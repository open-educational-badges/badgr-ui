import { Component, inject } from '@angular/core';
import { BaseRoutableComponent } from '../../../common/pages/base-routable.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DangerDialogComponent } from '../../../common/dialogs/oeb-dialogs/danger-dialog.component';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { FormsModule } from '@angular/forms';
import { OebButtonComponent } from '../../../components/oeb-button.component';

@Component({
	selector: 'app-new-terms',
	templateUrl: './new-terms.component.html',
	imports: [RouterLink, OebCheckboxComponent, FormsModule, OebButtonComponent, TranslatePipe],
})
export class NewTermsComponent extends BaseRoutableComponent {
	private translate = inject(TranslateService);
	private profileManager = inject(UserProfileManager);

	confirmed = false;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route);
	}

	changeConfirmed(value) {
		this.confirmed = value;
	}

	sendConfirmation() {
		if (!this.confirmed) {
			this.openErrorDialog();
		} else {
			this.profileManager.userProfilePromise.then((profile) => {
				profile.agreeToLatestTerms().then(() => {
					this.router.navigate(['public/about/newsletter']);
				}).catch((error) => {
					console.error('Failed to agree to terms:', error);
				});
			}).catch((error) => {
				console.error('Failed to get profile:', error);
			});
		}
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openErrorDialog() {
		const dialogRef = this._hlmDialogService.open(DangerDialogComponent, {
			context: {
				caption: this.translate.instant('TermsOfService.cantUseWithoutConfirmation'),
				variant: 'danger',
				singleButtonText: this.translate.instant('TermsOfService.backToTerms'),
			},
		});
	}
}
