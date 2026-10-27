package vn.edu.iuh.fit.thunderfood.util;

import java.util.List;

public final class ProvinceUtil {

    public static final List<String> PROVINCES = List.of(
            "Thành phố Hà Nội",
            "Thành phố Hồ Chí Minh",
            "Thành phố Hải Phòng",
            "Thành phố Đà Nẵng",
            "Thành phố Cần Thơ",
            "Thành phố Huế",
            "Tỉnh An Giang",
            "Tỉnh Bắc Ninh",
            "Tỉnh Cà Mau",
            "Tỉnh Cao Bằng",
            "Tỉnh Điện Biên",
            "Tỉnh Đắk Lắk",
            "Tỉnh Đồng Nai",
            "Tỉnh Đồng Tháp",
            "Tỉnh Gia Lai",
            "Tỉnh Hà Tĩnh",
            "Tỉnh Hưng Yên",
            "Tỉnh Khánh Hòa",
            "Tỉnh Lai Châu",
            "Tỉnh Lạng Sơn",
            "Tỉnh Lào Cai",
            "Tỉnh Lâm Đồng",
            "Tỉnh Nghệ An",
            "Tỉnh Ninh Bình",
            "Tỉnh Phú Thọ",
            "Tỉnh Quảng Ngãi",
            "Tỉnh Quảng Ninh",
            "Tỉnh Quảng Trị",
            "Tỉnh Sơn La",
            "Tỉnh Tây Ninh",
            "Tỉnh Thái Nguyên",
            "Tỉnh Thanh Hóa",
            "Tỉnh Tuyên Quang",
            "Tỉnh Vĩnh Long"
    );

    private ProvinceUtil() {
    }

    public static boolean isValid(String province) {
        return province != null && PROVINCES.contains(province);
    }
}
