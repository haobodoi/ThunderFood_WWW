package vn.edu.iuh.fit.thunderfood.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import vn.edu.iuh.fit.thunderfood.dto.CustomerRequests.OrderStatus;
import vn.edu.iuh.fit.thunderfood.entity.OrderEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.*;
import vn.edu.iuh.fit.thunderfood.exception.*;
import vn.edu.iuh.fit.thunderfood.repository.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.edu.iuh.fit.thunderfood.enums.OrderStatusEnum.*;
import static vn.edu.iuh.fit.thunderfood.enums.OrderPaymentStatusEnum.*;

class AdminRulesTest {
    private OrderService service;
    private OrderRepository repository;
    private OrderEntity order;
    private final LocalDateTime now=LocalDateTime.of(2026,11,3,10,0);
    @BeforeEach void setup(){
        repository=mock(OrderRepository.class);var rules=mock(CustomerRules.class);when(rules.now()).thenReturn(now);
        var restaurant=new RestaurantEntity();restaurant.setOwnerUserId(2L);
        order=new OrderEntity("TF-TEST",4L,restaurant,"Test","0900000004","Test address",null,PaymentMethodEnum.COD,new BigDecimal("80000"),new BigDecimal("15000"),new BigDecimal("95000"),now);
        order.addPayment("COD","TFTEST",now);
        org.springframework.test.util.ReflectionTestUtils.setField(order,"id",1L);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(order));
        service=new OrderService(repository,mock(RestaurantRepository.class),mock(CartRepository.class),rules,mock(CartService.class),mock(OrderEvents.class),mock(ApplicationEventPublisher.class));
    }
    private void action(OrderStatusEnum target){service.administer(1,"status",order.getOrderStatus(),order.getPaymentStatus(),new OrderStatus(target,"Lý do hợp lệ"));}
    @Test void codOnlySettlesAtCompletion(){
        action(CONFIRMED);action(PREPARING);action(DELIVERING);assertEquals(UNPAID,order.getPaymentStatus());action(COMPLETED);
        assertEquals(PAID,order.getPaymentStatus());assertEquals(now,order.getCompletedAt());
    }
    @Test void rejectsSkippingAndReopening(){
        assertThrows(BusinessException.class,()->action(COMPLETED));assertEquals(PENDING,order.getOrderStatus());
        action(REJECTED);assertThrows(BusinessException.class,()->action(CONFIRMED));assertEquals(FAILED,order.getPaymentStatus());
    }
    @Test void staleScreenDoesNotChangeOrder(){
        assertThrows(ConcurrentUpdateException.class,()->service.administer(1,"status",CONFIRMED,UNPAID,new OrderStatus(PREPARING,null)));
        assertEquals(PENDING,order.getOrderStatus());
    }
    @Test void paidRejectionRequiresExplicitRefund(){
        order.settle(PAID,PaymentRecordStatusEnum.SUCCESS,"MANUAL",now);action(REJECTED);assertEquals(PAID,order.getPaymentStatus());
        service.administer(1,"refund",REJECTED,PAID,null);assertEquals(REFUNDED,order.getPaymentStatus());
        assertThrows(BusinessException.class,()->service.administer(1,"refund",REJECTED,REFUNDED,null));
    }
    @Test void rejectsPrematureRefundAndInvalidPaymentConfirmation(){
        assertThrows(BusinessException.class,()->service.administer(1,"refund",PENDING,UNPAID,null));
        assertThrows(BusinessException.class,()->service.administer(1,"confirm-payment",PENDING,UNPAID,null));
    }
    @Test void rangesIncludeLeapDayAndHaveEqualPreviousPeriods(){
        var range=new AdminQueryService.Range(LocalDate.of(2024,2,28),LocalDate.of(2024,3,1));
        assertEquals(LocalDate.of(2024,2,25),range.previous().from());assertEquals(LocalDate.of(2024,2,27),range.previous().to());
        assertEquals(LocalDateTime.of(2024,3,2,0,0),range.params().get("until"));
    }
    @Test void rejectsInvalidOrUnboundedRanges(){
        assertThrows(BusinessException.class,()->new AdminQueryService.Range(LocalDate.of(2026,11,3),LocalDate.of(2026,11,2)));
        assertThrows(BusinessException.class,()->new AdminQueryService.Range(LocalDate.of(2000,1,1),LocalDate.of(2026,1,1)));
    }
}
