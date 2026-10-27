package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import vn.edu.iuh.fit.thunderfood.enums.BusinessTypeEnum;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "restaurants")
public class RestaurantEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "restaurant_id")
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", insertable = false, updatable = false)
    private UserEntity owner;

    @Column(name = "brand_name", nullable = false, length = 60)
    private String brandName;

    @Column(name = "specialty", length = 60)
    private String specialty;

    @Column(name = "area_name", length = 60)
    private String areaName;

    @Column(name = "restaurant_name", nullable = false, length = 200)
    private String restaurantName;

    @Column(name = "phone", nullable = false, length = 15)
    private String phone;

    @Column(name = "province", nullable = false, length = 100)
    private String province;

    @Column(name = "ward", nullable = false, length = 100)
    private String ward;

    @Column(name = "street_address", nullable = false)
    private String streetAddress;

    @Column(name = "address", nullable = false, length = 500)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_type")
    private BusinessTypeEnum businessType;

    @Column(name = "business_name", length = 200)
    private String businessName;

    @Column(name = "tax_code", length = 20)
    private String taxCode;

    @Column(name = "business_license_image", length = 500)
    private String businessLicenseImage;

    @Column(name = "rep_full_name", length = 120)
    private String repFullName;

    @Column(name = "rep_email", length = 190)
    private String repEmail;

    @Column(name = "rep_phone", length = 15)
    private String repPhone;

    @Column(name = "rep_phone_alt", length = 15)
    private String repPhoneAlt;

    @Column(name = "id_number", length = 20)
    private String idNumber;

    @Column(name = "id_issued_date")
    private LocalDate idIssuedDate;

    @Column(name = "id_issued_place", length = 150)
    private String idIssuedPlace;

    @Column(name = "id_front_image", length = 500)
    private String idFrontImage;

    @Column(name = "id_back_image", length = 500)
    private String idBackImage;

    @Column(name = "bank_name", length = 120)
    private String bankName;

    @Column(name = "bank_branch", length = 120)
    private String bankBranch;

    @Column(name = "bank_account_number", length = 30)
    private String bankAccountNumber;

    @Column(name = "bank_account_holder", length = 120)
    private String bankAccountHolder;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "avatar_image", length = 500)
    private String avatarImage;

    @Column(name = "cover_image", length = 500)
    private String coverImage;

    @Column(name = "delivery_fee", nullable = false)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(name = "is_open", nullable = false)
    private Boolean open = Boolean.FALSE;

    @Column(name = "registration_step", nullable = false)
    private Integer registrationStep = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RestaurantStatusEnum status = RestaurantStatusEnum.DRAFT;

    @Column(name = "status_reason", length = 500)
    private String statusReason;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dayOfWeek ASC, openTime ASC")
    private List<OpeningHourEntity> openingHours = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "restaurant_tags",
            joinColumns = @JoinColumn(name = "restaurant_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<TagEntity> tags = new LinkedHashSet<>();

    public RestaurantEntity() {
    }

    public Long getId() { return id; }
    public Long getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(Long ownerUserId) { this.ownerUserId = ownerUserId; }
    public UserEntity getOwner() { return owner; }
    public String getBrandName() { return brandName; }
    public void setBrandName(String brandName) { this.brandName = brandName; }
    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }
    public String getAreaName() { return areaName; }
    public void setAreaName(String areaName) { this.areaName = areaName; }
    public String getRestaurantName() { return restaurantName; }
    public void setRestaurantName(String restaurantName) { this.restaurantName = restaurantName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }
    public String getWard() { return ward; }
    public void setWard(String ward) { this.ward = ward; }
    public String getStreetAddress() { return streetAddress; }
    public void setStreetAddress(String streetAddress) { this.streetAddress = streetAddress; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public BusinessTypeEnum getBusinessType() { return businessType; }
    public void setBusinessType(BusinessTypeEnum businessType) { this.businessType = businessType; }
    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }
    public String getTaxCode() { return taxCode; }
    public void setTaxCode(String taxCode) { this.taxCode = taxCode; }
    public String getBusinessLicenseImage() { return businessLicenseImage; }
    public void setBusinessLicenseImage(String businessLicenseImage) { this.businessLicenseImage = businessLicenseImage; }
    public String getRepFullName() { return repFullName; }
    public void setRepFullName(String repFullName) { this.repFullName = repFullName; }
    public String getRepEmail() { return repEmail; }
    public void setRepEmail(String repEmail) { this.repEmail = repEmail; }
    public String getRepPhone() { return repPhone; }
    public void setRepPhone(String repPhone) { this.repPhone = repPhone; }
    public String getRepPhoneAlt() { return repPhoneAlt; }
    public void setRepPhoneAlt(String repPhoneAlt) { this.repPhoneAlt = repPhoneAlt; }
    public String getIdNumber() { return idNumber; }
    public void setIdNumber(String idNumber) { this.idNumber = idNumber; }
    public LocalDate getIdIssuedDate() { return idIssuedDate; }
    public void setIdIssuedDate(LocalDate idIssuedDate) { this.idIssuedDate = idIssuedDate; }
    public String getIdIssuedPlace() { return idIssuedPlace; }
    public void setIdIssuedPlace(String idIssuedPlace) { this.idIssuedPlace = idIssuedPlace; }
    public String getIdFrontImage() { return idFrontImage; }
    public void setIdFrontImage(String idFrontImage) { this.idFrontImage = idFrontImage; }
    public String getIdBackImage() { return idBackImage; }
    public void setIdBackImage(String idBackImage) { this.idBackImage = idBackImage; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getBankBranch() { return bankBranch; }
    public void setBankBranch(String bankBranch) { this.bankBranch = bankBranch; }
    public String getBankAccountNumber() { return bankAccountNumber; }
    public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }
    public String getBankAccountHolder() { return bankAccountHolder; }
    public void setBankAccountHolder(String bankAccountHolder) { this.bankAccountHolder = bankAccountHolder; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getAvatarImage() { return avatarImage; }
    public void setAvatarImage(String avatarImage) { this.avatarImage = avatarImage; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public void setDeliveryFee(BigDecimal deliveryFee) { this.deliveryFee = deliveryFee; }
    public Boolean getOpen() { return open; }
    public void setOpen(Boolean open) { this.open = open; }
    public Integer getRegistrationStep() { return registrationStep; }
    public void setRegistrationStep(Integer registrationStep) { this.registrationStep = registrationStep; }
    public RestaurantStatusEnum getStatus() { return status; }
    public void setStatus(RestaurantStatusEnum status) { this.status = status; }
    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public Long getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(Long reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<OpeningHourEntity> getOpeningHours() { return openingHours; }
    public Set<TagEntity> getTags() { return tags; }
}
