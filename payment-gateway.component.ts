import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-payment-gateway',
    templateUrl: './payment-gateway.component.html',
    styleUrls: ['./payment-gateway.component.css'],
})
export class PaymentGatewayComponent implements OnInit {
    private readonly data: any;

    constructor(private router: Router) {
        this.data = this.router.getCurrentNavigation()?.extras.state?.['data'];
    }

    ngOnInit(): void {
        try {
            const url = new URL(this.data?.TransactionUrl);
            // Only allow Telr-hosted HTTPS checkout, never arbitrary router URLs.
            if (url.protocol !== 'https:' || url.username || url.password ||
                (url.port && url.port !== '443') ||
                !(url.hostname === 'telr.com' || url.hostname.endsWith('.telr.com'))) {
                throw new Error('Invalid payment gateway URL');
            }
            if (!this.data?.telrRefNo || !this.data?.paymentIds?.length ||
                !this.data?.KidInfoIds?.length || !this.data?.parentId) {
                throw new Error('Missing payment context');
            }

            // Keep only the identifiers needed for server-side status verification.
            // Router state alone is lost when leaving the application.
            sessionStorage.setItem('telr.pendingPayment', JSON.stringify({
                telrRefNo: this.data.telrRefNo,
                paymentIds: this.data.paymentIds,
                KidInfoIds: this.data.KidInfoIds,
                parentId: this.data.parentId,
            }));
            window.location.assign(url.href);
        } catch {
            this.router.navigate(['/home/parent/fees'], {
                queryParams: { status: 'Reload' },
                replaceUrl: true,
            });
        }
    }
}
