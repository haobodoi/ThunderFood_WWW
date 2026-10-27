package vn.edu.iuh.fit.thunderfood.enums;

public enum AccountTypeEnum {
    CUSTOMER(RoleCodeEnum.CUSTOMER),
    RESTAURANT_PARTNER(RoleCodeEnum.RESTAURANT_PARTNER);

    private final RoleCodeEnum roleCode;

    AccountTypeEnum(RoleCodeEnum roleCode) {
        this.roleCode = roleCode;
    }

    public RoleCodeEnum getRoleCode() {
        return roleCode;
    }
}
