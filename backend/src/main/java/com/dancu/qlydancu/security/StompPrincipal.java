package com.dancu.qlydancu.security;

import java.security.Principal;

public class StompPrincipal implements Principal {

    private final String name; // Holds userId as string
    private final String email;

    public StompPrincipal(String userId, String email) {
        this.name = userId;
        this.email = email;
    }

    @Override
    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }
}
