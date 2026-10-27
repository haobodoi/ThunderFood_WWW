package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.AdminDashboardResponse;
import vn.edu.iuh.fit.thunderfood.dto.CustomerDashboardResponse;
import vn.edu.iuh.fit.thunderfood.dto.PartnerDashboardResponse;
import vn.edu.iuh.fit.thunderfood.entity.AccountStatus;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantStatus;
import vn.edu.iuh.fit.thunderfood.entity.RoleCode;
import vn.edu.iuh.fit.thunderfood.entity.User;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;

import java.util.NoSuchElementException;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final UserRepository userRepository;
    private final RestaurantRepository restaurantRepository;

    public DashboardService(UserRepository userRepository, RestaurantRepository restaurantRepository) {
        this.userRepository = userRepository;
        this.restaurantRepository = restaurantRepository;
    }

    public CustomerDashboardResponse customer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài khoản"));
        return new CustomerDashboardResponse(user.getFullName(), user.getAddress(), user.getCreatedAt());
    }

    public PartnerDashboardResponse partner(Long userId) {
        return restaurantRepository.findByOwnerUserId(userId)
                .map(r -> new PartnerDashboardResponse(
                        true,
                        r.getId(),
                        r.getRestaurantName(),
                        r.getStatus().name(),
                        r.getStatusReason(),
                        Boolean.TRUE.equals(r.getOpen())))
                .orElseGet(PartnerDashboardResponse::empty);
    }

    public AdminDashboardResponse admin() {
        return new AdminDashboardResponse(
                userRepository.countByRole_RoleCode(RoleCode.CUSTOMER),
                userRepository.countByRole_RoleCode(RoleCode.RESTAURANT_PARTNER),
                restaurantRepository.countByStatus(RestaurantStatus.PENDING),
                userRepository.countByAccountStatus(AccountStatus.LOCKED)
        );
    }
}
