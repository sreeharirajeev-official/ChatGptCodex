import { animate, style, transition, trigger } from '@angular/animations';
import {
    Component,
    ElementRef,
    OnInit,
    ViewChild,
    AfterViewInit,
    HostListener,
    OnDestroy,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Navigation, Router } from '@angular/router';
import { Observable, Observer } from 'rxjs';

@Component({
    selector: 'app-payment-gateway',
    templateUrl: './payment-gateway.component.html',
    styleUrls: ['./payment-gateway.component.css'],
    animations: [
        trigger('loadingAnimation', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('80ms', style({ opacity: 1 })),
            ]),
        ]),
    ],
})
export class PaymentGatewayComponent implements OnInit, AfterViewInit {
    paymenturl: any;
    iframeLoaded: boolean = false;
    showLoader = true;
    @ViewChild('iframe', { static: false })
    iFrame!: ElementRef<HTMLIFrameElement>;
    iframeObserver$: Observable<boolean>;
    data: any;
    constructor(private sanitizer: DomSanitizer, private router: Router) {
        // setTimeout(() => {
        //     this.showLoader = false;
        // }, 1000);
        const navigation: Navigation | null =
            this.router.getCurrentNavigation();
        if (navigation && navigation.extras.state) {
            const customData: any = navigation.extras.state as {
                [key: string]: any;
            };

            this.data = customData?.data;

            this.paymenturl = customData.data.TransactionUrl;
            this.paymenturl = this.getSafeUrl(this.paymenturl);
        }
        else {
            let queryParams = {status: 'Reload'};
            this.router.navigate(['/home/parent/fees'], {
                queryParams: queryParams,
                replaceUrl: true
            });
        }
    }

    ngOnInit() {}
    ngAfterViewInit() {
        const iframe = this.iFrame.nativeElement;

        this.iframeObserver$ = new Observable((observer: Observer<boolean>) => {
            observer.next(false);
            const onLoad = (event: Event) => {
                observer.next(true);
                observer.complete();
                this.showLoader = false;
            };

            iframe.addEventListener('load', onLoad);

            return () => iframe.removeEventListener('load', onLoad);
        });
    }
    getSafeUrl(url: string): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    @HostListener('window:message', ['$event'])
    handleIframeMessage(event: MessageEvent): void {
        // let contentWindow=this.iFrame?.nativeElement?.contentWindow;
        // if (event.source === this.iFrame?.nativeElement.contentWindow || (contentWindow!=null &&
        //     contentWindow?.length>0 && event.source === contentWindow[0])) {
            // if (event.data && event.data === 'Payment Redirect') {
            //     const receivedData = event.data;
            //     this.router.navigate(['/home/parent/fees'], {
            //         state: {
            //             data: {
            //                 ...(this.data ?? {}),
            //                 status: 'redirect',
            //             },
            //         },
            //     });
            // }
        // }

        if(event.data === 'Payment Successful'){
            this.router.navigate(['/home/parent/fees'], {
                state: {
                    data: {
                        ...(this.data ?? {}),
                        status: 'success',
                    },
                },
            });
        } else if(event.data === 'Payment Declined'){
            this.router.navigate(['/home/parent/fees'], {
                state: {
                    data: {
                        ...(this.data ?? {}),
                        status: 'declined',
                    },
                },
            });
        } else if(event.data === 'Payment Canceled'){
            this.router.navigate(['/home/parent/fees'], {
                state: {
                    data: {
                        ...(this.data ?? {}),
                        status: 'canceled',
                    },
                },
            });
        }
    }
}
