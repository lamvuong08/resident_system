package com.dancu.qlydancu.dto;

public class AuthRequests {

    public static class RegisterRequest {
        public String name;
        public String email;
        public String password;
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class ForgotRequest {
        public String email;
    }

    public static class ResetRequest {
        public String token; 
        public String email;
        public String otp;
        public String newPassword;
    }

    public static class SendOtpRequest {
        public String email;
        public String name; 
        public String purpose; 
    }

    public static class ConfirmRegisterRequest {
        public String name;
        public String email;
        public String password;
        public String otp;
    }
}
