package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantRegistrationDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantSummaryDto;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class RestaurantReviewService {

    private static final Set<RestaurantStatusEnum> VISIBLE_TO_ADMIN = EnumSet.of(
            RestaurantStatusEnum.PENDING,
            RestaurantStatusEnum.APPROVED,
            RestaurantStatusEnum.REJECTED,
            RestaurantStatusEnum.LOCKED);

    private final RestaurantRepository restaurantRepository;
    private final AdminAuditService audit;
    private final CustomerRules rules;

    public RestaurantReviewService(RestaurantRepository restaurantRepository, AdminAuditService audit, CustomerRules rules) {
        this.restaurantRepository = restaurantRepository;
        this.audit = audit;
        this.rules = rules;
    }

    @Transactional(readOnly = true)
    public List<RestaurantSummaryDto> list(RestaurantStatusEnum status) {
        RestaurantStatusEnum filter = status == null ? RestaurantStatusEnum.PENDING : status;
        if (!VISIBLE_TO_ADMIN.contains(filter)) {
            throw new BusinessException("Không thể xem hồ sơ đang ở trạng thái nháp");
        }
        return restaurantRepository.findByStatusOrderBySubmittedAtAsc(filter).stream()
                .map(RestaurantSummaryDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public RestaurantRegistrationDto get(Long restaurantId) {
        return RestaurantRegistrationDto.from(find(restaurantId));
    }

    public RestaurantRegistrationDto approve(Long adminId, Long restaurantId) {
        RestaurantEntity restaurant = findPending(restaurantId);
        restaurant.setStatus(RestaurantStatusEnum.APPROVED);
        restaurant.setStatusReason(null);
        restaurant.setReviewedBy(adminId);
        restaurant.setReviewedAt(rules.now());
        audit.record(adminId,"RESTAURANT_APPROVE","restaurant:"+restaurantId,"Duyệt hồ sơ quán");
        return RestaurantRegistrationDto.from(restaurant);
    }

    public RestaurantRegistrationDto reject(Long adminId, Long restaurantId, String reason) {
        RestaurantEntity restaurant = findPending(restaurantId);
        restaurant.setStatus(RestaurantStatusEnum.REJECTED);
        restaurant.setStatusReason(InputNormalizerUtil.text(reason));
        restaurant.setReviewedBy(adminId);
        restaurant.setReviewedAt(rules.now());
        audit.record(adminId,"RESTAURANT_REJECT","restaurant:"+restaurantId,InputNormalizerUtil.text(reason));
        return RestaurantRegistrationDto.from(restaurant);
    }

    private RestaurantEntity find(Long restaurantId) {
        return restaurantRepository.findByIdAndStatusIn(restaurantId, VISIBLE_TO_ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ quán"));
    }

    private RestaurantEntity findPending(Long restaurantId) {
        RestaurantEntity restaurant = restaurantRepository.findWithLockById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ quán"));
        if (restaurant.getStatus() != RestaurantStatusEnum.PENDING) {
            throw new BusinessException("Chỉ xử lý được hồ sơ đang chờ duyệt");
        }
        return restaurant;
    }
}
