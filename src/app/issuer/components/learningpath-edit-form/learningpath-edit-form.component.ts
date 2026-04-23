import {
	Component,
	ElementRef,
	EventEmitter,
	inject,
	Input,
	isDevMode,
	OnInit,
	Output,
	SimpleChanges,
	ViewChild,
	OnChanges,
	AfterViewInit,
} from '@angular/core';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { Validators, FormsModule, ReactiveFormsModule, ValidationErrors, FormControl } from '@angular/forms';
import { MessageService } from '../../../common/services/message.service';
import { IssuerApiService } from '../../services/issuer-api.service';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { LinkEntry } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { BadgeClass } from '../../models/badgeclass.model';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { LearningPath } from '../../models/learningpath.model';
import { TranslateService, TranslatePipe, TranslateModule } from '@ngx-translate/core';
import { BadgeInstanceManager } from '../../services/badgeinstance-manager.service';
import { LearningPathManager } from '../../services/learningpath-manager.service';
import { StepperComponent } from '../../../components/stepper/stepper.component';
import { AppConfigService } from '../../../common/app-config.service';
import { BadgeClassApiService } from '../../services/badgeclass-api.service';
import { UrlValidator } from '../../../common/validators/url.validator';
import { Issuer } from '../../models/issuer.model';
import { IssuerManager } from '../../services/issuer-manager.service';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { NgClass } from '@angular/common';
import { StepComponent } from '../../../components/stepper/step.component';
import { CdkStep } from '@angular/cdk/stepper';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { StringMatchingUtil } from '~/common/util/string-matching-util';
import {
	ApiBadgeClassForCreation,
	ApiBadgeClassNetworkShare,
	BadgeClassCategory,
} from '~/issuer/models/badgeclass-api.model';
import { base64ByteSize } from '~/common/util/file-util';
import { BadgeStudioComponent } from '../badge-studio/badge-studio.component';
import { BgFormFieldImageComponent } from '~/common/components/formfield-image';
import { OebInputComponent } from '../../../components/input.component';
import { BgBadgecard } from '../../../common/components/bg-badgecard';
import { BgAwaitPromises } from '~/common/directives/bg-await-promises';
import { AutocompleteLibModule } from 'angular-ng-autocomplete';
import { FormFieldSelectOption } from '~/common/components/formfield-select';
import { OebSeparatorComponent } from '../../../components/oeb-separator.component';
import { OebSelectComponent } from '~/components/select.component';
import { DndDraggableDirective, DndDropEvent, DndDropzoneDirective, DropEffect } from 'ngx-drag-drop';
import { HlmDialogService } from '~/components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DangerDialogComponent } from '~/common/dialogs/oeb-dialogs/danger-dialog.component';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { BgImageStatusPlaceholderDirective } from '~/common/directives/bg-image-status-placeholder.directive';
import { sortUnique } from '~/catalog/util/sorting';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmH2, HlmP } from '@spartan-ng/helm/typography';
import { UpperCasePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PDFTemplateManager } from '~/issuer/services/pdftemplate-manager.service';
import { ApiPDFTemplate } from '../../../common/model/pdftemplate-api.model';
import { NetworkApiService } from '~/issuer/services/network-api.service';
import { CommonEntityManager } from '~/entity-manager/services/common-entity-manager.service';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { AUTH_PROVIDER } from '~/common/services/authentication-service';
import { Network } from '~/issuer/network.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { SessionService } from '~/common/services/session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotaExceededDialog } from '../issuer-quotas-quota-exceeded-dialog/issuer-quotas-quota-exceeded-dialog.component';

type BadgeResult = BadgeClass & { selected?: boolean };

@Component({
	selector: 'learningpath-edit-form',
	templateUrl: './learningpath-edit-form.component.html',
	styleUrls: ['./learningpath-edit-form.component.scss'],
	imports: [
		FormMessageComponent,
		FormsModule,
		ReactiveFormsModule,
		StepperComponent,
		NgClass,
		StepComponent,
		CdkStep,
		BgAwaitPromises,
		AutocompleteLibModule,
		OebButtonComponent,
		TranslatePipe,
		TranslateModule,
		OebInputComponent,
		BgFormFieldImageComponent,
		BadgeStudioComponent,
		BgBadgecard,
		HlmH2,
		HlmP,
		HlmInput,
		OebSeparatorComponent,
		OebSelectComponent,
		DndDraggableDirective,
		DndDropzoneDirective,
		OebCheckboxComponent,
		BgImageStatusPlaceholderDirective,
		UpperCasePipe,
		NgIcon,
		HlmIcon,
	],
})
export class LearningPathEditFormComponent
	extends BaseAuthenticatedRoutableComponent
	implements OnInit, OnChanges, AfterViewInit
{
	protected messageService = inject(MessageService);
	protected learningPathApiService = inject(LearningPathApiService);
	protected issuerManager = inject(IssuerManager);
	protected issuerApiService = inject(IssuerApiService);
	protected networkApiService = inject(NetworkApiService);
	protected badgeClassService = inject(BadgeClassManager);
	protected badgeClassApiService = inject(BadgeClassApiService);
	protected entityManager = inject(CommonEntityManager);
	private translate = inject(TranslateService);
	protected badgeInstanceManager = inject(BadgeInstanceManager);
	protected learningPathManager = inject(LearningPathManager);
	protected configService = inject(AppConfigService);
	protected pdfTemplateManager = inject(PDFTemplateManager);
	protected authService: SessionService;

	@ViewChild(StepperComponent) stepper: StepperComponent;

	@ViewChild('badgeStudio')
	badgeStudio: BadgeStudioComponent;

	@ViewChild('imageField')
	imageField: BgFormFieldImageComponent;

	@ViewChild('customImageField')
	customImageField: BgFormFieldImageComponent;

	@ViewChild('newTagInput')
	newTagInput: ElementRef<HTMLInputElement>;

	@ViewChild('activationSection') activationSection!: ElementRef;

	nextStep(): void {
		this.learningPathForm.markTreeDirtyAndValidate();
		this.stepper.next();
	}

	previousStep(): void {
		this.stepper.previous();
	}

	lastStep(): boolean {
		return this.stepper?.selectedIndex == this.stepper?.steps.length - 1;
	}

	firstStep(): boolean {
		if (this.initialisedLearningpath) {
			return this.stepper?.selectedIndex == 0;
		}
		return this.stepper?.selectedIndex == 1;
	}

	@Output()
	save = new EventEmitter<Promise<LearningPath>>();

	@Output()
	cancelEdit = new EventEmitter<void>();

	@Input()
	submittingText: string;

	@Input() learningPath: LearningPath;
	@Input() lpBadge: BadgeClass;

	existingLpBadge: BadgeClass | null = null;

	currentImage;

	readonly badgeClassPlaceholderImageUrl = '../../../../breakdown/static/images/placeholderavatar.svg';

	allowedFileFormats = ['image/png', 'image/svg+xml'];
	allowedFileFormatsCustom = ['image/png'];

	initialisedLearningpath: LearningPath | null = null;

	breadcrumbLinkEntries: LinkEntry[] = [];
	selectedBadges: BadgeClass[] = [];
	studyLoad: number = 0;
	savePromise: Promise<LearningPath> | Promise<void> | null = null;

	isDevMode: boolean = false && isDevMode(); // DEBUG: enable to skip steps

	baseUrl: string;

	focusActivation = false;
	hasScrolled = false;

	@Input()
	issuer: Issuer | Network;

	isCustomImageLarge = false;
	maxCustomImageSize = 1024 * 250;

	issuers: string[] = [];
	tags: string[] = [];

	useOurEditor = this.translate.instant('CreateBadge.useOurEditor');
	imageSublabel = this.translate.instant('CreateBadge.imageSublabel');
	useOwnVisual = this.translate.instant('CreateBadge.useOwnVisual');
	uploadOwnDesign = this.translate.instant('CreateBadge.uploadOwnDesign');
	uploadOwnVisual = this.translate.instant('RecBadge.uploadOwnVisual');
	selectFromMyFiles = this.translate.instant('RecBadge.selectFromMyFiles');
	chooseFromExistingIcons = this.translate.instant('RecBadge.chooseFromExistingIcons');

	badgesLoaded: Promise<unknown>;
	loadingPromise: Promise<unknown>;
	allBadgesLoaded: boolean = false;
	badges: BadgeClass[] = null;
	badgeResults: BadgeResult[] = null;
	badgesFormArray: any;

	badgeResultsByCategory: MatchingBadgeCategory[] = [];
	badgeResultsByIssuer: MatchingBadgeIssuer[] = [];

	selectedTag: string = null;
	order = 'asc';
	private _searchQuery = '';
	get searchQuery() {
		return this._searchQuery;
	}
	set searchQuery(query) {
		this._searchQuery = query;
		this.updateResults();
	}

	private _groupBy: '---' | 'Category' | 'Issuer' = '---';
	get groupBy() {
		return this._groupBy;
	}
	set groupBy(val: typeof this._groupBy) {
		this._groupBy = val;
		this.updateResults();
	}

	groupControl = new FormControl<typeof this._groupBy>('---');
	groupOptions = [
		{
			label: 'Badge.groupBy',
			value: '---',
		},
		{
			label: 'Badge.category',
			value: 'Category',
		},
		{
			label: 'Badge.issuer',
			value: 'Issuer',
		},
	];

	categoryOptions: { [key in BadgeClassCategory]: string } = {
		competency: 'Badge.categories.competency',
		participation: 'Badge.categories.participation',
		learningpath: 'Badge.categories.learningpath',
	};

	get imageFieldDirty() {
		return (
			this.learningPathForm.controls.badge_image.dirty || this.learningPathForm.controls.badge_customImage.dirty
		);
	}

	selectMinBadgesOptions: FormFieldSelectOption[] = [];

	pdfTemplatesPromise: Promise<unknown>;
	pdfTemplates: ApiPDFTemplate[];
	selectPDFTemplateOptions: FormFieldSelectOption[] = [];

	constructor() {
		const sessionService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, sessionService);
		this.authService = sessionService;

		this.baseUrl = this.configService.apiConfig.baseUrl;
		if (!this.issuer)
			this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
				this.issuer = issuer;
				this.badgesLoaded = this.loadBadges();
			});
		else this.badgesLoaded = this.loadBadges();
	}
	next: string;
	previous: string;

	draggableList: {
		id: string;
		name: string;
		image: any;
		description: string;
		slug: string;
		issuerName: string;
		order: number;
	}[] = [];

	ngOnChanges(changes: SimpleChanges) {
		let shouldInitialize = false;

		if (changes['learningPath'] && changes['learningPath'].currentValue) {
			this.initialisedLearningpath = changes['learningPath'].currentValue;
			shouldInitialize = true;
		}

		if (changes['lpBadge'] && changes['lpBadge'].currentValue) {
			this.existingLpBadge = changes['lpBadge'].currentValue;
			shouldInitialize = true;
		}

		// Only initialize if both values are available
		if (shouldInitialize && this.initialisedLearningpath && this.existingLpBadge) {
			this.initFormFromExisting(this.initialisedLearningpath, this.existingLpBadge);
		}
	}

	ngOnInit() {
		this.groupControl.valueChanges.subscribe((value) => {
			this.groupBy = value;
		});
		this.fetchTags();
		if (!this.initialisedLearningpath) {
			this.learningPathForm.controls.license.addFromTemplate();
		}

		this.draggableList = this.selectedBadges.map((badge, index) => {
			return {
				id: badge.slug,
				name: badge.name,
				image: badge.image,
				description: badge.description,
				slug: badge.slug,
				issuerName: badge.issuerName,
				order: index,
			};
		});

		if (!this.initialisedLearningpath) {
			// restore name and description from sessionStorage
			const sessionValuesJSON = sessionStorage.getItem('oeb-create-badgeclassvalues');
			if (sessionValuesJSON) {
				const sessionValues = JSON.parse(sessionValuesJSON);
				this.learningPathForm.rawControl.patchValue({
					name: sessionValues['badge_name'] || '',
					description: sessionValues['badge_description'] || '',
				});
			}
			// save name and description to sessionStorage on Change
			this.learningPathForm.rawControl.valueChanges.subscribe((v) => {
				let saveableSessionValues = {};
				for (const [k, v] of Object.entries(this.learningPathForm.rawControl.value)) {
					if (['name', 'description'].includes(k)) {
						saveableSessionValues['badge_' + k] = v;
					}
				}
				sessionStorage.setItem('oeb-create-badgeclassvalues', JSON.stringify(saveableSessionValues));
			});
		} else {
			// clear session storage when editing existing badges
			sessionStorage.removeItem('oeb-create-badgeclassvalues');
		}
	}

	initFormFromExisting(lp: LearningPath, badge: BadgeClass) {
		if (!lp || !badge) return;

		this.learningPathForm.setValue({
			name: lp.name,
			description: lp.description,
			badge_category: 'learningpath',
			badge_image: badge.imageFrame ? lp.participationBadgeImage : null,
			badge_customImage: !badge.imageFrame ? lp.participationBadgeImage : null,
			useIssuerImageInBadge: true,
			activated: lp.activated,
			badges: lp.badges,
			required_badges_count: lp.required_badges_count.toString(), // oeb-select expects string
			license: [
				{
					id: 'CC-0',
					name: 'Public Domain',
					legalCode: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
				},
			],
			pdftemplate: lp.pdftemplate,
		});
		this.selectedBadges = lp.badges.map((b) => b.badge);

		this.currentImage = badge.extension['extensions:OrgImageExtension']
			? badge.extension['extensions:OrgImageExtension'].OrgImage
			: undefined;

		setTimeout(() => {
			if (badge.imageFrame) {
				this.generateUploadImage(this.currentImage, this.learningPathForm.value, true, true);
			}
		}, 1);

		lp.tags.forEach((t) => this.lpTags.add(t));
	}

	badgeChecked(badge: BadgeClass) {
		return this.selectedBadges.some((b) => b.slug == badge.slug);
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openDangerDialog(index: number) {
		const dialogRef = this._hlmDialogService.open(DangerDialogComponent, {
			context: {
				delete: () => {
					this.draggableList.splice(index, 1);
				},
				variant: 'danger',
				text: 'Are you sure you want to remove this badge from the learningpath?',
			},
		});
	}

	// checkboxChange(event, index: number) {
	// 	if (!event) {
	// 		this.openDangerDialog(index);
	// 	}
	// }

	validateFields(fields: string[]) {
		return fields.every((c) => {
			return this.learningPathForm.controls[c].valid;
		});
	}

	dirtyFields(fields: string[]) {
		return fields.every((c) => {
			return this.learningPathForm.controls[c].dirty;
		});
	}

	checkboxChange(event, badge: BadgeClass) {
		if (event) {
			this.selectedBadges.push(badge);
			this.learningPathForm.controls.badges.push(typedFormGroup().addControl('badge', badge));
			this.studyLoad += badge.extension['extensions:StudyLoadExtension'].StudyLoad;
		} else {
			this.selectedBadges.splice(
				this.selectedBadges.findIndex((b) => b.slug == badge.slug),
				1,
			);
			this.learningPathForm.controls.badges.removeAt(
				this.learningPathForm.controls.badges.value.findIndex((badge) => badge.badge === badge),
			);
			this.studyLoad -= badge.extension['extensions:StudyLoadExtension'].StudyLoad;
		}
		this.draggableList = this.selectedBadges.map((badge, index) => {
			return {
				id: badge.slug,
				name: badge.name,
				image: badge.image,
				description: badge.description,
				slug: badge.slug,
				issuerName: badge.issuerName,
				order: index,
			};
		});
	}

	// updateTags(tags: string[]) {
	// 	this.lpTags = tags;
	// }

	learningPathForm = typedFormGroup([this.imageValidation.bind(this), this.minSelectedBadges.bind(this)])
		.addControl('name', '', [Validators.required, Validators.maxLength(60)])
		.addControl('description', '', [Validators.required, Validators.maxLength(700)])
		.addControl('badge_image', '')
		.addControl('badge_category', 'learningpath')
		.addControl('badge_customImage', '')
		.addControl('useIssuerImageInBadge', true)
		.addControl('activated', false)
		.addArray('badges', typedFormGroup().addControl('badge', null, Validators.required))
		.addControl('required_badges_count', null)
		.addArray(
			'license',
			typedFormGroup()
				.addControl('id', 'CC-0', Validators.required)
				.addControl('name', 'Public Domain', Validators.required)
				.addControl(
					'legalCode',
					'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
					UrlValidator.validUrl,
				),
			Validators.required,
		)
		.addControl('pdftemplate', null);

	async ngAfterViewInit() {
		this.focusActivation = this.route.snapshot.queryParamMap.get('focusActivation') === 'true';

		if (this.focusActivation && this.initialisedLearningpath && this.stepper) {
			this.focusActivationSection();
		}
		this.learningPathForm.controls.badge_image.rawControl.valueChanges.subscribe((value) => {
			if (this.imageField.control.value != null) this.customImageField.control.reset();
		});

		this.learningPathForm.controls.badge_customImage.rawControl.valueChanges.subscribe((value) => {
			if (this.customImageField.control.value != null) this.imageField.control.reset();
		});

		if (this.initialisedLearningpath) {
			this.selectMinBadgesOptions = this.generateSelectMinBadgesOptions(this.selectedBadges);
		}

		this.learningPathForm.controls.badges.rawControl.valueChanges.subscribe((value) => {
			this.selectMinBadgesOptions = this.generateSelectMinBadgesOptions(value);
		});

		if (this.authService.isLoggedIn) {
			this.getPDFTemplatesForIssuerApi(this.issuerSlug);
			await this.pdfTemplatesPromise;

			this.selectPDFTemplateOptions = this.pdfTemplates.map((t) => ({
				label: t.name,
				value: t.slug,
			}));
			this.selectPDFTemplateOptions.push({
				label: this.translate.instant('PDFTemplate.oebDesign'),
				value: null,
			});
		}
	}

	private generateSelectMinBadgesOptions(badges: any[]): FormFieldSelectOption[] {
		if (!Array.isArray(badges)) return [];

		const options = badges
			.map((_, i) => ({ label: String(i + 1), value: String(i + 1) }))
			.filter((v) => parseInt(v.value) !== badges.length && parseInt(v.value) >= 2)
			.reverse();

		options.unshift({ label: 'General.all', value: badges.length.toString() });

		const currentValue = this.learningPathForm.controls.required_badges_count.value;
		const currentValueExists = options.some((opt) => opt.value === currentValue);

		// If current value is no longer in the options, reset to "all"
		if (currentValue && !currentValueExists) {
			this.learningPathForm.controls.required_badges_count.setValue(badges.length.toString());
		}

		return options;
	}

	private focusActivationSection() {
		if (this.focusActivation && this.activationSection && !this.hasScrolled) {
			// stepper being linear requires the steps to be marked as completed before changing the step index
			const steps = this.stepper.steps.toArray();
			for (let i = 0; i < 3; i++) {
				if (steps[i]) {
					steps[i].completed = true;
				}
			}
			this.stepper.selectedIndex = 3;

			// Wait for the DOM to update after changing stepper index
			setTimeout(() => {
				if (this.activationSection?.nativeElement) {
					this.hasScrolled = true;
					this.activationSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 100);
			// 	if (this.activationSection.nativeElement.offsetTop > 0) this.hasScrolled = true;
			// 	this.activationSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	generateRandomImage() {
		this.badgeStudio
			.generateRandom()
			.then((imageUrl) => this.imageField.useDataUrl(imageUrl, 'Auto-generated image'));
	}

	generateUploadImage(image, formdata, useIssuerImageInBadge = false, initializing = false) {
		this.currentImage = image.slice();
		this.badgeStudio
			.generateUploadImage(image.slice(), formdata, useIssuerImageInBadge, this.issuer.image)
			.then((imageUrl) => {
				this.imageField.useDataUrl(imageUrl, 'BADGE', initializing);
			});
	}

	generateCustomUploadImage(image) {
		if (base64ByteSize(image) > this.maxCustomImageSize) {
			this.isCustomImageLarge = true;
			return;
		}
		this.currentImage = image.slice();
		this.customImageField.useDataUrl(image, 'BADGE');
	}

	onStepChange(event: any): void {
		// this.learningPathForm.markTreeDirtyAndValidate();
	}

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	get lpSlug() {
		return this.route.snapshot.params['learningPathSlug'];
	}

	cancelClicked() {
		this.cancelEdit.emit();
	}

	async loadBadges() {
		this.badges = [];
		this.badgeResults = [];

		try {
			const badgesByIssuer = await firstValueFrom(this.badgeClassService.badgesByIssuerUrl$);

			const issuerBadges = badgesByIssuer[this.issuer.issuerUrl] || [];

			let sharedBadges: ApiBadgeClassNetworkShare[] = [];
			if (this.issuer.is_network) {
				try {
					const networkSlug = this.issuer.slug;
					sharedBadges = await this.networkApiService.getNetworkSharedBadges(networkSlug);
				} catch (e) {
					console.warn('Failed to load network shared badges', e);
					sharedBadges = [];
				}
			}

			const sharedBadgeClasses: BadgeClass[] = sharedBadges.map((shared) => {
				const badge = new BadgeClass(this.entityManager, shared.badgeclass);
				return badge;
			});

			this.badges = [...issuerBadges, ...sharedBadgeClasses]
				.filter(
					(b) =>
						b.extension['extensions:StudyLoadExtension'].StudyLoad > 0 &&
						b.extension['extensions:CategoryExtension'].Category !== 'learningpath',
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

			this.badgeResults = this.badges;
			this.badgesFormArray = this.learningPathForm.controls.badges.value;

			this.badgeResults.forEach((badge) => {
				this.badgesFormArray.push({ badge: badge, order: 0, selected: false });
				this.tags = this.tags.concat(badge.tags);
				this.issuers = this.issuers.concat(badge.issuer);
			});

			this.tags = sortUnique(this.tags);
			this.issuers = sortUnique(this.issuers);
			this.updateResults();

			return badgesByIssuer;
		} catch (error) {
			this.messageService.reportAndThrowError('Failed to load badges', error);
			throw error;
		}
	}

	private badgeMatcher(inputPattern: string): (badge) => boolean {
		const patternStr = StringMatchingUtil.normalizeString(inputPattern);
		const patternExp = StringMatchingUtil.tryRegExp(patternStr);
		return (badge) => StringMatchingUtil.stringMatches(badge.name, patternStr, patternExp);
	}
	private badgeTagMatcher(tag: string) {
		return (badge) => (tag ? badge.tags.includes(tag) : true);
	}

	changeOrder(order) {
		this.order = order;
		if (this.order === 'asc') {
			this.badgeResults.sort((a, b) => a.name.localeCompare(b.name));
			this.badgeResultsByIssuer
				.sort((a, b) => a.issuerName.localeCompare(b.issuerName))
				.forEach((r) => r.badges.sort((a, b) => a.name.localeCompare(b.name)));
			this.badgeResultsByCategory
				.sort((a, b) => a.category.localeCompare(b.category))
				.forEach((r) => r.badges.sort((a, b) => a.name.localeCompare(b.name)));
		} else {
			this.badgeResults.sort((a, b) => b.name.localeCompare(a.name));
			this.badgeResultsByIssuer
				.sort((a, b) => b.issuerName.localeCompare(a.issuerName))
				.forEach((r) => r.badges.sort((a, b) => b.name.localeCompare(a.name)));
			this.badgeResultsByCategory
				.sort((a, b) => b.category.localeCompare(a.category))
				.forEach((r) => r.badges.sort((a, b) => b.name.localeCompare(a.name)));
		}
	}

	private updateResults() {
		// Clear Results
		this.badgeResults = [];
		this.badgeResultsByIssuer = [];
		const badgeResultsByIssuerLocal = {};
		this.badgeResultsByCategory = [];
		const badgeResultsByCategoryLocal = {};
		const addBadgeToResultsByIssuer = (item) => {
			let issuerResults = badgeResultsByIssuerLocal[item.issuerName];
			if (!issuerResults) {
				issuerResults = badgeResultsByIssuerLocal[item.issuerName] = new MatchingBadgeIssuer(
					item.issuerName,
					'',
				);
				// append result to the issuerResults array bound to the view template.
				this.badgeResultsByIssuer.push(issuerResults);
			}
			issuerResults.addBadge(item);
			return true;
		};

		const addBadgeToResultsByCategory = (item) => {
			let itemCategory =
				item.extension && item.extension['extensions:CategoryExtension']
					? item.extension['extensions:CategoryExtension'].Category
					: 'noCategory';
			let categoryResults = badgeResultsByCategoryLocal[itemCategory];
			if (!categoryResults) {
				categoryResults = badgeResultsByCategoryLocal[itemCategory] = new MatchingBadgeCategory(
					itemCategory,
					'',
				);
				// append result to the categoryResults array bound to the view template.
				this.badgeResultsByCategory.push(categoryResults);
			}
			categoryResults.addBadge(item);
			return true;
		};
		this.badges
			.filter(this.badgeMatcher(this.searchQuery))
			.filter(this.badgeTagMatcher(this.selectedTag))
			.filter((i) => !i.apiModel.source_url)
			.forEach((item) => {
				this.badgeResults.push(item);
				addBadgeToResultsByIssuer(item);
				addBadgeToResultsByCategory(item);
			});
	}

	readonly badgeLoadingImageUrl = 'breakdown/static/images/badge-loading.svg';
	readonly badgeFailedImageUrl = 'breakdown/static/images/badge-failed.svg';

	/**
	 * Indicates wether the existing tags are currently being loaded.
	 * It is set in @see fetchTags
	 */
	existingTagsLoading: boolean;

	/**
	 * The already existing tags for other badges, for the autocomplete to show.
	 * The tags are loaded in @see fetchTags
	 */
	existingTags: { id: number; name: string }[];

	tagOptions: FormFieldSelectOption[];

	lpTags = new Set<string>();

	/**
	 * Fetches the tags from the @see badgeClassManager and selects the tags from them.
	 * The tags are then assigned to @see existingTags in an appropriate format.
	 * At the beginning, @see existingTagsLoading is set, once tags are loaded it's unset.
	 */
	fetchTags() {
		this.existingTags = [];
		this.existingTagsLoading = true;

		this.learningPathManager.allPublicLearningPaths$.subscribe({
			// Use arrow function to preserve "this" context
			next: (entities: LearningPath[]) => {
				let tags: string[] = entities.flatMap((entity) => entity.tags);
				let unique = [...new Set(tags)];
				unique.sort();
				this.existingTags = unique.map((tag, index) => ({ id: index, name: tag }));
				this.tagOptions = this.existingTags.map(
					(tag) => ({ value: tag.name, label: tag.name }) as FormFieldSelectOption,
				);
				// The tags are loaded in one badge, so it's save to assume
				// that after the first `next` call, the loading is done
				this.existingTagsLoading = false;
			},
			error(err) {
				console.error("Couldn't fetch labels: " + err);
			},
		});
	}

	addTag() {
		const newTag = (this.newTagInput['query'] || '').trim().toLowerCase();

		if (newTag.length > 0) {
			this.lpTags.add(newTag);

			this.newTagInput['query'] = '';
		}
	}

	handleTagInputKeyPress(event: KeyboardEvent) {
		if (event.keyCode === 13 /* Enter */) {
			this.addTag();
			this.newTagInput.nativeElement.focus();
			event.preventDefault();
		}
	}

	onDragged(item: any, list: any[], effect: DropEffect) {
		const index = list.indexOf(item);
		list.splice(index, 1);
		this.recalculateOrder(list);
	}

	onDrop(event: DndDropEvent, index: number, list: any[]) {
		const previousIndex = list.findIndex((item) => item.id === event.data.id);

		if (previousIndex !== -1) {
			list.splice(previousIndex, 1);
		}

		if (typeof index === 'undefined') {
			index = list.length;
		}

		list.splice(index, 0, event.data);
		this.recalculateOrder(list);
	}

	recalculateOrder(list: any[]) {
		list.forEach((item, index) => {
			item.order = index;
		});
	}

	removeTag(tag: string) {
		this.lpTags.delete(tag);
	}

	async onSubmit() {
		const studyLoadExtensionContextUrl = `${this.baseUrl}/static/extensions/StudyLoadExtension/context.json`;
		const categoryExtensionContextUrl = `${this.baseUrl}/static/extensions/CategoryExtension/context.json`;
		const licenseExtensionContextUrl = `${this.baseUrl}/static/extensions/LicenseExtension/context.json`;
		const competencyExtensionContextUrl = `${this.baseUrl}/static/extensions/CompetencyExtension/context.json`;
		const orgImageExtensionContextUrl = `${this.baseUrl}/static/extensions/OrgImageExtension/context.json`;

		const criteriaText =
			'*Folgende Kriterien sind auf Basis deiner Eingaben als Metadaten im Badge hinterlegt*: \n\n';
		const participationText = `Du hast erfolgreich an **${this.learningPathForm.controls.name.value}** teilgenommen.  \n\n `;

		if (this.issuer.quotas) {
			// recheck quotas and show dialog if something changed while starting the creation process
			await this.issuer.update();
			if (!this.checkQuotasDialog('LEARNINGPATH_CREATE')) {
				return false;
			}
		}

		if (this.initialisedLearningpath && this.lpBadge) {
			let imageFrame = true;
			if (this.learningPathForm.controls.badge_customImage.value && this.learningPathForm.valid) {
				imageFrame = false;
				this.learningPathForm.controls.badge_image.setValue(
					this.learningPathForm.controls.badge_customImage.value,
				);
			}

			this.learningPathForm.markTreeDirty();
			const formState = this.learningPathForm.value;

			this.existingLpBadge.imageFrame = imageFrame;
			this.existingLpBadge.image = !imageFrame ? formState.badge_image : null;
			this.existingLpBadge.name = formState.name;
			this.existingLpBadge.description = formState.description;
			this.existingLpBadge.tags = Array.from(this.lpTags);
			this.existingLpBadge.criteria_text = criteriaText;
			this.existingLpBadge.criteria_url = '';
			this.existingLpBadge.extension = {
				'extensions:StudyLoadExtension': {
					'@context': studyLoadExtensionContextUrl,
					type: ['Extension', 'extensions:StudyLoadExtension'],
					StudyLoad: this.studyLoad,
				},
				'extensions:CategoryExtension': {
					'@context': categoryExtensionContextUrl,
					type: ['Extension', 'extensions:CategoryExtension'],
					Category: 'learningpath',
				},
				'extensions:LicenseExtension': {
					'@context': licenseExtensionContextUrl,
					type: ['Extension', 'extensions:LicenseExtension'],
					id: this.learningPathForm.value.license[0].id,
					name: this.learningPathForm.value.license[0].name,
					legalCode: this.learningPathForm.value.license[0].legalCode,
				},
				'extensions:CompetencyExtension': [],
			};

			if (this.currentImage) {
				this.existingLpBadge.extension = {
					...this.existingLpBadge.extension,
					'extensions:OrgImageExtension': {
						'@context': orgImageExtensionContextUrl,
						type: ['Extension', 'extensions:OrgImageExtension'],
						OrgImage: this.currentImage,
					},
				};
			}

			this.existingLpBadge.save();

			this.initialisedLearningpath.name = formState.name;
			this.initialisedLearningpath.description = formState.description;
			this.initialisedLearningpath.activated = formState.activated;
			this.initialisedLearningpath.issuer_id = this.issuer.slug;
			this.initialisedLearningpath.tags = Array.from(this.lpTags);
			this.initialisedLearningpath.required_badges_count =
				formState.required_badges_count ?? this.selectedBadges.length;
			this.initialisedLearningpath.badges = this.draggableList.map((item, index) => {
				return { badge: item, order: item.order };
			});
			this.initialisedLearningpath.pdftemplate = formState.pdftemplate;

			this.savePromise = this.initialisedLearningpath.save();

			this.save.emit(this.savePromise);

			// clear sessionStorage
			sessionStorage.removeItem('oeb-create-badgeclassvalues');
		} else {
			this.savePromise = (async () => {
				try {
					let imageFrame = true;
					if (this.learningPathForm.controls.badge_customImage.value && this.learningPathForm.valid) {
						imageFrame = false;
						this.learningPathForm.controls.badge_image.setValue(
							this.learningPathForm.controls.badge_customImage.value,
						);
					}
					let participationBadgeData = {
						// if not custom, generate image on the server
						image: !imageFrame ? this.learningPathForm.controls.badge_image.value : null,
						imageFrame: imageFrame,
						name: this.learningPathForm.controls.name.value,
						description: this.learningPathForm.controls.description.value,
						tags: Array.from(this.lpTags),
						criteria_text: criteriaText,
						criteria_url: '',
						extensions: {
							'extensions:StudyLoadExtension': {
								'@context': studyLoadExtensionContextUrl,
								type: ['Extension', 'extensions:StudyLoadExtension'],
								StudyLoad: this.studyLoad,
							},
							'extensions:CategoryExtension': {
								'@context': categoryExtensionContextUrl,
								type: ['Extension', 'extensions:CategoryExtension'],
								Category: 'learningpath',
							},
							'extensions:LicenseExtension': {
								'@context': licenseExtensionContextUrl,
								type: ['Extension', 'extensions:LicenseExtension'],
								id: this.learningPathForm.value.license[0].id,
								name: this.learningPathForm.value.license[0].name,
								legalCode: this.learningPathForm.value.license[0].legalCode,
							},
							'extensions:CompetencyExtension': [],
						},
						copy_permissions: ['issuer'],
					} as ApiBadgeClassForCreation;

					if (this.currentImage) {
						participationBadgeData.extensions = {
							...participationBadgeData.extensions,
							'extensions:OrgImageExtension': {
								'@context': orgImageExtensionContextUrl,
								type: ['Extension', 'extensions:OrgImageExtension'],
								OrgImage: this.currentImage,
							},
						};
					}

					const participationBadge = await this.badgeClassService.createBadgeClass(
						this.issuerSlug,
						participationBadgeData,
					);

					const issuer = await this.issuerApiService.getIssuer(this.issuerSlug);

					const formState = this.learningPathForm.value;

					this.savePromise = this.learningPathManager.createLearningPath(this.issuerSlug, {
						issuer_id: issuer.slug,
						name: formState.name,
						description: formState.description,
						tags: Array.from(this.lpTags),
						badges: this.draggableList.map((item, index) => {
							return { badge: item, order: index };
						}),
						required_badges_count: formState.required_badges_count ?? this.selectedBadges.length,
						participationBadge_id: participationBadge.slug,
						activated: formState.activated,
						pdftemplate: formState.pdftemplate,
					});

					if (this.issuer.quotas) {
						this.savePromise.then(() => {
							// update issuer if quotas active to update used quotas information
							this.issuer.update();
						});
					}

					this.save.emit(this.savePromise);
					// clear sessionStorage
					sessionStorage.removeItem('oeb-create-badgeclassvalues');
				} catch (e) {
					this.savePromise = null;
					console.log(e);
				}
			})();
		}
	}

	imageValidation(): ValidationErrors | null {
		if (!this.learningPathForm) return null;

		const value = this.learningPathForm.value;

		const image = (value.badge_image || '').trim();
		const customImage = (value.badge_customImage || '').trim();
		// To hide custom-image large size error msg
		this.isCustomImageLarge = false;

		if (!image.length && !customImage.length) {
			return { imageRequired: true };
		}
	}

	minSelectedBadges(): ValidationErrors | null {
		return this.selectedBadges.length >= 2
			? null
			: { minSelectedBadges: { required: 2, actual: this.selectedBadges.length } };
	}

	getPDFTemplatesForIssuerApi(issuerSlug) {
		this.pdfTemplatesPromise = this.pdfTemplateManager
			.getPDFTemplatesForIssuer(issuerSlug)
			.then(
				(pdfTemplates) =>
					(this.pdfTemplates = pdfTemplates.sort(
						(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
					)),
			);
	}

	checkQuotasDialog(quota: string) {
		if (this.issuer.quotas?.quotas[quota]?.quota === 0) {
			this._hlmDialogService.open(QuotaExceededDialog, {
				context: {
					issuer: this.issuer,
					variant: 'quotas',
				},
			});
			return false;
		}
		return true;
	}
}

class MatchingBadgeCategory {
	constructor(
		public category: string,
		public badge,
		public badges: BadgeClass[] = [],
	) {}
	async addBadge(badge) {
		if (
			badge.extension &&
			badge.extension['extensions:CategoryExtension'] &&
			badge.extension['extensions:CategoryExtension'].Category === this.category
		) {
			if (this.badges.indexOf(badge) < 0) {
				this.badges.push(badge);
			}
		} else if (!badge.extension['extensions:CategoryExtension'] && this.category == 'noCategory') {
			if (this.badges.indexOf(badge) < 0) {
				this.badges.push(badge);
			}
		}
	}
}

class MatchingBadgeIssuer {
	constructor(
		public issuerName: string,
		public badge,
		public badges: BadgeClass[] = [],
	) {}
	async addBadge(badge) {
		if (badge.issuerName === this.issuerName) {
			if (this.badges.indexOf(badge) < 0) {
				this.badges.push(badge);
			}
		}
	}
}
