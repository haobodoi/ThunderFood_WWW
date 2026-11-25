package vn.edu.iuh.fit.thunderfood.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.*;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantProfileUpdateDtos.*;
import vn.edu.iuh.fit.thunderfood.entity.OpeningHourEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantProfileUpdateEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantProfileUpdateReviewLogEntity;
import vn.edu.iuh.fit.thunderfood.entity.TagEntity;
import vn.edu.iuh.fit.thunderfood.enums.BusinessTypeEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.TagTypeEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.*;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;
import vn.edu.iuh.fit.thunderfood.util.ProvinceUtil;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@Transactional
public class RestaurantProfileUpdateService {
    private final RestaurantRepository restaurants;
    private final RestaurantProfileUpdateRepository updates;
    private final RestaurantProfileUpdateReviewLogRepository logs;
    private final TagRepository tags;
    private final FileStorageService files;
    private final ObjectMapper json;
    private final CustomerRules rules;
    private final AdminAuditService audit;

    public RestaurantProfileUpdateService(RestaurantRepository restaurants, RestaurantProfileUpdateRepository updates,
                                          RestaurantProfileUpdateReviewLogRepository logs, TagRepository tags,
                                          FileStorageService files, ObjectMapper json, CustomerRules rules, AdminAuditService audit) {
        this.restaurants = restaurants; this.updates = updates; this.logs = logs; this.tags = tags;
        this.files = files; this.json = json; this.rules = rules; this.audit = audit;
    }

    public Response mine(long owner, long restaurantId) {
        var restaurant = ownedApproved(owner, restaurantId);
        var current = updates.findFirstByRestaurantIdOrderByIdDesc(restaurantId).orElse(null);
        if (current == null || "APPROVED".equals(current.getStatus())) {
            current = updates.save(new RestaurantProfileUpdateEntity(restaurantId, owner, write(from(restaurant))));
        }
        return response(current, restaurant);
    }

    public Response save(long owner, long restaurantId, Save request) {
        var restaurant = ownedApproved(owner, restaurantId);
        var row = open(owner, restaurantId);
        if (row.getVersion() != request.version()) throw new ConcurrentUpdateException();
        if ("PENDING".equals(row.getStatus())) throw new BusinessException("Hồ sơ đang chờ admin duyệt nên không thể chỉnh sửa");
        validate(owner, request.payload());
        row.setProfileJson(write(request.payload())); row.setStatus("DRAFT"); row.setStatusReason(null); row.bumpVersion();
        return response(row, restaurant);
    }

    public Response submit(long owner, long restaurantId, long version) {
        var restaurant = ownedApproved(owner, restaurantId);
        var row = open(owner, restaurantId);
        if (row.getVersion() != version) throw new ConcurrentUpdateException();
        if ("PENDING".equals(row.getStatus())) throw new BusinessException("Hồ sơ đang chờ admin duyệt");
        validate(owner, read(row));
        row.setStatus("PENDING"); row.setSubmittedAt(rules.now()); row.setStatusReason(null); row.setReviewedAt(null); row.setReviewedBy(null); row.bumpVersion();
        return response(row, restaurant);
    }

    @Transactional(readOnly = true)
    public List<Response> pending(long admin) {
        rules.actor(admin, "ADMIN", false);
        return updates.findByStatusOrderBySubmittedAtAsc("PENDING").stream().map(row -> response(row, restaurant(row.getRestaurantId()))).toList();
    }

    @Transactional(readOnly = true)
    public Response adminGet(long admin, long requestId) {
        rules.actor(admin, "ADMIN", false);
        var row = updates.findById(requestId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đề nghị cập nhật"));
        return response(row, restaurant(row.getRestaurantId()));
    }

    public Response approve(long admin, long requestId) {
        rules.actor(admin, "ADMIN", true);
        var row = pendingRow(requestId); var restaurant = restaurantLocked(row.getRestaurantId());
        apply(restaurant, row.getOwnerUserId(), read(row));
        row.setStatus("APPROVED"); row.setStatusReason(null); row.setReviewedBy(admin); row.setReviewedAt(rules.now()); row.bumpVersion();
        logs.save(new RestaurantProfileUpdateReviewLogEntity(row.getId(), admin, "APPROVED", null, rules.now()));
        audit.record(admin, "RESTAURANT_PROFILE_UPDATE_APPROVE", "restaurant:" + restaurant.getId(), "Duyệt cập nhật hồ sơ");
        return response(row, restaurant);
    }

    public Response reject(long admin, long requestId, String reason) {
        rules.actor(admin, "ADMIN", true);
        var row = pendingRow(requestId); var restaurant = restaurant(row.getRestaurantId());
        String note = CustomerRules.text(reason, 5, 500);
        row.setStatus("REJECTED"); row.setStatusReason(note); row.setReviewedBy(admin); row.setReviewedAt(rules.now()); row.bumpVersion();
        logs.save(new RestaurantProfileUpdateReviewLogEntity(row.getId(), admin, "REJECTED", note, rules.now()));
        audit.record(admin, "RESTAURANT_PROFILE_UPDATE_REJECT", "restaurant:" + restaurant.getId(), note);
        return response(row, restaurant);
    }

    private RestaurantProfileUpdateEntity pendingRow(long id) {
        var row = updates.findWithLockById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đề nghị cập nhật"));
        if (!"PENDING".equals(row.getStatus())) throw new BusinessException("Đề nghị này không còn chờ duyệt");
        return row;
    }
    private RestaurantProfileUpdateEntity open(long owner, long id) {
        var rows = updates.findOpenWithLock(id, List.of("DRAFT", "PENDING", "REJECTED"));
        var row = rows.isEmpty() ? null : rows.getFirst();
        if (row == null || row.getOwnerUserId() != owner) throw new ResourceNotFoundException("Không tìm thấy đề nghị cập nhật");
        return row;
    }
    private RestaurantEntity ownedApproved(long owner, long id) {
        var row = restaurants.findWithLockById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán"));
        if (row.getOwnerUserId() != owner || row.getStatus() != RestaurantStatusEnum.APPROVED) throw new ResourceNotFoundException("Không tìm thấy quán đang hoạt động");
        return row;
    }
    private RestaurantEntity restaurant(long id) { return restaurants.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán")); }
    private RestaurantEntity restaurantLocked(long id) { return restaurants.findWithLockById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán")); }

    private Payload from(RestaurantEntity r) {
        var data = RestaurantRegistrationDto.from(r);
        return new Payload(data.basic(), data.representative(), data.bank(), data.details());
    }
    private String write(Payload payload) { try { return json.writeValueAsString(payload); } catch (JsonProcessingException e) { throw new IllegalStateException("Không thể lưu hồ sơ cập nhật", e); } }
    private Payload read(RestaurantProfileUpdateEntity row) { try { return json.readValue(row.getProfileJson(), Payload.class); } catch (JsonProcessingException e) { throw new IllegalStateException("Hồ sơ cập nhật không hợp lệ", e); } }
    private Response response(RestaurantProfileUpdateEntity row, RestaurantEntity restaurant) { return new Response(row.getId(), row.getRestaurantId(), restaurant.getRestaurantName(), row.getStatus(), row.getStatusReason(), row.getVersion(), row.getSubmittedAt(), row.getReviewedAt(), read(row), RestaurantRegistrationDto.from(restaurant)); }

    private void validate(long owner, Payload p) {
        if (!ProvinceUtil.isValid(InputNormalizerUtil.text(p.basic().province()))) throw new BusinessException("Tỉnh/thành phố không hợp lệ");
        if (!files.isStoredFile(p.representative().idFrontImage(), owner, true) || !files.isStoredFile(p.representative().idBackImage(), owner, true)) throw new BusinessException("Ảnh giấy tờ không hợp lệ");
        boolean individual = p.representative().businessType() == BusinessTypeEnum.INDIVIDUAL;
        if (!individual && (!files.isStoredFile(p.representative().businessLicenseImage(), owner, true) || p.representative().taxCode() == null || !p.representative().taxCode().matches("^\\d{10}(-\\d{3})?$"))) throw new BusinessException("Thông tin doanh nghiệp hoặc giấy phép không hợp lệ");
        if (!files.isStoredFile(p.details().avatarImage(), owner, false) || !files.isStoredFile(p.details().coverImage(), owner, false)) throw new BusinessException("Ảnh quán không hợp lệ");
        if (p.details().openingHours().stream().anyMatch(h -> !h.closeTime().isAfter(h.openTime()))) throw new BusinessException("Giờ đóng cửa phải sau giờ mở cửa");
        var ids = Stream.concat(p.details().serviceTypeIds().stream(), p.details().cuisineIds().stream()).collect(Collectors.toSet());
        var mapped = tags.findAllById(ids).stream().collect(Collectors.toMap(TagEntity::getId, x -> x));
        if (mapped.size() != ids.size() || p.details().serviceTypeIds().stream().anyMatch(id -> mapped.get(id).getTagType() != TagTypeEnum.SERVICE_TYPE) || p.details().cuisineIds().stream().anyMatch(id -> mapped.get(id).getTagType() != TagTypeEnum.CUISINE)) throw new BusinessException("Phân loại quán không hợp lệ");
    }

    private void apply(RestaurantEntity r, long owner, Payload p) {
        validate(owner, p);
        var basic = p.basic(); var representative = p.representative(); var bank = p.bank(); var details = p.details();
        r.setBrandName(InputNormalizerUtil.text(basic.brandName())); r.setSpecialty(InputNormalizerUtil.textOrNull(basic.specialty())); r.setAreaName(InputNormalizerUtil.textOrNull(basic.areaName()));
        r.setRestaurantName(Stream.of(r.getBrandName(), r.getSpecialty(), r.getAreaName()).filter(Objects::nonNull).filter(s -> !s.isBlank()).collect(Collectors.joining(" - ")));
        r.setPhone(InputNormalizerUtil.phone(basic.phone())); r.setProvince(InputNormalizerUtil.text(basic.province())); r.setWard(InputNormalizerUtil.text(basic.ward())); r.setStreetAddress(InputNormalizerUtil.text(basic.streetAddress())); r.setAddress(r.getStreetAddress() + ", " + r.getWard() + ", " + r.getProvince());
        boolean individual = representative.businessType() == BusinessTypeEnum.INDIVIDUAL;
        r.setBusinessType(representative.businessType()); r.setBusinessName(individual ? null : InputNormalizerUtil.text(representative.businessName())); r.setTaxCode(individual ? null : InputNormalizerUtil.text(representative.taxCode())); r.setBusinessLicenseImage(individual ? null : representative.businessLicenseImage());
        r.setRepFullName(InputNormalizerUtil.text(representative.repFullName())); r.setRepEmail(InputNormalizerUtil.email(representative.repEmail())); r.setRepPhone(InputNormalizerUtil.phone(representative.repPhone())); r.setRepPhoneAlt(InputNormalizerUtil.phoneOrNull(representative.repPhoneAlt())); r.setIdNumber(representative.idNumber().trim().toUpperCase()); r.setIdIssuedDate(representative.idIssuedDate()); r.setIdIssuedPlace(InputNormalizerUtil.text(representative.idIssuedPlace())); r.setIdFrontImage(representative.idFrontImage()); r.setIdBackImage(representative.idBackImage());
        r.setBankName(InputNormalizerUtil.text(bank.bankName())); r.setBankBranch(InputNormalizerUtil.textOrNull(bank.bankBranch())); r.setBankAccountNumber(bank.bankAccountNumber().trim()); r.setBankAccountHolder(InputNormalizerUtil.foldName(bank.bankAccountHolder()));
        r.getOpeningHours().clear(); details.openingHours().stream().sorted(Comparator.comparing(OpeningHourDto::dayOfWeek).thenComparing(OpeningHourDto::openTime)).forEach(h -> r.getOpeningHours().add(new OpeningHourEntity(r, h.dayOfWeek(), h.openTime(), h.closeTime())));
        var ids = Stream.concat(details.serviceTypeIds().stream(), details.cuisineIds().stream()).collect(Collectors.toSet()); r.getTags().clear(); r.getTags().addAll(tags.findAllById(ids));
        r.setAvatarImage(details.avatarImage()); r.setCoverImage(details.coverImage()); r.setDescription(InputNormalizerUtil.textOrNull(details.description()));
    }
}
