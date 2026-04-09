package com.dancu.qlydancu.dto;

public class AuthResponses {
    public static class AuthResponse {
        public String token;
        public String email;
        public String role;
        public String name;

        public AuthResponse() {}

        public AuthResponse(String token, String email) {
            this.token = token;
            this.email = email;
        }

        public AuthResponse(String token, String email, String role) {
            this.token = token;
            this.email = email;
            this.role = role;
        }

        public AuthResponse(String token, String email, String role, String name) {
            this.token = token;
            this.email = email;
            this.role = role;
            this.name = name;
        }
    }
}
