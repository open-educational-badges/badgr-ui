import {
	Component,
	EventEmitter,
	Input,
	Output,
	OnInit,
	ViewChild,
	OnChanges,
	SimpleChanges,
	AfterViewInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Validators, FormsModule, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { typedFormGroup } from '../../../common/util/typed-forms';
import {
	PDFTemplateAlignment,
	PDFTemplateFormat,
	ApiPDFTemplateForCreation,
} from '../../../common/model/pdftemplate-api.model';
import { PDFTemplate, pdfTemplateAlignments, pdfTemplateFormats } from '../../models/pdftemplate.model';
import { TranslateService, TranslatePipe, TranslateModule } from '@ngx-translate/core';
import { PDFTemplateManager } from '../../services/pdftemplate-manager.service';
import { Issuer } from '../../models/issuer.model';
import { IssuerManager } from '../../services/issuer-manager.service';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { OebInputComponent } from '../../../components/input.component';
import { OebSelectComponent } from '../../../components/select.component';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { FormFieldSelectOption } from '../../../common/components/formfield-select';
import { FormFieldRadio } from '../../../common/components/formfield-radio';
import { FormFieldIconRadio } from '../../../common/components/formfield-icon-radio';
import { HlmH2, HlmH3, HlmP } from '@spartan-ng/helm/typography';
import { UpperCasePipe } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { StepperComponent } from '../../../components/stepper/stepper.component';
import { StepComponent } from '../../../components/stepper/step.component';
import { CdkStep } from '@angular/cdk/stepper';
import { BgFormFieldImageComponent } from '~/common/components/formfield-image';
import { preloadImageURL, base64ByteSize } from '~/common/util/file-util';
import { PreviewCanvas } from '~/common/util/pdftemplate-util';
import { debounce, interval } from 'rxjs';

@Component({
	selector: 'pdftemplate-edit-form',
	templateUrl: './pdftemplate-edit-form.component.html',
	styleUrls: ['./pdftemplate-edit-form.component.scss'],
	imports: [
		FormMessageComponent,
		FormsModule,
		ReactiveFormsModule,
		HlmH2,
		HlmH3,
		HlmP,
		OebInputComponent,
		OebSelectComponent,
		OebCheckboxComponent,
		OebButtonComponent,
		FormFieldRadio,
		FormFieldIconRadio,
		TranslatePipe,
		TranslateModule,
		UpperCasePipe,
		NgIcon,
		HlmIcon,
		StepperComponent,
		StepComponent,
		CdkStep,
		BgFormFieldImageComponent,
	],
})
export class PDFTemplateEditFormComponent
	extends BaseAuthenticatedRoutableComponent
	implements OnInit, OnChanges, AfterViewInit
{
	issuer: Issuer;
	issuerLoaded: Promise<unknown>;
	savePromise: Promise<PDFTemplate> | null = null;

	@ViewChild(StepperComponent) stepper: StepperComponent;

	@ViewChild('imageField')
	imageField: BgFormFieldImageComponent;

	@Input() submittingText: string;

	@Input() pdfTemplate: PDFTemplate;

	@Output()
	save = new EventEmitter<Promise<PDFTemplate>>();

	@Output()
	cancelEdit = new EventEmitter<void>();

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	nextStep(): void {
		this.pdfTemplateForm.markTreeDirtyAndValidate();
		this.stepper.next();
	}

	previousStep(): void {
		this.stepper.previous();
	}

	lastStep(): boolean {
		return this.stepper?.selectedIndex == this.stepper?.steps.length - 1;
	}

	firstStep(): boolean {
		return this.stepper?.selectedIndex == 0;
	}

	cancelClicked() {
		this.cancelEdit.emit();
	}

	allowedFileFormats = ['image/png', 'image/svg+xml', 'image/jpeg'];
	pdfPreviewOEBDesignImageUrl: string;
	maxImageSize = 1024 * 1024 * 2;
	isImageLarge = false;
	currentImage;

	protected previewCanvas?: PreviewCanvas;
	canvasDiffXDecimal: number = 0;
	canvasDiffYDecimal: number = 0;

	constructor(
		protected loginService: SessionService,
		protected router: Router,
		protected route: ActivatedRoute,
		private translate: TranslateService,
		protected issuerManager: IssuerManager,
		protected pdfTemplateManager: PDFTemplateManager,
	) {
		super(router, route, loginService);
		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;
		});

		if (this.translate.currentLang == 'de') {
			this.pdfPreviewOEBDesignImageUrl = preloadImageURL(
				'../../../../breakdown/static/images/pdfPreviewOEBDesignDE.svg',
			);
		} else {
			this.pdfPreviewOEBDesignImageUrl = preloadImageURL(
				'../../../../breakdown/static/images/pdfPreviewOEBDesignEN.svg',
			);
		}
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['pdfTemplate'] && changes['pdfTemplate'].currentValue) {
			this.initFormFromExisting(this.pdfTemplate);
		}
	}

	ngOnInit() {
		if (!this.pdfTemplate) {
			// restore values from sessionStorage for new pdf templates
			const sessionValuesJSON = sessionStorage.getItem('oeb-create-pdftemplatevalues');
			if (sessionValuesJSON) {
				const sessionValues = JSON.parse(sessionValuesJSON);
				this.pdfTemplateForm.rawControl.patchValue({
					name: sessionValues['pdftemplate_name'] || '',
					format: sessionValues['pdftemplate_format'] || false,
					alignment: sessionValues['pdftemplate_alignment'] || (0 as PDFTemplateAlignment),
					posX: sessionValues['pdftemplate_posX'] || 80,
					posY: sessionValues['pdftemplate_posY'] || 98,
					scale: sessionValues['pdftemplate_scale'] || 90,
				});
			}
			// save name, format & alignment to sessionStorage on Change
			this.pdfTemplateForm.rawControl.valueChanges.subscribe((v) => {
				let saveableSessionValues = {};
				for (const [k, v] of Object.entries(this.pdfTemplateForm.rawControl.value)) {
					if (['name', 'format', 'alignment', 'posX', 'posY', 'scale'].includes(k)) {
						saveableSessionValues['pdftemplate_' + k] = v;
					}
				}
				sessionStorage.setItem('oeb-create-pdftemplatevalues', JSON.stringify(saveableSessionValues));
			});
		} else {
			// clear session storage when editing existing pdf templates
			sessionStorage.removeItem('oeb-create-pdftemplatevalues');
		}

		this.translate.onLangChange.subscribe((event) => {
			if (event.lang == 'de') {
				this.pdfPreviewOEBDesignImageUrl = preloadImageURL(
					'../../../../breakdown/static/images/pdfPreviewOEBDesignDE.svg',
				);
			} else {
				this.pdfPreviewOEBDesignImageUrl = preloadImageURL(
					'../../../../breakdown/static/images/pdfPreviewOEBDesignEN.svg',
				);
			}
		});
	}

	ngAfterViewInit(): void {
		this.stepper.selectionChange.subscribe((event) => {
			if (typeof this.previewCanvas === 'undefined' && event.selectedIndex == 1) {
				setTimeout(() => {
					this.previewCanvas = new PreviewCanvas(
						this.translate,
						this.pdfTemplateForm.value.format == '0' ? 'portrait' : 'landscape',
						this.pdfTemplateForm.value.scale,
						this.pdfTemplateForm.value.alignment == '0' ? 'left' : 'center',
						this.pdfTemplateForm.value.posX,
						this.pdfTemplateForm.value.posY,
						this.pdfTemplateForm.controls.image.value,
					);

					this.previewCanvas.canvasTextBlock.on('moving', (e) => {
						const newPosX = Math.round(e.transform.target.left);
						const newPosY = Math.round(e.transform.target.top);

						this.pdfTemplateForm.rawControl.controls.posX.setValue(newPosX, {
							emitEvent: false,
						});
						this.pdfTemplateForm.rawControl.controls.posY.setValue(newPosY, {
							emitEvent: false,
						});
					});
				}, 1);
			}
		});

		this.pdfTemplateForm.rawControl.controls['format'].valueChanges.subscribe((v) => {
			this.imageField.control.reset();
		});

		['alignment', 'posX', 'posY'].forEach((control) => {
			this.pdfTemplateForm.rawControl.controls[control].valueChanges.subscribe((v) => {
				setTimeout(() => {
					this.updatePreview(this.previewCanvas.page);
				}, 1);
			});
		});

		this.pdfTemplateForm.rawControl.controls['scale'].valueChanges
			.pipe(debounce(() => interval(25)))
			.subscribe(() => {
				setTimeout(() => {
					this.updatePreview(this.previewCanvas.page);
				}, 1);
			});
	}

	updatePreview(page: number = 1) {
		this.previewCanvas.updateValues(
			this.pdfTemplateForm.value.format == '0' ? 'portrait' : 'landscape',
			Number(this.pdfTemplateForm.value.scale),
			this.pdfTemplateForm.value.alignment == '0' ? 'left' : 'center',
			Number(this.pdfTemplateForm.value.posX),
			Number(this.pdfTemplateForm.value.posY),
			this.pdfTemplateForm.value.image,
			page,
		);
	}

	initFormFromExisting(pt: PDFTemplate) {
		if (!pt) return;

		this.pdfTemplateForm.setValue({
			name: pt.name,
			format: pt.format.toString(),
			alignment: pt.alignment.toString(),
			posX: pt.posX,
			posY: pt.posY,
			scale: pt.scale,
			image: pt.image,
		});
	}

	positiveIntegerOrNull() {
		return (control: AbstractControl) => {
			const val = parseFloat(control.value);

			if (isNaN(val)) {
				return { emptyField: this.translate.instant('OEBComponents.fieldIsRequired') };
			}
			if (!Number.isInteger(val) || val < 0) {
				return { negativeDuration: this.translate.instant('CreateBadge.durationPositive') };
			}
		};
	}

	imageValidation(): ValidationErrors | null {
		if (!this.pdfTemplateForm) return null;

		const value = this.pdfTemplateForm.value;

		const image = (value.image || '').trim();

		if (!image.length) {
			return { imageRequired: true };
		} else {
			const permittedDiscrepancy = 0.01;
			let ratioA4 = 210 / 297;
			if (Number(value.format)) {
				ratioA4 = 297 / 210;
			}

			let img = new Image();
			img.src = image;

			const imgRatio = img.width / img.height;
			if (ratioA4 - permittedDiscrepancy > imgRatio || ratioA4 + permittedDiscrepancy < imgRatio) {
				return { imageRatioFalse: true };
			}
		}
	}

	pdfTemplateForm = typedFormGroup([this.imageValidation.bind(this)])
		.addControl('name', '', [Validators.required, Validators.maxLength(60)])
		.addControl('format', '0', Validators.required)
		.addControl('alignment', '0', Validators.required)
		.addControl('posX', 80, [this.positiveIntegerOrNull()])
		.addControl('posY', 98, this.positiveIntegerOrNull)
		.addControl('scale', 90, [this.positiveIntegerOrNull(), Validators.min(83), Validators.max(100)])
		.addControl('image', '');

	readonly formatOptions: FormFieldSelectOption[] = pdfTemplateFormats.map((r) => ({
		label: r.label,
		value: r.value,
	}));

	readonly alignmentOptions: FormFieldSelectOption[] = pdfTemplateAlignments.map((r) => ({
		label: r.label,
		value: r.value,
		icon: r.icon,
	}));

	async onSubmit() {
		try {
			this.pdfTemplateForm.markTreeDirty();
			const formState = this.pdfTemplateForm.value;

			if (this.pdfTemplate) {
				this.pdfTemplate.name = formState.name;
				this.pdfTemplate.format = Number(formState.format) as PDFTemplateFormat;
				this.pdfTemplate.alignment = Number(formState.alignment) as PDFTemplateAlignment;
				this.pdfTemplate.posX = formState.posX;
				this.pdfTemplate.posY = formState.posY;
				this.pdfTemplate.scale = formState.scale;
				this.pdfTemplate.image = formState.image;

				this.savePromise = this.pdfTemplate.save();
			} else {
				let pdfTemplateData = {
					issuer_id: this.issuer.slug,
					name: formState.name,
					format: Number(formState.format) as PDFTemplateFormat,
					alignment: Number(formState.alignment) as PDFTemplateAlignment,
					posX: formState.posX,
					posY: formState.posY,
					scale: formState.scale,
					image: formState.image,
				} as ApiPDFTemplateForCreation;

				this.savePromise = this.pdfTemplateManager.createPDFTemplate(this.issuerSlug, pdfTemplateData);
			}

			this.save.emit(this.savePromise);

			// clear sessionStorage
			sessionStorage.removeItem('oeb-create-pdftemplatevalues');
		} catch (e) {
			console.log(e);
		}
	}

	get imageFieldDirty() {
		return this.pdfTemplateForm.controls.image.dirty;
	}

	validateFields(fields: string[]) {
		return fields.every((c) => {
			return this.pdfTemplateForm.controls[c].valid;
		});
	}

	dirtyFields(fields: string[]) {
		return fields.every((c) => {
			return this.pdfTemplateForm.controls[c].dirty;
		});
	}

	generateUploadImage(image) {
		if (base64ByteSize(image) > this.maxImageSize) {
			this.isImageLarge = true;
			return;
		}
		this.currentImage = image.slice();
		this.imageField.useDataUrl(image, 'PDFTEMPLATE');
	}

	isPreviewPage(pn: number): boolean {
		if (this.previewCanvas !== undefined && this.previewCanvas.page == pn) {
			return true;
		}

		return false;
	}

	showCoverPage() {
		this.updatePreview(1);
	}

	showCompetencePage() {
		this.updatePreview(2);
	}

	showOptionalPage() {
		this.updatePreview(3);
	}
}
