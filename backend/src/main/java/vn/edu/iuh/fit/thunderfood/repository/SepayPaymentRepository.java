package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public class SepayPaymentRepository {
    public record Recipient(String bankBin, String bankName, String accountNumber, String accountHolder) {}

    private final JdbcTemplate jdbc;

    public SepayPaymentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void register(long orderId, Recipient recipient) {
        jdbc.update("INSERT INTO sepay_payments(order_id,bank_bin,bank_name,account_number,account_holder) VALUES (?,?,?,?,?)",
                orderId, recipient.bankBin(), recipient.bankName(), recipient.accountNumber(), recipient.accountHolder());
    }

    public Optional<Recipient> findRecipient(long orderId) {
        return jdbc.query("SELECT bank_bin,bank_name,account_number,account_holder FROM sepay_payments WHERE order_id=?",
                (row, i) -> new Recipient(row.getString("bank_bin"), row.getString("bank_name"),
                        row.getString("account_number"), row.getString("account_holder")), orderId).stream().findFirst();
    }

    public boolean recordTransfer(long orderId, long transactionId, String reference, LocalDateTime transferredAt) {
        try {
            return jdbc.update("""
                    UPDATE sepay_payments SET sepay_transaction_id=?,bank_reference=?,transferred_at=?
                    WHERE order_id=? AND sepay_transaction_id IS NULL
                    """, transactionId, reference, transferredAt, orderId) == 1;
        } catch (DuplicateKeyException alreadyRecorded) {
            // A SePay transaction may credit only one order, even across simultaneous callbacks.
            return false;
        }
    }
}
