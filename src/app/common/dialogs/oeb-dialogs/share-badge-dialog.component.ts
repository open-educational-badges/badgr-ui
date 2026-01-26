import { AfterViewInit, Component, inject, NgZone, signal, WritableSignal } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';

import { TranslateModule } from '@ngx-translate/core';
import { OebDialogComponent } from '~/components/oeb-dialog.component';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { HlmDialogModule } from '@spartan-ng/helm/dialog';
import { HlmH3, HlmP } from '@spartan-ng/helm/typography';
import { RecipientBadgeInstance } from '~/recipient/models/recipient-badge.model';
import { Issuer } from '~/issuer/models/issuer.model';

export interface ShareBadgeDialogContext {
	badge: RecipientBadgeInstance;
}

const COPY_NOTIF_TIMEOUT_MS: number = 3000;

@Component({
	selector: 'share-badge-dialog',
	standalone: true,
	imports: [TranslateModule, OebDialogComponent, OebButtonComponent, HlmDialogModule, HlmH3, HlmP],
	template: `
		<oeb-dialog [variant]="'default'">
			<hlm-dialog-header>
				<h3 hlmH3 class="oeb tw-text-purple tw-uppercase tw-font-bold tw-pb-4">
					{{ 'RecBadgeDetail.shareBadge' | translate }}
				</h3>
			</hlm-dialog-header>
			<p hlmP class="oeb tw-text-base tw-font-bold tw-pb-1">{{ 'RecBadge.shareViaLink' | translate }}</p>
			<div class="tw-flex tw-flex-row tw-gap-2 tw-pb-8 tw-pr-8 tw-relative">
				<input
					[value]="shareUrl"
					readonly
					class="tw-border-solid tw-border-purple tw-border-2 tw-rounded-lg  tw-px-2 tw-bg-white tw-grow"
				/>
				<oeb-button
					[text]="'General.copy' | translate"
					[variant]="'blackborder'"
					[weight]="'medium'"
					[size]="'sm'"
					(click)="copyToClipboard(shareUrl)"
				/>
				<span [hidden]="!copied()" class="tw-absolute tw-bottom-2">{{
					'BadgeCollection.copiedToClipboard' | translate
				}}</span>
			</div>
			<p hlmP class="oeb tw-text-base tw-font-bold tw-pb-1">{{ 'RecBadge.shareViaLinkedIn' | translate }}</p>
			<div class="tw-flex tw-flex-row tw-gap-2 tw-pr-8">
				<img
					src="../../../breakdown/static/scss/images/social-linkedin.svg"
					width="38"
					height="38"
					class="tw-rounded-lg tw-bg-[#0a66c2] tw-p-2"
				/>
				<oeb-button
					[text]="'RecBadge.addToLinkedInProfile' | translate"
					[size]="'sm'"
					(click)="shareOnLinkedIn()"
				/>
			</div>
			@if (hasLinkedInIdForInstitution()) {
				<p hlmP [size]="'sm'" class="oeb tw-text-xs tw-italic tw-pt-2">
					{{ 'RecBadge.shareWithoutLinkedInId' | translate }}
				</p>
			}
		</oeb-dialog>
	`,
})
export class ShareBadgeDialogComponent implements AfterViewInit {
	private zone = inject(NgZone);

	copied: WritableSignal<boolean> = signal(false);
	hasLinkedInIdForInstitution: WritableSignal<boolean> = signal(false);
	private readonly _dialogContext = injectBrnDialogContext<ShareBadgeDialogContext>();
	private readonly dialogRef = inject<BrnDialogRef>(BrnDialogRef);
	private issuer: Issuer = undefined;
	protected readonly context = this._dialogContext;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	ngAfterViewInit(): void {
		this.context.badge.issuerManager.issuerBySlug(this.context.badge.badgeClass.issuer.slug).then((i) => {
			this.issuer = i;
			this.hasLinkedInIdForInstitution.set((this.issuer.linkedinId?.length ?? 0) === 0);
		});
	}

	close() {
		this.dialogRef.close();
	}

	public cancel() {
		this.dialogRef.close('cancel');
	}

	public continue() {
		this.dialogRef.close('continue');
	}

	get shareUrl() {
		const baseUrl = window.location.origin;
		return `${baseUrl}/public/assertions/${this.context.badge.slug}`;
	}

	async copyToClipboard(input: string) {
		const valueToCopy = input;
		try {
			await navigator.clipboard.writeText(valueToCopy);
			this.zone.run(() => {
				this.copied.set(true);
				window.setTimeout(() => {
					this.copied.set(false);
				}, COPY_NOTIF_TIMEOUT_MS);
			});
		} catch (err) {
			console.warn(err);
			this.copied.set(false);
		}
	}

	async shareOnLinkedIn() {
		if (!this.issuer) return;

		const shareParams = new URLSearchParams({
			startTask: 'CERTIFICATION_NAME', // this is the name LinkedIn has given the task
			name: this.context.badge.badgeClass.name,
			organizationName: this.context.badge.badgeClass.issuer.name,
			issueYear: `${this.context.badge.issueDate.getFullYear()}`,
			issueMonth: ('0' + (this.context.badge.issueDate.getMonth() + 1)).slice(-2),
			expirationYear: this.context.badge.expiresDate
				? `${this.context.badge.expiresDate.getFullYear()}`
				: undefined,
			expirationMonth: this.context.badge.expiresDate
				? ('0' + (this.context.badge.expiresDate.getMonth() + 1)).slice(-2)
				: undefined,
			certUrl: this.shareUrl,
			certId: this.context.badge.slug,
			organizationId: this.issuer.linkedinId?.length > 0 ? this.issuer.linkedinId : undefined,
		});

		// clean out undefined values (which are converted to string)
		for (const [key, value] of shareParams) if (value === 'undefined') shareParams.delete(key);

		const linkedInUrl = new URL(`https://www.linkedin.com/profile/add?${shareParams}`);
		console.log(linkedInUrl);
		window.open(linkedInUrl, '_blank');
	}
}
