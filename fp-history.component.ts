import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-fp-history',
  templateUrl: './fp-history.component.html',
  styleUrls: ['./fp-history.component.css']
})
export class FpHistoryComponent {

    @Input() set selectedStudents(value: any) {
        this.SelectedStudents = value;
        this.SelectedStudents.forEach((x) => {
            this.getCumulativeLateFee(x);
        })
        this.getScreenSize();
      }
      get selectedStudents() {
        return this.SelectedStudents;
      }
      SelectedStudents: any[] = [];

  @Input() paymentHistory: any;
  @Input() set showSpinner(value: boolean) {
    if(value == false){
        this.SelectedStudents.forEach((x:any) => {
            x?.PaymentHistory?.forEach((y:any) => {
                y.showSpinner = false;
            });
        });
    }
  };
  @Input() selectedLanguage: any;
  studentSelected: any;
  visibleLateStayFeeDetails: boolean = false;

  screenW: any;
  @HostListener('window:resize', ['$event'])
        getScreenSize(event?:any) {
            this.screenW = window.innerWidth;
    }
  @Output() printTableToPDFEvent = new EventEmitter();


  printTableToPDF(student: any, payment:any){
    payment.showSpinner = true;
    payment.FormattedAmount = parseFloat(payment.Amount).toFixed(2);
    student.payemt = payment;
    this.printTableToPDFEvent.emit(student);
  }
  lateStayFee = 'Late Stay Fee';
  lateFee = 'Late Fee';
  isLateFee(payment: any) {
    if(payment.FeeSetting?.FeeType?.Type && ((payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase())) {
        return true;
    }
    return false;
  }
  getCumulativeLateFee(student: any) {
    let lateFeePayments = student?.PaymentHistory?.filter((p: any) => p.FeeSetting?.FeeType?.Type && ((p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase()));
    let otherFeePayments = student?.PaymentHistory?.filter((p: any) => (p.FeeSetting?.FeeType?.Type && (p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() != this.lateStayFee.toLocaleLowerCase() && (p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() != this.lateFee.toLocaleLowerCase()));
    student.lateFeePayments = JSON.parse(JSON.stringify(lateFeePayments));
    let totalLateFeeAmount = 0;
    if(lateFeePayments.length > 0) {
        lateFeePayments.forEach((x: any) => {
            totalLateFeeAmount += x.Amount;
        });
        lateFeePayments[0].Amount = totalLateFeeAmount;
        student.PaymentHistory = [...otherFeePayments, ...[lateFeePayments[0]]];
    }
  }
  @HostListener('document:click')
  onDocumentClick() {
    this.visibleLateStayFeeDetails = false;
  }
  openLateStayFeeModal(event:any, student: any){
    event.stopPropagation();
    this.studentSelected = JSON.parse(JSON.stringify(student))
    this.visibleLateStayFeeDetails = true;
  }
  getTotalForLateFee(payments: any) {
    let total:number = 0;
    payments.forEach((x:any) => {
        total += x?.Amount;
    });
    return total;
  }
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    return formattedTime;
  }
}
