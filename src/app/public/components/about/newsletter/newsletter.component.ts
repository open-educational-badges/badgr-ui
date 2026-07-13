import { Component, AfterViewInit, ElementRef, OnInit, Renderer2, inject } from '@angular/core';
import { SuccessDialogComponent } from '../../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { HlmDialogService } from '../../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseRoutableComponent } from '../../../../common/pages/base-routable.component';
import { typedFormGroup } from '../../../../common/util/typed-forms';
import { Validators } from '@angular/forms';
import { UserProfileApiService } from '../../../../common/services/user-profile-api.service';
import { SessionService } from '../../../../common/services/session.service';

@Component({
	selector: 'about-newsletter',
	templateUrl: './newsletter.component.html',
	styleUrls: ['../about.component.css'],
	imports: [TranslatePipe],
})
export class NewsletterComponent extends BaseRoutableComponent implements OnInit, AfterViewInit {
	private translate = inject(TranslateService);
	private userProfileApiService = inject(UserProfileApiService);
	private sessionService = inject(SessionService);
	private renderer = inject(Renderer2);
	private elementRef = inject(ElementRef);

	newsletterForm = typedFormGroup({})
		.addControl('email', '', Validators.required)
		.addControl('firstName', '', Validators.required)
		.addControl('lastName', '', Validators.required);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);
	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route);
	}

	ngAfterViewInit(): void {
		if (!document.querySelector('script[src*="sibforms.com/forms/end-form/build/main.js"]')) {
			const scriptElement = this.renderer.createElement('script');
			scriptElement.src = 'https://sibforms.com/forms/end-form/build/main.js';
			this.renderer.appendChild(this.elementRef.nativeElement, scriptElement);
		}
	}

	ngOnInit(): void {
		this.userProfileApiService.getProfile().then((profile) => {
			this.userProfileApiService.fetchEmails().then((emails) => {
				this.newsletterForm.setValue({
					email: emails[0].email,
					firstName: profile.first_name,
					lastName: profile.last_name,
				});
			});
		});
	}

	subscribe() {
		this.router.navigate(['issuer']);
		this.openSuccessDialog();
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openSuccessDialog() {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				text: this.translate.instant('Newsletter.confirmedSubscription'),
				variant: 'success',
			},
		});
	}
}
