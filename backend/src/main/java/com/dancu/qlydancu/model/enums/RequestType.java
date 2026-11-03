package com.dancu.qlydancu.model.enums;

public enum RequestType {
    REPAIR("Sửa chữa"),
    COMPLAINT("Khiếu nại"),
    SUPPORT("Hỗ trợ");

    private final String displayName;

    RequestType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
