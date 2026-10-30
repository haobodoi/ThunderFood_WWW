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
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.UUID;
import static vn.edu.iuh.fit.thunderfood.service.CustomerRules.version;

/** Images are never exposed by the public uploads resource handler. */
@Service
public class ReviewImageService {
    private final Path root;
    private final CustomerDataRepository db;
    private final CustomerReviewService reviews;
    private final CustomerRules rules;
    public ReviewImageService(@Value("${app.upload-dir:uploads}") String directory, CustomerDataRepository db, CustomerReviewService reviews, CustomerRules rules) {
        root=Path.of(directory).toAbsolutePath().normalize().resolve("reviews"); this.db=db; this.reviews=reviews; this.rules=rules;
    }
    @Transactional
    public void upload(long customer,long reviewId,long expected,MultipartFile file) {
        rules.actor(customer,"CUSTOMER",true);
        var review=db.one("SELECT * FROM customer_reviews WHERE review_id=? FOR UPDATE",reviewId);
        reviews.editable(customer,review); version(review,expected);
        if(file.isEmpty() || file.getSize()>1024*1024) throw new BusinessException("Ảnh JPG/PNG tối đa 1MB");
        var slots=db.rows("SELECT display_order FROM review_images WHERE review_id=?",reviewId);
        int slot=1;
        while(slot<=5) { final int n=slot; if(slots.stream().noneMatch(s -> ((Number)s.get("display_order")).intValue()==n)) break; slot++; }
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
        db.update("INSERT INTO review_images(review_id,file_key,display_order) VALUES (?,?,?)",reviewId,target.getFileName().toString(),slot);
        db.update("UPDATE customer_reviews SET version=version+1,edited_at=?,updated_at=? WHERE review_id=?",rules.now(),rules.now(),reviewId);
    }
    @Transactional
    public void remove(long customer,long reviewId,long imageId,long expected) {
        rules.actor(customer,"CUSTOMER",true);
        var review=db.one("SELECT * FROM customer_reviews WHERE review_id=? FOR UPDATE",reviewId);
        reviews.editable(customer,review); version(review,expected);
        var image=db.one("SELECT file_key FROM review_images WHERE review_id=? AND image_id=?",reviewId,imageId);
        Path file=path(image.get("file_key").toString());
        db.update("DELETE FROM review_images WHERE image_id=?",imageId);
        db.update("UPDATE customer_reviews SET version=version+1,edited_at=?,updated_at=? WHERE review_id=?",rules.now(),rules.now(),reviewId);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { cleanup(file); }
        });
    }
    @Transactional(readOnly=true)
    public Resource load(long imageId,UserDetailsDto principal) {
        var image=db.one("SELECT i.file_key,v.customer_id,v.status,v.deleted_at,r.status AS restaurant_status FROM review_images i JOIN customer_reviews v ON v.review_id=i.review_id JOIN restaurants r ON r.restaurant_id=v.restaurant_id WHERE i.image_id=?",imageId);
        boolean visible="PUBLISHED".equals(image.get("status")) && image.get("deleted_at")==null && "APPROVED".equals(image.get("restaurant_status"));
        if(!visible) {
            if(principal==null) throw new ResourceNotFoundException("Không tìm thấy ảnh");
            rules.actor(principal.getId(),principal.getRoleCode(),false);
            if(!"ADMIN".equals(principal.getRoleCode()) && principal.getId()!=CustomerDataRepository.number(image,"customer_id")) throw new ResourceNotFoundException("Không tìm thấy ảnh");
        }
        Path file=path(image.get("file_key").toString());
        if(!Files.isRegularFile(file)) throw new ResourceNotFoundException("Không tìm thấy ảnh");
        return new FileSystemResource(file);
    }
    private Path path(String key) {
        if(!key.matches("[a-f0-9-]{36}\\.png")) throw new ResourceNotFoundException("Không tìm thấy ảnh");
        return root.resolve(key);
    }
    private static void cleanup(Path file) { try { Files.deleteIfExists(file); } catch(IOException ignored) { /* Retry through operational orphan cleanup if the filesystem is unavailable. */ } }
}
