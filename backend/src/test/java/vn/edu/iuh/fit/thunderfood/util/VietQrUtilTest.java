package vn.edu.iuh.fit.thunderfood.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class VietQrUtilTest {

    @Test
    void crcMatchesCcittFalseCheckValue() {
        assertEquals("29B1", VietQrUtil.crc16("123456789"));
    }

    @Test
    void buildsExpectedEmvFields() {
        String payload = VietQrUtil.payload("970436", "0123456789", new BigDecimal("88000.00"), "TF20261031K7M2QX");
        String body = "000201"
                + "010212"
                + "3854" + "0010A000000727" + "0124" + "0006970436" + "01100123456789" + "0208QRIBFTTA"
                + "5303704"
                + "540588000"
                + "5802VN"
                + "6220" + "0816TF20261031K7M2QX"
                + "6304";
        assertEquals(body + VietQrUtil.crc16(body), payload);
    }

    @Test
    void wholeThousandsAreNotWrittenInScientificNotation() {
        assertTrue(VietQrUtil.payload("970436", "0123456789", new BigDecimal("100000"), "TF1").contains("5406100000"));
    }

    @Test
    void onlyPositiveWholeAmountsArePayable() {
        assertTrue(VietQrUtil.isPayableAmount(new BigDecimal("1000.00")));
        assertFalse(VietQrUtil.isPayableAmount(new BigDecimal("1000.50")));
        assertFalse(VietQrUtil.isPayableAmount(BigDecimal.ZERO));
        assertFalse(VietQrUtil.isPayableAmount(new BigDecimal("-1000")));
        assertFalse(VietQrUtil.isPayableAmount(null));
    }

    @Test
    void everyRegistrationBankHasBin() {
        for (String bank : new String[] {"Vietcombank", "VietinBank", "BIDV", "Agribank", "Techcombank", "MB Bank", "ACB",
                "VPBank", "TPBank", "Sacombank", "VIB", "HDBank", "SHB", "OCB", "MSB", "SeABank", "Eximbank", "LPBank",
                "Nam A Bank", "Bac A Bank"}) {
            assertTrue(VietQrUtil.binOf(bank).isPresent(), bank);
        }
        assertTrue(VietQrUtil.binOf("Ngân hàng lạ").isEmpty());
    }

    @Test
    void rejectsContentBanksWouldStrip() {
        assertThrows(IllegalArgumentException.class,
                () -> VietQrUtil.payload("970436", "0123456789", BigDecimal.TEN, "TF-2026"));
    }
}
