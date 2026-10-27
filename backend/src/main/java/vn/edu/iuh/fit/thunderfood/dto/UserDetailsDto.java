package vn.edu.iuh.fit.thunderfood.dto;

import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import vn.edu.iuh.fit.thunderfood.entity.UserEntity;

import java.util.Collection;
import java.util.List;

public class UserDetailsDto implements UserDetails, CredentialsContainer {

    private final Long id;
    private final String email;
    private final String fullName;
    private final String roleCode;
    private final boolean locked;
    private final List<GrantedAuthority> authorities;
    private String password;

    public UserDetailsDto(UserEntity user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.roleCode = user.getRole().getRoleCode();
        this.locked = user.isLocked();
        this.password = user.getPasswordHash();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + roleCode));
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getRoleCode() {
        return roleCode;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !locked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public void eraseCredentials() {
        this.password = null;
    }
}
