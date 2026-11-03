package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.entity.ReviewImageEntity;
import vn.edu.iuh.fit.thunderfood.enums.RestaurantStatusEnum;
import vn.edu.iuh.fit.thunderfood.enums.ReviewStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.ReviewImageRepository;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.UUID;
import java.util.stream.Collectors;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.version;

/** Images are never exposed by the public uploads resource handler. */
@Service
public class ReviewImageService {
    private final Path root;
    private final ReviewImageRepository images;
    private final CustomerReviewService reviews;
    private final CustomerRules rules;
    public ReviewImageService(@Value("${app.upload-dir:uploads}") String directory, ReviewImageRepository images, CustomerReviewService reviews, CustomerRules rules) {
        root=Path.of(directory).toAbsolutePath().normalize().resolve("reviews"); this.images=images; this.reviews=reviews; this.rules=rules;
    }
    @Transactional
    public void upload(long customer,long reviewId,long expected,MultipartFile file) {
        rules.actor(customer,"CUSTOMER",true);
        var review=reviews.locked(reviewId);
        reviews.editable(customer,review); version(review.getVersion(),expected);
        if(file.isEmpty() || file.getSize()>1024*1024) throw new BusinessException("Ảnh JPG/PNG tối đa 1MB");
        var slots=review.getImages().stream().map(ReviewImageEntity::getDisplayOrder).collect(Collectors.toSet());
        int slot=1;
        while(slot<=5 && slots.contains(slot)) slot++;
        if(slot>5) throw new BusinessException("Mỗi đánh giá tối đa 5 ảnh");
        Path target=root.resolve(UUID.randomUUID()+".png");
        try {
            BufferedImage image;
            try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
                var readers=ImageIO.getImageReaders(stream);
                if(!readers.hasNext()) throw new BusinessException("Chỉ nhận ảnh JPG/PNG hợp lệ");
                var reader=readers.next();
                try {
                    reader.setInput(stream);
                    String format=reader.getFormatName();
                    if(!format.equalsIgnoreCase("JPEG") && !format.equalsIgnoreCase("PNG")) throw new BusinessException("Chỉ nhận ảnh JPG/PNG");
                    long pixels=(long)reader.getWidth(0)*reader.getHeight(0);
                    if(pixels>16_000_000) throw new BusinessException("Ảnh tối đa 16 triệu điểm ảnh");
                    image=reader.read(0);
                } finally { reader.dispose(); }
            } catch (IOException e) { throw new BusinessException("Ảnh bị hỏng hoặc không đọc được. Vui lòng chọn ảnh JPG/PNG khác."); }
            Files.createDirectories(root);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) { if(status!=STATUS_COMMITTED) cleanup(target); }
            });
            if(!ImageIO.write(image,"png",target.toFile())) throw new IOException("PNG writer unavailable");
        } catch(IOException e) { throw new UncheckedIOException("Không lưu được ảnh đánh giá",e); }
        images.save(new ReviewImageEntity(review,target.getFileName().toString(),slot));
        review.imagesChanged(rules.now());
    }
    @Transactional
    public void remove(long customer,long reviewId,long imageId,long expected) {
        rules.actor(customer,"CUSTOMER",true);
        var review=reviews.locked(reviewId);
        reviews.editable(customer,review); version(review.getVersion(),expected);
        var image=images.findByIdAndReviewId(imageId,reviewId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dữ liệu"));
        Path file=path(image.getFileKey());
        images.delete(image);
        review.imagesChanged(rules.now());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { cleanup(file); }
        });
    }
    @Transactional(readOnly=true)
    public Resource load(long imageId,UserDetailsDto principal) {
        var image=images.findWithReviewById(imageId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dữ liệu"));
        var review=image.getReview();
        boolean visible=review.getStatus()==ReviewStatusEnum.PUBLISHED && review.getDeletedAt()==null && review.getRestaurant().getStatus()==RestaurantStatusEnum.APPROVED;
        if(!visible) {
            if(principal==null) throw new ResourceNotFoundException("Không tìm thấy ảnh");
            rules.actor(principal.getId(),principal.getRoleCode(),false);
            if(!"ADMIN".equals(principal.getRoleCode()) && !principal.getId().equals(review.getCustomerId())) throw new ResourceNotFoundException("Không tìm thấy ảnh");
        }
        Path file=path(image.getFileKey());
        if(!Files.isRegularFile(file)) throw new ResourceNotFoundException("Không tìm thấy ảnh");
        return new FileSystemResource(file);
    }
    private Path path(String key) {
        if(!key.matches("[a-f0-9-]{36}\\.png")) throw new ResourceNotFoundException("Không tìm thấy ảnh");
        return root.resolve(key);
    }
    private static void cleanup(Path file) { try { Files.deleteIfExists(file); } catch(IOException ignored) { /* Retry through operational orphan cleanup if the filesystem is unavailable. */ } }
}
