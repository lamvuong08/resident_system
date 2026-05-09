package com.dancu.qlydancu.service;

import org.springframework.core.io.Resource;

public record UserRequestAttachmentPayload(Resource resource, String contentType, String originalName) {}
