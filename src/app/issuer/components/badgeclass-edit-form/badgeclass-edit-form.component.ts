import {
	AfterViewInit,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnInit,
	Output,
	ViewChild,
	isDevMode,
	SimpleChanges,
	AfterViewChecked,
	OnChanges,
	inject,
} from '@angular/core';
import {
	AbstractControl,
	Validators,
	ValidatorFn,
	ValidationErrors,
	NgModel,
	FormsModule,
	ReactiveFormsModule,
} from '@angular/forms';
import { Md5 } from 'ts-md5';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { MessageService } from '../../../common/services/message.service';
import {
	ApiBadgeClassForCreation,
	BadgeClassCategory,
	BadgeClassCopyPermissions,
	BadgeClassLevel,
} from '../../models/badgeclass-api.model';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { BadgeStudioComponent } from '../badge-studio/badge-studio.component';
import { BgFormFieldImageComponent } from '../../../common/components/formfield-image';
import { UrlValidator } from '../../../common/validators/url.validator';
import { CommonDialogsService } from '../../../common/services/common-dialogs.service';
import { BadgeClass } from '../../models/badgeclass.model';
import { AppConfigService } from '../../../common/app-config.service';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { FormFieldSelectOption } from '../../../common/components/formfield-select';
import { AiSkillsService } from '../../../common/services/ai-skills.service';
import { ApiSkill } from '../../../common/model/ai-skills.model';
import { TranslateService, TranslatePipe, TranslateModule } from '@ngx-translate/core';
import { NavigationService } from '../../../common/services/navigation.service';
import { base64ByteSize } from '../../../common/util/file-util';
import { StepperComponent } from '../../../components/stepper/stepper.component';
import { BadgeClassDetailsComponent } from '../badgeclass-create-steps/badgeclass-details/badgeclass-details.component';
import { Issuer } from '../../models/issuer.model';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { NgClass, NgStyle, DecimalPipe } from '@angular/common';
import { BadgeLegendComponent } from '../../../common/components/badge-legend/badge-legend.component';
import { StepComponent } from '../../../components/stepper/step.component';
import { CdkStep } from '@angular/cdk/stepper';
import { OebInputComponent } from '../../../components/input.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { OebCollapsibleComponent } from '../../../components/oeb-collapsible.component';
import { NgIcon } from '@ng-icons/core';
import { OebSelectComponent } from '../../../components/select.component';
import { AutocompleteLibModule } from 'angular-ng-autocomplete';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmH2, HlmP } from '@spartan-ng/helm/typography';
import { Network } from '~/issuer/network.model';
import { PositiveIntegerOrNullValidator } from '~/common/validators/positive-integer-or-null.validator';
import { getDurationOptions, expirationToDays, ExpirationUnit } from '~/common/util/expiration-util';
import { CatalogService } from '~/catalog/catalog.service';

const MAX_STUDYLOAD_HRS: number = 10_000;
const MAX_HRS_PER_COMPETENCY: number = 999;

@Component({
	selector: 'badgeclass-edit-form',
	templateUrl: './badgeclass-edit-form.component.html',
	styleUrl: './badgeclass-edit-form.component.css',
	imports: [
		FormMessageComponent,
		BadgeLegendComponent,
		FormsModule,
		ReactiveFormsModule,
		StepperComponent,
		StepComponent,
		CdkStep,
		HlmH2,
		OebInputComponent,
		HlmP,
		BgFormFieldImageComponent,
		BadgeStudioComponent,
		NgClass,
		OebButtonComponent,
		OebCheckboxComponent,
		OebCollapsibleComponent,
		NgIcon,
		HlmIcon,
		NgStyle,
		OebSelectComponent,
		AutocompleteLibModule,
		DecimalPipe,
		TranslatePipe,
		TranslateModule,
	],
})
export class BadgeClassEditFormComponent
	extends BaseAuthenticatedRoutableComponent
	implements OnInit, AfterViewInit, AfterViewChecked, OnChanges
{
	protected messageService = inject(MessageService);
	private configService = inject(AppConfigService);
	protected badgeClassManager = inject(BadgeClassManager);
	protected dialogService = inject(CommonDialogsService);
	protected aiSkillsService = inject(AiSkillsService);
	private translate = inject(TranslateService);
	private navService = inject(NavigationService);
	protected catalogService = inject(CatalogService);

	baseUrl: string;
	badgeCategory: string;

	aiCompetenciesLoading = false;
	selectedKeywordCompetencies: ApiSkill[] = [];
	keywordCompetenciesResult: ApiSkill[] = [];
	keywordCompetenciesLanguage = 'de';
	keywordCompetenciesShowResults = false;
	keywordCompetenciesLoading = false;
	keywordCompetenciesLoaded = false;
	keywordCompetenciesViewChildrenInitialized = false;

	isDevMode: boolean = false && isDevMode(); // DEBUG: enable to skip steps

	// Translation
	selectFromMyFiles = this.translate.instant('RecBadge.selectFromMyFiles');
	chooseFromExistingIcons = this.translate.instant('RecBadge.chooseFromExistingIcons');
	uploadOwnVisual = this.translate.instant('RecBadge.uploadOwnVisual');
	chooseABadgeCategory = this.translate.instant('CreateBadge.chooseABadgeCategory');
	summarizedDescription =
		this.translate.instant('CreateBadge.summarizedDescription') +
		' ' +
		this.translate.instant('CreateBadge.descriptionSavedInBadge');
	enterDescription = this.translate.instant('Issuer.enterDescription');
	max60chars = '(max. 60 ' + this.translate.instant('General.characters') + ')';

	useOurEditor = this.translate.instant('CreateBadge.useOurEditor');
	imageSublabel = this.translate.instant('CreateBadge.imageSublabel');
	useOwnVisual = this.translate.instant('CreateBadge.useOwnVisual');
	uploadOwnDesign = this.translate.instant('CreateBadge.uploadOwnDesign');
	imageErrorFork = this.translate.instant('CreateBadge.imageErrorFork');

	detailedDescription = this.translate.instant('CreateBadge.detailedDescription');
	competencyTitle = this.translate.instant('Badge.competency') + '-' + this.translate.instant('General.title');
	titleError = this.translate.instant('CreateBadge.titleError');
	requiredError = this.translate.instant('CreateBadge.requiredError');
	competencyDuration = this.translate.instant('CreateBadge.competencyDuration');
	competencyCategory = this.translate.instant('Badge.competency') + '-' + this.translate.instant('Badge.category');
	competencyCategoryError = this.translate.instant('CreateBadge.competencyCategoryError');
	competencyDescription =
		this.translate.instant('Badge.competency') + '-' + this.translate.instant('General.description');
	minMaxError = this.translate.instant('CreateBadge.minMaxError');
	hoursMaxError = this.translate.instant('CreateBadge.hoursMaxError');
	shortDescription = this.translate.instant('CreateBadge.shortDescription');
	alignmentNameError = this.translate.instant('CreateBadge.alignmentNameError');
	alignmentURLError = this.translate.instant('CreateBadge.alignmentURLError');

	chooseDuration = this.translate.instant('CreateBadge.chooseDuration');
	newTag = this.translate.instant('CreateBadge.newTag');

	suggestCompetenciesText = this.translate.instant('CreateBadge.suggestCompetencies');

	giveBadgeTitle = this.translate.instant('CreateBadge.giveBadgeTitle');
	changeBadgeTitle = this.translate.instant('CreateBadge.changeBadgeTitle');
	maxValue1000 = this.translate.instant('CreateBadge.maxValue1000');

	imageTooLarge = this.translate.instant('CreateBadge.imageTooLarge');

	competencyExceedsBadgeDurationError = this.translate.instant('CreateBadge.competencyExceedsBadgeDuration');
	competenceHoursMinutesZeroError = this.translate.instant('CreateBadge.competenceHoursMinutesZero');
	pleaseAddCompetencies = this.translate.instant('CreateBadge.pleaseAddCompetencies');

	// To check custom-image size
	maxCustomImageSize = 1024 * 1024 * 2;
	isCustomImageLarge: boolean = false;

	pendingInitialization: BadgeClass | null = null;

	@Input()
	set badgeClass(badgeClass: BadgeClass) {
		if (this.existingBadgeClass !== badgeClass) {
			this.existingBadgeClass = badgeClass;
			this.existing = true;
			this.initFormFromExisting(this.existingBadgeClass);
		}
	}

	@Input() set initBadgeClass(badgeClass: BadgeClass) {
		if (this.initialisedBadgeClass !== badgeClass) {
			this.initialisedBadgeClass = badgeClass;
			this.initFormFromExisting(this.initialisedBadgeClass);
		}
	}

	/**
	 * Wether or not the badge class that is being worked on is forked.
	 * This field is required to reduce the possibility of misordering @link initBadgeClass and isForked
	 * calls (isForked has to be set first).
	 * If not set, an error is logged and it is interpreted as `false`.
	 */
	@Input()
	set isForked(isBadgeClassForked: boolean | string) {
		// Parameters from HTML are passed as string, even if the type of the parameter
		// is set to boolean
		if (typeof isBadgeClassForked == 'string') isBadgeClassForked = isBadgeClassForked == 'true';
		this.isBadgeClassForked = isBadgeClassForked;
	}

	get badgeClass() {
		return this.initialisedBadgeClass ? this.initialisedBadgeClass : this.existingBadgeClass;
	}

	get imageFieldDirty() {
		return this.badgeClassForm.controls.badge_image.dirty || this.badgeClassForm.controls.badge_customImage.dirty;
	}

	get badgeStudyLoadDirty() {
		return this.badgeClassForm.controls.badge_hours.dirty || this.badgeClassForm.controls.badge_minutes.dirty;
	}

	getImagePath(): string {
		return `../../../../breakdown/static/badgestudio/shapes/${this.category}.svg`;
	}

	readonly badgeClassPlaceholderImageUrl = '../../../../breakdown/static/images/placeholderavatar.svg';

	criteriaOptions = [
		{ controlName: 'activeParticipation', text: this.translate.instant('Badge.activeParticipation') },
		{ controlName: 'selfReflection', text: this.translate.instant('Badge.selfReflection') },
		{ controlName: 'peerFeedback', text: 'Peer-Feedback' },
		{ controlName: 'achievedIndividualLearning', text: this.translate.instant('Badge.achievedIndividualLearning') },
		{ controlName: 'passed75', text: this.translate.instant('Badge.passed75') },
		{ controlName: 'practicalApplication', text: this.translate.instant('Badge.practicalApplication') },
		{ controlName: 'onlineCourseCompleted', text: this.translate.instant('Badge.onlineCourseCompleted') },
		{ controlName: 'portfolio', text: 'Portfolio' },
		{ controlName: 'projectCompleted', text: this.translate.instant('Badge.projectCompleted') },
		{ controlName: 'exam', text: this.translate.instant('General.exam') },
	];
	/**
	 * The name the badge is not allowed to have.
	 * This is used to enforce a change of the pattern when forking a badge.
	 */
	forbiddenName: string | null = null;
	/**
	 * The image the badge is not allowed to have.
	 * This is used to enforce a change of the pattern when forking a badge.
	 */
	forbiddenImage: string | null = null;

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

	/**
	 * The description of the competencies entered by the user
	 * for the AI tool
	 */
	aiCompetenciesDescription: string = '';

	/**
	 * The suggested competencies regarding the description
	 * from the user (@see aiCompetenciesDescription)
	 */
	aiCompetenciesSuggestions: ApiSkill[] = [];

	/**
	 * The query for the ESCO Skill search for the AI tool
	 */
	keywordCompetenciesKeywords: string = '';

	savePromise: Promise<BadgeClass> | null = null;
	criteriaForm = typedFormGroup()
		.addControl('name', '', [Validators.required, Validators.maxLength(50)])
		.addControl('description', '', Validators.maxLength(300));

	criteriaSelectionsForm = typedFormGroup().addArray(
		'selections',
		typedFormGroup().addControl('controlName', '').addControl('selected', false).addControl('text', ''),
	);

	badgeClassForm = typedFormGroup([
		this.imageValidation.bind(this),
		this.maxStudyLoadValidation.bind(this),
		this.noDuplicateCompetencies.bind(this),
		this.hoursAndMinutesValidatorBadgeDuration.bind(this),
		this.hoursAndMinutesValidatorCompetencies.bind(this),
	])
		.addControl('badge_name', '', [
			Validators.required,
			Validators.maxLength(60),
			// Validation that the name of a fork changed
			(control: AbstractControl): ValidationErrors | null =>
				this.forbiddenName && this.forbiddenName == control.value
					? { mustChange: { value: control.value } }
					: null,
		])
		.addControl('badge_image', '')
		.addControl('badge_customImage', '')
		.addControl('useIssuerImageInBadge', true)
		.addControl('badge_description', '', [Validators.required, Validators.maxLength(700)])
		.addControl('badge_study_load', 0, [(control) => PositiveIntegerOrNullValidator.valid(control, this.translate)])
		.addControl('badge_hours', 1, (control) => PositiveIntegerOrNullValidator.valid(control, this.translate))
		.addControl('badge_minutes', 0, (control) => PositiveIntegerOrNullValidator.valid(control, this.translate))
		.addControl('badge_category', '', Validators.required)
		.addControl('badge_level', 'a1', Validators.required)
		.addControl('badge_based_on', {
			slug: '',
			issuerSlug: '',
		})
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
		.addArray(
			'aiCompetencies',
			typedFormGroup()
				.addControl('selected', false)
				.addControl('studyLoad', 60, [Validators.required, this.positiveInteger()])
				.addControl('hours', 1, [
					(control) => PositiveIntegerOrNullValidator.valid(control, this.translate),
					Validators.max(MAX_HRS_PER_COMPETENCY),
				])
				.addControl('minutes', 0, [
					(control) => PositiveIntegerOrNullValidator.valid(control, this.translate),
					Validators.max(59),
				])
				.addControl('framework', 'esco', Validators.required),
		)
		.addArray(
			'keywordCompetencies',
			typedFormGroup()
				.addControl('studyLoad', 60, [Validators.required, this.positiveInteger()])
				.addControl('hours', 1, [
					(control) => PositiveIntegerOrNullValidator.valid(control, this.translate),
					Validators.max(MAX_HRS_PER_COMPETENCY),
				])
				.addControl('minutes', 0, [
					(control) => PositiveIntegerOrNullValidator.valid(control, this.translate),
					Validators.max(59),
				])
				.addControl('framework', 'esco', Validators.required),
		)
		.addArray(
			'competencies',
			typedFormGroup()
				.addControl('added', false)
				.addControl('name', '', Validators.required)
				.addControl('description', '', Validators.required)
				.addControl('framework_identifier', '')
				// limit of 1000000 is set so that users cant break the UI by entering a very long number
				.addControl('studyLoad', 60, [Validators.required, this.positiveInteger()])
				.addControl('hours', 1, [
					(control) => PositiveIntegerOrNullValidator.valid(control, this.translate),
					Validators.max(MAX_HRS_PER_COMPETENCY),
				])
				.addControl('minutes', 0, [
					(control) => PositiveIntegerOrNullValidator.valid(control, this.translate),
					Validators.max(59),
				])
				.addControl('category', '', Validators.required)
				.addControl('framework', '')
				.addControl('source', ''),
		)
		.addArray(
			'alignments',
			typedFormGroup()
				.addControl('target_name', '', Validators.required)
				.addControl('target_url', '', [Validators.required, UrlValidator.validUrl])
				.addControl('target_description', '')
				.addControl('target_framework', '')
				.addControl('target_code', ''),
		)
		.addControl('courseUrl', null, UrlValidator.validUrl)
		.addControl('expiration', null, [(control) => PositiveIntegerOrNullValidator.valid(control, this.translate)])
		.addControl('expiration_unit', 'days', Validators.required)
		.addArray('criteria', this.criteriaForm)

		.addControl('copy_permissions_allow_others', false);

	@ViewChild('badgeStudio')
	badgeStudio: BadgeStudioComponent;

	@ViewChild('imageField')
	imageField: BgFormFieldImageComponent;

	@ViewChild('customImageField')
	customImageField: BgFormFieldImageComponent;

	@ViewChild('newTagInput')
	newTagInput: ElementRef<HTMLInputElement>;

	@ViewChild('formElem')
	formElem: ElementRef<HTMLFormElement>;

	@ViewChild('imageSection') imageSection!: ElementRef<HTMLElement>;

	@ViewChild('keywordCompetenciesInput') keywordCompetenciesInput: ElementRef<HTMLInputElement>;
	@ViewChild('keywordCompetenciesInputModel') keywordCompetenciesInputModel: NgModel;
	@ViewChild('keywordCompetenciesLanguageSelectModel') keywordCompetenciesLanguageSelectModel: NgModel;

	existingBadgeClass: BadgeClass | null = null;

	initialisedBadgeClass: BadgeClass | null = null;

	badgeClassesLoadedPromise: Promise<unknown>;
	badgeClasses: BadgeClass[] | null;
	selectedBadgeClasses: BadgeClass[] = [];

	/**
	 * Indicates wether or not the @link initialisedBadgeClass is forked
	 */
	isBadgeClassForked: boolean | null = null;

	@Output()
	save = new EventEmitter<Promise<BadgeClass>>();

	@Output()
	cancelEdit = new EventEmitter<void>();

	@Input()
	issuer: Issuer | Network;

	@Input()
	category: string;

	@Input()
	scrolled: boolean;

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Tags
	tags = new Set<string>();

	collapsedCompetenciesOpen = false;

	durationOptions = null;

	categoryOptions: Partial<{ [key in BadgeClassCategory]: string }> = {
		competency: this.translate.instant('Badge.competency'),
		participation: this.translate.instant('Badge.participation'),
	};

	competencyCategoryOptions = {
		skill: this.translate.instant('Badge.skill'),
		knowledge: this.translate.instant('Badge.knowledge'),
	};

	levelOptions: { [key in BadgeClassLevel]: string } = {
		a1: 'A1 Einsteiger*in',
		a2: 'A2 Entdecker*in',
		b1: 'B1 Insider*in',
		b2: 'B2 Expert*in',
		c1: 'C1 Leader*in',
		c2: 'C2 Vorreiter*in',
	};

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Alignments
	alignmentsEnabled = false;
	showAdvanced: boolean[] = [false];

	currentImage;
	existing = false;
	showLegend = false;

	@ViewChild(StepperComponent) stepper: StepperComponent;

	@ViewChild('stepTwo') stepTwo!: BadgeClassDetailsComponent;

	selectedStep = 0;
	next: string;
	previous: string;

	constructor() {
		super();
		const translate = this.translate;

		this.baseUrl = this.configService.apiConfig.baseUrl;

		this.keywordCompetenciesLanguage = translate.currentLang;
	}

	initFormFromExisting(badgeClass: BadgeClass) {
		if (!badgeClass) return;

		if (this.isBadgeClassForked === null) {
			console.error('Missing information on wether the init badge is forked!');
			this.isBadgeClassForked = false;
		}

		if (this.isBadgeClassForked) {
			// Store the "old" name and image (hash) to later verify that it changed
			this.forbiddenName = badgeClass.name;
			this.forbiddenImage = badgeClass.extension['extensions:OrgImageExtension']?.OrgImage
				? (() => {
						const hash = new Md5()
							.appendStr(badgeClass.extension['extensions:OrgImageExtension'].OrgImage)
							.end();
						return typeof hash === 'string' ? hash : hash.join('');
					})()
				: null;
		} else {
			this.forbiddenName = null;
			this.forbiddenImage = null;
		}

		// transform minutes into hours and minutes
		let competencies = badgeClass.extension['extensions:CompetencyExtension'].map((comp) => {
			return { ...comp, hours: Math.floor(comp.studyLoad / 60), minutes: comp.studyLoad % 60 };
		});

		this.category = badgeClass.extension['extensions:CategoryExtension']
			? badgeClass.extension['extensions:CategoryExtension'].Category
			: 'participation';

		this.badgeClassForm.setValue({
			badge_name: badgeClass.name,
			badge_image: badgeClass.imageFrame ? badgeClass.image : null,
			badge_customImage: !badgeClass.imageFrame ? badgeClass.image : null,
			useIssuerImageInBadge: this.badgeClassForm.value.useIssuerImageInBadge,
			badge_description: badgeClass.description,
			badge_hours: badgeClass.extension['extensions:StudyLoadExtension']
				? Math.floor(badgeClass.extension['extensions:StudyLoadExtension'].StudyLoad / 60)
				: null,
			badge_minutes: badgeClass.extension['extensions:StudyLoadExtension']
				? badgeClass.extension['extensions:StudyLoadExtension'].StudyLoad % 60
				: null,
			badge_study_load: badgeClass.extension['extensions:StudyLoadExtension']
				? badgeClass.extension['extensions:StudyLoadExtension'].StudyLoad
				: null,
			badge_category: this.category,
			badge_level: badgeClass.extension['extensions:LevelExtension']?.Level || 'a1', // a1 is default in formcontrol
			badge_based_on: {
				slug: badgeClass.slug,
				issuerSlug: badgeClass.issuerSlug,
			},
			license: badgeClass.extension['extensions:LicenseExtension']
				? [
						{
							id: badgeClass.extension['extensions:LicenseExtension'].id,
							name: badgeClass.extension['extensions:LicenseExtension'].name,
							legalCode: badgeClass.extension['extensions:LicenseExtension'].legalCode,
						},
					]
				: [
						{
							id: 'CC-0',
							name: 'Public Domain',
							legalCode: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
						},
					],
			// Note that, even though competencies might originally have been selected
			// based on ai suggestions, they can't be separated anymore and thus will
			// be displayed as competencies entered by hand
			aiCompetencies: [],
			keywordCompetencies: [],
			competencies: badgeClass.extension['extensions:CompetencyExtension'] ? competencies : [],
			alignments: this.badgeClass.alignments.map((alignment) => ({
				target_name: alignment.target_name,
				target_url: alignment.target_url,
				target_description: alignment.target_description,
				target_framework: alignment.target_framework,
				target_code: alignment.target_code,
			})),
			courseUrl: badgeClass.courseUrl,
			expiration: badgeClass.expiration,
			expiration_unit: 'days', // api always returns expiration in days
			criteria: badgeClass.apiModel.criteria,
			copy_permissions_allow_others: this.existing ? badgeClass.canCopy('others') : false,
		});

		if (this.badgeClassForm.controls.competencies.controls.length > 0) {
			this.collapsedCompetenciesOpen = true;
		}

		this.currentImage = badgeClass.extension['extensions:OrgImageExtension']
			? badgeClass.extension['extensions:OrgImageExtension'].OrgImage
			: undefined;

		setTimeout(() => {
			if (badgeClass.imageFrame) {
				// regenerating the upload image for the issuer image in case it changed via copying
				// or if it was not part of the badge image yet
				this.generateUploadImage(this.currentImage, this.badgeClassForm.value, true, true);
			}
		}, 1);

		this.tags = new Set();
		this.badgeClass.tags.forEach((t) => this.tags.add(t));

		this.alignmentsEnabled = this.badgeClass.alignments.length > 0;
	}

	ngOnInit() {
		super.ngOnInit();
		this.fetchTags();

		this.durationOptions = getDurationOptions(this.translate);

		if (this.issuer.is_network) {
			this.badgeClassForm.rawControl.controls.useIssuerImageInBadge.setValue(false);
		}

		this.criteriaOptions.forEach((option) => {
			const selectionGroup = typedFormGroup()
				.addControl('controlName', option.controlName)
				.addControl('selected', false)
				.addControl('text', option.text);

			this.criteriaSelectionsForm.controls.selections.push(selectionGroup);
		});

		this.criteriaSelectionsForm.controls.selections.controls.forEach((group, index) => {
			group.controls.selected.rawControl.valueChanges.subscribe((isSelected) => {
				const controlName = group.controls.text.value;

				if (isSelected) {
					this.addCriteriaIfNotExists(controlName);
				} else {
					this.removeCriteria(controlName);
				}
			});
		});

		this.translate.get('General.next').subscribe((next) => {
			this.next = next;
		});
		this.translate.get('General.previous').subscribe((previous) => {
			this.previous = previous;
		});

		if (!this.existing) {
			this.badgeClassForm.controls.license.addFromTemplate();
		}

		// Set badge category when editing a badge. As new select component doesn't show badge competencies
		// FIXME: only runs when initializing the component via button click, not when refreshing the url
		// maybe combine this with initFormFromExisting?
		if (this.category && this.categoryOptions.hasOwnProperty(this.category)) {
			this.badgeClassForm.rawControl.controls['badge_category'].setValue(this.category);
		}
		this.badgeCategory = this.badgeClassForm.rawControl.controls['badge_category'].value;

		// update badge frame when a category is selected, unless no-hexagon-frame checkbox is checked
		this.badgeClassForm.rawControl.controls['badge_category'].statusChanges.subscribe((res) => {
			this.handleBadgeCategoryChange();
		});

		this.badgeClassForm.rawControl.controls['useIssuerImageInBadge'].valueChanges.subscribe(
			(useIssuerImageInBadge) => {
				if (this.currentImage && this.imageField.control.value) {
					this.generateUploadImage(this.currentImage, this.badgeClassForm.value, useIssuerImageInBadge);
				}
			},
		);

		// To check duplicate competencies only when one is selected
		if (this.badgeClassForm.controls.aiCompetencies.controls['selected']) {
			this.badgeClassForm.controls.aiCompetencies.controls['selected'].statusChanges.subscribe((res) => {
				this.checkDuplicateCompetency();
			});
		}

		if (!this.existingBadgeClass && !this.initialisedBadgeClass) {
			// restore values from sessionStorage for new badges
			const sessionValues = sessionStorage.getItem('oeb-create-badgeclassvalues');
			if (sessionValues) {
				this.badgeClassForm.rawControl.patchValue(JSON.parse(sessionValues));
			}
			// restore values from sessionStorage
			const saveableSessionValues = ['badge_name', 'badge_description', 'badge_hours', 'badge_minutes'];
			const filterSessionValues = (values: object) => {
				const filteredValues = {};
				for (const [k, v] of Object.entries(values)) {
					if (saveableSessionValues.includes(k)) {
						filteredValues[k] = v;
					}
				}
				return filteredValues;
			};
			this.badgeClassForm.rawControl.valueChanges.subscribe((v) => {
				sessionStorage.setItem(
					'oeb-create-badgeclassvalues',
					JSON.stringify(filterSessionValues(this.badgeClassForm.rawControl.value)),
				);
			});
		} else {
			// clear session storage when editing existing badges
			sessionStorage.removeItem('oeb-create-badgeclassvalues');
		}
	}

	ngAfterViewInit(): void {
		this.imageField.control.statusChanges.subscribe((e) => {
			if (this.imageField.control.value != null) this.customImageField.control.reset();
		});

		this.customImageField.control.statusChanges.subscribe((e) => {
			if (this.customImageField.control.value != null) this.imageField.control.reset();
		});

		this.stepper.selectionChange.subscribe((event) => {
			this.selectedStep = event.selectedIndex;
			this.badgeClassForm.rawControl.setValidators([
				this.createCompetenciesValidator(),
				this.hoursAndMinutesValidatorCompetencies(),
				// this.hoursAndMinutesValidatorBadgeDuration(),
				this.noDuplicateCompetencies(),
			]);
			this.badgeClassForm.rawControl.updateValueAndValidity();
		});
	}

	ngAfterViewChecked() {
		if (
			this.keywordCompetenciesInputModel &&
			this.keywordCompetenciesLanguageSelectModel &&
			!this.keywordCompetenciesViewChildrenInitialized
		) {
			this.initializeViewChildSubscriptions();
			this.keywordCompetenciesViewChildrenInitialized = true;
		}
	}

	private initializeViewChildSubscriptions() {
		// debounce ai competencies keyword search input
		this.keywordCompetenciesInputModel.valueChanges
			.pipe(debounceTime(500))
			.pipe(distinctUntilChanged())
			.subscribe(() => {
				this.keywordCompetenciesKeywordsChange();
			});

		this.keywordCompetenciesLanguageSelectModel.valueChanges.subscribe((val: string) => {
			// valueChanges is triggered before the value has been set, so we set it manually
			this.keywordCompetenciesLanguage = val;
			this.keywordCompetenciesInput.nativeElement.focus();
			this.keywordCompetenciesKeywordsChange();
		});
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['badgeClass'] && changes['badgeClass'].currentValue) {
			if (this.badgeClassForm.controls.criteria.controls.length > 0) {
				const existingCriteriaNames = this.badgeClassForm.controls.criteria.controls.map(
					(criteriaGroup) => criteriaGroup.controls.name.value,
				);

				this.criteriaSelectionsForm.controls.selections.controls.forEach((selectionGroup) => {
					const controlText = selectionGroup.controls.text.value;

					if (existingCriteriaNames.includes(controlText)) {
						selectionGroup.controls.selected.setValue(true);
					}
				});
			}
		}
	}

	isPredefinedCriteria(criteria: typeof this.criteriaForm): boolean {
		const controlName = criteria.value.name;
		return this.criteriaOptions.some((option) => option.text === controlName);
	}

	addCriteriaIfNotExists(controlName: string) {
		if (this.findCriteriaIndex(controlName) === -1) {
			const newGroup = typedFormGroup().addControl('name', controlName).addControl('description', '');

			this.badgeClassForm.controls.criteria.push(newGroup);
		}
	}

	removeCriteria(controlName: string) {
		const index = this.findCriteriaIndex(controlName);
		const selectionIndex = this.findCriteriaSelectionIndex(controlName);
		if (index !== -1) {
			this.badgeClassForm.controls.criteria.removeAt(index);
			this.criteriaSelectionsForm.controls.selections.controls
				.at(selectionIndex)
				.controls.selected.setValue(false);
		}
	}

	findCriteriaIndex(controlName: string): number {
		return this.badgeClassForm.controls.criteria.controls.findIndex(
			(group) => group.controls.name.value === controlName,
		);
	}

	findCriteriaSelectionIndex(controlName: string): number {
		return this.criteriaSelectionsForm.controls.selections.controls.findIndex(
			(group) => group.controls.controlName.value === controlName,
		);
	}

	get selectedCriteria() {
		return this.criteriaSelectionsForm.controls.selections.controls
			.filter((control) => control.controls.selected.value === true)
			.map((control) => ({
				controlName: control.controls.controlName.value,
				text: control.controls.text.value,
			}));
	}

	getCompetencyPageError() {
		if (this.badgeClassForm.valid) return;
		if (
			this.badgeClassForm.hasError('competencyExceedsBadgeDuration') ||
			this.badgeClassForm.hasError('competenceHoursMinutesZero') ||
			this.badgeClassForm.hasError('maxMinutesCompetencyError') ||
			this.badgeClassForm.hasError('maxHoursCompetencyError') ||
			this.badgeClassForm.hasError('duplicateCompetency')
		) {
			return this.translate.instant('CreateBadge.invalidCompetence');
		}
		// else if(this.badgeClassForm.hasError('competenceHoursMinutesZero')){
		// 	return this.competenceHoursMinutesZeroError
		// }
		else {
			return this.pleaseAddCompetencies;
		}
	}

	clearCompetencies() {
		const competencies = this.badgeClassForm.controls.competencies;
		competencies.reset();
		for (let i = competencies.length - 1; i >= 0; i--) {
			competencies.removeAt(i);
		}
	}

	async confirmCategoryChange(): Promise<boolean> {
		return await this.dialogService.confirmDialog.openTrueFalseDialog({
			dialogTitle: 'Wenn du die Kategorie änderst, werden alle Kompetenzen gelöscht.',
			dialogBody: 'Möchtest du fortfahren?',
			resolveButtonLabel: 'Fortfahren',
			rejectButtonLabel: 'Abbrechen',
		});
	}

	async handleBadgeCategoryChange() {
		const badgeCategoryControl = this.badgeClassForm.rawControl.controls['badge_category'];
		const currentBadgeCategory = badgeCategoryControl.value;

		// First part of below if-condition is to handle selecting category for first time
		if (this.badgeCategory === 'competency' && currentBadgeCategory !== 'competency') {
			if (await this.confirmCategoryChange()) {
				this.clearCompetencies();
			} else {
				this.badgeClassForm.controls['badge_category'].setValue(this.badgeCategory);
				return;
			}
		}
		this.badgeCategory = currentBadgeCategory;

		// To update badge-frame when badge-category is changed
		this.changeBadgeFrame();
	}

	changeBadgeFrame() {
		// check browser refresh to resolve disappearing badge-image when page reload
		if (!this.navService.browserRefresh) {
			if (this.imageField?.control.value) {
				this.updateImageFrame(this.badgeClassForm.value, true);
			} else if (this.customImageField?.control.value) {
				if (!this.existing) {
					this.customImageField.useDataUrl(this.customImageField.control.value, 'BADGE');
				}
			}
		} else {
			this.navService.browserRefresh = false;
		}
	}

	/**
	 * Fetches the tags from the @see badgeClassManager and selects the tags from them.
	 * The tags are then assigned to @see existingTags in an appropriate format.
	 * At the beginning, @see existingTagsLoading is set, once tags are loaded it's unset.
	 */
	fetchTags() {
		this.existingTags = [];
		this.existingTagsLoading = true;
		this.catalogService.getBadgeTags().then(
			(tags) => {
				this.existingTags = tags.map((tag, index) => ({
					id: index,
					name: tag,
				}));
				this.tagOptions = this.existingTags.map(
					(tag) =>
						({
							value: tag.name,
							label: tag.name,
						}) as FormFieldSelectOption,
				);
				// The tags are loaded in one badge, so it's save to assume
				// that after the first `next` call, the loading is done
				this.existingTagsLoading = false;
			},
			(err) => {
				console.error("Couldn't fetch labels: " + err);
				this.existingTagsLoading = false;
			},
		);
	}

	addTag() {
		const newTag = (this.newTagInput['query'] || '').trim().toLowerCase();

		if (newTag.length > 0) {
			this.tags.add(newTag);

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

	removeTag(tag: string) {
		this.tags.delete(tag);
	}

	enableAlignments() {
		this.alignmentsEnabled = true;
		if (this.badgeClassForm.controls.alignments.length === 0) {
			this.addAlignment();
		}
	}

	addAlignment() {
		this.badgeClassForm.controls.alignments.addFromTemplate();
	}

	addNewOwnCriteria() {
		this.badgeClassForm.controls.criteria.addFromTemplate();
	}

	addCompetency(competency: typeof this.badgeClassForm.controls.competencies) {
		competency.markTreeDirty();
		if (competency.invalid) {
			return;
		}
		competency.controls['added'].setValue(true);
	}

	addAnotherCompetency() {
		this.badgeClassForm.controls.competencies.addFromTemplate();
	}

	/**
	 * Fetches competencies from the ai tool (@see aiSkillsService) and saves them
	 * in @see aiCompetenciesSuggestions. Also adds the necessary form control
	 * (@see badgeClassForm.controls.aiCompetencies) (and removes the old ones).
	 */
	suggestCompetencies() {
		if (this.aiCompetenciesDescription.length < 70) {
			return;
		}
		this.aiCompetenciesLoading = true;
		this.aiSkillsService
			.getAiSkills(this.aiCompetenciesDescription)
			.then((skills) => {
				let aiCompetencies = this.badgeClassForm.controls.aiCompetencies;
				const selectedAiCompetencies = aiCompetencies.value
					.map((c, i) => (c.selected ? this.aiCompetenciesSuggestions[i] : null))
					.filter(Boolean);
				for (let i = aiCompetencies.length - 1; i >= 0; i--) {
					aiCompetencies.removeAt(i);
				}
				this.aiCompetenciesSuggestions = [
					...selectedAiCompetencies,
					...skills.filter(
						(skill) =>
							!selectedAiCompetencies.some((existing) => existing.concept_uri === skill.concept_uri),
					),
				];

				this.aiCompetenciesSuggestions.forEach((skill, i) => {
					aiCompetencies.addFromTemplate();
					if (selectedAiCompetencies.includes(skill)) {
						this.badgeClassForm.controls.aiCompetencies.controls[i].setValue({
							...this.badgeClassForm.controls.aiCompetencies.controls[i].value,
							selected: true,
						});
					}
				});
				this.aiCompetenciesLoading = false;
			})
			.catch((error) => {
				this.aiCompetenciesLoading = false;
				this.messageService.reportAndThrowError(`Failed to obtain ai skills: ${error.message}`, error);
			});
	}

	getSelectedAiCompetencies() {
		return this.badgeClassForm.controls.aiCompetencies.value.filter((c, i) => c.selected);
	}

	async keywordCompetenciesKeywordsChange() {
		if (this.keywordCompetenciesKeywords.length >= 3) {
			this.keywordCompetenciesLoading = true;
			try {
				this.keywordCompetenciesResult = [];
				this.keywordCompetenciesResult = await this.aiSkillsService.getAiKeywordSkills(
					this.keywordCompetenciesKeywords,
					this.keywordCompetenciesLanguage,
				);
			} catch (error) {
				this.messageService.reportAndThrowError(`Failed to obtain ai skills: ${error.message}`, error);
			}
			this.keywordCompetenciesLoading = false;
			this.keywordCompetenciesLoaded = true;
		}
	}

	keywordCompetenciesInputFocusOut() {
		// delay hiding for click event
		setTimeout(() => {
			this.keywordCompetenciesShowResults = false;
		}, 200);
	}

	addKeywordCompetenciesResult(skill: ApiSkill) {
		const existing = this.selectedKeywordCompetencies.find((s) => {
			return s.concept_uri == skill.concept_uri;
		});
		if (!existing) {
			this.selectedKeywordCompetencies.push(skill);
			this.badgeClassForm.controls.keywordCompetencies.addFromTemplate();
		}
	}
	removeKeywordCompetenciesResult(index: number) {
		this.selectedKeywordCompetencies.splice(index, 1);
		this.badgeClassForm.controls.keywordCompetencies.removeAt(index);
	}

	getFilteredkeywordCompetenciesResult() {
		return this.keywordCompetenciesResult.filter((result: ApiSkill) => {
			return !this.selectedKeywordCompetencies.find((s) => {
				return s.concept_uri == result.concept_uri;
			});
		});
	}

	async disableAlignments() {
		const isPlural = this.badgeClassForm.value.alignments.length > 1;
		if (
			!(await this.dialogService.confirmDialog.openTrueFalseDialog({
				dialogTitle: this.translate.instant('CreateBadge.removeAlignment') + (isPlural ? 's' : '') + '?',
				dialogBody:
					this.translate.instant('CreateBadge.removeAlignmentInfo') +
					this.translate.instant('CreateBadge.irreversibleAction'),
				resolveButtonLabel: this.translate.instant('General.remove'),
				rejectButtonLabel: this.translate.instant('General.cancel'),
			}))
		) {
			return;
		}
		this.alignmentsEnabled = false;
		this.badgeClassForm.setValue({
			...this.badgeClassForm.value,
			alignments: [],
		});
	}

	async removeAlignment(alignment: this['badgeClassForm']['controls']['alignments']['controls'][0]) {
		const value = alignment.value;

		if (
			(value.target_name || '').trim().length > 0 ||
			(value.target_url || '').trim().length > 0 ||
			(value.target_description || '').trim().length > 0 ||
			(value.target_framework || '').trim().length > 0 ||
			(value.target_code || '').trim().length > 0
		) {
			if (
				!(await this.dialogService.confirmDialog.openTrueFalseDialog({
					dialogTitle: this.translate.instant('CreateBadge.removeAlignment') + '?',
					dialogBody: this.translate.instant('CreateBadge.removeAlignmentInfo'),
					resolveButtonLabel:
						this.translate.instant('General.remove') +
						' ' +
						this.translate.instant('CreateBadge.alignment'),
					rejectButtonLabel: this.translate.instant('General.cancel'),
				}))
			) {
				return;
			}
		}

		this.badgeClassForm.controls.alignments.removeAt(
			this.badgeClassForm.controls.alignments.controls.indexOf(alignment),
		);
	}

	async removeCompetency(competency: this['badgeClassForm']['controls']['competencies']['controls'][0]) {
		const value = competency.value;

		if (
			(value.name || '').trim().length > 0 ||
			(value.description || '').trim().length > 0 ||
			(value['framework_identifier'] || '').trim().length > 0 ||
			(value.category || '').trim().length > 0
		) {
			if (
				!(await this.dialogService.confirmDialog.openTrueFalseDialog({
					dialogTitle: this.translate.instant('EditBadge.removeCompetency') + '?',
					dialogBody: this.translate.instant('EditBadge.removeCompetencyInfo'),
					resolveButtonLabel: this.translate.instant('EditBadge.removeCompetency'),
					rejectButtonLabel: this.translate.instant('General.cancel'),
				}))
			) {
				return;
			}
		}

		this.badgeClassForm.controls.competencies.removeAt(
			this.badgeClassForm.controls.competencies.controls.indexOf(competency),
		);
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	imageValidation(): ValidationErrors | null {
		if (!this.badgeClassForm) return null;

		const value = this.badgeClassForm.value;

		const image = (value.badge_image || '').trim();
		const customImage = (value.badge_customImage || '').trim();
		// To hide custom-image large size error msg
		this.isCustomImageLarge = false;

		if (!image.length && !customImage.length) {
			return { imageRequired: true };
		}

		// Validation that the image (hash) of a fork changed
		const controlValue = customImage || image;
		if (!controlValue || !this.forbiddenImage || !this.forbiddenImage) {
			return null;
		}
		const other = new Md5().appendStr(this.forbiddenImage).end();
		if (this.forbiddenImage != other) {
			return null;
		}
		return { mustChange: { value: this.forbiddenImage } };
	}

	maxStudyLoadValidation(): ValidationErrors | null {
		if (!this.badgeClassForm) return null;

		const value = this.badgeClassForm.value;

		const minutes = value.badge_minutes;
		if (minutes > 59) {
			return { maxMinutesError: true };
		}
		const hours = value.badge_hours;
		if (hours > MAX_STUDYLOAD_HRS) {
			return { maxHoursError: true };
		}
	}

	createCompetenciesValidator(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!this.badgeClassForm) return null;

			const allCompetencies = [
				...this.badgeClassForm.value.competencies,
				...this.badgeClassForm.value.keywordCompetencies,
				...this.badgeClassForm.value.aiCompetencies.filter((comp) => comp.selected),
			];

			const isAtCompetenciesStep = this.existingBadgeClass ? this.selectedStep >= 1 : this.selectedStep >= 2;

			if (
				this.badgeClassForm.controls.badge_category.value == 'competency' &&
				isAtCompetenciesStep &&
				allCompetencies.length == 0
			) {
				return { emptyCompetencies: true };
			}

			return null;
		};
	}

	// Validator for competencies, displays error messages for all compentencies
	hoursAndMinutesValidatorCompetencies(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!this.badgeClassForm) return null;

			const allCompetencies = [
				...this.badgeClassForm.value.competencies,
				...this.badgeClassForm.value.keywordCompetencies,
				...this.badgeClassForm.value.aiCompetencies.filter((comp) => comp.selected),
			];

			// Suche nach dem ersten fehlerhaften Kompetenzfeld
			const invalidCompetencyIndex = allCompetencies.findIndex(
				(competence) => Number(competence.hours) === 0 && Number(competence.minutes) === 0,
			);

			if (invalidCompetencyIndex !== -1) {
				return { competenceHoursMinutesZero: true, invalidIndex: invalidCompetencyIndex };
			}

			const invalidMaxMinutesCompetencyIndex = allCompetencies.findIndex(
				(competence) => Number(competence.minutes) > 59,
			);

			if (invalidMaxMinutesCompetencyIndex !== -1) {
				return { maxMinutesCompetencyError: true };
			}

			const invalidMaxHoursCompetencyIndex = allCompetencies.findIndex(
				(competence) => Number(competence.hours) > 999,
			);

			if (invalidMaxHoursCompetencyIndex !== -1) {
				return { maxHoursCompetencyError: true };
			}

			const badgeDurationInMinutes =
				Number(this.badgeClassForm.controls.badge_hours.value) * 60 +
				Number(this.badgeClassForm.controls.badge_minutes.value);

			const competencyExceedsBadgeDurationIndex = allCompetencies.findIndex(
				(competence) => Number(competence.hours * 60) + Number(competence.minutes) > badgeDurationInMinutes,
			);

			if (competencyExceedsBadgeDurationIndex !== -1) {
				return { competencyExceedsBadgeDuration: true, invalidIndex: competencyExceedsBadgeDurationIndex };
			}

			return null;
		};
	}

	// Validator for badge Duration, is displayed on the respective input
	hoursAndMinutesValidatorBadgeDuration(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!this.badgeClassForm) return null;

			const hours = Number(this.badgeClassForm.value.badge_hours);
			const minutes = Number(this.badgeClassForm.value.badge_minutes);
			if (hours === 0 && minutes === 0) {
				return { hoursAndMinutesError: true };
			}

			return null;
		};
	}

	competencyDurationValidator(): ValidationErrors | null {
		if (!this.badgeClassForm) return null;

		const hours = Number(this.badgeClassForm.value.badge_hours);
		const minutes = Number(this.badgeClassForm.value.badge_minutes);
		if (hours === 0 && minutes === 0) {
			return { hoursAndMinutesError: true };
		}

		return null;
	}

	async onSubmit() {
		try {
			if (this.badgeClassForm.rawControl.controls.badge_category.value === 'competency') {
				this.badgeClassForm.controls.competencies.rawControls.forEach((control, i) => {
					if (control.untouched && control.status === 'INVALID') {
						this.badgeClassForm.controls.competencies.removeAt(i);
					}
				});
			}

			let imageFrame = true;
			if (this.badgeClassForm.controls.badge_customImage.value && this.badgeClassForm.valid) {
				imageFrame = false;
				this.badgeClassForm.controls.badge_image.setValue(this.badgeClassForm.controls.badge_customImage.value);
			}

			this.badgeClassForm.markTreeDirty();

			if (!this.badgeClassForm.valid) {
				const firstInvalidInput = this.formElem.nativeElement.querySelector(
					'.ng-invalid,.dropzone-is-error,.u-text-error',
				);
				if (firstInvalidInput) {
					if (typeof firstInvalidInput['focus'] === 'function') {
						firstInvalidInput['focus']();
					}
					if (firstInvalidInput.id == 'imageTextError') {
						this.imageSection.nativeElement.scrollIntoView(true);
					} else {
						firstInvalidInput.scrollIntoView({ behavior: 'smooth' });
					}
				}
				const competencyError = this.badgeClassForm.errors?.['competenceHoursMinutesZero'];
				if (competencyError) {
					// On error scroll to competency headline
					const competencySection = document.getElementById('fillWithCompetencies');
					if (competencySection) {
						competencySection.scrollIntoView({ behavior: 'smooth' });
						competencySection.focus();
					}
				}
				return;
			}

			const formState = this.badgeClassForm.value;

			const studyLoadExtensionContextUrl = `${this.baseUrl}/static/extensions/StudyLoadExtension/context.json`;
			const categoryExtensionContextUrl = `${this.baseUrl}/static/extensions/CategoryExtension/context.json`;
			const levelExtensionContextUrl = `${this.baseUrl}/static/extensions/LevelExtension/context.json`;
			const basedOnExtensionContextUrl = `${this.baseUrl}/static/extensions/BasedOnExtension/context.json`;
			const competencyExtensionContextUrl = `${this.baseUrl}/static/extensions/CompetencyExtension/context.json`;
			const licenseExtensionContextUrl = `${this.baseUrl}/static/extensions/LicenseExtension/context.json`;
			const orgImageExtensionContextUrl = `${this.baseUrl}/static/extensions/OrgImageExtension/context.json`;

			const aiCompetenciesSuggestions = this.aiCompetenciesSuggestions;
			const keywordCompetenciesResults = this.selectedKeywordCompetencies;

			const expirationDays = expirationToDays(formState.expiration, formState.expiration_unit as ExpirationUnit);

			let copy_permissions: BadgeClassCopyPermissions[];
			if (this.issuer.is_network) {
				copy_permissions = ['none'];
			} else {
				copy_permissions = ['issuer'];
				if (formState.copy_permissions_allow_others) {
					copy_permissions.push('others');
				}
			}

			if (this.existingBadgeClass) {
				this.existingBadgeClass.name = formState.badge_name;
				this.existingBadgeClass.description = formState.badge_description;
				this.existingBadgeClass.image = !imageFrame ? formState.badge_image : null;
				this.existingBadgeClass.imageFrame = imageFrame;
				this.existingBadgeClass.alignments = this.alignmentsEnabled ? formState.alignments : [];
				this.existingBadgeClass.tags = Array.from(this.tags);
				this.existingBadgeClass.courseUrl = formState.courseUrl;
				this.existingBadgeClass.criteria = formState.criteria;
				this.existingBadgeClass.expiration = expirationDays;
				this.existingBadgeClass.criteria_text = '';
				this.existingBadgeClass.extension = {
					...this.existingBadgeClass.extension,
					'extensions:StudyLoadExtension': {
						'@context': studyLoadExtensionContextUrl,
						type: ['Extension', 'extensions:StudyLoadExtension'],
						StudyLoad: Number(formState.badge_hours) * 60 + Number(formState.badge_minutes),
					},
					'extensions:CategoryExtension': {
						'@context': categoryExtensionContextUrl,
						type: ['Extension', 'extensions:CategoryExtension'],
						Category: String(formState.badge_category),
					},
					'extensions:LevelExtension': {
						'@context': levelExtensionContextUrl,
						type: ['Extension', 'extensions:LevelExtension'],
						Level: String(formState.badge_level),
					},
					'extensions:LicenseExtension': {
						'@context': licenseExtensionContextUrl,
						type: ['Extension', 'extensions:LicenseExtension'],
						id: formState.license[0].id,
						name: formState.license[0].name,
						legalCode: formState.license[0].legalCode,
					},
					'extensions:CompetencyExtension': this.getCompetencyExtensions(
						aiCompetenciesSuggestions,
						keywordCompetenciesResults,
						formState,
						competencyExtensionContextUrl,
					),
				};
				if (this.currentImage) {
					this.existingBadgeClass.extension = {
						...this.existingBadgeClass.extension,
						'extensions:OrgImageExtension': {
							'@context': orgImageExtensionContextUrl,
							type: ['Extension', 'extensions:OrgImageExtension'],
							OrgImage: this.currentImage,
						},
					};
				}
				this.existingBadgeClass.copyPermissions = copy_permissions;

				this.savePromise = this.existingBadgeClass.save();
			} else {
				let badgeClassData = {
					name: formState.badge_name,
					description: formState.badge_description,
					// if not custom, generate image on the server
					image: !imageFrame ? formState.badge_image : null,
					imageFrame: imageFrame,
					tags: Array.from(this.tags),
					alignment: this.alignmentsEnabled ? formState.alignments : [],
					expiration: expirationDays,
					criteria: formState.criteria,
					course_url: formState.courseUrl,
					extensions: {
						'extensions:StudyLoadExtension': {
							'@context': studyLoadExtensionContextUrl,
							type: ['Extension', 'extensions:StudyLoadExtension'],
							StudyLoad: Number(formState.badge_hours) * 60 + Number(formState.badge_minutes),
						},
						'extensions:CategoryExtension': {
							'@context': categoryExtensionContextUrl,
							type: ['Extension', 'extensions:CategoryExtension'],
							Category: String(formState.badge_category),
						},
						'extensions:LevelExtension': {
							'@context': levelExtensionContextUrl,
							type: ['Extension', 'extensions:LevelExtension'],
							Level: String(formState.badge_level),
						},
						'extensions:BasedOnExtension': {
							'@context': basedOnExtensionContextUrl,
							type: ['Extension', 'extensions:BasedOnExtension'],
							BasedOn: formState.badge_based_on,
						},
						'extensions:LicenseExtension': {
							'@context': licenseExtensionContextUrl,
							type: ['Extension', 'extensions:LicenseExtension'],
							id: formState.license[0].id,
							name: formState.license[0].name,
							legalCode: formState.license[0].legalCode,
						},
						'extensions:CompetencyExtension': this.getCompetencyExtensions(
							aiCompetenciesSuggestions,
							keywordCompetenciesResults,
							formState,
							competencyExtensionContextUrl,
						),
					},
					copy_permissions: copy_permissions,
				} as ApiBadgeClassForCreation;
				if (this.currentImage) {
					badgeClassData.extensions = {
						...badgeClassData.extensions,
						'extensions:OrgImageExtension': {
							'@context': orgImageExtensionContextUrl,
							type: ['Extension', 'extensions:OrgImageExtension'],
							OrgImage: this.currentImage,
						},
					};
				}
				this.savePromise = this.badgeClassManager.createBadgeClass(this.issuer.slug, badgeClassData);
			}

			this.save.emit(this.savePromise);

			// clear sessionStorage
			sessionStorage.removeItem('oeb-create-badgeclassvalues');
		} catch (e) {
			console.log(e);
		}
	}

	/**
	 * Gets the combinded competency extensions, based on the "by hand" competencies (@see formState.competencies)
	 * and the ones that were suggested by the ai tool and selected (@see formState.aiCompetencies).
	 */
	getCompetencyExtensions(
		aiCompetenciesSuggestions: ApiSkill[],
		keywordCompetenciesResults: ApiSkill[],
		formState,
		competencyExtensionContextUrl: string,
	): {
		'@context': string;
		type: string[];
		name: string;
		description: string;
		framework: string;
		framework_identifier: string;
		source: string;
		studyLoad: number;
		category: string;
	} {
		return formState.competencies
			.map((competency) => ({
				'@context': competencyExtensionContextUrl,
				type: ['Extension', 'extensions:CompetencyExtension'],
				name: String(competency.name),
				description: String(competency.description),
				studyLoad: Number(competency.hours * 60) + Number(competency.minutes),
				hours: Number(competency.hours),
				minutes: Number(competency.minutes),
				category: String(competency.category),
				source: competency.source === 'ai' ? 'ai' : 'manual',
				framework: competency.framework,
				framework_identifier: String(competency['framework_identifier']),
			}))
			.concat(
				formState.aiCompetencies
					.map((aiCompetency, index) => ({
						'@context': competencyExtensionContextUrl,
						type: ['Extension', 'extensions:CompetencyExtension'],
						name: aiCompetenciesSuggestions[index].preferred_label,
						description: aiCompetenciesSuggestions[index].description,
						framework_identifier: 'http://data.europa.eu' + aiCompetenciesSuggestions[index].concept_uri,
						studyLoad: Number(aiCompetency.hours * 60) + Number(aiCompetency.minutes),
						hours: Number(aiCompetency.hours),
						minutes: Number(aiCompetency.minutes),
						category: aiCompetenciesSuggestions[index].type.includes('skill') ? 'skill' : 'knowledge',
						source: 'ai',
						framework: 'esco',
					}))
					.filter((_, index) => formState.aiCompetencies[index].selected),
			)
			.concat(
				formState.keywordCompetencies.map((keywordCompetency, index) => ({
					'@context': competencyExtensionContextUrl,
					type: ['Extension', 'extensions:CompetencyExtension'],
					name: keywordCompetenciesResults[index].preferred_label,
					description: keywordCompetenciesResults[index].description,
					framework_identifier: 'http://data.europa.eu' + keywordCompetenciesResults[index].concept_uri,
					studyLoad: Number(keywordCompetency.hours * 60) + Number(keywordCompetency.minutes),
					hours: Number(keywordCompetency.hours),
					minutes: Number(keywordCompetency.minutes),
					category: keywordCompetenciesResults[index].type.includes('skill') ? 'skill' : 'knowledge',
					source: 'ai',
					framework: 'esco',
				})),
			);
	}

	cancelClicked() {
		this.cancelEdit.emit();
	}

	generateRandomImage() {
		this.badgeStudio
			.generateRandom()
			.then((imageUrl) => this.imageField.useDataUrl(imageUrl, 'Auto-generated image'));
	}

	/**
	 * Generates a new bagde-image when:
	 * 	 1. image field is empty / creating a new badge.
	 * 	 2. changing existing bagde-image
	 * 	 3. changing from custom to framed image.
	 * 	    for the AI tool.
	 *
	 * @param image
	 * @param formdata
	 */
	generateUploadImage(image, formdata, useIssuerImageInBadge = true, initializing = false) {
		this.currentImage = image.slice();
		this.badgeStudio
			.generateUploadImage(image.slice(), formdata, useIssuerImageInBadge, this.issuer.image)
			.then((imageUrl) => {
				this.imageField.useDataUrl(imageUrl, 'BADGE', initializing);
			});
	}

	generateCustomUploadImage(image) {
		// Check custom-image size before loading it
		if (base64ByteSize(image) > this.maxCustomImageSize) {
			this.isCustomImageLarge = true;
			return;
		}

		this.currentImage = image.slice();
		// do not use frame for custom images
		this.customImageField.useDataUrl(this.currentImage, 'BADGE');
	}

	/**
	 * Updates image-frame when category is changed.
	 *
	 * @param formdata
	 * @param isCategoryChanged - To prevent unnecessary call of (@function generateUploadImage) which causes an issue of drawing multiple frames around badge-image.
	 */
	updateImageFrame(formdata, isCategoryChanged = false) {
		if (this.currentImage && this.badgeStudio) {
			this.badgeStudio
				.generateUploadImage(this.currentImage.slice(), formdata)
				.then((imageUrl) => this.imageField.useDataUrl(imageUrl, 'BADGE', isCategoryChanged));
		}
	}

	allowedFileFormats = ['image/png', 'image/svg+xml'];
	allowedFileFormatsCustom = ['image/png'];

	positiveInteger() {
		// turned into factory because this was sometimes missing
		return (control: AbstractControl) => {
			const val = parseInt(control.value, 10);
			if (isNaN(val) || val < 1) {
				return { expires_amount: this.translate.instant('CreateBadge.valuePositive') };
				// return { expires_amount: 'CreateBadge.valuePositive' };
			}
		};
	}

	noDuplicateCompetencies(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			const duplicateName = this.checkDuplicateCompetency();
			return duplicateName
				? { duplicateCompetency: { duplicateName, message: `Duplicate competency: ${duplicateName}` } }
				: null;
		};
	}

	checkDuplicateCompetency(): string | null {
		if (!this.badgeClassForm) {
			return null;
		}

		try {
			const handCompetencyNames = this.extractUserCompetencyNames();
			const keywordCompetencyNames = this.extractKeywordCompetencyNames();
			const selectedAICompetencyNames = this.extractSelectedAICompetencyNames();

			const allCompetencyNames = [
				...handCompetencyNames,
				...keywordCompetencyNames,
				...selectedAICompetencyNames,
			];

			return this.findFirstDuplicate(allCompetencyNames);
		} catch (error) {
			return null;
		}
	}

	private extractUserCompetencyNames(): string[] {
		const competencies = this.badgeClassForm.controls.competencies.value;
		return Array.isArray(competencies) ? competencies.filter((c) => c?.name).map((c) => c.name.trim()) : [];
	}

	private extractKeywordCompetencyNames(): string[] {
		return Array.isArray(this.selectedKeywordCompetencies)
			? this.selectedKeywordCompetencies.filter((c) => c?.preferred_label).map((c) => c.preferred_label.trim())
			: [];
	}

	private extractSelectedAICompetencyNames(): string[] {
		const aiCompetencies = this.badgeClassForm.controls.aiCompetencies.value;

		if (!Array.isArray(aiCompetencies) || !Array.isArray(this.aiCompetenciesSuggestions)) {
			return [];
		}

		return aiCompetencies
			.map((competency, index) => {
				if (competency?.selected && this.aiCompetenciesSuggestions[index]?.preferred_label) {
					return this.aiCompetenciesSuggestions[index].preferred_label.trim();
				}
				return null;
			})
			.filter((label): label is string => !!label && label.length > 0);
	}

	private findFirstDuplicate(items: string[]): string | null {
		const seen = new Set<string>();

		for (const item of items) {
			const normalizedItem = item.toLowerCase();
			if (seen.has(normalizedItem)) {
				return item;
			}
			seen.add(normalizedItem);
		}

		return null;
	}

	closeLegend() {
		this.showLegend = false;
	}

	openLegend() {
		this.showLegend = true;
	}

	// Stepper functions
	nextStep(): void {
		this.badgeClassForm.markTreeDirty();
		this.stepper.next();
		window.scrollTo({ top: this.formElem.nativeElement.offsetTop, behavior: 'smooth' });
	}

	previousStep(): void {
		this.stepper.previous();
	}

	lastStep(): boolean {
		return this.stepper?.selectedIndex == this.stepper?.steps.length - 1;
	}

	validateFields(fields: string[]) {
		return fields.every((c) => {
			return this.badgeClassForm.controls[c].valid;
		});
	}

	dirtyFields(fields: string[]) {
		return fields.every((c) => {
			return this.badgeClassForm.controls[c].dirty;
		});
	}

	// FIXME: calculates keywordCompeteniesSuggestions dropdown position and max height,
	// maybe move into its own component in the future
	calculateDropdownMaxHeight(el: HTMLElement, minHeight = 100) {
		const rect = el.getBoundingClientRect();
		let maxHeight = Math.ceil(window.innerHeight - rect.top - rect.height - 20);
		if (maxHeight < minHeight) {
			maxHeight = Math.ceil(rect.top - 20);
		}
		return maxHeight;
	}
	calculateDropdownBottom(el: HTMLElement, minHeight = 100) {
		const rect = el.getBoundingClientRect();
		const maxHeight = Math.ceil(window.innerHeight - rect.top - rect.height - 20);
		if (maxHeight < minHeight) {
			return rect.height + 2;
		}
		return null;
	}
}
