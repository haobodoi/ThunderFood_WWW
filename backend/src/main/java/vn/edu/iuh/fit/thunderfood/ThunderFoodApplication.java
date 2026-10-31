package vn.edu.iuh.fit.thunderfood;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ThunderFoodApplication {
    public static void main(String[] args) {
        SpringApplication.run(ThunderFoodApplication.class, args);
    }
}
