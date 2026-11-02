package com.dancu.qlydancu.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.dancu.qlydancu.dto.ApartmentMeterReadingResponse;
import com.dancu.qlydancu.dto.MeterReadingRequest;
import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.FeeType;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.MeterReading;
import com.dancu.qlydancu.model.MeterTariff;
import com.dancu.qlydancu.model.MeterType;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.model.enums.FeeTypeCode;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.BillDetailRepository;
import com.dancu.qlydancu.repo.BillRepository;
import com.dancu.qlydancu.repo.FeeTypeRepository;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.MeterReadingRepository;
import com.dancu.qlydancu.repo.MeterTariffRepository;
import com.dancu.qlydancu.repo.MeterTypeRepository;
import com.dancu.qlydancu.repo.ResidentRepository;

@Service
public class MeterReadingService {

    @Autowired private MeterReadingRepository meterReadingRepository;
    @Autowired private MeterTariffRepository meterTariffRepository;
    @Autowired private MeterTypeRepository meterTypeRepository;
    @Autowired private ApartmentRepository apartmentRepository;
    @Autowired private BillRepository billRepository;
    @Autowired private BillDetailRepository billDetailRepository;
    @Autowired private FeeTypeRepository feeTypeRepository;
    @Autowired private BillService billService;
    @Autowired private HouseholdRepository householdRepository;
    @Autowired private ResidentRepository residentRepository;

    /**
     * Parse billing_month string (accepts "MM/YYYY" hoặc "YYYY-MM") thành YearMonth
     * để so sánh thứ tự thời gian chính xác.
     */
    private Optional<YearMonth> parseBillingMonth(String billingMonth) {
        if (billingMonth == null || billingMonth.isBlank()) return Optional.empty();
        try {
            // Thử định dạng "MM/YYYY"
            return Optional.of(YearMonth.parse(billingMonth.trim(), DateTimeFormatter.ofPattern("MM/yyyy")));
        } catch (DateTimeParseException e1) {
            try {
                // Thử định dạng "YYYY-MM"
                return Optional.of(YearMonth.parse(billingMonth.trim(), DateTimeFormatter.ofPattern("yyyy-MM")));
            } catch (DateTimeParseException e2) {
                return Optional.empty();
            }
        }
    }

    /**
     * Tìm bản ghi ghi điện của tháng liền trước (theo thứ tự thời gian thực, không phải createdAt)
     * so với targetMonth. Tránh lỗi khi database có nhiều định dạng billing_month khác nhau.
     */
    private MeterReading findPreviousMonthReading(Long apartmentId, Long meterTypeId, String targetMonth) {
        Optional<YearMonth> targetYM = parseBillingMonth(targetMonth);
        List<MeterReading> allReadings = meterReadingRepository
            .findByApartmentIdAndMeterTypeId(apartmentId, meterTypeId);
        return allReadings.stream()
            .filter(r -> {
                Optional<YearMonth> ym = parseBillingMonth(r.getBillingMonth());
                if (!ym.isPresent()) return false;
                // Loại trừ chính tháng hiện tại
                if (targetYM.isPresent() && ym.get().equals(targetYM.get())) return false;
                // Chỉ lấy các tháng trước tháng hiện tại
                return !targetYM.isPresent() || ym.get().isBefore(targetYM.get());
            })
            .max(Comparator.comparing(r -> parseBillingMonth(r.getBillingMonth()).orElse(YearMonth.of(1900, 1))))
            .orElse(null);
    }

    /**
     * Tìm bản ghi ghi điện của tháng liền sau (theo thứ tự thời gian thực)
     * so với targetMonth để kiểm tra tính nhất quán (chỉ số tháng này không được lớn hơn tháng sau).
     */
    private MeterReading findNextMonthReading(Long apartmentId, Long meterTypeId, String targetMonth) {
        Optional<YearMonth> targetYM = parseBillingMonth(targetMonth);
        if (!targetYM.isPresent()) return null;
        List<MeterReading> allReadings = meterReadingRepository
            .findByApartmentIdAndMeterTypeId(apartmentId, meterTypeId);
        return allReadings.stream()
            .filter(r -> {
                Optional<YearMonth> ym = parseBillingMonth(r.getBillingMonth());
                return ym.isPresent() && ym.get().isAfter(targetYM.get());
            })
            .min(Comparator.comparing(r -> parseBillingMonth(r.getBillingMonth()).orElse(YearMonth.of(3000, 1))))
            .orElse(null);
    }

    public MeterType resolveElectricMeterType(Long meterTypeId) {
        if (meterTypeId != null) {
            return meterTypeRepository.findById(meterTypeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy loại đồng hồ ID: " + meterTypeId));
        }
        return meterTypeRepository.findAll().stream()
            .filter(m -> (m.getName() != null && m.getName().toLowerCase().contains("điện")) || "kwh".equalsIgnoreCase(m.getUnit()))
            .findFirst()
            .orElseGet(() -> {
                List<MeterType> all = meterTypeRepository.findAll();
                if (all.isEmpty()) {
                    throw new RuntimeException("Chưa cấu hình loại đồng hồ điện trong hệ thống.");
                }
                return all.get(0);
            });
    }

    public List<ApartmentMeterReadingResponse> getApartmentsForMeterReading(Long buildingId, Integer floor, String billingMonth) {
        String targetMonth = (billingMonth != null && !billingMonth.trim().isEmpty())
            ? billingMonth.trim()
            : LocalDate.now().format(DateTimeFormatter.ofPattern("MM/yyyy"));

        List<Apartment> apartments;
        if (buildingId != null && floor != null) {
            apartments = apartmentRepository.findByBuilding_IdAndFloorNumber(buildingId, floor);
        } else if (buildingId != null) {
            apartments = apartmentRepository.findByBuilding_Id(buildingId);
        } else if (floor != null) {
            apartments = apartmentRepository.findByFloorNumber(floor);
        } else {
            apartments = apartmentRepository.findAll();
        }

        MeterType electricType = resolveElectricMeterType(null);
        List<MeterTariff> tariffs = meterTariffRepository.findByMeterTypeIdOrderByMinUsageAsc(electricType.getId());

        List<ApartmentMeterReadingResponse> result = new ArrayList<>();

        for (Apartment apt : apartments) {
            ApartmentMeterReadingResponse res = new ApartmentMeterReadingResponse();
            res.setApartmentId(apt.getId());
            res.setApartmentCode(apt.getCode());
            if (apt.getBuilding() != null) {
                res.setBuildingId(apt.getBuilding().getId());
                res.setBuildingCode(apt.getBuilding().getCode());
                res.setBuildingName(apt.getBuilding().getName());
            }
            res.setFloorNumber(apt.getFloorNumber());

            // Tìm thông tin chủ hộ thực tế từ cư dân hoặc tài khoản chủ hộ
            String ownerName = apt.getOwnerName();
            if (ownerName == null || ownerName.isBlank()) {
                ownerName = residentRepository.findOwnerNameByApartmentCode(apt.getCode());
            }
            if (ownerName == null || ownerName.isBlank()) {
                Household h = householdRepository.findByApartment_Code(apt.getCode()).orElse(null);
                if (h != null) {
                    if (h.getUser() != null && h.getUser().getName() != null && !h.getUser().getName().isBlank()) {
                        ownerName = h.getUser().getName();
                    } else {
                        List<Resident> resList = residentRepository.findByHouseholdId(h.getId());
                        if (resList != null && !resList.isEmpty()) {
                            ownerName = resList.get(0).getName();
                        }
                    }
                }
            }
            res.setOwnerName(ownerName != null && !ownerName.isBlank() ? ownerName : null);
            res.setMeterTypeId(electricType.getId());
            res.setMeterTypeName(electricType.getName());
            res.setBillingMonth(targetMonth);

            // Kiểm tra trạng thái hóa đơn
            Bill bill = billRepository.findByApartmentIdAndBillingMonth(apt.getId(), targetMonth).orElse(null);
            if (bill != null) {
                res.setBillStatus(bill.getStatus() != null ? bill.getStatus().name() : "UNPAID");
                res.setIsLocked(bill.getStatus() == BillDetailStatus.PAID);
            } else {
                res.setBillStatus("UNPAID");
                res.setIsLocked(false);
            }

            // Kiểm tra xem kỳ này đã ghi chưa
            MeterReading currentReading = meterReadingRepository
                .findFirstByApartmentIdAndMeterTypeIdAndBillingMonth(apt.getId(), electricType.getId(), targetMonth)
                .orElse(null);

            // Tìm tháng liền trước theo thứ tự thời gian thực (không phải createdAt)
            MeterReading lastReading = findPreviousMonthReading(apt.getId(), electricType.getId(), targetMonth);
            BigDecimal previousNewReading = (lastReading != null && lastReading.getNewReading() != null)
                ? lastReading.getNewReading()
                : null;

            if (currentReading != null) {
                // Nếu kỳ liền trước có chỉ số mới và hóa đơn tháng hiện tại chưa thanh toán, ưu tiên lấy chỉ số mới kỳ trước
                BigDecimal effectiveOldReading = (previousNewReading != null && !res.getIsLocked())
                    ? previousNewReading
                    : (currentReading.getOldReading() != null ? currentReading.getOldReading() : BigDecimal.ZERO);

                BigDecimal effectiveUsage = (currentReading.getNewReading() != null && currentReading.getNewReading().compareTo(effectiveOldReading) >= 0)
                    ? currentReading.getNewReading().subtract(effectiveOldReading)
                    : (currentReading.getUsageAmount() != null ? currentReading.getUsageAmount() : BigDecimal.ZERO);

                res.setOldReading(effectiveOldReading);
                res.setNewReading(currentReading.getNewReading());
                res.setUsageAmount(effectiveUsage);
                res.setCalculatedAmount(calculateTieredAmount(effectiveUsage, tariffs));
                res.setRecordedStatus("RECORDED");
                res.setRecordedAt(currentReading.getCreatedAt());
            } else {
                BigDecimal oldReading = (previousNewReading != null) ? previousNewReading : BigDecimal.ZERO;
                res.setOldReading(oldReading);
                res.setNewReading(null);
                res.setUsageAmount(null);
                res.setCalculatedAmount(0L);
                res.setRecordedStatus("NOT_RECORDED");
                res.setRecordedAt(null);
            }

            result.add(res);
        }

        result.sort(Comparator.comparing(ApartmentMeterReadingResponse::getApartmentCode));
        return result;
    }

    public Long previewCalculateBill(MeterReadingRequest request) {
        if (request.getApartmentId() == null) {
            throw new RuntimeException("Thiếu apartmentId");
        }
        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy căn hộ"));
            
        MeterType meterType = resolveElectricMeterType(request.getMeterTypeId());

        String targetMonth = (request.getBillingMonth() != null && !request.getBillingMonth().isBlank())
            ? request.getBillingMonth().trim()
            : LocalDate.now().format(DateTimeFormatter.ofPattern("MM/yyyy"));

        MeterReading currentReading = meterReadingRepository
            .findFirstByApartmentIdAndMeterTypeIdAndBillingMonth(apartment.getId(), meterType.getId(), targetMonth)
            .orElse(null);

        MeterReading lastReading = findPreviousMonthReading(apartment.getId(), meterType.getId(), targetMonth);
        BigDecimal oldReading = (lastReading != null && lastReading.getNewReading() != null)
            ? lastReading.getNewReading()
            : ((currentReading != null && currentReading.getOldReading() != null) ? currentReading.getOldReading() : BigDecimal.ZERO);

        BigDecimal newReading = request.getNewReading();
        if (newReading == null) {
            throw new RuntimeException("Chỉ số mới không được để trống");
        }
        if (newReading.compareTo(oldReading) < 0) {
            throw new RuntimeException("Chỉ số mới (" + newReading + ") không được nhỏ hơn chỉ số cũ (" + oldReading + ")");
        }

        MeterReading nextReading = findNextMonthReading(apartment.getId(), meterType.getId(), targetMonth);
        if (nextReading != null && nextReading.getNewReading() != null && newReading.compareTo(nextReading.getNewReading()) > 0) {
            throw new RuntimeException("Chỉ số mới (" + newReading + ") không được lớn hơn chỉ số của tháng sau (" 
                + nextReading.getBillingMonth() + ": " + nextReading.getNewReading() + ")");
        }

        BigDecimal usageAmount = newReading.subtract(oldReading);
        List<MeterTariff> tariffs = meterTariffRepository.findByMeterTypeIdOrderByMinUsageAsc(meterType.getId());
        return calculateTieredAmount(usageAmount, tariffs);
    }

    @Transactional
    public void recordAndCalculateBill(MeterReadingRequest request) {
        if (request.getApartmentId() == null) {
            throw new RuntimeException("Thiếu thông tin căn hộ.");
        }
        if (request.getNewReading() == null) {
            throw new RuntimeException("Vui lòng nhập chỉ số điện mới.");
        }
        if (request.getBillingMonth() == null || request.getBillingMonth().trim().isEmpty()) {
            throw new RuntimeException("Vui lòng chọn kỳ ghi điện (tháng/năm).");
        }

        String billingMonth = request.getBillingMonth().trim();

        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy căn hộ"));
            
        MeterType meterType = resolveElectricMeterType(request.getMeterTypeId());

        Bill bill = billService.getOrCreateBill(apartment, billingMonth);
        if (bill.getStatus() == BillDetailStatus.PAID) {
            throw new RuntimeException("Hóa đơn tháng " + billingMonth + " của căn hộ " + apartment.getCode() + " đã được thanh toán, không thể thay đổi chỉ số.");
        }

        // Lấy chỉ số cũ từ kỳ liền trước (nếu có), hoặc từ bản ghi hiện tại
        MeterReading currentReading = meterReadingRepository
            .findFirstByApartmentIdAndMeterTypeIdAndBillingMonth(apartment.getId(), meterType.getId(), billingMonth)
            .orElse(null);

        MeterReading lastReading = findPreviousMonthReading(apartment.getId(), meterType.getId(), billingMonth);
        BigDecimal oldReading = (lastReading != null && lastReading.getNewReading() != null)
            ? lastReading.getNewReading()
            : ((currentReading != null && currentReading.getOldReading() != null) ? currentReading.getOldReading() : BigDecimal.ZERO);

        BigDecimal newReading = request.getNewReading();
        if (newReading.compareTo(oldReading) < 0) {
            throw new RuntimeException("Chỉ số mới (" + newReading + ") không được nhỏ hơn chỉ số cũ (" + oldReading + ")");
        }

        // Kiểm tra tính nhất quán với tháng liền sau
        MeterReading nextReading = findNextMonthReading(apartment.getId(), meterType.getId(), billingMonth);
        if (nextReading != null && nextReading.getNewReading() != null && newReading.compareTo(nextReading.getNewReading()) > 0) {
            throw new RuntimeException("Chỉ số mới (" + newReading + ") không được lớn hơn chỉ số của tháng sau (" 
                + nextReading.getBillingMonth() + ": " + nextReading.getNewReading() + ")");
        }

        BigDecimal usageAmount = newReading.subtract(oldReading);

        // Lưu / cập nhật MeterReading
        MeterReading reading = (currentReading != null) ? currentReading : new MeterReading();
        reading.setApartment(apartment);
        reading.setMeterType(meterType);
        reading.setBillingMonth(billingMonth);
        reading.setOldReading(oldReading);
        reading.setNewReading(newReading);
        reading.setUsageAmount(usageAmount);
        meterReadingRepository.save(reading);

        List<MeterTariff> tariffs = meterTariffRepository.findByMeterTypeIdOrderByMinUsageAsc(meterType.getId());
        long calculatedAmount = calculateTieredAmount(usageAmount, tariffs);

        FeeTypeCode feeCode = FeeTypeCode.ELECTRIC;
        FeeType feeType = feeTypeRepository.findByCode(feeCode)
            .orElseThrow(() -> new RuntimeException("Chưa cấu hình loại phí cho: " + feeCode));

        BillDetail detail = billDetailRepository.findByBillIdAndFeeTypeId(bill.getId(), feeType.getId())
            .orElseGet(() -> {
                BillDetail newDetail = new BillDetail();
                newDetail.setBill(bill);
                newDetail.setFeeType(feeType);
                newDetail.setStatus(BillDetailStatus.UNPAID);
                newDetail.setDueDate(LocalDateTime.now().plusDays(15)); 
                return newDetail;
            });

        long oldDetailAmount = (detail.getAmount() != null) ? detail.getAmount() : 0L;
        
        detail.setOldReading(oldReading);
        detail.setNewReading(newReading);
        detail.setQuantity(usageAmount);
        detail.setAmount(calculatedAmount);
        detail.setUnitPrice(usageAmount.compareTo(BigDecimal.ZERO) == 0 ? 0L : calculatedAmount / (usageAmount.longValue() == 0 ? 1 : usageAmount.longValue())); 
        detail.setNote("Tiền điện tiêu thụ " + usageAmount + " kWh (kỳ " + billingMonth + ")");
        billDetailRepository.save(detail);

        long currentTotal = (bill.getTotalAmount() != null) ? bill.getTotalAmount() : 0L;
        bill.setTotalAmount(Math.max(0L, currentTotal - oldDetailAmount + calculatedAmount));
        billRepository.save(bill);

        // Tự động đồng bộ lại chỉ số cũ của tháng liền sau nếu tháng sau chưa thanh toán
        if (nextReading != null && nextReading.getNewReading() != null) {
            Bill nextBill = billRepository.findByApartmentIdAndBillingMonth(apartment.getId(), nextReading.getBillingMonth()).orElse(null);
            if (nextBill == null || nextBill.getStatus() != BillDetailStatus.PAID) {
                nextReading.setOldReading(newReading);
                BigDecimal nextUsage = nextReading.getNewReading().subtract(newReading);
                nextReading.setUsageAmount(nextUsage);
                meterReadingRepository.save(nextReading);

                if (nextBill != null) {
                    BillDetail nextDetail = billDetailRepository.findByBillIdAndFeeTypeId(nextBill.getId(), feeType.getId()).orElse(null);
                    if (nextDetail != null) {
                        long oldNextAmount = (nextDetail.getAmount() != null) ? nextDetail.getAmount() : 0L;
                        long newNextAmount = calculateTieredAmount(nextUsage, tariffs);
                        nextDetail.setOldReading(newReading);
                        nextDetail.setQuantity(nextUsage);
                        nextDetail.setAmount(newNextAmount);
                        nextDetail.setNote("Tiền điện tiêu thụ " + nextUsage + " kWh (kỳ " + nextReading.getBillingMonth() + ")");
                        billDetailRepository.save(nextDetail);

                        long nextCurrentTotal = (nextBill.getTotalAmount() != null) ? nextBill.getTotalAmount() : 0L;
                        nextBill.setTotalAmount(Math.max(0L, nextCurrentTotal - oldNextAmount + newNextAmount));
                        billRepository.save(nextBill);
                    }
                }
            }
        }
    }

    private long calculateTieredAmount(BigDecimal usage, List<MeterTariff> tariffs) {
        if (usage == null || usage.compareTo(BigDecimal.ZERO) <= 0) {
            return 0L;
        }
        long totalAmount = 0L;
        BigDecimal remainingUsage = usage;

        for (MeterTariff tariff : tariffs) {
            if (remainingUsage.compareTo(BigDecimal.ZERO) <= 0) break;

            Integer min = tariff.getMinUsage();
            Integer max = tariff.getMaxUsage();

            BigDecimal tierCapacity = (max != null) 
                ? new BigDecimal(max - min + 1) 
                : new BigDecimal(Integer.MAX_VALUE);

            BigDecimal usageInTier;
            if (remainingUsage.compareTo(tierCapacity) > 0) {
                usageInTier = tierCapacity;
            } else {
                usageInTier = remainingUsage;
            }

            totalAmount += usageInTier.multiply(new BigDecimal(tariff.getUnitPrice())).longValue();
            remainingUsage = remainingUsage.subtract(usageInTier);
        }

        return totalAmount;
    }
}