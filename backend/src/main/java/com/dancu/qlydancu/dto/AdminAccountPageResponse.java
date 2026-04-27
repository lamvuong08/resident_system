package com.dancu.qlydancu.dto;

import java.util.List;

public class AdminAccountPageResponse {
    public List<AdminAccountResponse> items;
    public int page;
    public int size;
    public long totalItems;
    public int totalPages;
    public AccountStats stats;

    public static class AccountStats {
        public long totalAccounts;
        public long adminAccounts;
        public long residentAccounts;
    }
}
