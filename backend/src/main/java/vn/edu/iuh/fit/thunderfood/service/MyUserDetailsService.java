package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.entity.UserEntity;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;

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
        UserEntity user = findByLoginIdentifier(username)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản: " + username));
        return new UserDetailsDto(user);
    }

    @Transactional(readOnly = true)
    public Optional<UserEntity> findByLoginIdentifier(String identifier) {
        if (InputNormalizerUtil.isBlank(identifier)) {
            return Optional.empty();
        }
        String value = identifier.trim();
        if (value.contains("@")) {
            return userRepository.findByEmail(InputNormalizerUtil.email(value));
        }
        return userRepository.findByPhone(InputNormalizerUtil.phone(value));
    }
}
