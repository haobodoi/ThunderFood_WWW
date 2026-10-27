package vn.edu.iuh.fit.thunderfood.exception;

import java.util.Map;

public class FieldValidationException extends RuntimeException {

    private final Map<String, String> errors;

    public FieldValidationException(String message, Map<String, String> errors) {
        super(message);
        this.errors = Map.copyOf(errors);
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}
