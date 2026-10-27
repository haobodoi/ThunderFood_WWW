package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.entity.RoleCode;

public enum AccountType {
    CUSTOMER(RoleCode.CUSTOMER),
    RESTAURANT_PARTNER(RoleCode.RESTAURANT_PARTNER);

    private final String roleCode;

    AccountType(String roleCode) {
        this.roleCode = roleCode;
    }

    public String getRoleCode() {
        return roleCode;
    }
}
