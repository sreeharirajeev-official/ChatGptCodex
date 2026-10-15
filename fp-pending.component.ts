import { filter } from 'rxjs';
import { Component, DebugNode, EventEmitter, HostListener, Input, Output ,ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LabelType, Options } from 'ngx-slider-v2';
import { DataService } from 'src/app/shared/services/data.service';
import { FatherProfileService } from '../../father-profile/father-profile.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-fp-pending',
  templateUrl: './fp-pending.component.html',
  styleUrls: ['./fp-pending.component.css']
})
export class FpPendingComponent {
  @ViewChild('horizontalSlider') horizontalSlider: any;
  @Input() pendingPayments: any;
  WalletAmount: number;
  walletMoney: number;

  @Input() set selectedStudents(value: any) {
    value.forEach((x:any) => {
        x.selectedRowData = x?.selectedRowData ? x?.selectedRowData : [];
        x.selectedLateFee = [];
        // x?.PendingPayments.forEach((y:any) => {
        //     y.isCheckedRow = false;
        // });
        x.fromMonth = x.fromMonth ?? 0;
        x.toMonth = x.toMonth ?? 0;
    });
    this.SelectedStudents = JSON.parse(JSON.stringify(value));
    if(value && value.length > 0) {
        this.getAdvancedPayments();
    }
    // this.isSelectAllRow = false;
    if(this.feeDueStudents?.length > 0){
        let pendingPaymentsIds:any = [];
        this.feeDueStudents?.forEach((q:any)=>{ q?.PendingPayments?.forEach((w:any)=>{pendingPaymentsIds?.push(w?.Id)}) });
        this.SelectedStudents?.forEach((x:any)=>{
            x?.PendingPayments?.forEach((z:any)=>{
                if(pendingPaymentsIds?.includes(z?.Id)){
                    if(z?.FeeSetting?.FeeType?.Type && ((z?.FeeSetting?.FeeType?.Type)?.toLocaleLowerCase() == this.lateStayFee?.toLocaleLowerCase() || (z?.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee?.toLocaleLowerCase())) {
                        x.selectedLateFee = x?.lateFeePayments;
                    }
                    x.selectedRowData = x?.selectedRowData ? x?.selectedRowData : [];
                    x?.selectedRowData.push(z);
                    z.isCheckedRow = true;
                }
            });
        })
    }
    this.isSelectAllRow = this.SelectedStudents?.filter((x:any)=>(x?.selectedRowData?.length == x?.PendingPayments?.length || x?.selectedLateFee?.length == x?.PendingPayments?.length))?.length == this.SelectedStudents?.length;
  }
  get selectedStudents() {
    return this.SelectedStudents;
  }

  SelectedStudents: any[] = [];
  @Input() feeDueStudents: any;
  @Input() selectedLanguage: any;

  @Output() onSelectDeselectPaymentEvent = new EventEmitter();
  @Output() openPaymentModalEvent = new EventEmitter();
  @Output() onConvertingToInstallment = new EventEmitter();
  selectedRowData:any[] = [];
  visibleInvoiceDetails:boolean = false;

  totalPaymentCount:number = 0;
  selectedPaymentCount: number = 0;
  showchecked=false
  screenH: any;
  isSelectWalletAmount=false
  screenW: any;
  lang:boolean=true
  @HostListener('window:resize', ['$event'])
    getScreenSize(event?:any) {
          this.screenH = window.innerHeight;
          this.screenW = window.innerWidth;
  }

    constructor(
        public translate: TranslateService, private toastrService: ToastrService,
        private dataService: DataService,private service: FatherProfileService,
        private router: Router, private modalService: NgbModal
    ) {
        this.getScreenSize();
        // this.getMonthTotalAmount({month: "AUG", year: "2024"});
        let data = localStorage.getItem("SN_CURRENT_LANG");
        this.lang = data === "ar" ? false : true;
        this.translate.onLangChange.subscribe((event) => {
            this.lang = event.lang === "ar" ? false : true;
        });
        let academicYear:any[] = [];
        this.service.getAllMasters().subscribe((res: any) => {
            this.dataService.masterData = { ...this.dataService.masterData, "master": res };
            localStorage.setItem('AllMasters', JSON.stringify(res));

            academicYear = JSON.parse(JSON.stringify(res?.AcademicYear ?? []));
            this.academicYearStart = academicYear?.[0]?.AccadamicYearStartDate;
            this.academicYearEnd = academicYear?.[0]?.AccademicYearEndDate;
            // this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student) = this.generateMonthYearArray(this.academicYearStart, this.academicYearEnd);
        });

    }


  onSelectDeselectPendingPayment(event:any, payment:any){
    this.onSelectDeselectPaymentEvent.emit({event:event, payment: payment});
  }

  openPaymentModal(payments:any, confirmed:boolean){
    this.openPaymentModalEvent.emit({payments: payments, confirmed: confirmed});
  }
  lateStayFee = 'Late Stay Fee';
  lateFee = 'Late Fee';
  isLateFee(payment: any) {
    if(payment.FeeSetting?.FeeType?.Type && ((payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase())) {
        return true;
    }
    return false;
  }
  onRowSelect(event:any, student: any){
    let payment = event.data;
    if(payment.FeeSetting?.FeeType?.Type && ((payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase())) {
        student.selectedLateFee = student.lateFeePayments;
    }
    event.data.isCheckedRow = true;
    this.isSelectAllRow = this.SelectedStudents.filter((x:any)=>(x.selectedRowData.length == x.PendingPayments.length || x.selectedLateFee.length == x.PendingPayments.length)).length == this.SelectedStudents.length;
  }
  showtoastWallet(student:any){
    if(!student.isCheckSelectWalletamount && student?.selectedPaymentsPerMonth?.length > 0 ){
      this.toastrService.warning(this.translate.instant("Wallet cannot be added for advance payment"), "", { timeOut: 2000 })
    }

  }
  onwalletAmount(event:any ,student: any){
    this.SelectedStudents?.forEach((x: any) => {
        x.selectedRowData.forEach((y: any) => {
      if(x.KidId===student.KidId){
        y.isCheckSelectWalletamount = event.checked;
      }

        });
      x.selectedLateFee?.forEach((y: any) => {
          if(x.KidId===student.KidId){
            y.isCheckSelectWalletamount = event.checked;
          }

            });
      //   x.selectedPaymentsPerMonth.forEach((y: any) => {
      // if(x.KidId===student.KidId){
      //   y.isCheckSelectWalletamount = event.checked;
      // }

      //   });
    });



  }

  closeModal(){
     this.SelectedStudents?.forEach((x: any) => {
      x.isCheckSelectWalletamount =false
      x.selectedRowData.forEach((y: any) => {

      y.isCheckSelectWalletamount =false
      });

      if( x.selectedPaymentsPerMonth.length == 0 &&  x.selectedRowData.length > 0){
        if( x.Wallet?.Balance != undefined && x.Wallet?.Balance!= 0){
          x.isUpcoming=false
        }
        else {
          x.isUpcoming=true
        }

      }
      if( x.selectedPaymentsPerMonth.length > 0 &&  x.selectedRowData.length > 0){
        x.isUpcoming=true
      }
      if( x.selectedPaymentsPerMonth.length > 0 &&  x.selectedRowData.length == 0){
        x.isUpcoming=true
      }
      x.selectedPaymentsPerMonth.forEach((y: any) => {

      y.isCheckSelectWalletamount =false
      });
  });


  }
  onRowUnselect(event:any, student: any){
    let payment = event.data;
    if(payment.FeeSetting?.FeeType?.Type && ((payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase())) {
        student.selectedLateFee = [];
    }
    this.SelectedStudents.forEach((s) => {
        s.selectedPaymentsPerMonth = [];
        s.isAllAdvancePaymentsChecked = false;
        s.advancePaymentsList.forEach((x: any) => {
            x.isCheckedRow = false;
        });
    })
    event.data.isCheckedRow = false;
    this.isSelectAllRow = this.SelectedStudents.filter((x:any)=>x.selectedRowData.length == x.PendingPayments.length).length == this.SelectedStudents.length;
  }
  isSelectAllRow:boolean = false;
  getLeftOptions(student: any) {
    let options: Options = {
        floor: 0,
        draggableRange:false,
        rightToLeft: false,
        ceil: this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student).length-1,
        showTicks: true,
        step: 1,
        showTicksValues:false,
        getLegend: (value: number): string => {
            return "<span class='month-label'>"+this.getMonthTotalAmount(this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student)[value], student)+'&nbspAED'+"</span>";
            // return "<span class='month-label'>"+this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student)[value].month+"<br>"+this.getMonthTotalAmount(this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student)[value], student)+'&nbspAED'+"</span>";
            // return "<span class='month-label'>"+this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student)[value].month+"</span>";
        }
    }
    return options;
  }
  getSliderSteps(academicYearStart:any , academicYearEnd:any, student:any){
    const monthYearArray: any[] = [];
    const seenSteps = new Set<string>();

    const pushStep = (month: string, year: string) => {
      const key = month + '-' + year;
      if (!seenSteps.has(key)) {
        seenSteps.add(key);
        monthYearArray.push({ month, year });
      }
    };

    const paymentDates: Date[] = (student?.AllAdvancePayments ?? [])
      .map((p: any) => new Date(p?.DueDate))
      .filter((d: Date) => !isNaN(d.getTime()));

    let rangeStart = new Date(academicYearStart);
    let rangeEnd = new Date(academicYearEnd);
    const hasValidAcademicYear = !isNaN(rangeStart.getTime()) && !isNaN(rangeEnd.getTime());

    if (paymentDates.length > 0) {
      const minPaymentDate = new Date(Math.min(...paymentDates.map((d: Date) => d.getTime())));
      const maxPaymentDate = new Date(Math.max(...paymentDates.map((d: Date) => d.getTime())));
      if (!hasValidAcademicYear) {
        rangeStart = minPaymentDate;
        rangeEnd = maxPaymentDate;
      } else {
        if (minPaymentDate < rangeStart) {
          rangeStart = new Date(minPaymentDate.getFullYear(), minPaymentDate.getMonth(), 1);
        }
        if (maxPaymentDate > rangeEnd) {
          rangeEnd = new Date(maxPaymentDate.getFullYear(), maxPaymentDate.getMonth() + 1, 0);
        }
      }
    }

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      return monthYearArray;
    }

    const emptyDate = new Date(rangeStart);
    emptyDate.setMonth(emptyDate.getMonth() - 1);
    pushStep(
      emptyDate.toLocaleString('default', { month: 'short' }).toUpperCase(),
      emptyDate.getFullYear().toString()
    );

    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      const month = cursor.toLocaleString('default', { month: 'short' }).toUpperCase();
      const year = cursor.getFullYear().toString();
      if (this.getMonthTotalAmount({ month, year }, student) > 0) {
        pushStep(month, year);
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return monthYearArray;
  }
  getRightOptions(student: any) {
    let rightOptions: Options = {
        floor: 0,
        draggableRange:false,
        rightToLeft: true,
        ceil: this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student).length-1,
        showTicks: true,
        step: 1,
        showTicksValues:false,
        getLegend: (value: number): string => {
          return "<span class='month-label'>"+this.getMonthTotalAmount(this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student)[value], student)+'&nbspAED'+"</span>";
          // return "<span class='month-label''>"+this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student)[value].month+"</span>";
        }
    };
    return rightOptions;
  }
  getVerticalOptions(student: any) {
    let verticalOptions: Options = {
        floor: 0,
        ceil: this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student).length-1,
        showTicks: true,
        showTicksValues: false,
        rightToLeft: this.selectedLanguage == 'en' ? false : true,
        // vertical:true,
        getLegend: (value: number): string => {
            if(value === verticalOptions.floor || value === verticalOptions.ceil || value === student.toMonth || value % 4 == 0) {
                if(value != student.toMonth - 1 && value != student.toMonth + 1) {
                    return "<span class='month-label'>"+this.getMonthTotalAmount(this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student)[value], student)+'&nbspAED'+"</span>";
                    // return "<span class='month-label'>"+this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student)[value].month+"</span>";
                } else {
                    return "";
                }
            } else {
                return "";
            }
        }
    };
    return verticalOptions;
  }
  onSelect(e:any){
    this.showchecked=!this.showchecked
  }
  onSelectAll(event:any){
   this.isSelectAllRow=!this.isSelectAllRow;
   if(this.isSelectAllRow) {
        this.SelectedStudents?.forEach((s) => {
            s.selectedPaymentsPerMonth = [];
            s.isAllAdvancePaymentsChecked = false;
            s.advancePaymentsList?.forEach((x: any) => {
                x.isCheckedRow = false;
            });
            let lateFeeIndex = s.PendingPayments.findIndex((payment: any) => payment.FeeSetting?.FeeType?.Type && ((payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase()));
            if(lateFeeIndex != -1) {
                s.selectedLateFee = s.lateFeePayments;
            }
        })
    }
    if(this.isSelectAllRow){
        this.SelectedStudents?.forEach((x) => {
            x.selectedRowData = x.PendingPayments;
            x.PendingPayments?.forEach((y:any) => {
                y.isCheckedRow = true;
            });
        })
    } else {
        this.SelectedStudents?.forEach((x) => {
            if(x.PendingPayments && x.PendingPayments.length > 0) {
                x.expanded = false;
                x.fromMonth = 0;
                x.toMonth = 0;
                x.AdvAmount = 0;
            }
            x.selectedRowData = [];
            x.selectedLateFee = [];
            x.toMonth = 0;
            this.getAdvAmount(0,0,x);
            x.PendingPayments?.forEach((y:any) => {
                y.isCheckedRow = false;
            });
        })
        this.SelectedStudents?.forEach((s) => {
            this.SelectedStudents?.forEach((s) => {
                s.selectedPaymentsPerMonth = [];
                s.isAllAdvancePaymentsChecked = false;
                s.advancePaymentsList?.forEach((x: any) => {
                    x.isCheckedRow = false;
                });
                let lateFeeIndex = s.PendingPayments.findIndex((payment: any) => payment.FeeSetting?.FeeType?.Type && ((payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase()));
                if(lateFeeIndex != -1) {
                    s.selectedLateFee = s.lateFeePayments;
                }
            })
        })
    }
  }
  goToPaymentScreen() {

    this.SelectedStudents.map((x:any)=>{
      if(x.isCheckSelectWalletamount==false){
        delete x.totalWalletAmount
      }
     if(x.selectedRowData.length > 0){
       x.selectedRowData.map((y:any)=>{
           y.wallet = x.Wallet

        })

      }
     if(x.selectedLateFee.length > 0){
       x.selectedLateFee.map((y:any)=>{
           y.wallet = x.Wallet

        })

      }

     })
    let selectedPayments: any[] = [];
    this.SelectedStudents.forEach((x) => {
        x.selectedRowData.forEach((y: any, index: any) => {
            if(y.FeeSetting?.FeeType?.Type && ((y.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (y.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase())) {
                x.selectedRowData.splice(index, 1);
            }
        })
    })
    this.SelectedStudents.forEach((x) => {
        selectedPayments = [...selectedPayments, ...x.selectedRowData];
        selectedPayments = [...selectedPayments, ...x.selectedPaymentsPerMonth];
        selectedPayments = [...selectedPayments, ...x.selectedLateFee];
    });
    selectedPayments = selectedPayments.filter((p: any) => p != null);
    // let amount = this.getTotalAmount(selectedPayments);
    let amount = this.WalletAmount;
    this.visibleInvoiceDetails = false;
    this.openPaymentModalEvent.emit({payments: selectedPayments, totalAmount: amount, corfirmed: true});
  }
  getTotalForLateFee(payments: any) {
    let total:number = 0;
    payments.forEach((x:any) => {
        total += x?.TotalFee;
    });
    return total;
  }
  isAccordianDisabled(student: any) {
    if(!student?.PendingPayments || student?.PendingPayments?.length == 0) {
        return false;
    }
    if(student?.PendingPayments && student?.PendingPayments.length > 0) {
        let uncheckedRows = student?.PendingPayments.filter((x: any) => !x.isCheckedRow);
        return uncheckedRows.length == 0 ? false : true;
    }
    return true;
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
  getTotalAmount(allPayments:any){

    let total:number = 0;
    allPayments.forEach((x:any) => {
        total += x?.TotalFee;
    });
    return total;
  }
  onAdvanceRowSelect(event: any, student: any) {
    event.data.isCheckedRow = true;
    let list = student.advancePaymentsList.filter((x: any) => !x.isCheckedRow);
    if(list && list.length > 0) {
        student.isAllAdvancePaymentsChecked = false;
    } else {
        student.isAllAdvancePaymentsChecked = true;
    }
  }
  getAdvancePaymentAmount() {
    let advanceAmount = 0;
    this.SelectedStudents.forEach((s) => {
        s.selectedPaymentsPerMonth.forEach((x: any) => {
            advanceAmount += x?.TotalFee ?? 0;
        })
    })
    return advanceAmount;
  }
  onAdvanceRowUnselect(event: any, student: any) {
      student.isAllAdvancePaymentsChecked = false;
      student.advancePaymentsList.forEach((x: any) => {
          if(x.Id == event.data.Id) {
              x.isCheckedRow = false;
          }
          if(new Date(x.DueDate) > new Date(event.data.DueDate)) {
              x.isCheckedRow = false;
              let index = student.selectedPaymentsPerMonth.findIndex((p: any) => p.Id == x.Id);
              if(index != -1) {
                  student.selectedPaymentsPerMonth.splice(index, 1);
              }
          }
      })
  }
//   isAllAdvancePaymentsChecked: boolean = false;
  selectAllAdvancePayments(event: any, student: any) {
    student.advancePaymentsList?.map((x: any) => {x.isCheckedRow = student.isAllAdvancePaymentsChecked; return x;} );
    if(student.isAllAdvancePaymentsChecked) {
        student.selectedPaymentsPerMonth = student.advancePaymentsList;
    } else {
        student.selectedPaymentsPerMonth = [];
    }
  }
  onSliderValueChanged(event: any, student: any) {
    setTimeout(() => {
        student.fromMonth = 0;
    });
    // this.filterAdvancePaymentsByMonth(0, event.highValue, student);
    this.getAdvAmount(0, event.highValue, student);

  }
  paymentsListPerMonths: any[] = [];
  onChangeAdvancePayment(event: any, payment: any,student:any,isMobView:boolean=false) {
    this.SelectedStudents?.forEach((s) => {
        let list = s?.advancePaymentsList?.filter((x: any) => !x?.isCheckedRow);
        if(list && list?.length > 0) {
            s.isAllAdvancePaymentsChecked = false;
        } else {
            s.isAllAdvancePaymentsChecked = true;
        }
    })
    let selectedKidIndex = this.SelectedStudents?.findIndex((x:any)=>x?.KidId == student?.KidId);
    if(isMobView){
        if(event?.checked){
            let selectedPaymentsId:any[] = [];
            selectedPaymentsId = student?.selectedPaymentsPerMonth?.map((x:any)=>x?.KidId);
            if(!selectedPaymentsId?.includes(payment?.Id)){
                student.selectedPaymentsPerMonth?.push(payment);
            }
        } else {
            student.selectedPaymentsPerMonth = student?.selectedPaymentsPerMonth?.filter((x:any)=> x?.Id != payment?.Id)
        }
        this.SelectedStudents[selectedKidIndex].selectedPaymentsPerMonth = student?.selectedPaymentsPerMonth;
    }
  }
  getAdvancedPayments() {
    let date = new Date();
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    this.SelectedStudents?.forEach((x) => {
        x.selectedPaymentsPerMonth = [];
        if(x?.PendingPayments && x?.PendingPayments?.length > 0) {
            let advancePayments = x?.PendingPayments?.filter((p: any) => !p.IsRegistrationFee && !p.IsInvoiceSent);
            let pendingPayments = x?.PendingPayments?.filter((p: any) => p.IsRegistrationFee || p.IsInvoiceSent);
            let lateFeePayments = x?.PendingPayments?.filter((p: any) => p.FeeSetting?.FeeType?.Type && ((p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase()));
            x.lateFeePayments = JSON.parse(JSON.stringify(lateFeePayments));
            x.AllAdvancePayments = JSON.parse(JSON.stringify(advancePayments));
            // x.advancePaymentsList = advancePayments;
            x.pendingPayments = JSON.parse(JSON.stringify(pendingPayments));
        } else {
            x.pendingPayments = [];
            x.lateFeePayments = [];
            x.advancePaymentsList = [];
        }
    });
    this.SelectedStudents?.forEach((x) => {
        x.PendingPayments = x?.pendingPayments;
        if(x.lateFeePayments && x.lateFeePayments.length > 0) {
            this.getCumulativeLateFee(x);
        }
        setTimeout(() => {
            // this.filterAdvancePaymentsByMonth(x?.fromMonth, x?.toMonth, x);
            this.getAdvAmount(x?.fromMonth, x?.toMonth, x);
        }, 1000);
    })
    // this.SelectedStudents[0].PendingPayments = [...this.SelectedStudents[0].PendingPayments, ...this.paymentsListPerMonths]
    // let currentDate = new Date();}
  }
  getCumulativeLateFee(student: any) {
    let lateFeePayments = student?.PendingPayments?.filter((p: any) => p.FeeSetting?.FeeType?.Type && ((p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase()));
    let otherFeePayments = student?.PendingPayments?.filter((p: any) => (p.FeeSetting?.FeeType?.Type && (p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() != this.lateStayFee.toLocaleLowerCase() && (p.FeeSetting?.FeeType?.Type).toLocaleLowerCase() != this.lateFee.toLocaleLowerCase()));
    let totalLateFeeAmount = 0;
    let totalLateFeeAmountVal = 0;
    let totalLateFeeVATAmount = 0;
    lateFeePayments.forEach((x: any) => {
        totalLateFeeAmount += x.TotalFee;
    });
    lateFeePayments.forEach((x: any) => {
        totalLateFeeAmountVal += x.Amount;
    });
    lateFeePayments.forEach((x: any) => {
        totalLateFeeVATAmount += x.VATAmount;
    });
    lateFeePayments[0].TotalFee = totalLateFeeAmount;
    lateFeePayments[0].Amount = totalLateFeeAmountVal;
    lateFeePayments[0].VATAmount = totalLateFeeVATAmount;
    student.PendingPayments = [...otherFeePayments, ...[lateFeePayments[0]]];
  }

  handleNgxSliderHelpClick(event:any){
    event.stopPropagation();
    event.preventDefault();
  }

  showPendingPaymentsWarning(student: any) {
    student.expanded = false;
    let studentName = this.selectedLanguage == 'en' ? student.FullNameInEnglish : student?.FullNameInArabic;
    this.toastrService.warning(studentName + "," + this.translate.instant(' has pending payments. Please complete them first'), '', {timeOut: 5000});
  }

  getAdvAmount(minValueIndex: any, maxValueIndex: any, student: any) {
    const steps = this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student);
    let date = new Date(steps[maxValueIndex]?.month+" "+steps[maxValueIndex]?.year);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    let startDate = new Date(steps[minValueIndex]?.month+" "+steps[minValueIndex]?.year);
    // this.SelectedStudents.forEach((s) => {
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            student.advancePaymentsList = [];
            student.selectedPaymentsPerMonth = [];
            student.isAllAdvancePaymentsChecked = false;
            student.AdvAmount = 0;
            return;
        }
        if(student.AllAdvancePayments && student.AllAdvancePayments.length > 0) {
            student?.AllAdvancePayments?.filter((x: any) => {
                const dueDate = new Date(x?.DueDate);
                return !isNaN(dueDate.getTime()) && dueDate > endDate;
            })?.map((p: any) => {p.isCheckedRow = false; return p;});
        }
        student.advancePaymentsList = student?.AllAdvancePayments?.filter((x: any) => {
            const dueDate = new Date(x?.DueDate);
            return !isNaN(dueDate.getTime()) && dueDate >= startDate && dueDate <= endDate;
        });
        student.selectedPaymentsPerMonth = student.advancePaymentsList?.filter((x: any) => x.isCheckedRow);
        let uncheckedPayments = student?.advancePaymentsList?.filter((x: any) => !x?.isCheckedRow);
        student.isAllAdvancePaymentsChecked = uncheckedPayments?.length == 0 && student?.advancePaymentsList?.length > 0;


        student.AdvAmount = student?.advancePaymentsList?.reduce((accumulator:any, currentValue:any) => {
                                        return accumulator + currentValue.TotalFee;
                                      }, 0);
        student.isAllAdvancePaymentsChecked = true;
        this.selectAllAdvancePayments(null, student);


    // });
  }

  filterAdvancePaymentsByMonth(minValueIndex: any, maxValueIndex: any, student: any) {
    const steps = this.getSliderSteps(this.academicYearStart,this.academicYearEnd,student);
    let date = new Date(steps[maxValueIndex]?.month+" "+steps[maxValueIndex]?.year);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    let startDate = new Date(steps[minValueIndex]?.month+" "+steps[minValueIndex]?.year);
    // this.SelectedStudents.forEach((s) => {
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            student.advancePaymentsList = [];
            student.selectedPaymentsPerMonth = [];
            student.isAllAdvancePaymentsChecked = false;
            return;
        }
        if(student.AllAdvancePayments && student.AllAdvancePayments.length > 0) {
            student?.AllAdvancePayments?.filter((x: any) => {
                const dueDate = new Date(x?.DueDate);
                return !isNaN(dueDate.getTime()) && dueDate > endDate;
            })?.map((p: any) => {p.isCheckedRow = false; return p;});
        }
        student.advancePaymentsList = student?.AllAdvancePayments?.filter((x: any) => {
            const dueDate = new Date(x?.DueDate);
            return !isNaN(dueDate.getTime()) && dueDate >= startDate && dueDate <= endDate;
        });
        student.selectedPaymentsPerMonth = student.advancePaymentsList?.filter((x: any) => x.isCheckedRow);
        let uncheckedPayments = student?.advancePaymentsList?.filter((x: any) => !x?.isCheckedRow);
        student.isAllAdvancePaymentsChecked = uncheckedPayments?.length == 0 && student?.advancePaymentsList?.length > 0;
    // });
  }
  disableCheckBox(student: any) {
    if(!student.PendingPayments || student.PendingPayments.length == 0) {
        return false;
    }
    let selectedPendingPayments = student.PendingPayments.filter((x: any) => x.isCheckedRow);
    if(student.PendingPayments.length == selectedPendingPayments.length) {
        return false;
    }
    return true;
  }
  isAdvancePaymentAdded(student: any) {
    let advancePayments = student.selectedPaymentsPerMonth.filter((x: any) => x?.KidInfoId == student?.KidId);
    if(advancePayments.length > 0) {
        return true;
    }
    return false;
  }
  onStudentPaymentChecked(event: any,student:any, payment:any) {
    if(event.checked) {
         student?.selectedRowData?.push(payment);
         if(payment.FeeSetting?.FeeType?.Type && ((payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateStayFee.toLocaleLowerCase() || (payment.FeeSetting?.FeeType?.Type).toLocaleLowerCase() == this.lateFee.toLocaleLowerCase())) {
            student.selectedLateFee = student.lateFeePayments;
         }
         this.isSelectAllRow = this.SelectedStudents.filter((x:any)=>x.selectedRowData.length == x.PendingPayments.length).length == this.SelectedStudents.length;
    } else {
        student.expanded = false;
        student.fromMonth = 0;
        student.toMonth = 0;
        student.AdvAmount = 0;
        student.selectedRowData = student?.selectedRowData?.filter((x:any)=> x?.Id != payment?.Id);
        this.isSelectAllRow = this.SelectedStudents.filter((x:any)=>x.selectedRowData.length == x.PendingPayments.length).length == this.SelectedStudents.length;
        this.SelectedStudents.forEach((s) => {
            s.selectedPaymentsPerMonth = [];
            s.isAllAdvancePaymentsChecked = false;
            s.advancePaymentsList.forEach((x: any) => {
                x.isCheckedRow = false;
            });
        })
    }
  }
  getGrandTotal(student?: any) {
    let grandTotal: number = 0;

    this.SelectedStudents?.forEach((x: any) => {
        x?.selectedRowData?.forEach((y: any) => {
            grandTotal += y?.TotalFee;
        });
        x?.selectedPaymentsPerMonth?.forEach((y: any) => {
            grandTotal += y?.TotalFee ?? 0;
        });



        // x.selectedLateFee?.forEach((y: any) => {
        //     grandTotal += y?.Amount ?? 0;
        // });
    });
  return grandTotal;

}
getGrandTotalAmount(student?: any) {

  let grandTotal: number = 0;

  this.SelectedStudents?.forEach((x: any) => {
      x.selectedRowData.forEach((y: any) => {
          grandTotal += y?.TotalFee;
      });
      x.selectedPaymentsPerMonth?.forEach((y: any) => {
          grandTotal += y?.TotalFee ?? 0;
      });


      // x.selectedLateFee?.forEach((y: any) => {
      //     grandTotal += y?.Amount ?? 0;
      // });
  });
  this.SelectedStudents?.forEach((x: any) => {
      if(x?.selectedRowData.length > 0){
        const isAnySelected = x?.selectedRowData?.some((y: any) => y.isCheckSelectWalletamount === true);

        if(isAnySelected){

          grandTotal= Math.max(0, grandTotal - (x?.Wallet?.Balance ? x?.totalWalletAmount : 0));

        this.WalletAmount =grandTotal
          return grandTotal;
        }
        else{
          this.WalletAmount =grandTotal
          return grandTotal;
        }

      }
      this.WalletAmount=grandTotal
      return grandTotal;
  });
  return grandTotal;

}




  getTotalPayableAmount(payments: any[]) {
    let totalAmount = 0;
    payments.forEach((x) => {
        totalAmount += x.TotalFee;
    });
    return totalAmount;
  }
  getTotalForIndividualStudent(student: any) {
    let grandTotal = 0;
    student.selectedRowData.forEach((y:any) => {
        grandTotal += y?.TotalFee;
    });
    student.selectedPaymentsPerMonth?.forEach((y: any) => {
        grandTotal += y?.TotalFee ?? 0;
    });
    return grandTotal;
  }
  getTotalForIndividualStudentbyWalletBalance(student: any) {

    let grandTotal = 0;

    student.selectedRowData.forEach((y: any) => {
      if (y) {
        grandTotal += y?.TotalFee;
      }
    });

    student.selectedPaymentsPerMonth?.forEach((y: any) => {
      grandTotal += y?.TotalFee ?? 0;
    });

    const isAnySelected = student.selectedRowData.some((y: any) => y.isCheckSelectWalletamount === true);
    // const isAnyMonthSelected = student.selectedPaymentsPerMonth.some((y: any) => y.isCheckSelectWalletamount === true);

    student.selectedRowData.forEach((y: any) => {
      y.walletamount= isAnySelected  ? grandTotal: 0
    });
    if(student?.selectedPaymentsPerMonth.length > 0){
      student.selectedPaymentsPerMonth?.forEach((y: any) => {
        grandTotal = Math.max(0, grandTotal - (y?.TotalFee ? y?.TotalFee : 0));
       });
    }

    if (isAnySelected ) {
      student?.Wallet?.Balance && student?.Wallet?.Balance < grandTotal ? student.totalWalletAmount = student?.Wallet?.Balance : student.totalWalletAmount =  grandTotal;
      return student?.Wallet?.Balance && student?.Wallet?.Balance < grandTotal ? student?.Wallet?.Balance : grandTotal;
    } else {

      return 0;
    }
  }

  getTotalForIndividualStudentbyWalletBalances(student: any) {
    let grandTotal = 0;

    student.selectedRowData.forEach((y: any) => {
        grandTotal += y?.TotalFee;
    });

    student.selectedPaymentsPerMonth?.forEach((y: any) => {
        grandTotal += y?.TotalFee ?? 0;
    });

    const isAnySelected = student.selectedRowData.some((y: any) => y.isCheckSelectWalletamount === true);
    // const isAnyMonthSelected = student.selectedPaymentsPerMonth.some((y: any) => y.isCheckSelectWalletamount === true);
    let result:any
    if (isAnySelected) {


      result = Math.max(0, grandTotal - (student?.totalWalletAmount ? student?.totalWalletAmount: 0));
      student.selectedRowData.forEach((y: any) => {
       y.grandTotal=result;
    });
    return result
    } else {
      student.selectedRowData.forEach((y: any) => {
        y.grandTotal=grandTotal;
     });

     return grandTotal;
    }


  }


  selectedPaymentsCount(){
    let total: number = 0;
    let selected: number = 0;
    this.SelectedStudents.forEach((x:any)=>{
        total += x.PendingPayments.length;
        x.selectedRowData.forEach((y:any) => {
            selected += 1;
        });
    });
    this.totalPaymentCount = total;
    this.selectedPaymentCount = selected;
    return selected+" / "+total;
  }


  sliderSteps:any = [
    // {month: "SEP", year: "2023"},
    // {month: "OCT", year: "2023"},
    // {month: "NOV", year: "2023"},
    // {month: "DEC", year: "2023"},
    // {month: "JAN", year: "2024"},
    // {month: "FEB", year: "2024"},
    // {month: "MAR", year: "2024"},
    // {month: "APR", year: "2024"},
    // {month: "MAY", year: "2024"},
    // {month: "JUN", year: "2024"},
    // {month: "JUL", year: "2024"},
    // {month: "AUG", year: "2024"}
  ]
  toggleRightSliderMovement: boolean = true;

  fromMonth = 0;
  toMonth = 0;

  academicYearStart: any;
  academicYearEnd: any;

  generateMonthYearArray(academicYearStart:any, academicYearEnd:any) {
    const startDate = new Date(academicYearStart);
    const endDate = new Date(academicYearEnd);
    const monthYearArray = [];

    while (startDate <= endDate) {
      const month = startDate.toLocaleString('default', { month: 'short' }).toUpperCase();
      const year = startDate.getFullYear().toString();
      monthYearArray.push({ month, year });

      startDate.setMonth(startDate.getMonth() + 1);
    }

    return monthYearArray;
  }

  getMonthTotalAmount(data:any, student: any){
    const startDate = new Date(data.month+" "+data.year);
    if (isNaN(startDate.getTime())) {
      return 0;
    }
    const endDate = (new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0));
    endDate.setHours(23, 59, 59, 999);
    let totalAmount:number = 0;
    student?.AllAdvancePayments?.filter((x: any) => {
        const dueDate = new Date(x?.DueDate);
        return !isNaN(dueDate.getTime()) && dueDate >= startDate && dueDate <= endDate;
    })?.forEach((y:any)=>{
        totalAmount += y?.TotalFee;
    });
    return totalAmount;
  }

  toggleMoreFilter(event: any) {
    event.stopPropagation();
  }
  @HostListener('document:click')
  onDocumentClick() {
    this.visibleInvoiceDetails = false;
    this.visibleLateStayFeeDetails = false;
  }

  visibleLateStayFeeDetails:boolean = false;
  studentSelected: any;
  openLateStayFeeModal(event:any, student: any){
    event.stopPropagation();
    this.studentSelected = JSON.parse(JSON.stringify(student))
    this.visibleLateStayFeeDetails = true;
  }
  selectedPaymentForInstallment: any;
  selectedStudentForInstallment: any;
  feeSettingInstallmentDetails: any[] = [];
  isAcknowledged: boolean = false;
  isInstallmentBtnDisabled: boolean = false;
  private installmentConfirmModalRef: any;
  @ViewChild('installmentConfirmModal') set installmentConfirmModalModal(elem:any) {
    this.installmentConfirmModalRef = elem;
  };
  convertToEMI(event: Event, payment: any, student: any) {
    event.stopPropagation();
    this.selectedPaymentForInstallment = payment;
    this.selectedStudentForInstallment = student;
    this.feeSettingInstallmentDetails = payment?.FeeSetting?.FeeSettingInstallmentDetails ?? [];
    this.modalService.open(this.installmentConfirmModalRef, { ariaLabelledBy: 'modal-basic-title', backdrop: 'static', size: 'xl' ,centered:true});
  }
  confirmConvertToEMI() {
    let data: any = {
        PaymentId: this.selectedPaymentForInstallment?.Id,
        KidInfoId: this.selectedStudentForInstallment?.KidId
    };
    this.isInstallmentBtnDisabled = true;
    this.service.addPaymentInstallmentRequest(data).subscribe((res: any) => {
        if(res?.Message == "Success") {
            this.toastrService.success(this.translate.instant('Payment converted to EMI successfully'), '', {timeOut: 5000});
        } else if (res?.Message == "Payment installment request already exists.") {
            this.toastrService.error(this.translate.instant('Payment installment request already exists.'), '', {timeOut: 5000});
        } else if (res?.Message == "Pending payment not found.") {
            this.toastrService.error(this.translate.instant('Pending payment not found.'), '', {timeOut: 5000});
        } else {
            this.toastrService.error(this.translate.instant('Failed to convert payment to EMI'), '', {timeOut: 5000});
        }
        this.onConvertingToInstallment.emit(true);
        this.isInstallmentBtnDisabled = false;
        this.modalService.dismissAll();
    });
  }
}

