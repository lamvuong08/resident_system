package com.dancu.qlydancu.config;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.dancu.qlydancu.model.Apartment;
import com.dancu.qlydancu.model.ApartmentContract;
import com.dancu.qlydancu.model.ApartmentFinance;
import com.dancu.qlydancu.model.ApartmentNote;
import com.dancu.qlydancu.model.Bill;
import com.dancu.qlydancu.model.Building;
import com.dancu.qlydancu.model.Household;
import com.dancu.qlydancu.model.Resident;
import com.dancu.qlydancu.model.enums.BillDetailStatus;
import com.dancu.qlydancu.model.status.ApartmentStatus;
import com.dancu.qlydancu.repo.ApartmentContractRepository;
import com.dancu.qlydancu.repo.ApartmentFinanceRepository;
import com.dancu.qlydancu.repo.ApartmentNoteRepository;
import com.dancu.qlydancu.repo.ApartmentRepository;
import com.dancu.qlydancu.repo.BillRepository;
import com.dancu.qlydancu.repo.BuildingRepository;
import com.dancu.qlydancu.repo.HouseholdRepository;
import com.dancu.qlydancu.repo.PaymentRepository;
import com.dancu.qlydancu.repo.ResidentRepository;
import com.dancu.qlydancu.repo.UserRequestRepository;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);
    private final BuildingRepository buildingRepository;
    private final ApartmentRepository apartmentRepository;
    private final ResidentRepository residentRepository;
    private final HouseholdRepository householdRepository;
    private final BillRepository billRepository;
    private final ApartmentFinanceRepository financeRepository;
    private final ApartmentContractRepository contractRepository;
    private final ApartmentNoteRepository noteRepository;

    public DataInitializer(BuildingRepository buildingRepository,
                           ApartmentRepository apartmentRepository,
                           ResidentRepository residentRepository,
                           HouseholdRepository householdRepository,
                           BillRepository billRepository,
                           ApartmentFinanceRepository financeRepository,
                           PaymentRepository paymentRepository,
                           UserRequestRepository maintenanceRepository,
                           ApartmentContractRepository contractRepository,
                           ApartmentNoteRepository noteRepository) {
        this.buildingRepository = buildingRepository;
        this.apartmentRepository = apartmentRepository;
        this.residentRepository = residentRepository;
        this.householdRepository = householdRepository;
        this.billRepository = billRepository;
        this.financeRepository = financeRepository;
        this.contractRepository = contractRepository;
        this.noteRepository = noteRepository;
    }

    @Override
    public void run(String... args) {
        if (apartmentRepository.count() > 0) {
            logger.info("DataInitializer: apartments already present — skipping seeding.");
            return;
        }

        int buildings = 3;
        int floors = 12;
        int perFloor = 8;

        List<Apartment> allAps = new ArrayList<>();

        for (int b = 1; b <= buildings; b++) {

            String code = "T" + b;
            Building building = new Building(code, "Tòa " + code, floors);
            buildingRepository.save(building);

            for (int f = 1; f <= floors; f++) {
                for (int s = 1; s <= perFloor; s++) {

                    String apCode = String.format("%s-%02d%02d", code, f, s);

                    Apartment ap = new Apartment(apCode, f, ApartmentStatus.EMPTY);
                    ap.setBuilding(building);

                    allAps.add(ap);
                }
            }
        }

        apartmentRepository.saveAll(allAps);

        Random rnd = new Random(12345);

        List<Resident> residents = new ArrayList<>();
        long phoneBase = 900000000L;
        int residentIdx = 1;
        String month = LocalDate.now().getYear() + "-" +
                String.format("%02d", LocalDate.now().getMonthValue());

        for (Apartment ap : apartmentRepository.findAll()) {

            boolean occupied = rnd.nextDouble() < 0.7;

            if (occupied) {

                int people = 1 + rnd.nextInt(4);

                ap.setStatus(ApartmentStatus.OCCUPIED);
                ap.setPeopleCount(people);
                ap.setOwnerName("Chủ nhà " + ap.getCode());
                apartmentRepository.save(ap);

                Household household = new Household();
                household.setApartment(ap);
                household = householdRepository.save(household);

                for (int p = 0; p < people; p++) {
                    Resident r = new Resident("Cư dân " + residentIdx);
                    r.setHouseholdId(household.getId());
                    r.setAge(18 + rnd.nextInt(60));
                    r.setPhone("09" + (phoneBase + residentIdx));
                    residents.add(r);
                    residentIdx++;
                }

                // ================= FINANCE FIXED =================
                ApartmentFinance f1 = new ApartmentFinance(
                        "Phí quản lý",
                        400000L + rnd.nextInt(200000),
                        month
                );
                ApartmentFinance f2 = new ApartmentFinance(
                        "Tiền điện",
                        100000L + rnd.nextInt(300000),
                        month
                );
                ApartmentFinance f3 = new ApartmentFinance(
                        "Tiền nước",
                        50000L + rnd.nextInt(100000),
                        month
                );

                f1.setApartment(ap);
                f2.setApartment(ap);
                f3.setApartment(ap);

                financeRepository.save(f1);
                financeRepository.save(f2);
                financeRepository.save(f3);

                long totalBillAmount = f1.getAmount() + f2.getAmount() + f3.getAmount();
                Bill bill = new Bill();
                bill.setApartment(ap);
                bill.setBillingMonth(month);
                bill.setTotalAmount(totalBillAmount);
                bill.setStatus(BillDetailStatus.PAID);
                bill.setCreatedAt(LocalDateTime.now());
                bill = billRepository.save(bill);

                // ================= CONTRACT =================
                ApartmentContract c = new ApartmentContract();
                c.setTenantName("Người thuê " + ap.getCode());
                c.setStartDate(LocalDate.now().minusMonths(3 + rnd.nextInt(12)));
                c.setEndDate(LocalDate.now().plusMonths(6 + rnd.nextInt(12)));
                c.setDeposit(1000000L + rnd.nextInt(2000000));
                c.setApartment(ap);
                contractRepository.save(c);

                // ================= NOTE =================
                ApartmentNote n = new ApartmentNote();
                n.setContent("Ghi chú tự động cho " + ap.getCode());
                n.setCreatedAt(LocalDateTime.now());
                n.setApartment(ap);
                noteRepository.save(n);

            } else {
                ap.setStatus(ApartmentStatus.EMPTY);
                ap.setPeopleCount(0);
                ap.setOwnerName(null);
                apartmentRepository.save(ap);
            }
        }

        residentRepository.saveAll(residents);
    }
}