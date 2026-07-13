import {
	AfterViewInit,
	Component,
	ElementRef,
	Input,
	OnChanges,
	OnInit,
	SimpleChanges,
	ViewChild,
	ViewEncapsulation,
	inject,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';

import { CustomValidatorMessages, messagesForValidationError } from './formfield-text';
import { SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from '../app-config.service';
import { LMarkdownEditorModule } from 'ngx-markdown-editor';

interface UploadResult {
	isImg: boolean;
	name: string;
	url: string;
}

@Component({
	selector: 'bg-formfield-markdown',
	host: {
		class: 'forminput',
		'[class.forminput-is-error]': 'isErrorState',
		'[class.forminput-locked]': 'isLockedState',
	},
	template: `@if (aceReady) {
		<md-editor (input)="change()" [(ngModel)]="markdown_content" [upload]="doUpload" (paste)="change()">
		</md-editor>
	}`,
	styleUrls: ['./formfield-markdown.css'],
	encapsulation: ViewEncapsulation.ShadowDom,
	imports: [LMarkdownEditorModule, FormsModule],
})
export class FormFieldMarkdown implements OnInit, OnChanges, AfterViewInit {
	private http = inject(HttpClient);
	private configService = inject(AppConfigService);

	markdown_content = '';
	aceReady = false;

	private static aceLoadPromise: Promise<void> | null = null;

	private loadAce(): Promise<void> {
		if ((window as any).ace) return Promise.resolve();
		if (FormFieldMarkdown.aceLoadPromise) return FormFieldMarkdown.aceLoadPromise;
		FormFieldMarkdown.aceLoadPromise = new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = '/assets/ace-builds/ace.js';
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load ace.js'));
			document.head.appendChild(script);
		});
		return FormFieldMarkdown.aceLoadPromise;
	}

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		this.doUpload = this.doUpload.bind(this);
	}

	async doUpload(files: Array<File>): Promise<Array<UploadResult>> {
		var fd = new FormData();
		fd.append('files', files[0]);

		const name = files[0].name;

		return new Promise((resolve, reject) => {
			const baseUrl = this.configService.apiConfig.baseUrl;

			this.http.post<{ filename: string }>(`${baseUrl}/upload`, fd).subscribe(
				(result) => {
					const url = `${baseUrl}/media/${result.filename}`;
					this.markdown_content = `${this.markdown_content} ![${name}](${url})`;
					resolve([{ name, url, isImg: true }]);
				},
				(error) => {
					console.log(error);
					reject(error);
				},
			);
		});
	}

	@Input()
	set unlocked(unlocked: boolean) {
		this._unlocked = unlocked;
		this.updateDisabled();
	}

	get unlocked() {
		return this._unlocked;
	}
	@Input()
	set locked(locked: boolean) {
		this._locked = locked;
		this.updateDisabled();
	}

	get locked() {
		return this._locked;
	}

	get inputElement(): HTMLTextAreaElement {
		if (this.textareaInput && this.textareaInput.nativeElement) {
			return this.textareaInput.nativeElement;
		}
		return null;
	}

	get hasFocus(): boolean {
		return document.activeElement === this.inputElement;
	}

	get errorMessageForDisplay(): string {
		return this.hasFocus ? this.cachedErrorMessage : this.uncachedErrorMessage;
	}

	get uncachedErrorMessage(): string {
		return messagesForValidationError(this.label, this.control && this.control.errors, this.errorMessage).concat(
			messagesForValidationError(this.label, this.errorGroup && this.errorGroup.errors, this.errorGroupMessage),
		)[0]; // Only display the first error
	}

	get value() {
		return this.control.value;
	}

	get controlErrorState() {
		return this.control.dirty && (!this.control.valid || (this.errorGroup && !this.errorGroup.valid));
	}

	get isErrorState() {
		if (this.hasFocus && this.cachedErrorState !== null) {
			return this.cachedErrorState;
		} else {
			return this.controlErrorState;
		}
	}

	get isLockedState() {
		return this.locked && !this.unlocked;
	}

	get inputName() {
		return (this.label || this.placeholder || this.randomName).replace(/[^\w]+/g, '_').toLowerCase();
	}
	@Input() control: FormControl;
	@Input() initialValue: string;
	@Input() label: string;
	@Input() includeLabelAsWrapper = false; // includes label for layout purposes even if label text wasn't passed in.
	@Input() formFieldAside: string; // Displays additional text above the field. I.E (optional)
	@Input() errorMessage: CustomValidatorMessages;
	@Input() description: string;
	@Input() placeholder: string;
	@Input() optional = false;

	@Input() errorGroup: FormGroup;
	@Input() errorGroupMessage: CustomValidatorMessages;

	@Input() unlockConfirmText =
		'Unlocking this field may have unintended consequences. Are you sure you want to continue?';

	@Input() autofocus = false;

	@ViewChild('textareaInput') textareaInput: ElementRef;
	@ViewChild('markdownPreviewPane') markdownPreviewPane: ElementRef;

	textHeight: number;
	_preview = false;

	private _lastRenderedMarkdown?: string;
	private _currentMarkdownHtml?: SafeHtml;

	private _unlocked = false;

	private _locked = false;

	private cachedErrorMessage = null;
	private cachedErrorState = null;
	private cachedDirtyState = null;

	private randomName = 'field' + Math.random();

	ngOnInit() {
		this.loadAce().then(() => {
			this.aceReady = true;
		});
	}

	ngAfterViewInit() {
		if (this.autofocus) {
			this.focus();
		}
		this.markdown_content = this.value;
	}

	ngOnChanges(changes: SimpleChanges) {
		//Unlocked by default when there is no value
		if (!this.control.value) {
			this.unlocked = true;
		}

		if ('initialValue' in changes) {
			const initialValue = changes['initialValue'].currentValue;
			if (
				(this.value === null || this.value === undefined || this.value === '') &&
				initialValue !== null &&
				initialValue !== undefined &&
				initialValue !== ''
			) {
				this.control.setValue(initialValue);
			}
		}

		this.updateDisabled();
	}

	markdownPreview(preview) {
		if (this.textareaInput) {
			this.textHeight = this.textareaInput.nativeElement.offsetHeight;
		}

		this._preview = preview;
	}

	updateDisabled() {
		if (!this.control) {
			return;
		}

		if (this.isLockedState) {
			this.control.disable();
		} else {
			this.control.enable();
		}
	}

	focus() {
		this.inputElement.focus();
	}

	select() {
		this.inputElement.select();
	}

	change() {
		this.control.setValue(this.markdown_content);
	}

	private cacheControlState() {
		this.cachedErrorMessage = this.uncachedErrorMessage;
		this.cachedDirtyState = this.control.dirty;
		this.cachedErrorState = this.controlErrorState;
	}

	private handleKeyPress(event: KeyboardEvent) {
		// This handles revalidating when hitting enter from within an input element. Ideally, we'd catch _all_ form submission
		// events, but since the form supresses those if things aren't valid, that doesn't really work. So we do this hack.
		if (event.keyCode === 13) {
			this.control.markAsDirty();
			this.cacheControlState();
		}
	}
}
