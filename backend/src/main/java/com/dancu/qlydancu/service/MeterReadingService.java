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
    @Autowired private BillService billService;

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

        List<MeterTariff> tariffs = meterTariffRepository.findByMeterTypeIdOrderByMinUsageAsc(meterType.getId());
        return calculateTieredAmount(usageAmount, tariffs);
    }

    @Transactional
    public void recordAndCalculateBill(MeterReadingRequest request) {
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

        MeterReading reading = new MeterReading();
        reading.setApartment(apartment);
        reading.setMeterType(meterType);
        reading.setBillingMonth(request.getBillingMonth());
        reading.setOldReading(oldReading);
        reading.setNewReading(newReading);
        reading.setUsageAmount(usageAmount);
        meterReadingRepository.save(reading);

        List<MeterTariff> tariffs = meterTariffRepository.findByMeterTypeIdOrderByMinUsageAsc(meterType.getId());
        long calculatedAmount = calculateTieredAmount(usageAmount, tariffs);

        if (!meterType.getName().toLowerCase().contains("điện")) {
            throw new RuntimeException("Loại đồng hồ này không được hỗ trợ nhập chỉ số. Nước hiện được tính theo phí cố định.");
        }
        
        FeeTypeCode feeCode = FeeTypeCode.ELECTRIC;
        FeeType feeType = feeTypeRepository.findByCode(feeCode)
            .orElseThrow(() -> new RuntimeException("Chưa cấu hình loại phí cho: " + feeCode));
            
        if (feeType.getCalculationType() != com.dancu.qlydancu.model.enums.CalculationType.ELECTRIC_METER) {
            throw new RuntimeException("Loại phí " + feeType.getName() + " được cấu hình là phí cố định, không thể nhập chỉ số.");
        }

        Bill bill = billService.getOrCreateBill(apartment, request.getBillingMonth());

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
        
        detail.setQuantity(usageAmount);
        detail.setAmount(calculatedAmount);
        detail.setUnitPrice(calculatedAmount / (usageAmount.longValue() == 0 ? 1 : usageAmount.longValue())); 
        billDetailRepository.save(detail);

        long currentTotal = (bill.getTotalAmount() != null) ? bill.getTotalAmount() : 0L;
        bill.setTotalAmount(currentTotal - oldDetailAmount + calculatedAmount);
        billRepository.save(bill);
    }

    private long calculateTieredAmount(BigDecimal usage, List<MeterTariff> tariffs) {
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