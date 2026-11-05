package com.dancu.qlydancu.security;

import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.UserStatus;
import com.dancu.qlydancu.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthChannelInterceptor.class);

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public WebSocketAuthChannelInterceptor(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            authenticateConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            authorizeSubscribe(accessor);
        } else if (StompCommand.SEND.equals(command)) {
            authorizeSend(accessor);
        }

        return message;
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            authHeader = accessor.getFirstNativeHeader("token");
            if (authHeader != null && !authHeader.startsWith("Bearer ")) {
                authHeader = "Bearer " + authHeader;
            }
        }

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("STOMP CONNECT rejected: Missing or invalid Authorization header");
            throw new AccessDeniedException("Thiếu token xác thực");
        }

        String token = authHeader.substring(7).trim();
        if (!jwtUtil.validateToken(token)) {
            log.warn("STOMP CONNECT rejected: Token validation failed");
            throw new AccessDeniedException("Token không hợp lệ hoặc đã hết hạn");
        }

        String email = jwtUtil.getEmailFromToken(token);
        if (email == null || email.isBlank()) {
            throw new AccessDeniedException("Token không chứa email hợp lệ");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy người dùng"));

        if (user.getStatus() == UserStatus.BLOCKED) {
            log.warn("STOMP CONNECT rejected: User {} is blocked", user.getId());
            throw new AccessDeniedException("Tài khoản đã bị vô hiệu hóa");
        }

        Principal principal = new StompPrincipal(String.valueOf(user.getId()), user.getEmail());
        accessor.setUser(principal);
        log.info("STOMP client connected successfully for userId={}", user.getId());
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null) {
            throw new AccessDeniedException("Chưa xác thực");
        }

        String destination = accessor.getDestination();
        if ("/user/queue/notifications".equals(destination)) return;
        if ("/user/queue/request-updates".equals(destination)) {
            User user = userRepository.findById(Long.valueOf(principal.getName()))
                    .orElseThrow(() -> new AccessDeniedException("Không tìm thấy tài khoản."));
            if (user.getStatus() != UserStatus.BLOCKED &&
                    (user.getRoles() == com.dancu.qlydancu.model.enums.UserRole.ROLE_ADMIN ||
                     user.getRoles() == com.dancu.qlydancu.model.enums.UserRole.ROLE_STAFF)) return;
        }
        throw new AccessDeniedException("Không có quyền đăng ký destination này.");
    }

    private void authorizeSend(StompHeaderAccessor accessor) {
        // This application mutates requests through authenticated REST, not client STOMP SEND.
        throw new AccessDeniedException("Client không được phép phát sự kiện realtime.");
    }
}
