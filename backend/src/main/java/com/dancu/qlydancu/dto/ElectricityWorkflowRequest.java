package com.dancu.qlydancu.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public final class ElectricityWorkflowRequest {
    private ElectricityWorkflowRequest() {}
    public record Item(@NotNull @Positive Long id,@NotNull @PositiveOrZero Long version) {}
    public record Batch(@NotEmpty @Size(max=200) List<@NotNull @Valid Item> items,LocalDate dueDate) {}
    public record Rejection(@NotNull @PositiveOrZero Long version,@NotBlank @Size(max=1000) String reason) {}
    public record Result(long id,boolean success,boolean alreadyIssued,Long billId,String message) {}
    public record BatchResult(int succeeded,int failed,List<Result> results) {
        public static BatchResult of(List<Result> rows) {int ok=(int)rows.stream().filter(Result::success).count();return new BatchResult(ok,rows.size()-ok,rows);}
    }
}
