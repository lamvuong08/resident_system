package com.dancu.qlydancu.dto;

public class UserEmailRequests {

    public static class SendOtpRequest {
        public String newEmail;
    }

    public static class VerifyOtpRequest {
        public String newEmail;
        public String otp;
    }

    public static class UpdateEmailRequest {
        public String newEmail;
        public String otp;
    }
}
