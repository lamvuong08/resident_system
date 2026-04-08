package com.dancu.qlydancu.dto;

public class AuthResponses {
    public static class AuthResponse {
        public String token;
        public String email;

        public AuthResponse() {}

        public AuthResponse(String token, String email) {
            this.token = token;
            this.email = email;
        }
    }
}
