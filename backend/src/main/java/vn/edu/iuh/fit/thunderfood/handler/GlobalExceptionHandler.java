package vn.edu.iuh.fit.thunderfood.handler;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import vn.edu.iuh.fit.thunderfood.dto.ApiErrorDto;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.FieldValidationException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ConcurrentUpdateException.class)
    public ResponseEntity<ApiErrorDto> concurrentUpdate(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiErrorDto.of("STALE_VERSION", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorDto> invalidBody(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return ResponseEntity.badRequest()
                .body(new ApiErrorDto("VALIDATION_ERROR", "Dữ liệu chưa hợp lệ", errors));
    }

    @ExceptionHandler(FieldValidationException.class)
    public ResponseEntity<ApiErrorDto> fieldErrors(FieldValidationException ex) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorDto("VALIDATION_ERROR", ex.getMessage(), ex.getErrors()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiErrorDto> business(BusinessException ex) {
        return ResponseEntity.badRequest().body(ApiErrorDto.of("BUSINESS_RULE", ex.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorDto> notFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorDto.of("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorDto> tooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.badRequest().body(ApiErrorDto.of("FILE_TOO_LARGE", "Ảnh tối đa 1MB"));
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class
    })
    public ResponseEntity<ApiErrorDto> badRequest(Exception ex) {
        return ResponseEntity.badRequest()
                .body(ApiErrorDto.of("BAD_REQUEST", "Dữ liệu gửi lên không đúng định dạng"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorDto> conflict(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorDto.of("CONFLICT", "Dữ liệu đã tồn tại hoặc tham chiếu không hợp lệ. Vui lòng tải lại trước khi thử lại."));
    }
}
