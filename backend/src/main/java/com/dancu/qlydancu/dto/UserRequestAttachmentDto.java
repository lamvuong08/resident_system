package com.dancu.qlydancu.dto;

public class UserRequestAttachmentDto {
    private String originalName;
    private String storedFileName;
    private String contentType;
    private long sizeBytes;

    public UserRequestAttachmentDto() {}

    public UserRequestAttachmentDto(String originalName, String storedFileName, String contentType, long sizeBytes) {
        this.originalName = originalName;
        this.storedFileName = storedFileName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public String getStoredFileName() {
        return storedFileName;
    }

    public void setStoredFileName(String storedFileName) {
        this.storedFileName = storedFileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }
}
