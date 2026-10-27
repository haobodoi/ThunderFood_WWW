package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.entity.User;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;
import vn.edu.iuh.fit.thunderfood.security.CustomUserDetails;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizer;

import java.util.Optional;

@Service
public class MyUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public MyUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = findByLoginIdentifier(username)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản: " + username));
        return new CustomUserDetails(user);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByLoginIdentifier(String identifier) {
        if (InputNormalizer.isBlank(identifier)) {
            return Optional.empty();
        }
        String value = identifier.trim();
        if (value.contains("@")) {
            return userRepository.findByEmail(InputNormalizer.email(value));
        }
        return userRepository.findByPhone(InputNormalizer.phone(value));
    }
}
