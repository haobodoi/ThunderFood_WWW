package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.*;
import vn.edu.iuh.fit.thunderfood.dto.AdminRequests.*;
import vn.edu.iuh.fit.thunderfood.enums.*;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.*;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Service
@Transactional
public class AdminManagementService {
    private final AdminAuditService audit;
    private final OrderService orders;
    private final PartnerMenuService menu;
    private final RestaurantRepository restaurants;
    private final MenuItemRepository items;
    private final MenuCategoryRepository categories;
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwords;
    private final JdbcTemplate jdbc;
    private final CustomerRules rules;
    public AdminManagementService(AdminAuditService audit,OrderService orders,PartnerMenuService menu,RestaurantRepository restaurants,MenuItemRepository items,MenuCategoryRepository categories,UserRepository users,RoleRepository roles,PasswordEncoder passwords,JdbcTemplate jdbc,CustomerRules rules) {
        this.audit=audit;this.orders=orders;this.menu=menu;this.restaurants=restaurants;this.items=items;this.categories=categories;this.users=users;this.roles=roles;this.passwords=passwords;this.jdbc=jdbc;this.rules=rules;
    }
    public void order(long actor,long id,String action,OrderAction request) {
        if(action.equals("status")&&request.status()==null)throw new BusinessException("Vui lòng chọn trạng thái mới");
        orders.administer(id,action,request.expectedStatus(),request.expectedPayment(),new CustomerRequests.OrderStatus(request.status(),request.reason()));
        audit.record(actor,"ORDER_"+action,"order:"+id,request.expectedStatus()+" → "+(request.status()==null?action:request.status())+"; "+CustomerRules.text(request.reason(),0,500));
    }
    public void note(long actor,long id,String reason) {
        if(!ordersExist(id))throw new ResourceNotFoundException("Không tìm thấy đơn hàng");
        audit.record(actor,"ORDER_NOTE","order:"+id,CustomerRules.text(reason,5,500));
    }
    private boolean ordersExist(long id){return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM orders WHERE order_id=?)",Boolean.class,id));}
    private long owner(long id){return restaurants.findById(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy quán")).getOwnerUserId();}
    public Object item(long actor,long restaurant,Long id,MenuItemRequestDto request) {
        validateImage(request.imageUrl());
        var result=id==null?menu.createItem(owner(restaurant),restaurant,request):menu.updateItem(owner(restaurant),restaurant,id,request);
        audit.record(actor,id==null?"ITEM_CREATE":"ITEM_UPDATE","item:"+result.id(),result.itemName());
        return result;
    }
    private static void validateImage(String url){
        if(url==null||url.isBlank())return;
        if(!url.startsWith("/uploads/public/")&&!url.matches("https?://[^\\s]+"))throw new BusinessException("Ảnh phải là URL http/https hoặc ảnh tải lên hệ thống");
    }
    public void removeItem(long actor,long restaurant,long id){menu.deleteItem(owner(restaurant),restaurant,id);audit.record(actor,"ITEM_DELETE","item:"+id,"Xóa mềm; giữ dữ liệu đơn hàng");}
    public void itemVisible(long actor,long restaurant,long id,boolean visible){
        owner(restaurant);
        var item=items.findByIdAndRestaurantIdAndDeletedFalse(id,restaurant).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy món"));
        item.setApprovalStatus(visible?ApprovalStatusEnum.APPROVED:ApprovalStatusEnum.HIDDEN);
        audit.record(actor,"ITEM_VISIBILITY","item:"+id,visible?"Hiển thị":"Ẩn khỏi thực đơn");
    }
    public Object category(long actor,long restaurant,Long id,MenuCategoryRequestDto request){
        if(request.displayOrder()!=null&&request.displayOrder()<0)throw new BusinessException("Thứ tự phải không âm");
        var result=id==null?menu.createCategory(owner(restaurant),restaurant,request):menu.updateCategory(owner(restaurant),restaurant,id,request);
        audit.record(actor,id==null?"CATEGORY_CREATE":"CATEGORY_UPDATE","category:"+result.id(),result.categoryName());return result;
    }
    public void categoryVisible(long actor,long restaurant,long id,boolean visible){
        var cat=categories.findByIdAndRestaurantId(id,restaurant).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy danh mục"));
        cat.setVisible(visible);audit.record(actor,"CATEGORY_VISIBILITY","category:"+id,visible?"Hiển thị":"Ẩn danh mục và các món trong danh mục");
    }
    public void removeCategory(long actor,long restaurant,long id){
        if(items.countByCategoryIdAndDeletedFalse(id)>0)throw new BusinessException("Chuyển hoặc xóa các món trong danh mục trước khi xóa; có thể ẩn danh mục");
        menu.deleteCategory(owner(restaurant),restaurant,id);audit.record(actor,"CATEGORY_DELETE","category:"+id,"Xóa danh mục rỗng");
    }
    public void access(long actor,long id,UserAccess request){
        if(actor==id)throw new BusinessException("Không được thay đổi quyền hoặc khóa tài khoản đang sử dụng");
        // Serialize changes to administrators, including the last-admin invariant.
        jdbc.queryForList("SELECT u.user_id FROM users u JOIN roles r ON r.role_id=u.role_id WHERE r.role_code='ADMIN' ORDER BY u.user_id FOR UPDATE");
        var user=users.findWithLockById(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy người dùng"));
        String before=user.getRole().getRoleCode();
        if(!before.equals(request.role())&&(!Set.of("ADMIN","STAFF").contains(before)||!Set.of("ADMIN","STAFF").contains(request.role())))throw new BusinessException("Chỉ thay đổi vai trò giữa nhân viên và quản trị viên; giữ vai trò khách/đối tác để bảo vệ dữ liệu");
        if(before.equals("ADMIN")&&(!request.role().equals("ADMIN")||request.status().equals("LOCKED"))){
            int active=jdbc.queryForObject("SELECT COUNT(*) FROM users u JOIN roles r ON r.role_id=u.role_id WHERE r.role_code='ADMIN' AND u.account_status='ACTIVE'",Integer.class);
            if(user.getAccountStatus()==AccountStatusEnum.ACTIVE&&active<=1)throw new BusinessException("Phải giữ ít nhất một quản trị viên đang hoạt động");
        }
        user.setRole(roles.findByRoleCode(request.role()).orElseThrow(()->new BusinessException("Vai trò chưa được cài đặt; chạy migration V5")));
        user.setAccountStatus(AccountStatusEnum.valueOf(request.status()));
        String reason=CustomerRules.text(request.reason(),5,500);
        user.setLockReason(request.status().equals("LOCKED")?reason:null);
        user.setLockedBy(request.status().equals("LOCKED")?actor:null);user.setLockedAt(request.status().equals("LOCKED")?rules.now():null);
        audit.record(actor,"USER_ACCESS","user:"+id,before+" → "+request.role()+"; "+request.status()+"; "+reason);
    }
    public long staff(long actor,Staff request){
        String email=InputNormalizerUtil.email(request.email()),phone=InputNormalizerUtil.phone(request.phone());
        if(users.existsByEmail(email)||users.existsByPhone(phone))throw new BusinessException("Email hoặc số điện thoại đã tồn tại");
        if(request.password().getBytes(StandardCharsets.UTF_8).length>72)throw new BusinessException("Mật khẩu tối đa 72 byte UTF-8");
        var user=new vn.edu.iuh.fit.thunderfood.entity.UserEntity();
        user.setFullName(CustomerRules.text(request.fullName(),2,120));user.setEmail(email);user.setPhone(phone);
        user.setRole(roles.findByRoleCode(request.role()).orElseThrow(()->new BusinessException("Chưa có vai trò; chạy migration V5")));
        user.setPasswordHash(passwords.encode(request.password()));users.saveAndFlush(user);
        audit.record(actor,"STAFF_CREATE","user:"+user.getId(),"Tạo tài khoản "+request.role());return user.getId();
    }
    public void store(long actor,long id,Store request){
        var restaurant=restaurants.findById(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy quán"));
        menu.updateOpenStatus(restaurant.getOwnerUserId(),id,request.open());restaurant.setDeliveryFee(request.deliveryFee());
        audit.record(actor,"STORE_UPDATE","restaurant:"+id,"Phí giao: "+request.deliveryFee()+" VND; mở nhận đơn: "+request.open());
    }
    public void complaint(long actor,long id,Complaint request){
        var rows=jdbc.queryForList("SELECT complaint_status FROM complaints WHERE complaint_id=? FOR UPDATE",id);
        if(rows.isEmpty())throw new ResourceNotFoundException("Không tìm thấy phản hồi");
        String before=rows.getFirst().get("complaint_status").toString();
        if(Set.of("RESOLVED","REJECTED").contains(before))throw new BusinessException("Phản hồi đã kết thúc xử lý");
        String response=CustomerRules.text(request.response(),5,2000);
        jdbc.update("UPDATE complaints SET complaint_status=?,response=?,handled_by=? WHERE complaint_id=?",request.status(),response,actor,id);
        audit.record(actor,"COMPLAINT_UPDATE","complaint:"+id,before+" → "+request.status());
    }
}
