import {
    Component,
    ElementRef,
    HostListener,
    Inject,
    Input,
    LOCALE_ID,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { FeesPaymentsService } from './fees-payments.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { environment } from 'src/environments/environment';
import { SharedService } from 'src/app/shared/services/shared.service';
import { Subject, Subscription, firstValueFrom } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import { add_Amiri } from 'src/app/shared/functions/amiri.font';
import { formatDate } from '@angular/common';
import { DataService } from 'src/app/shared/services/data.service';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import * as e from 'express';
import { ActionRequiredModalQueueService } from 'src/app/shared/services/action-required-modal-queue.service';
@Component({
    selector: 'app-fees-payments',
    templateUrl: './fees-payments.component.html',
    styleUrls: ['./fees-payments.component.css'],
    animations: [
        trigger('loadingAnimation', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('80ms', style({ opacity: 1 })),
            ]),
        ]),
    ],
})
export class FeesPaymentsComponent implements OnInit, OnDestroy {
    @ViewChild('pdfContainer', { static: true }) pdfContainer: ElementRef;
    @ViewChild('statmentsRef', { static: true }) statmentsRef: ElementRef;
    @HostListener('window:resize', ['$event'])
    getScreenSize(event?: any) {
        this.screenW = window.innerWidth;
    }
    tabName: string = 'pending';
    private paymentModalRef: any;
    private paymentSuccessModalRef: any;
    private paymentAlreadyPaidModalRef: any;
    private paymentPaidDetailsModalRef: any;
    private paymentDeclinedModalRef: any;
    private paymentFailureModalRef: any;
    paymentData: any;
    screenW: any;
    upcomingPayments: any[] = [];
    pendingPayments: any[] = [];
    paymentHistory: any[] = [];
    selectedPayments: any[] = [];
    feeDueStudents:any[] = [];
    isShowing: boolean = false;
    showPaymentHistory = false;
    paymenturl: any;
    safePaymentUrl: any;
    showLoader: boolean = false;
    showSpinner: boolean = false;
    checkingStatus: boolean = false;
    isPaymentSuccessfull: boolean = true;
    orderRefNo: string = '';
    completedPaymentData: any;
    loggedInUserId: any;
    currentObj: any;
    selectedLanguage: string = "ar";
    pageSize = { label: 'A4', value: [210, 297] };
    orientation = 'p';
    columns: { field: string; header: string }[];
    exportColumns: { title: string; dataKey: string }[];
    activeTab = 1;
    StudentList: any[] = [];
    selectedTab: number = 1;
    currentDate:Date = new Date();
    selectedStudents: any[] = [];
    paymentOrderRef: any = "";
    handleSelectedStudentChange(studentIds: any[]) {
        this.selectedStudents = [];
        studentIds.forEach((x) => {
            let index = this.StudentList.findIndex(s => s.KidId == x);
            if (index != -1) {
                this.selectedStudents.push(this.StudentList[index]);
            }
        })
    }

    pendingPaymentsLoaded$: Subject<boolean> = new Subject<boolean>();
    studentListLoaded$: Subject<boolean> = new Subject<boolean>();
    selectedStudent: any;
    statmentStartDate: any = null;
    statmentEndDate: any = null;

    @ViewChild('paymentModal') set paymentModal(elem: any) {
        this.paymentModalRef = elem;
    }
    @ViewChild('paymentSuccessModal') set paymentSuccessModal(elem: any) {
        this.paymentSuccessModalRef = elem;
    }
    @ViewChild('paymentDeclinedModal') set paymentDeclinedModal(elem: any) {
        this.paymentDeclinedModalRef = elem;
    }
    @ViewChild('paymentAlreadyPaidModal') set paymentAlreadyPaidModal(elem: any) {
        this.paymentAlreadyPaidModalRef = elem;
    }
    @ViewChild('paymentPaidDetailsModal') set paymentPaidDetailsModal(elem: any) {
        this.paymentPaidDetailsModalRef = elem;
    }
    @ViewChild('paymentFailureModal') set paymentFailureModal(elem: any) {
        this.paymentFailureModalRef = elem;
    }
    setTab(tab: string) {
        this.tabName = tab;
    }
    subscriptions: Subscription[] = [];

    constructor(
        private modalService: NgbModal,
        private service: FeesPaymentsService,
        private router: Router,
        private route: ActivatedRoute,
        private sharedService: SharedService,
        public translate: TranslateService,
        private dataService: DataService,
        private toastrService: ToastrService,
        public actionRequiredModalService: ActionRequiredModalQueueService,
        @Inject(LOCALE_ID) private locale: string
    ) {
        this.getScreenSize();
        let loggedInUser = JSON.parse(localStorage.getItem('SN_USER_INFO') ?? '{Id:0}').Id;
        this.loggedInUserId = loggedInUser;
        this.feeDueStudents = [];
        this.sharedService.feeDueStudents$.subscribe((res: any) => {
            this.feeDueStudents = res ?? [];
            this.setStudentSelection();
            this.getInitialPendingPayments();
        })
        this.getKidPaymentsByParentId();
        // to enable menu based on permission
        this.subscriptions.push(
            this.sharedService
                .getParentMenuDetailsById(this.loggedInUserId)
                .subscribe((res: any) => {
                    if (res) {
                        sharedService.changeParentCurrentMenu(
                            res.CurrentMenu == undefined || res.CurrentMenu == 0
                                ? 0
                                : res.CurrentMenu
                        );
                        sharedService.setIsVerificationStarted(
                            res.isVerificationStarted == undefined
                                ? false
                                : res.isVerificationStarted
                        );
                    }
                })
        );
        this.showLoader = false;
        // setTimeout(() => {
        //     this.showLoader = true;
        // }, 5000);
        this.getParentPendingPayments(loggedInUser);
        this.getParentUpcomingPayments(loggedInUser);
        this.getParentPaymentHistory(loggedInUser);

        this.columns = [
            { field: 'ReceiptNo', header: 'Receipt No' },
            { field: 'DueDate', header: 'Payment Date' },
            { field: 'Description', header: 'Description' },
            { field: 'PaymentDate', header: 'Paid Date' },
            { field: 'Amounts', header: 'Amount' },
        ];

        this.dataService.languageChanged$.subscribe((data) => {
            if (data != null) {
                this.selectedLanguage = data.language;
            } else {
                this.selectedLanguage = localStorage.getItem("SN_CURRENT_LANG") ?? "ar";
            }
        });
        // if(this.feeDueStudents?.length == 0){
        //     this.sharedService.openFeeDueActionRequiredModal();
        // }
    }
    ngOnInit() {
        // A full-page checkout loses Angular router state. On return (or Back),
        // verify the saved order with the backend; browser state is not proof of payment.
        if (!this.route.snapshot.queryParamMap.has('telrRefNo')) {
            const pendingPayment = sessionStorage.getItem('telr.pendingPayment');
            if (pendingPayment) {
                try {
                    const context = JSON.parse(pendingPayment);
                    if (Number(context.parentId) === Number(this.loggedInUserId)) {
                        this.checkOrderStatus(context);
                    }
                } catch {
                    sessionStorage.removeItem('telr.pendingPayment');
                }
            }
        }
        this.route.queryParams.subscribe((params) => {
            if (params['telrRefNo']) {
                this.showLoader = false;
                this.checkOrderStatus(params);
            }
            if (params['status'] == 'Reload') {
                this.openPaymentFailureModal();
            }
            if (params['paymentId']) {
                this.openPaymentModalFromQueryParams(params['paymentId']);
            }
            if (params['kidId']) {
                this.selectedTab = 2;
                this.openStudentPaymentHistoryFromQueryParams(params['kidId']);
            }
        });

        // if (history?.state?.data?.status === 'redirect') {
        //     this.showLoader = false;
        //     this.checkOrderStatus(history?.state?.data);
        // }


    }

    ngAfterViewInit(){
        this.paymentOrderRef = history?.state?.data?.OrderRef;
        if(history?.state?.data?.status){
            if(history?.state?.data?.status === 'success'){
                setTimeout(() => {
                    this.modalService.open(this.paymentSuccessModalRef, {
                        ariaLabelledBy: 'modal-basic-title',
                        backdrop: 'static',
                        windowClass: 'modal-dialog-success',
                    });
                    history.replaceState({}, ''); // Clear the history state
                },100)
            } else if(history?.state?.data?.status === 'declined'){
                setTimeout(() => {
                    this.modalService.open(this.paymentDeclinedModalRef, {
                        ariaLabelledBy: 'modal-basic-title',
                        backdrop: 'static',
                        windowClass: 'modal-dialog-declined',
                    });
                    history.replaceState({}, ''); // Clear the history state
                },100)

            } else if(history?.state?.data?.status === 'canceled'){
                setTimeout(() => {
                    this.modalService.open(this.paymentFailureModalRef, {
                        ariaLabelledBy: 'modal-basic-title',
                        backdrop: 'static',
                        windowClass: 'modal-dialog-canceled',
                    });
                    history.replaceState({}, ''); // Clear the history state
                },100)
            }
            this.checkOrderStatus(history?.state?.data);
        }
    }

    openSuccessModal() {
        if (this.isPaymentSuccessfull) {
            this.modalService.open(this.paymentSuccessModalRef, {
                ariaLabelledBy: 'modal-basic-title',
                backdrop: 'static',
            });
        } else {
            this.modalService.open(this.paymentFailureModalRef, {
                ariaLabelledBy: 'modal-basic-title',
                backdrop: 'static',
            });
        }
    }
    openPaymentFailureModal() {
        setTimeout(() => {
            this.modalService.open(this.paymentFailureModalRef, {
                ariaLabelledBy: 'modal-basic-title',
                backdrop: 'static',
            });
        }, 500);
        this.router.navigate(['/home/parent/fees']);
    }

    openStudentPaymentHistoryFromQueryParams(studentId: any) {
        this.showLoader = false;
        this.studentListLoaded$.subscribe((loaded) => {
            if (loaded) {
                this.StudentList.map((x) => { x.selected = false; return x });
                const index = this.StudentList.findIndex((x) => x.KidId == studentId);
                this.StudentList[index].selected = true;
                this.router.navigate(['/home/parent/fees']);
                window.scrollTo(0, 0);
            }
        })
    }
    alreadyPaidPayments: any[] = [];
    pendingAmount: any = 0;
    openPaymentModalFromQueryParams(pId: any) {
        this.showLoader = false;
        this.pendingPaymentsLoaded$.subscribe((loaded) => {
            if (loaded) {
                const paymentData = this.pendingPayments.find(x => x.Id == pId);
                this.showLoader = true;
                this.openPaymentModal({ payments: [paymentData], totalAmount: paymentData.Amount });
            } else {

            }
        })
    }
    async openPaymentModal(pendingData: any, confirmed: boolean = true) {
        if (this.selectedPayments.length > 1 && !confirmed) {
            this.modalService.open(this.paymentModalRef, {
                ariaLabelledBy: 'modal-basic-title',
                backdrop: 'static',
            });
            return;
        }
        this.showLoader = false;
        setTimeout(() => {
            this.showLoader = true;
        }, 5000);
        const Language = (await firstValueFrom(this.sharedService.isRTL$))
            ? 'ar'
            : 'en';
        let paymentData: any[] = pendingData.payments;
        paymentData.sort((a, b) => a.KidInfoId - b.KidInfoId);

        let tempArrays: any[] = [];
        let currentKidInfoId: any = null;
        let tempArray: any = null;

        paymentData.forEach(payment => {
            if (payment.KidInfoId !== currentKidInfoId) {
                tempArray = [];
                tempArrays.push(tempArray);
                currentKidInfoId = payment.KidInfoId;
            }

        tempArray.push(payment);
        });

        tempArrays.map((y:any)=>{

            let walletamount:any=y?.[0]?.wallet?.Balance
            y.map((x:any)=>{
                if(x.isCheckSelectWalletamount){
                    x.WalletMoney = walletamount > 0 && walletamount > x.Amount ? x.Amount :  walletamount
                    walletamount > 0 ?  walletamount = Math.max(0,walletamount - x.Amount) : walletamount = 0
                }
                else if (!x.isCheckSelectWalletamount){
                    x.WalletMoney=0
                }
            })


        })

        const paymentIds = paymentData.map((x) => { return x.Id });
        const kidInfoIds = paymentData.map((x) => { return x.KidInfoId })
        const walletInfoIds = paymentData.map(x => {
            return {
                kidInfoId: x.KidInfoId,
                includeWalletBalance: x.wallet==undefined || !x.isCheckSelectWalletamount ||  x.WalletMoney==0 ? false : true,
                walletAmount: x.isCheckSelectWalletamount  ? x.WalletMoney : 0
            };
        });
        let loggedInUserId = JSON.parse(
            localStorage.getItem('SN_USER_INFO') ?? '{Id:0}'
        ).Id;
        const data = {
            Amount: pendingData.totalAmount,
            Currency: 'AED',
            paymentIds: paymentIds,
            kidInfoIds: kidInfoIds,
            kidInfoId: kidInfoIds[0],
            walletKidInfoIds:walletInfoIds,
            ParentId: loggedInUserId,
            Description: paymentData[0]?.Description,
            Declined: environment.declinedURL,
            Return_Canceled: environment.returnCanceledURL,
            Return_Authenticated: environment.returnAuthenticatedURL,
            Return_Declined: environment.returnDeclinedURL,
            Language,
        };


       this.service.addPayment(data).subscribe((res: any) => {
            this.showLoader = true;
            if(res == "No pending payments selected") {
                this.modalService.open(this.paymentAlreadyPaidModalRef, {
                    ariaLabelledBy: 'modal-basic-title',
                    backdrop: 'static',
                });
                this.getParentPendingPayments(this.loggedInUserId);
                this.getParentUpcomingPayments(this.loggedInUserId);
                this.getParentPaymentHistory(this.loggedInUserId);
                this.getKidPaymentsByParentId();
            } else if(res?.alreadyPaidPayments && res?.alreadyPaidPayments?.length > 0 && res?.response) {
                this.alreadyPaidPayments = res?.alreadyPaidPayments;
                let response = JSON.parse(res?.response);
                let alreadyPaidIds = this.alreadyPaidPayments.map((x: any) => x.Id);
                paymentData = paymentData.filter((x: any) => !alreadyPaidIds.includes(x.Id));
                this.paymenturl = response.TransactionUrl;
                this.orderRefNo = response.OrderRef;
                this.completedPaymentData = paymentData;
                this.paymentData = response;
                this.isShowing = true;
                this.pendingAmount = res?.Amount;
                this.modalService.open(this.paymentPaidDetailsModalRef, {
                    ariaLabelledBy: 'modal-basic-title',
                    backdrop: 'static',
                    size: 'lg',
                    centered: true
                });
            } else if(res?.response) {
                let response = JSON.parse(res?.response);
                this.paymenturl = response.TransactionUrl;
                this.orderRefNo = response.OrderRef;
                this.completedPaymentData = paymentData;
                this.paymentData = response;
                this.isShowing = true;
                this.navigateToTarget(response, paymentData, res?.Amount);
            }
        });
    }

    payPendingPayments() {
        this.navigateToTarget(this.paymentData, this.completedPaymentData, this.pendingAmount);
    }

    getSelectedPaymentSum() {
        return this.selectedPayments.reduce((x: any, y: any) => parseFloat(x) + parseFloat(y.Amount), 0);
    }

    makeBulkPayment() {
        this.pendingPayments.forEach((x: any) => {
            x.selected = false;
        });
        this.selectedPayments = [];
        this.modalService.dismissAll();
    }

    onSelectDeselectPendingPayment(event: any, payment: any) {
        if (event.checked == true) {
            this.selectedPayments.push(payment);
        }
        else {
            let p = this.selectedPayments.findIndex(x => x.Id == payment.Id);
            if (p >= 0)
                this.selectedPayments.splice(p, 1)
        }
    }

    getParentPendingPayments(parentId: any) {
        this.service.getParentPendingPayments(parentId).subscribe((res) => {
            res = res.map((x: any) => { x.selected = false; return x; })
            this.pendingPayments = res ?? [];
            this.pendingPaymentsLoaded$.next(true);
            this.showLoader = this.checkingStatus? false : true;
        });
    }
    getParentUpcomingPayments(parentId: any) {
        this.service.getParentUpcomingPayments(parentId).subscribe((res) => {
            this.upcomingPayments = res ?? [];
            this.showLoader = this.checkingStatus? false : true;
        });
    }
    getParentPaymentHistory(parentId: any) {
        this.service.getParentPaymentHistory(parentId).subscribe((res) => {
            this.paymentHistory = res ?? [];
            this.showLoader = this.checkingStatus? false : true;
        });
    }
    navigateToTarget(data: any, payment: any[], totalAmount: any) {
        let loggedInUser = JSON.parse(
            localStorage.getItem('SN_USER_INFO') ?? '{Id:0}'
        ).Id;
        const paymentIds = payment.map((x) => { return x.Id });
        const kidInfoIds = payment.map((x) => { return x.KidInfoId })
        const customData = {
            data: {
                ...(data ?? {}),
                telrRefNo: data.OrderRef,
                TransactionUrl: data.TransactionUrl,
                paymentIds: paymentIds,
                KidInfoIds: kidInfoIds,
                parentId: loggedInUser,
                amount: totalAmount,
            },
        };

        const navigationExtras: NavigationExtras = {
            state: customData,
        };
        this.pendingAmount = 0;
        this.router.navigate(
            ['/home/parent/payment-gateway'],
            navigationExtras
        );
        // const newWindow = window.open(data.TransactionUrl, '_blank');
        // this.showLoader=false
        // if (newWindow) {
        //     // The new window was opened successfully
        //     const checkUrlInterval = setInterval(() => {
        //       if (newWindow.location.href === 'http://localhost:4200/login') {
        //         clearInterval(checkUrlInterval);

        //         // The URL of the new tab has changed to 'http://localhost:4200/login'
        //         newWindow.close();

        //         // Get the query parameters from the original tab
        //         const originalQueryParams = new URLSearchParams(window.location.search);

        //         // Add additional query parameter to the original URL
        //         originalQueryParams.set('telrRefNo', this.orderRefNo);
        //         originalQueryParams.set('paymentId', payment?.Id);
        //         originalQueryParams.set('KidInfoId', payment?.KidInfoId);
        //         originalQueryParams.set('parentId', payment?.ParentId);

        //         // Redirect back to the original tab with the updated URL
        //         window.location.href = window.location.pathname + '?' + originalQueryParams.toString();
        //         this.showLoader=true
        //         // this.route.queryParams.subscribe((params)=>{
        //         //     if(params['telrRefNo']){
        //         //         this.checkOrderStatus()
        //         //     }
        //         //    }

        //         // )
        //       }
        //     }, 100);

        //   } else {
        //     // The new window was blocked by the browser's popup blocker
        //     // You can inform the user or handle the situation as appropriate
        //   }
    }

    checkOrderStatus(params: any) {
        // this.showLoader = false;
        // this.checkingStatus = true;
        let paymentId = params['paymentIds'];
        let kidInfoId = params['KidInfoIds'];
        let parentId = Number(params['parentId']);
        this.orderRefNo = params['telrRefNo'];
        this.actionRequiredModalService.removeChildGracePeriodModalFromQueue();
        history.replaceState({}, '');
        const queryParams = {};
        this.router.navigate([], {
            queryParams: queryParams,
            replaceUrl: true,
            relativeTo: this.route,
        });
        if (paymentId && kidInfoId && this.orderRefNo != '') {
            // this.showLoader = false;
            let checkStatusData = {
                telrRefNo: this.orderRefNo,
                paymentId: Array.isArray(paymentId) ? paymentId[0] : paymentId,
                kidInfoId: Array.isArray(kidInfoId) ? kidInfoId[0] : kidInfoId,
                parentId: parentId,
            };
            this.service
                .checkPaymentStatus(checkStatusData)
                .subscribe((res) => {
                    if (res === 'Paid') {
                        sessionStorage.removeItem('telr.pendingPayment');
                    }
                    // this.checkingStatus = false;
                    if (res == 'Paid') {
                        // this.modalService.open(this.paymentSuccessModalRef, {
                        //     ariaLabelledBy: 'modal-basic-title',
                        //     backdrop: 'static',
                        // });
                        // this.getParentPendingPayments(this.loggedInUserId);
                        // this.getParentUpcomingPayments(this.loggedInUserId);
                        // this.getParentPaymentHistory(this.loggedInUserId);
                        this.getKidPaymentsByParentId();
                    } else {
                        // this.modalService.open(this.paymentFailureModalRef, {
                        //     ariaLabelledBy: 'modal-basic-title',
                        //     backdrop: 'static',
                        // });
                    }
                    this.orderRefNo = '';
                    this.completedPaymentData = null;
                    // this.showLoader=true;
                });
        }
        else{
            // this.checkingStatus = false;
        }
    }
    // this.router.navigate(['/home/parent/payment-gateway'], navigationExtras);
    ngOnDestroy(): void {
        if (this.subscriptions && this.subscriptions.length > 0) {
            this.subscriptions.forEach((x) => {
                x.unsubscribe();
            });
        }
    }

    isFileHidden: boolean = true;

    printTableToPDF(payment: any) {

        this.currentObj = payment;
        // this.isFileHidden = false;
        // document.body.classList.add('preventScrollOnLoading');
        this.showSpinner = true;
        this.service.getReceiptForDownload(payment?.payemt?.Id).subscribe((response: any) => {
            if(response?.Message == "Success") {
                const base64 = response.Data;
                const contentType = response.ContentType;

                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: contentType });
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL);
            }
            else {
                this.toastrService.error(this.translate.instant(response?.Message));
            }
            this.showSpinner = false;
        });
        // setTimeout(() => {
        //     this.viewReceiptForPrint();
        //     setTimeout(() => {
        //         document.body.classList.remove('preventScrollOnLoading');
        //         this.showSpinner = false;
        //     }, 5000);
        // }, 100);
    }
    // printPage() {
    //     const doc = new jsPDF('p', 'mm', 'a4');
    //     const element = document.getElementById('example6');
    //     if (element) {
    //         doc.html(element, {
    //             callback: function (pdf) {
    //                 pdf.autoPrint();
    //                 window.open(pdf.output('bloburl'));
    //             },
    //         });
    //     } else {
    //         console.error('Table Not Found');
    //     }
    // }

    getPageSize(): number[] {
        return this.pageSize.value;
    }

    getOrientation(): 'p' | 'l' {
        return this.orientation == 'p' ? 'p' : 'l';
    }

    printPageStyle() {
        if (this.currentObj != null) {
            this.exportColumns = this.columns.map((col) => ({
                title: this.translate.instant(col.header),
                dataKey: col.field,
            }));

            this.currentObj.DueDate = this.currentObj.DueDate =
                this.currentObj.DueDate != null && this.currentObj.DueDate != ''
                    ? formatDate(
                        (this.currentObj.DueDate = new Date(
                            this.currentObj.DueDate
                        )),
                        'd-MMMM-y',
                        this.locale
                    )
                    : '';

            this.currentObj.payemt.PaymentDate =
                this.currentObj.payemt.PaymentDate != null &&
                    this.currentObj.payemt.PaymentDate != ''
                    ? formatDate(
                        (this.currentObj.payemt.PaymentDate = new Date(
                            this.currentObj.payemt.PaymentDate
                        )),
                        'd-MMMM-y',
                        this.locale
                    )
                    : '';
            this.currentObj.payemt.Amounts =
                (this.currentObj.payemt.Amount != null && this.currentObj.payemt.Amount != ''
                    ? this.currentObj.payemt.Amount
                    : 0) + ' AED';
            const doc = new jsPDF({
                orientation: this.getOrientation(),
                unit: 'mm',
                format: this.getPageSize(),
                compress: true,
            });
            add_Amiri(doc);
            autoTable(doc, {
                didDrawPage: (data) => {
                    doc.setDrawColor(0); // Black color for the border
                    doc.setLineWidth(.50); // Set line width for the border
                    doc.rect(
                        4,
                        4,
                        doc.internal.pageSize.getWidth() - 9,
                        doc.internal.pageSize.getHeight() - 10,
                        'S'
                    );
                    //Header Start
                    const imgIcon = '../../../../assets/images/main-logo.png';

                    doc.addImage(imgIcon, 'PNG', 30, 11, 120, 20);
                    doc.setFontSize(9);
                    doc.setFont('Amiri', 'bold');
                    doc.setTextColor('#000000');
                    doc.text(
                        `Tel: ${'*****************'}`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.22,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.97
                    );
                    doc.text(
                        `Mob: ${'+971 6 506 2222'}`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.22,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.96
                    );
                    doc.text(
                        `Fax: ${'info@sea.ac.ae'}`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.22,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.95
                    );
                    doc.text(
                        `P.O Box: ${'1655'}`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.22,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.94
                    );
                    doc.text(
                        `Address:`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.22,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.93
                    );
                    doc.text(
                        wrapText(`Behind Capital Cultural Monument, University city, Sharjah, UAE.`, 32),
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.22,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.92
                    );
                    //Header End
                    //Recepit

                    doc.setFont('Amiri', 'bold');
                    doc.setTextColor('#000000');
                    doc.setFontSize(13);
                    doc.text(
                        `سند القبض`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.55,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.85
                    );
                    doc.setLineWidth(0.5);
                    doc.line(
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.6,
                        doc.internal.pageSize.getHeight() * 0.15 + 2,
                        doc.internal.pageSize.getWidth() * 0.6,
                        doc.internal.pageSize.getHeight() * 0.15 + 2
                    );
                    doc.setFont('bold');
                    doc.setFontSize(13);
                    doc.text(
                        `RECEIPT VOCHER`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.6,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.83
                    );
                    doc.setFont('Amiri', 'bold');
                    doc.setFontSize(10);
                    doc.text(
                        `Date: ${new Date().toDateString()}`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.25,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.84
                    );
                    doc.text(
                        `تاريخ`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.07,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.84
                    );
                    doc.setFont('Amiri', 'bold');
                    doc.setFontSize(10);

                    const lineHeight = 8;
                    function wrapText(text: string, maxLength: number): string {
                        const words = text.split(' ');
                        let line = '';
                        let result = '';

                        for (const word of words) {
                            if ((line + word).length > maxLength) {
                                result += line.trim() + '\n';
                                line = '';
                            }
                            line += word + ' ';
                        }

                        if (line.length > 0) {
                            result += line.trim();
                        }

                        return result;
                    }

                    doc.text(
                        `Receipt No: `,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.9,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.78
                    );
                    doc.text(
                        this.currentObj.payemt.ReceiptNo,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.7,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.78
                    );
                    doc.text(
                        `:رقم الإيصال`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.5,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.78
                    );

                    doc.text(
                        `Paid Date: `,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.4,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.78
                    );
                    doc.text(
                        this.currentObj.payemt.PaymentDate,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.3,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.78
                    );
                    doc.text(
                        `:تاريخ المدفوعة`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.13,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.78
                    );

                    doc.text(
                        `Received from Mr./M/s :`,
                        doc.internal.pageSize.getWidth() - doc.internal.pageSize.getWidth() * 0.9,
                        doc.internal.pageSize.getHeight() - doc.internal.pageSize.getHeight() * 0.75,

                    );
                    doc.text(
                        wrapText(this.currentObj.FullNameInEnglish + "  " + this.currentObj.FullNameInArabic, 58),
                        doc.internal.pageSize.getWidth() - doc.internal.pageSize.getWidth() * 0.7,
                        doc.internal.pageSize.getHeight() - doc.internal.pageSize.getHeight() * 0.75
                    );
                    doc.text(
                        `: وردت من السيد / م / س`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.2,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.75
                    );
                    doc.text(
                        `Dhs.: ${this.currentObj.payemt.Amounts}`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.9,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.71 + lineHeight
                    );
                    doc.text(
                        ` :درهم`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.75,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.71 + lineHeight
                    );
                    doc.text(
                        `The Sum of Dhs.: `,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.7,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.71 + lineHeight
                    );
                    doc.text(
                        this.currentObj.AmountInText,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.55,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.71 + lineHeight
                    );
                    doc.text(
                        ` :مجموع درهم`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.13,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.71 + lineHeight
                    );
                    doc.text(
                        `Description : `,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.9,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.68 + lineHeight
                    );
                    doc.text(
                        this.currentObj.payemt.Description,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.8,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.68 + lineHeight
                    );
                    doc.text(
                        ` :وصف`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.1,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.68 + lineHeight
                    );

                    doc.text(
                        `Payment Type: `,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.9,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.65 + lineHeight
                    );
                    doc.text(
                        this.currentObj.payemt.PaymentType.Type,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.7,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.65 + lineHeight
                    );
                    doc.text(
                        ` :نوع الدفع`,
                        doc.internal.pageSize.getWidth() -
                        doc.internal.pageSize.getWidth() * 0.11,
                        doc.internal.pageSize.getHeight() -
                        doc.internal.pageSize.getHeight() * 0.65 + lineHeight
                    );
                },
            });

            // doc.save("payslip.pdf");
            doc.output('dataurlnewwindow');
        }
    }
    getInitialPendingPayments() {
        this.selectedStudents = this.StudentList.filter(x => x.selected == true);
    }
    getKidPaymentsByParentId() {
        this.service.getKidsPaymentByParentId(this.loggedInUserId).subscribe((res) => {
            this.StudentList = res ?? [];
            if(this.StudentList && this.StudentList.length > 0) {
                this.StudentList[0].selected = true;
                this.setStudentSelection();
                this.studentListLoaded$.next(true);
                this.getInitialPendingPayments();
            }
        })
    }
    onConvertingToInstallment(event: any) {
        if (event) {
            this.getKidPaymentsByParentId();
        }
    }
    changeSelectedStudents() {
        if (this.selectedTab == 1) {
            this.StudentList.map((s: any) => { s.selected = false; return s; });
            this.selectedStudents = this.StudentList.filter(x => x.selected == true);
        }
    }
    viewReceiptForPrint() {
        var htmlContent = document.createElement('div');
        htmlContent.innerHTML = this.pdfContainer.nativeElement.innerHTML;
        document.getElementById('printPreviewHiddenContainer')?.appendChild(htmlContent);
        const doc = new jsPDF({
            orientation: this.getOrientation(),
            unit: 'mm',
            format: this.getPageSize(),
            compress: true,
        });
        let receiptTitle: string = `${this.currentObj?.payemt?.ReceiptNo}.pdf`;
        doc.setProperties(
            {
                title: receiptTitle
            }
        )
        add_Amiri(doc);
        doc.setDrawColor('#ccc');
        doc.setLineWidth(.50);
        doc.rect(
            10,
            10,
            doc.internal.pageSize.getWidth() - 20,
            doc.internal.pageSize.getHeight() - 20,
            'S'
        );
        this.isFileHidden = true;
        doc.html(htmlContent, {
            callback: function (d) {
                if (document.getElementById('printPreviewHiddenContainer')) {
                    document.getElementById('printPreviewHiddenContainer')!.innerHTML = "";
                }
                d.output('dataurlnewwindow', {
                    filename: receiptTitle
                });
            },
            x: 17,
            y: 17,
            width: 176,
            windowWidth: 1000
        });
    }

    private downloadStatmentsModal: any;
    @ViewChild('downloadStatments') set downloadStatmentsModalRef(elem: any) {
        this.downloadStatmentsModal = elem;
    };
    formSubmitted: boolean = false;
    openDownloadModal() {
        this.selectedStudent = this.StudentList[0];
        let date = new Date();
        this.statmentStartDate = new Date(date.getFullYear(), date.getMonth() - 1, date.getDate());
        this.statmentEndDate = new Date();
        this.statmentEndDate.setHours(23, 59, 59, 999);
        this.walletStatement = {
            Balance: 0,
            Id: 0,
            KidInfo: {},
            WalletTransaction: []
        }
        this.formSubmitted = false;
        this.modalService.open(this.downloadStatmentsModal, {
            ariaLabelledBy: 'modal-basic-title',
            centered: true,
            size: 'xl',
            scrollable: true,
            backdropClass: 'backdrop',
            backdrop: 'static',
            windowClass: 'custom-checkinout-modal'
        })
    }

    showTableLoader: boolean = false;
    getWalletStatement(form: NgForm) {
        this.formSubmitted = true;
        if (form?.valid) {
            this.showTableLoader = true;
            this.service.getWalletStatement(this.selectedStudent?.KidId, this.statmentStartDate, this.statmentEndDate).subscribe((res: any) => {
                if (res?.WalletTransaction?.length > 0) {
                    this.walletStatement = res;
                    this.walletStatement.DebitSum = res?.WalletTransaction.filter((x:any)=>x.IsOutTransaction).reduce((x: any, y: any) => parseFloat(x) + parseFloat(y.Amount), 0)
                    this.walletStatement.CreditSum = res?.WalletTransaction.filter((x:any)=>!x.IsOutTransaction).reduce((x: any, y: any) => parseFloat(x) + parseFloat(y.Amount), 0)
                } else if (res == "Wallet not found" || res?.WalletTransaction?.length == 0) {
                    this.walletStatement = {
                        Balance: 0,
                        Id: 0,
                        KidInfo: {},
                        WalletTransaction: [],
                    }
                } else {
                    this.toastrService.error(this.translate.instant("Something went wrong. Try again later"));
                }
                setTimeout(() => {
                    this.showTableLoader = false;
                }, 100)
            })
        } else {
            form.form.markAllAsTouched();
        }
    }

    walletStatement: any = {
        Balance: 0,
        Id: 0,
        KidInfo: {},
        WalletTransaction: [],
    };

    printLoader: boolean = false;
    printStatments() {
        if (this.walletStatement?.WalletTransaction.length > 0) {
            this.printLoader = true;
            var htmlContent = document.createElement('div');
            htmlContent.innerHTML = this.statmentsRef.nativeElement.innerHTML;
            const doc = new jsPDF({
                orientation: this.getOrientation(),
                unit: 'mm',
                format: this.getPageSize(),
                compress: true,
            });
            let receiptTitle: string = `${this.selectedStudent?.FullNameInEnglish} statement.pdf`;
            doc.setProperties(
                {
                    title: receiptTitle
                }
            )
            add_Amiri(doc);
            doc.setDrawColor('#ccc');
            doc.setLineWidth(.50);
            doc.rect(
                10,
                10,
                doc.internal.pageSize.getWidth() - 20,
                doc.internal.pageSize.getHeight() - 20,
                'S'
            );
            this.isFileHidden = true;
            doc.html(htmlContent, {
                callback:(d) =>{
                    d.output('dataurlnewwindow', {
                        filename: receiptTitle
                    });
                    setTimeout(() => {
                        this.printLoader = false;
                    }, 1000);
                },
                x: 17,
                y: 17,
                width: 176,
                windowWidth: 1000
            }
            );

        } else {
            this.toastrService.warning(this.translate.instant("No Data"), "", { timeOut: 3000 })
        }
    }

    setStudentSelection(){
        if(this.feeDueStudents?.length > 0 && this.StudentList?.length > 0){
            this.StudentList[0].selected = false;
            let kidIds = this.feeDueStudents?.map((x:any)=>x?.KidInfoId);
            this.StudentList?.forEach((x:any)=>{
                if(kidIds?.includes(x?.KidId)){
                    x.selected = true;
                }
            })
        }
    }
    clearStatment() {
        this.selectedStudent = null;
        this.statmentEndDate = null;
        this.statmentStartDate = null;
    }

    clearActionRequiredModalRef(){
        this.actionRequiredModalService.setchildsGracePeriod(null);
        this.sharedService.openFeeDueActionRequiredModal();
        this.actionRequiredModalService.clearActionRequiredModalRef(null);
    }
}
