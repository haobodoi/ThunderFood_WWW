package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.thunderfood.enums.UploadKindEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class FileStorageService {

    public static final long MAX_IMAGE_SIZE = 1024 * 1024;
    private static final String PUBLIC_URL_PREFIX = "/uploads/public/";
    private static final String PRIVATE_URL_PREFIX = "/api/files/private/";
    private static final Pattern FILE_NAME = Pattern.compile("^[a-f0-9\\-]{36}\\.(jpg|png|webp)$");

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir:uploads}") String uploadDir) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root.resolve("public"));
            Files.createDirectories(root.resolve("private"));
        } catch (IOException e) {
            throw new UncheckedIOException("Không tạo được thư mục lưu ảnh: " + root, e);
        }
    }

    public Path getPublicRoot() {
        return root.resolve("public");
    }

    public String store(Long userId, UploadKindEnum kind, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Vui lòng chọn ảnh để tải lên");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BusinessException("Ảnh tối đa 1MB");
        }
        try {
            byte[] bytes = file.getBytes();
            String extension = detectExtension(bytes);
            if (extension == null) {
                throw new BusinessException("Chỉ nhận ảnh định dạng JPG, PNG hoặc WEBP");
            }
            String fileName = UUID.randomUUID() + "." + extension;
            Path dir = folderOf(kind.isPrivateFile(), userId);
            Files.createDirectories(dir);
            Files.write(dir.resolve(fileName), bytes);
            return (kind.isPrivateFile() ? PRIVATE_URL_PREFIX : PUBLIC_URL_PREFIX) + userId + "/" + fileName;
        } catch (IOException e) {
            throw new UncheckedIOException("Không lưu được ảnh", e);
        }
    }

    public boolean isStoredFile(String url, Long userId, boolean privateFile) {
        if (url == null) {
            return false;
        }
        String prefix = (privateFile ? PRIVATE_URL_PREFIX : PUBLIC_URL_PREFIX) + userId + "/";
        if (!url.startsWith(prefix)) {
            return false;
        }
        String fileName = url.substring(prefix.length());
        return FILE_NAME.matcher(fileName).matches()
                && Files.isRegularFile(folderOf(privateFile, userId).resolve(fileName));
    }

    public Resource loadPrivate(Long ownerId, String fileName) {
        if (fileName == null || !FILE_NAME.matcher(fileName).matches()) {
            throw new ResourceNotFoundException("Không tìm thấy ảnh");
        }
        Path path = folderOf(true, ownerId).resolve(fileName).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new ResourceNotFoundException("Không tìm thấy ảnh");
        }
        return new FileSystemResource(path);
    }

    public static MediaType mediaTypeOf(String fileName) {
        if (fileName.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (fileName.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }

    private Path folderOf(boolean privateFile, Long userId) {
        return root.resolve(privateFile ? "private" : "public").resolve(String.valueOf(userId));
    }

    private static String detectExtension(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "png";
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "webp";
        }
        return null;
    }
}
