import { Component, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { base64ByteSize, loadImageURL, preloadImageURL, readFileAsDataURL } from '../util/file-util';
import { DomSanitizer } from '@angular/platform-browser';
import { throwExpr } from '../util/throw-expr';
import { CommonDialogsService } from '../services/common-dialogs.service';
import { NounProjectIcon } from '../model/nounproject.model';
import { MessageService } from '../services/message.service';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmIcon } from '@spartan-ng/helm/icon';

@Component({
	selector: 'bg-formfield-image',
	host: {
		'(drag)': 'stopEvent($event)',
		'(dragstart)': 'stopEvent($event)',
		'(dragover)': 'dragStart($event)',
		'(dragenter)': 'dragStart($event)',
		'(dragleave)': 'dragStop($event)',
		'(dragend)': 'dragStop($event)',
		'(drop)': 'drop($event)',
	},
	template: `
		<div class="forminput u-margin-bottom2x">
			<div class="forminput-x-labelrow">
				<label [class]="labelStyle" for="image_field{{ uniqueIdSuffix }}">{{ label }}</label>
				@if (sublabelRight) {
					<span class="tw-mr-auto tw-ml-2 tw-font-[rubik] tw-text-oebblack tw-text-sm tw-font-normal">{{
						sublabelRight
					}}</span>
				}
				@if (generateRandom) {
					<a
						(click)="$event.preventDefault(); generateRandomImage.emit()"
						class="forminput-x-helplink"
						href="#"
						>{{ 'RecBadge.genRandomImage' | translate }}</a
					>
				}
			</div>
			@if (sublabel) {
				<p
					class="tw-text-sm tw-w-full tw-text-center tw-text-oebblack tw-mt-2 tw-italic tw-leading-[16.4px]"
					[innerHTML]="sublabel"
				></p>
			}
			<input
				type="file"
				[accept]="allowedFileFormats"
				name="image_field{{ uniqueIdSuffix }}"
				id="image_field{{ uniqueIdSuffix }}"
				(change)="fileInputChanged($event)"
				class="visuallyhidden"
				(cancel)="cancelFileSelection($event)"
			/>

			<label
				class="dropzone tw-mx-auto tw-mt-2 !tw-h-[250px] md:tw-min-w-[300px]"
				#imageLabel
				[attr.for]="'image_field' + uniqueIdSuffix"
				(click)="clearFileInput()"
				tabindex="0"
				[class.dropzone-is-dragging]="isDragging"
				[class.dropzone-is-error]="imageErrorMessage || (control.dirty && !control.valid)"
			>
				@if (imageDataUrl) {
					<div class="dropzone-x-preview">
						<img [src]="imageDataUrl" alt="" />
						<p class="u-text-body">
							{{ imageName }}
							<button (click)="imageLabel.click()" type="button" class="u-text-link">
								{{ 'RecBadge.chooseAnotherFile' | translate }}
							</button>
							@if (loaderName != 'basic' && enableIconSearch) {
								<button
									(click)="$event.preventDefault(); findNounproject($event)"
									type="button"
									class="u-text-link"
								>
									{{ 'RecBadge.searchAnotherIcon' | translate }}
								</button>
							}
						</p>
					</div>
				}

				@if (!imageDataUrl) {
					<ng-icon hlm size="xl" name="lucideCloudUpload"></ng-icon>
					@if (dropZoneInfo1) {
						<p class="dropzone-x-info1">
							<span cass="tw-font-bold">{{ dropZoneInfo1 }} </span>
							@if (dropZoneInfo1) {
								<span class="tw-inline-block tw-font-normal tw-my-1 tw-mr-1">
									{{ 'General.or' | translate }}
								</span>
							}
						</p>
					}
					<p class="dropzone-x-info2">
						<span class="u-text-link tw-underline tw-inline-block tw-font-normal">{{ text_body }}</span>
					</p>
					<!-- dont let user select icon when uploading badge -->
					@if (loaderName != 'basic' && dropZoneInfo2) {
						<p class="dropzone-x-info2">
							<span class="tw-inline-block tw-my-1 tw-mr-1">{{ 'General.or' | translate }}</span>
							<span
								id="nounProject_span"
								class="u-text-link tw-underline tw-inline-block tw-font-normal"
								(click)="$event.preventDefault(); findNounproject($event)"
								>{{ dropZoneInfo2 }}</span
							>
						</p>
					}
					@if (loaderName != 'basic' && dropZoneInfo3) {
						<p class="tw-mx-auto tw-mt-4">
							<span class="tw-text-oebblack tw-italic tw-text-sm tw-mt-4">{{ dropZoneInfo3 }}</span>
						</p>
					}
				}
			</label>

			@if (control.dirty && !control.valid) {
				<p class="forminput-x-error">{{ errorMessage }}</p>
			}
		</div>
	`,
	imports: [NgIcon, HlmIcon, TranslatePipe],
})
export class BgFormFieldImageComponent {
	private elemRef = inject<ElementRef<HTMLElement>>(ElementRef);
	private domSanitizer = inject(DomSanitizer);
	protected dialogService = inject(CommonDialogsService);
	protected messageService = inject(MessageService);

	@Input() set imageLoaderName(name: string) {
		this.loaderName = name;
		this.imageLoader = namedImageLoaders[name] || throwExpr(new Error(`Invalid image loader name ${name}`));
	}
	@Input() allowedFileFormats: string[] = ['image/*'];
	get imageDataUrl() {
		return this.control.value;
	}
	set imageDataUrl(url: string) {
		this.control.setValue(url);
	}
	get unsafeImageDataUrl() {
		return this.domSanitizer.bypassSecurityTrustUrl(this.imageDataUrl);
	}

	get imageSize() {
		return base64ByteSize(this.imageDataUrl);
	}

	private get element() {
		return this.elemRef.nativeElement;
	}

	static uniqueNameCounter = 0;
	@Input() generateRandom = false;

	@Output() generateRandomImage: EventEmitter<unknown> = new EventEmitter();

	@Output() imageUploaded = new EventEmitter();
	// Image error is emitted when the image is too large or not square
	@Output() imageError = new EventEmitter<string>();

	@Input() control: FormControl;
	@Input() enableIconSearch: boolean = true;
	@Input() label: string;
	@Input() sublabel: string;
	@Input() sublabelRight: string;
	@Input() text_body: string;
	@Input() dropZoneInfo1: string;
	@Input() dropZoneInfo2: string;
	@Input() dropZoneInfo3: string;
	@Input() type: string = null;
	@Input() errorMessage = 'Please provide a valid image file';
	@Input() placeholderImage: string;
	@Input() labelStyle = 'forminput-x-label u-margin-bottom1x tw-w-full tw-text-center !tw-font-bold !tw-text-[22px]';
	@Input() imageLoader: (file: File | string) => Promise<string> = basicImageLoader;
	@Input() maxSizeInMB: number = null;

	@Input() newDropZone = false;

	uniqueIdSuffix = BgFormFieldImageComponent.uniqueNameCounter++;

	isDragging = false;

	generated = false;
	imageLoading = false;
	imageProvided = false;
	imageErrorMessage: string = null;
	loaderName: string = 'basic';

	imageName: string;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	cancelFileSelection(event: Event) {
		// Stop the propagation so that the form isn't aborted
		event.stopPropagation();
	}

	clearFileInput() {
		(this.element.querySelector("input[type='file']") as HTMLInputElement).value = null;
	}

	fileInputChanged(ev: Event) {
		const input: HTMLInputElement = ev.target as HTMLInputElement;

		this.generated = false;
		if (input.files && input.files[0]) {
			this.updateFiles(input.files);
		}
	}

	stopEvent(ev: DragEvent) {
		ev.preventDefault();
		ev.stopPropagation();
	}

	dragStart(ev: DragEvent) {
		this.stopEvent(ev);
		this.isDragging = true;
	}

	dragStop(ev: DragEvent) {
		this.stopEvent(ev);
		this.isDragging = false;
	}

	drop(ev: DragEvent) {
		this.dragStop(ev);
		this.generated = false;
		if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
			this.updateFiles(ev.dataTransfer.files);
		}
	}

	useDataUrl(dataUrl: string, name = 'Unknown', isCategoryChanged = false, initializing = false) {
		// From https://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
		function dataURItoBlob(dataURI): Blob {
			// convert base64/URLEncoded data component to raw binary data held in a string
			let byteString;
			if (dataURI.split(',')[0].indexOf('base64') >= 0) {
				byteString = atob(dataURI.split(',')[1]);
			} else {
				byteString = decodeURIComponent(dataURI.split(',')[1]);
			}

			// separate out the mime component
			const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

			// write the bytes of the string to a typed array
			const ia = new Uint8Array(byteString.length);
			for (let i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}

			return new Blob([ia], { type: mimeString });
		}

		const file: File = Object.assign(dataURItoBlob(dataUrl), {
			name,
			lastModifiedDate: new Date(),
		}) as unknown as File;

		this.updateFile(file, isCategoryChanged, initializing);
	}

	private updateFiles(files: FileList) {
		this.updateFile(files[0], false, false);
	}

	private updateFile(file: File | string, isCategoryChanged, initializing) {
		this.imageName = typeof file == 'string' ? 'icon' : file.name;
		this.imageDataUrl = null;
		this.imageProvided = false;
		this.imageErrorMessage = null;
		this.imageLoading = true;

		this.imageLoader(file).then(
			(dataUrl) => {
				if (this.type === 'badge' && !this.generated && !isCategoryChanged && !initializing) {
					this.imageUploaded.emit(dataUrl);
					this.generated = true;
					// this.generateRandom = true;
					this.imageProvided = true;
					this.imageLoading = false;
				} else {
					this.imageDataUrl = dataUrl;
					this.imageProvided = true;
					this.imageLoading = false;
				}
			},
			(error: Error) => {
				this.imageErrorMessage = error.message;
				this.imageLoading = false;
			},
		);
	}

	findNounproject(e) {
		e.stopPropagation();
		this.dialogService.nounprojectDialog
			.openDialog()
			.then((icon: NounProjectIcon) => {
				if (icon) {
					this.generated = false;
					this.updateFile(icon.thumbnail_url, false, false);
				}
			})
			.catch((error) => {
				this.messageService.reportAndThrowError('Failed to load icons from nounproject', error);
			});
	}
}

// file can either be file or url to a file
export function basicImageLoader(file: File | string): Promise<string> {
	if (typeof file == 'string') {
		return loadImageURL(file)
			.then(() => file)
			.catch((e) => {
				throw new Error(`${file} is not a valid image file`);
			});
	} else {
		return readFileAsDataURL(file)
			.then((url) => loadImageURL(url).then(() => url))
			.catch((e) => {
				throw new Error(`${file.name} is not a valid image file`);
			});
	}
}

// file can either be file or url to a file
export function badgeImageLoader(file: File | string): Promise<string> {
	// Max file size from https://github.com/mozilla/openbadges-backpack/blob/1193c04847c5fb9eb105c8fb508e1b7f6a39052c/controllers/backpack.js#L397
	const maxFileSize = 1024 * 1024 * 2; // 2MB max file size
	const startingMaxDimension = 512;

	if (typeof file == 'string') {
		return new Promise((resolve, reject) => {
			loadImageURL(file)
				.then((image) => {
					image.crossOrigin = 'Anonymous';
					image.src = image.src + '?';
					image.onload = function () {
						const canvas = document.createElement('canvas');
						let maxDimension = Math.min(Math.max(image.width, image.height), startingMaxDimension);
						let dataURL: string;

						do {
							canvas.width = canvas.height = maxDimension;

							const context = canvas.getContext('2d');

							// Inspired by https://stackoverflow.com/questions/26705803/image-object-crop-and-draw-in-center-of-canvas
							const scaleFactor = Math.min(canvas.width / image.width, canvas.height / image.height);
							const scaledWidth = image.width * scaleFactor;
							const scaledHeight = image.height * scaleFactor;

							context.drawImage(
								image,
								0,
								0,
								image.width,
								image.height,
								(canvas.width - scaledWidth) / 2,
								(canvas.height - scaledHeight) / 2,
								scaledWidth,
								scaledHeight,
							);

							dataURL = canvas.toDataURL('image/png');

							// On the first try, guess a dimension based on the ratio of max pixel count to file size
							if (maxDimension === startingMaxDimension) {
								maxDimension = Math.sqrt(
									maxFileSize * (Math.pow(maxDimension, 2) / base64ByteSize(dataURL)),
								);
							}

							// The guesses tend to be a little large, so shrink it down, and continue to shrink the size until it fits
							maxDimension *= 0.95;
						} while (base64ByteSize(dataURL) > maxFileSize);

						resolve(dataURL);
					};
				})
				.catch((e) => {
					throw new Error(`${file} is not a valid image file`);
				});
		});
	} else if (file.type === 'image/svg+xml' && file.size <= maxFileSize) {
		return basicImageLoader(file);
	} else {
		return readFileAsDataURL(file)
			.then(loadImageURL)
			.then((image) => {
				const canvas = document.createElement('canvas');
				let maxDimension = Math.min(Math.max(image.width, image.height), startingMaxDimension);
				let dataURL: string;

				do {
					canvas.width = canvas.height = maxDimension;

					const context = canvas.getContext('2d');

					// Inspired by https://stackoverflow.com/questions/26705803/image-object-crop-and-draw-in-center-of-canvas
					const scaleFactor = Math.min(canvas.width / image.width, canvas.height / image.height);
					const scaledWidth = image.width * scaleFactor;
					const scaledHeight = image.height * scaleFactor;

					context.drawImage(
						image,
						0,
						0,
						image.width,
						image.height,
						(canvas.width - scaledWidth) / 2,
						(canvas.height - scaledHeight) / 2,
						scaledWidth,
						scaledHeight,
					);

					dataURL = canvas.toDataURL('image/png');

					// On the first try, guess a dimension based on the ratio of max pixel count to file size
					if (maxDimension === startingMaxDimension) {
						maxDimension = Math.sqrt(maxFileSize * (Math.pow(maxDimension, 2) / base64ByteSize(dataURL)));
					}

					// The guesses tend to be a little large, so shrink it down, and continue to shrink the size until it fits
					maxDimension *= 0.95;
				} while (base64ByteSize(dataURL) > maxFileSize);

				return dataURL;
			})
			.catch((e) => {
				throw new Error(`${file.name} is not a valid image file`);
			});
	}
}

// file can either be file or url to a file
export function issuerImageLoader(file: File | string): Promise<string> {
	// Max file size from https://github.com/mozilla/openbadges-backpack/blob/1193c04847c5fb9eb105c8fb508e1b7f6a39052c/controllers/backpack.js#L397
	const maxFileSize = 1024 * 1024 * 2; // 2MB max file size
	const startingMaxDimension = 512;

	if (typeof file == 'string') {
		return new Promise((resolve, reject) => {
			loadImageURL(file)
				.then((image) => {
					image.crossOrigin = 'Anonymous';
					image.src = image.src + '?';
					image.onload = function () {
						const canvas = document.createElement('canvas');
						let dataURL: string;

						let maxDimension = startingMaxDimension;

						do {
							const scaleFactor = Math.min(1, maxDimension / image.width, maxDimension / image.height);

							const scaledWidth = image.width * scaleFactor;
							const scaledHeight = image.height * scaleFactor;

							canvas.width = scaledWidth;
							canvas.height = scaledHeight;

							const context = canvas.getContext('2d');

							context.drawImage(image, 0, 0, image.width, image.height, 0, 0, scaledWidth, scaledHeight);

							dataURL = canvas.toDataURL('image/png');

							// On the first try, guess a dimension based on the ratio of max pixel count to file size
							if (maxDimension === startingMaxDimension) {
								maxDimension = Math.sqrt(
									maxFileSize * (Math.pow(maxDimension, 2) / base64ByteSize(dataURL)),
								);
							}

							// The guesses tend to be a little large, so shrink it down, and continue to shrink the size until it fits
							maxDimension *= 0.95;
						} while (base64ByteSize(dataURL) > maxFileSize);

						resolve(dataURL);
					};
				})
				.catch((e) => {
					throw new Error(`${file} is not a valid image file`);
				});
		});
	} else if (file.type === 'image/svg+xml' && file.size <= maxFileSize) {
		return basicImageLoader(file);
	} else {
		return readFileAsDataURL(file)
			.then(loadImageURL)
			.then((image) => {
				const imageSizeInMB = base64ByteSize(image.src) / (1024 * 1024);
				const tolerance = 0.05;

				if (this.maxSizeInMB && imageSizeInMB > this.maxSizeInMB) {
					return Promise.reject(new Error('Image is large'));
				} else if (Math.abs(image.width / image.height - 1) > tolerance) {
					return Promise.reject(new Error('Image must be square'));
				}

				const canvas = document.createElement('canvas');
				let dataURL: string;

				let maxDimension = startingMaxDimension;

				do {
					const scaleFactor = Math.min(1, maxDimension / image.width, maxDimension / image.height);

					const scaledWidth = image.width * scaleFactor;
					const scaledHeight = image.height * scaleFactor;

					canvas.width = scaledWidth;
					canvas.height = scaledHeight;

					const context = canvas.getContext('2d');

					context.drawImage(image, 0, 0, image.width, image.height, 0, 0, scaledWidth, scaledHeight);

					dataURL = canvas.toDataURL('image/png');

					// On the first try, guess a dimension based on the ratio of max pixel count to file size
					if (maxDimension === startingMaxDimension) {
						maxDimension = Math.sqrt(maxFileSize * (Math.pow(maxDimension, 2) / base64ByteSize(dataURL)));
					}

					// The guesses tend to be a little large, so shrink it down, and continue to shrink the size until it fits
					maxDimension *= 0.95;
				} while (base64ByteSize(dataURL) > maxFileSize);

				return dataURL;
			})
			.catch((e) => {
				if (e.message === 'Image is large') {
					this.imageError.emit(
						`Das Bild ist zu groß. Bitte wähle ein Bild mit einer Größe von maximal ${this.maxSizeInMB} MB.`,
					);
				} else if (e.message === 'Image must be square') {
					this.imageError.emit(
						'Bitte lade ein Bild im quadratischen 1:1-Format hoch, damit es auf unserer Plattform optimal dargestellt werden kann',
					);
				}
				throw new Error(`${file.name} is not a valid image file`);
			});
	}
}

// file can either be file or url to a file
export function pdftemplateImageLoader(file: File | string): Promise<string> {
	return basicImageLoader(file);
}

export const namedImageLoaders = {
	badge: badgeImageLoader,
	issuer: issuerImageLoader,
	basic: basicImageLoader,
	pdftemplate: pdftemplateImageLoader,
};
