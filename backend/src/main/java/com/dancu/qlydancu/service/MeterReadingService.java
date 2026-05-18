package com.dancu.qlydancu.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.dancu.qlydancu.dto.MeterReadingRequest;
import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.BillDetail;
import com.dancu.qlydancu.model.FeeType;
import com.dancu.qlydancu.model.MeterReading;
import com.dancu.qlydancu.model.MeterTariff;
import com.dancu.qlydancu.model.MeterType;
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.model.enums.FeeTypeCode;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.BillDetailRepository;
import com.dancu.qlydancu.repo.BillRepository;
import com.dancu.qlydancu.repo.FeeTypeRepository;
import com.dancu.qlydancu.repo.MeterReadingRepository;
import com.dancu.qlydancu.repo.MeterTariffRepository;
import com.dancu.qlydancu.repo.MeterTypeRepository;

@Service
public class MeterReadingService {

    @Autowired private MeterReadingRepository meterReadingRepository;
    @Autowired private MeterTariffRepository meterTariffRepository;
    @Autowired private MeterTypeRepository meterTypeRepository;
    @Autowired private ApartmentRepository apartmentRepository;
    @Autowired private BillRepository billRepository;
    @Autowired private BillDetailRepository billDetailRepository;
    @Autowired private FeeTypeRepository feeTypeRepository;

    public Long previewCalculateBill(MeterReadingRequest request) {
        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy căn hộ"));
            
        MeterType meterType = meterTypeRepository.findById(request.getMeterTypeId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy loại đồng hồ"));

        MeterReading lastReading = meterReadingRepository
            .findFirstByApartmentIdAndMeterTypeIdOrderByCreatedAtDesc(apartment.getId(), meterType.getId());
            
        BigDecimal oldReading = (lastReading != null) ? lastReading.getNewReading() : BigDecimal.ZERO;
        BigDecimal newReading = request.getNewReading();

        if (newReading.compareTo(oldReading) < 0) {
            throw new RuntimeException("Chỉ số mới không được nhỏ hơn chỉ số cũ (" + oldReading + ")");
        }

        BigDecimal usageAmount = newReading.subtract(oldReading);

        // Lấy danh sách bậc thang và tính (gọi lại hàm tính bạn đã viết ở bước trước)
        List<MeterTariff> tariffs = meterTariffRepository.findByMeterTypeIdOrderByMinUsageAsc(meterType.getId());
        return calculateTieredAmount(usageAmount, tariffs);
    }

    @Transactional
    public void recordAndCalculateBill(MeterReadingRequest request) {
        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy căn hộ"));
            
        MeterType meterType = meterTypeRepository.findById(request.getMeterTypeId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy loại đồng hồ"));

        // 1. Tìm chỉ số tháng trước để làm số cũ (Giả định lấy bản ghi gần nhất)
        // Lưu ý: Cần có method findFirstByApartmentIdAndMeterTypeIdOrderByCreatedAtDesc trong Repo
        MeterReading lastReading = meterReadingRepository
            .findFirstByApartmentIdAndMeterTypeIdOrderByCreatedAtDesc(apartment.getId(), meterType.getId());
            
        BigDecimal oldReading = (lastReading != null) ? lastReading.getNewReading() : BigDecimal.ZERO;
        BigDecimal newReading = request.getNewReading();

        if (newReading.compareTo(oldReading) < 0) {
            throw new RuntimeException("Chỉ số mới không được nhỏ hơn chỉ số cũ (" + oldReading + ")");
        }

        BigDecimal usageAmount = newReading.subtract(oldReading);

        // 2. Lưu lịch sử chỉ số
        MeterReading reading = new MeterReading();
        reading.setApartment(apartment);
        reading.setMeterType(meterType);
        reading.setBillingMonth(request.getBillingMonth());
        reading.setOldReading(oldReading);
        reading.setNewReading(newReading);
        reading.setUsageAmount(usageAmount);
        meterReadingRepository.save(reading);

        // 3. Tính tiền theo bậc thang
        List<MeterTariff> tariffs = meterTariffRepository.findByMeterTypeIdOrderByMinUsageAsc(meterType.getId());
        long calculatedAmount = calculateTieredAmount(usageAmount, tariffs);

        // 4. Map MeterType sang FeeType (Điện -> ELECTRIC, Nước -> WATER)
        FeeTypeCode feeCode = meterType.getName().toLowerCase().contains("điện") ? FeeTypeCode.ELECTRIC : FeeTypeCode.WATER;
        FeeType feeType = feeTypeRepository.findByCode(feeCode)
            .orElseThrow(() -> new RuntimeException("Chưa cấu hình loại phí cho: " + feeCode));

        // 5. Tìm Bill tổng của tháng, nếu chưa có thì tạo mới
        Bill bill = billRepository.findByApartmentIdAndBillingMonth(apartment.getId(), request.getBillingMonth())
            .orElseGet(() -> {
                Bill newBill = new Bill();
                newBill.setApartment(apartment);
                newBill.setBillingMonth(request.getBillingMonth());
                newBill.setTotalAmount(0L);
                newBill.setStatus(BillDetailStatus.UNPAID);
                newBill.setCreatedAt(LocalDateTime.now());
                return billRepository.save(newBill);
            });

        // 6. Tìm BillDetail của loại phí này, nếu có rồi thì update, chưa thì tạo
        BillDetail detail = billDetailRepository.findByBillIdAndFeeTypeId(bill.getId(), feeType.getId())
            .orElseGet(() -> {
                BillDetail newDetail = new BillDetail();
                newDetail.setBill(bill);
                newDetail.setFeeType(feeType);
                newDetail.setStatus(BillDetailStatus.UNPAID);
                newDetail.setDueDate(LocalDateTime.now().plusDays(15)); // Hạn chót 15 ngày
                return newDetail;
            });

        // Trừ đi amount cũ (nếu đang update) để cộng amount mới vào Bill tổng
        long oldDetailAmount = (detail.getAmount() != null) ? detail.getAmount() : 0L;
        
        detail.setQuantity(usageAmount);
        detail.setAmount(calculatedAmount);
        // Với bậc thang, unit_price không cố định 1 giá trị, có thể set null hoặc giá trị trung bình
        detail.setUnitPrice(calculatedAmount / (usageAmount.longValue() == 0 ? 1 : usageAmount.longValue())); 
        billDetailRepository.save(detail);

        // 7. Cập nhật lại tổng tiền hóa đơn (Bill)
        long currentTotal = (bill.getTotalAmount() != null) ? bill.getTotalAmount() : 0L;
        bill.setTotalAmount(currentTotal - oldDetailAmount + calculatedAmount);
        billRepository.save(bill);
    }

    // Thuật toán bóc tách giá trị tiêu thụ qua các bậc thang
    private long calculateTieredAmount(BigDecimal usage, List<MeterTariff> tariffs) {
        long totalAmount = 0L;
        BigDecimal remainingUsage = usage;

        for (MeterTariff tariff : tariffs) {
            if (remainingUsage.compareTo(BigDecimal.ZERO) <= 0) break;

            // Số lượng tối đa có thể chịu mức giá của bậc này
            Integer min = tariff.getMinUsage();
            Integer max = tariff.getMaxUsage();
            
            // Nếu max = null (bậc cuối cùng, vd: từ 400 trở lên)
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