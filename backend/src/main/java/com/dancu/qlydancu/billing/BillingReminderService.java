package com.dancu.qlydancu.billing;

import org.slf4j.*;
import org.springframework.stereotype.Service;

@Service
@BillingReminderEnabled
public class BillingReminderService {
    private static final Logger log=LoggerFactory.getLogger(BillingReminderService.class);
    private final BillingReminderRepository bills;
    private final EmailOutboxService outbox;
    private final BillingReminderProperties settings;
    private final ServiceSuspensionService services;
    public BillingReminderService(BillingReminderRepository bills,EmailOutboxService outbox,BillingReminderProperties settings,ServiceSuspensionService services) {
        this.bills=bills;this.outbox=outbox;this.settings=settings;
        this.services=services;
    }
    public record RunResult(int checked,int eligible,int created,int skipped,int failed){}
    public RunResult run() {
        var today=outbox.today();log.info("Billing reminder scan started date={}",today);
        int checked=0,eligible=0,created=0,skipped=0,failed=0;long after=0;
        while(true) {
            var ids=bills.candidates(today,after,settings.getPageSize());if(ids.isEmpty())break;
            for(long id:ids) {
                after=id;checked++;
                try {
                    services.review(id);
                    var data=bills.load(id);
                    if(data.isEmpty()||!data.get().eligible(BillingReminderType.BILL_REMINDER,today)){skipped++;continue;}
                    eligible++;
                    for(var type:java.util.List.of(BillingReminderType.BILL_REMINDER,BillingReminderType.BILL_OVERDUE_NOTICE)) {
                        if(data.get().eligible(type,today)) {
                            if(outbox.enqueueReminder(id,type))created++;else skipped++;
                        }
                    }
                }catch(RuntimeException ex){failed++;log.warn("Billing reminder billId={} failed class={}",id,ex.getClass().getSimpleName());}
            }
        }
        var result=new RunResult(checked,eligible,created,skipped,failed);log.info("Billing reminder scan completed result={}",result);return result;
    }
}
