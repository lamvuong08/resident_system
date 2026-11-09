package com.dancu.qlydancu.billing;

import java.security.Principal;
import java.util.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** ADMIN authorization comes from /api/admin/** in SecurityConfig. Records evidence; never operates devices. */
@RestController
@BillingReminderEnabled
@RequestMapping("/api/admin/utility-services")
public class ServiceSuspensionController {
    private final ServiceSuspensionService service;
    private final ServiceSuspensionRepository repository;
    public ServiceSuspensionController(ServiceSuspensionService service,ServiceSuspensionRepository repository) { this.service=service;this.repository=repository; }
    @GetMapping("/apartments/{id}")
    public List<ServiceSuspensionRepository.State> states(@PathVariable long id) { return repository.states(id); }
    @GetMapping("/pending")
    public List<Map<String,Object>> pending(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        if(page<0||page>100000||size<1||size>100)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Phân trang không hợp lệ");
        return repository.pending(page*size,size);
    }
    @GetMapping("/events/{id}")
    public ServiceSuspensionRepository.Event event(@PathVariable long id) {
        return repository.event(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy sự kiện"));
    }
    @PostMapping("/bills/{id}/confirm-suspension")
    public ServiceSuspensionRepository.Event suspend(@PathVariable long id,@Valid @RequestBody ServiceSuspensionService.Confirmation request,Principal principal) {
        return service.confirm(id,request,principal.getName(),false);
    }
    @PostMapping("/bills/{id}/confirm-restoration")
    public ServiceSuspensionRepository.Event restore(@PathVariable long id,@Valid @RequestBody ServiceSuspensionService.Confirmation request,Principal principal) {
        return service.confirm(id,request,principal.getName(),true);
    }
}
