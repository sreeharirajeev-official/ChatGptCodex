import { Injectable } from '@angular/core';
import { FatherProfileApiService } from '../father-profile/father-profile-api.service';
import { HttpClient } from '@angular/common/http';
import { dateObjToString, dateStringToObj } from 'src/app/shared/functions/date-string-to-obj';

@Injectable({
    providedIn: 'root'
})
export class FeesPaymentsService {

    constructor(private apiService: FatherProfileApiService,private api:HttpClient) { }
    getReceiptForDownload(paymentId: any) {
        return this.apiService.getReceiptForDownload(paymentId);
    }
    getParentPendingPayments(parentId: any) {
        return this.apiService.getParentPendingPayments(parentId);
    }
    getParentUpcomingPayments(parentId: any) {
        return this.apiService.getParentUpcomingPayments(parentId);
    }
    getParentPaymentHistory(parentId: any) {
        return this.apiService.getParentPaymentHistory(parentId);
    }
    addPayment(data: any) {
        return this.apiService.updatePayment(data);
    }
    checkPaymentStatus(checkStatusData: any) {
        return this.apiService.checkPaymentStatus(checkStatusData);
    }
    getKidsPaymentByParentId(parentId: any) {
        return this.apiService.getKidsPaymentByParentId(parentId);
    }
    getWalletStatement(kidId: any,startDate:any, endDate:any) {
        startDate = dateObjToString(startDate);
        endDate = dateObjToString(endDate);
        let statementData = {
            kidInfoId: kidId,
            fromDate: startDate,
            toDate: endDate
        }
        return this.apiService.getWalletStatement(statementData);
    }
}
