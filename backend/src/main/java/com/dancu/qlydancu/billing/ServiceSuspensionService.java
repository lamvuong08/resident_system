package com.dancu.qlydancu.billing;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@BillingReminderEnabled
public class ServiceSuspensionService {
    private final ServiceSuspensionRepository repository;
    private final BillingReminderRepository bills;
    private final EmailOutboxService outbox;
    private final BillingReminderProperties settings;
    private final Clock clock;
    private final Environment environment;
    public ServiceSuspensionService(ServiceSuspensionRepository repository,BillingReminderRepository bills,EmailOutboxService outbox,
            BillingReminderProperties settings,@Qualifier("billingReminderClock") Clock clock,Environment environment) {
        this.repository=repository;this.bills=bills;this.outbox=outbox;this.settings=settings;this.clock=clock;this.environment=environment;
    }
    public record Confirmation(@NotNull UUID requestId,@NotEmpty Set<@NotNull UtilityServiceType> services,
        @NotBlank @Size(max=255) String authority,@NotBlank @Size(max=1000) String evidenceRef,
        @NotBlank @Size(max=1000) String basisRef,@NotNull OffsetDateTime confirmedAt) {}

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void review(long billId) {
        bills.lockBill(billId);
        long apartment=repository.apartment(billId);repository.lockApartment(apartment);
        var eligible=repository.overdueServices(billId,outbox.today());
        for(var state:repository.states(apartment)) {
            if(eligible.contains(state.service()) && (state.status()==UtilityServiceStatus.ACTIVE ||
                    state.status()==UtilityServiceStatus.RESTORED && !Objects.equals(state.billId(),billId)))
                repository.saveState(apartment,state.service(),UtilityServiceStatus.PENDING_SUSPENSION,billId,null,outbox.now());
            else if(state.status()==UtilityServiceStatus.PENDING_SUSPENSION && Objects.equals(state.billId(),billId) && !eligible.contains(state.service()))
                repository.saveState(apartment,state.service(),UtilityServiceStatus.ACTIVE,billId,null,outbox.now());
        }
        for(long eventId:repository.unqueuedEvents(billId))outbox.enqueueSuspension(eventId);
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public ServiceSuspensionRepository.Event confirm(long billId,Confirmation request,String actor,boolean restore) {
        if(actor==null||actor.isBlank()||actor.length()>254)throw conflict("Người ghi nhận không hợp lệ");
        boolean simulated=settings.isSimulation();
        var profiles=Set.of(environment.getActiveProfiles());
        if(simulated && (!profiles.contains("dev") || profiles.contains("prod") || profiles.contains("production")))
            throw conflict("Chỉ cho phép xác nhận mô phỏng trong profile dev, không có prod/production");
        // Serialize bill mutations first, then all utility changes for the apartment.
        bills.lockBill(billId);
        long apartment;
        try { apartment=repository.apartment(billId); } catch(org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy hóa đơn");
        }
        repository.lockApartment(apartment);
        String action=restore?"RESTORE":"SUSPEND";
        LocalDateTime actual=request.confirmedAt().atZoneSameInstant(ZoneId.of(settings.getZone())).toLocalDateTime().truncatedTo(ChronoUnit.MICROS);
        var existing=repository.byRequest(request.requestId().toString());
        if(existing.isPresent()) {
            var event=existing.get();
            if(event.billId()!=billId || !event.action().equals(action) || !event.services().equals(request.services()) ||
                !event.authority().equals(request.authority().trim()) || !event.evidenceRef().equals(request.evidenceRef().trim()) ||
                !event.basisRef().equals(request.basisRef().trim()) || !event.confirmedAt().equals(actual) || event.simulated()!=simulated)
                throw conflict("Mã yêu cầu đã được sử dụng cho xác nhận khác");
            return event;
        }
        LocalDateTime localNow=LocalDateTime.now(clock.withZone(ZoneId.of(settings.getZone())));
        if(actual.isAfter(localNow))throw conflict("Thời điểm xác nhận không được ở tương lai");
        if(repository.issuedAt(billId).filter(issued -> !actual.isBefore(issued)).isEmpty())
            throw conflict("Thời điểm xác nhận phải sau khi hóa đơn được phát hành");
        var states=repository.states(apartment);
        if(!restore) {
            var eligible=repository.overdueServices(billId,actual.toLocalDate());
            if(!eligible.containsAll(request.services()) || !repository.overdueServices(billId,outbox.today()).containsAll(request.services()))
                throw conflict("Chỉ ghi nhận tạm ngừng khi khoản phí của đúng dịch vụ còn nợ, quá hạn ít nhất 7 ngày và không chờ duyệt thanh toán");
        }
        for(var type:request.services()) {
            var state=states.stream().filter(s->s.service()==type).findFirst().orElseThrow();
            if(state.eventId()!=null && repository.event(state.eventId()).filter(e->actual.isBefore(e.confirmedAt())).isPresent())
                throw conflict("Thời điểm xác nhận không được trước sự kiện dịch vụ gần nhất");
            if(restore) {
                if(state.status()!=UtilityServiceStatus.SUSPENDED || !Objects.equals(state.billId(),billId))
                    throw conflict("Chỉ khôi phục dịch vụ đã được xác nhận tạm ngừng bởi hóa đơn này");
                var previous=repository.event(state.eventId()).orElseThrow();
                if(actual.isBefore(previous.confirmedAt()))throw conflict("Khôi phục không được trước thời điểm tạm ngừng");
            } else if(state.status()==UtilityServiceStatus.SUSPENDED)
                throw conflict("Dịch vụ đã tạm ngừng; cần xác nhận khôi phục trước khi ghi sự kiện mới");
        }
        long eventId=repository.insert(request.requestId().toString(),billId,apartment,action,request.services(),request.authority().trim(),
            request.evidenceRef().trim(),request.basisRef().trim(),actual,actor,outbox.now(),simulated);
        for(var type:request.services())repository.saveState(apartment,type,restore?UtilityServiceStatus.RESTORED:UtilityServiceStatus.SUSPENDED,billId,eventId,outbox.now());
        if(!restore)outbox.enqueueSuspension(eventId);
        return repository.event(eventId).orElseThrow();
    }
    private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT,message); }
}
