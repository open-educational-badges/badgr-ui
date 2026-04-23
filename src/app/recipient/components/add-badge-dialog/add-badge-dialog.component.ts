import { Component, ViewChild, TemplateRef, inject, AfterViewInit } from '@angular/core';
import { RecipientBadgeManager } from '../../services/recipient-badge-manager.service';
import { FormBuilder } from '@angular/forms';
import { UrlValidator } from '../../../common/validators/url.validator';
import { JsonValidator } from '../../../common/validators/json.validator';
import { MessageService } from '../../../common/services/message.service';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { preloadImageURL } from '../../../common/util/file-util';
import { TypedFormControl, typedFormGroup } from '../../../common/util/typed-forms';
import { TranslateService } from '@ngx-translate/core';

import { ReactiveFormsModule } from '@angular/forms';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { DialogComponent } from '../../../components/dialog.component';
import { OebTabsComponent, Tab } from '../../../components/oeb-tabs.component';
import { TranslateModule } from '@ngx-translate/core';
import {
	UploadTabComponent,
	JsonTabComponent,
	UrlTabComponent,
} from '../upload-badge-tabs/upload-badge-tabs.component';
import { NgIcon } from '@ng-icons/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleX } from '@ng-icons/lucide';
import { Router } from '@angular/router';
import { OebButtonComponent } from '../../../components/oeb-button.component';

@Component({
	selector: 'add-badge-dialog',
	standalone: true,
	imports: [
		ReactiveFormsModule,
		UploadTabComponent,
		UrlTabComponent,
		JsonTabComponent,
		TranslateModule,
		OebTabsComponent,
		NgIcon,
		OebButtonComponent,
	],
	providers: [provideIcons({ lucideCircleX })],
	templateUrl: './add-badge-dialog.component.html',
	styleUrl: './add-badge-dialog.component.scss',
})
export class AddBadgeDialogComponent implements AfterViewInit {
	protected recipientBadgeManager = inject(RecipientBadgeManager);
	protected formBuilder = inject(FormBuilder);
	protected messageService = inject(MessageService);
	private translate = inject(TranslateService);
	private router = inject(Router);

	@ViewChild('dialogHeader') dialogHeader: TemplateRef<void>;
	@ViewChild('dialogContent') dialogContent: TemplateRef<void>;
	@ViewChild('uploadTabTemplate') uploadTabTemplate: TemplateRef<void>;
	@ViewChild('urlTabTemplate') urlTabTemplate: TemplateRef<void>;
	@ViewChild('jsonTabTemplate') jsonTabTemplate: TemplateRef<void>;
	@ViewChild('failureHeader') failureHeader: TemplateRef<void>;
	@ViewChild('failureContent') failureContent: TemplateRef<void>;

	readonly uploadBadgeImageUrl = '../../../../breakdown/static/images/image-uplodBadge.svg';
	readonly pasteBadgeImageUrl = preloadImageURL('../../../../breakdown/static/images/image-uplodBadgeUrl.svg');

	addRecipientBadgeForm = typedFormGroup()
		.addControl('image', null)
		.addControl('url', '', UrlValidator.validUrl)
		.addControl('assertion', '', JsonValidator.validJson);

	formError: string;
	currentTab: string = 'image';
	badgeUploadPromise: Promise<unknown>;
	tabs: Tab[] = [];

	private dialogRef: BrnDialogRef;
	private _hlmDialogService = inject(HlmDialogService);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	ngAfterViewInit() {
		// Initialize tabs after view is initialized to get template references
		setTimeout(() => {
			this.tabs = [
				{
					key: 'image',
					title: this.translate.instant('RecBadge.image'),
					component: this.uploadTabTemplate,
				},
				{
					key: 'url',
					title: 'URL',
					component: this.urlTabTemplate,
				},
				{
					key: 'json',
					title: 'JSON',
					component: this.jsonTabTemplate,
				},
			];
		});
	}

	isJson = (str) => {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	};

	/**
	 * Opens the badge dialog
	 * @returns {Promise<void>}
	 */
	openDialog(): Promise<void> {
		this.addRecipientBadgeForm.reset();
		// this.currentTab = this.translate.instant('RecBadge.image');

		return new Promise<void>((resolve, reject) => {
			// wait for temlate refs to be available
			setTimeout(() => {
				this.dialogRef = this._hlmDialogService.open(DialogComponent, {
					context: {
						headerTemplate: this.dialogHeader,
						variant: 'default',
						content: this.dialogContent,
					},
				});

				if (this.dialogRef && this.dialogRef.closed$) {
					this.dialogRef.closed$.subscribe(
						(result) => {
							if (result === 'cancel') {
								reject();
							} else {
								resolve();
							}
						},
						(error) => {
							reject(error);
						},
					);
				} else {
					reject(new Error('Dialog reference not properly initialized'));
				}
			});
		});
	}

	closeDialog() {
		this.dialogRef?.close();
	}

	get formHasBadgeValue() {
		const formState = this.addRecipientBadgeForm.value;
		return !!(formState.assertion || formState.image || formState.url);
	}

	routeToUserProfile() {
		this.router.navigate(['profile', 'profile']);
		this.closeDialog();
	}

	submitBadgeRecipientForm() {
		const formState = this.addRecipientBadgeForm.value;

		if (this.formHasBadgeValue && this.addRecipientBadgeForm.valid) {
			this.badgeUploadPromise = this.recipientBadgeManager
				.createRecipientBadge(formState)
				.then((instance) => {
					this.messageService.reportMajorSuccess(this.translate.instant('RecBadge.importedSuccessfully'));
					this.closeDialog();
				})
				.catch((err) => {
					let message = BadgrApiFailure.from(err).firstMessage;
					console.log('message', message);
					this.closeDialog();
					switch (message) {
						case 'VERIFY_RECIPIENT_IDENTIFIER':
							this.dialogRef = this._hlmDialogService.open(DialogComponent, {
								context: {
									variant: 'default',
									headerTemplate: this.failureHeader,
									content: this.failureContent,
									templateContext: {
										message: this.translate.instant('RecBadge.uploadEmailDoesNotMatchError'),
										text: this.translate.instant('RecBadge.addEmailToUpload'),
										buttontext: this.translate.instant('General.toMyProfile'),
									},
								},
							});
							break;

						case 'DUPLICATE_BADGE':
							this.dialogRef = this._hlmDialogService.open(DialogComponent, {
								context: {
									variant: 'default',
									headerTemplate: this.failureHeader,
									content: this.failureContent,
									templateContext: {
										message: this.translate.instant('RecBadge.uploadFailed'),
										text: this.translate.instant('RecBadge.duplicateBadge'),
									},
								},
							});
							break;

						case 'INVALID_BADGE_VERSION':
							this.dialogRef = this._hlmDialogService.open(DialogComponent, {
								context: {
									variant: 'default',
									headerTemplate: this.failureHeader,
									content: this.failureContent,
									templateContext: {
										message: this.translate.instant('RecBadge.badgeUploadVersionError'),
										text: this.translate.instant('General.sendUsYourBadge'),
									},
								},
							});
							break;

						default:
							this.dialogRef = this._hlmDialogService.open(DialogComponent, {
								context: {
									variant: 'default',
									headerTemplate: this.failureHeader,
									content: this.failureContent,
									templateContext: {
										message: this.translate.instant('General.thisDidNotWork'),
										text: this.translate.instant('General.sendUsYourBadge'),
									},
								},
							});
					}

					// display human readable description of first error if provided by server
					// if (this.isJson(message)) {
					// 	console.log('msg', message);
					// 	console.log('err', err);
					// 	const jsonErr = JSON.parse(message);
					// 	if (err.response && err.response._body) {
					// 		const body = JSON.parse(err.response._body);
					// 		if (body && body.length > 0 && body[0].description) {
					// 			message = body[0].description;
					// 		}
					// 	} else if (jsonErr.length) {
					// 		message = jsonErr[0].result || jsonErr[0].description;
					// 	}
					// }

					// this.messageService.reportAndThrowError(
					// 	message
					// 		? this.translate.instant('RecBadge.uploadFailed') + message
					// 		: this.translate.instant('RecBadge.unknownError'),
					// 	err,
					// );
				})
				.catch((e) => {
					this.closeDialog();
					throw e;
				});
		} else {
			this.formError = this.translate.instant('RecBadge.oneBadgeRequired');
		}
	}

	controlUpdated(updatedControl: TypedFormControl<unknown>) {
		// Clear the value from other controls
		this.addRecipientBadgeForm.controlsArray.forEach((control) => {
			if (control !== updatedControl) {
				control.reset();
			}
		});
	}

	clearFormError() {
		this.formError = undefined;
	}
}
