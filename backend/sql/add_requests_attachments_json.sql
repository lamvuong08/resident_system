-- Chạy thủ công trên DB qlydancu khi dùng spring.jpa.hibernate.ddl-auto=none
ALTER TABLE requests ADD COLUMN attachments_json LONGTEXT NULL;
