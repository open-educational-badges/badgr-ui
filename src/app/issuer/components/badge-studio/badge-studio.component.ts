import { Component, ElementRef, Input, OnInit, ViewChild, inject } from '@angular/core';
// import "font-awesome/css/font-awesome.css";
import FontFaceObserver from 'fontfaceobserver';
import { canvasVisualCenter } from '../../../common/util/visual-center';
import { HttpClient } from '@angular/common/http';

// The FabricJs Import does not work as expected. Instead of getting a "fabric" variable with properties for the various
// fabric classes, it contains another nested "fabric" property with those values. This seems to be the only way to get
// it to work correctly.
@Component({
	selector: 'badge-studio',
	host: {},
	template: ` <canvas #canvas width="400" height="400"></canvas> `,
	styleUrls: ['../../../../../node_modules/font-awesome/css/font-awesome.css'],
})
export class BadgeStudioComponent implements OnInit {
	protected http = inject(HttpClient);

	get canvas() {
		return this.canvasElem.nativeElement as HTMLCanvasElement;
	}

	get context2d(): CanvasRenderingContext2D {
		return this.canvas.getContext('2d');
	}

	@Input() formData;

	dataUrl: string;
	@ViewChild('canvas')
	private canvasElem: ElementRef;

	@Input() scrolled: boolean;
	// private ready: boolean;

	private fontPromise: Promise<unknown>;
	private imageToShow;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	ngOnInit() {
		this.fontPromise = new FontFaceObserver('FontAwesome').load('').catch((e) => console.error(e));
	}

	generateRandom(): Promise<string> {
		return this.fontPromise.then(
			() =>
				new Promise<string>((resolve, reject) => {
					// const shapeColor = shapeColors[Math.floor(Math.random() * shapeColors.length)];
					const shapeColor = shapeColorsTypes[this.formData.badge_category];

					console.log(this.formData.badge_category);

					const iconColor = '#0000000';
					this.context2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
					var shapeImage =
						shapeImagesTypes[this.formData.badge_category] || this.formData.badge_category['participation'];
					// this.formData.badge_category === 'competency'
					// 	? shapeImagesTypes['competency']
					// 	: shapeImagesTypes['participation'];
					// var shapeImage2 = "../../../../breakdown/static/badgestudio/shapes/noun_test.svg";
					var shapeImage2 = 'https://static.thenounproject.com/png/1444428-200.png';
					// Grab a random SVG from our set

					let imagePromises = [];
					imagePromises.push(
						this.http
							.get(shapeImage, {
								observe: 'body',
								responseType: 'text',
							})
							.toPromise(),
					);

					imagePromises.push(
						this.http
							.get(
								// shapeImages[Math.floor(Math.random() * shapeImages.length)],
								shapeImage2,
								{
									responseType: 'blob',
								},
							)
							.toPromise(),
					);

					Promise.all(imagePromises).then((res) => {
						const svgRoot = new DOMParser().parseFromString(res[0], 'image/svg+xml').documentElement;
						// const svgRoot2 = new DOMParser().parseFromString(res[1], "image/svg+xml").documentElement;
						this.createImageFromBlob(res[1]);
						// We need to attach the SVG to the window so we can compute the style of the elements for re-coloring
						document.body.appendChild(svgRoot);
						// document.body.appendChild(svgRoot2);

						// Re-color any non-white elements
						Array.from(svgRoot.querySelectorAll('*'))
							.filter((e): e is HTMLElement => 'style' in e) // Filter out elements that don't have a style to change (this fixes a bug in IE)
							.forEach((e: HTMLElement) => {
								const fill = window.getComputedStyle(e)['fill'];

								if (!fill.match(/^rgb\(255,\s*255,\s*255\s*\)$/)) {
									e.style.fill = shapeColor;
								}
							});

						// And clean up the document
						svgRoot.remove();
						// svgRoot2.remove();

						// Work around https://bugzilla.mozilla.org/show_bug.cgi?id=700533
						svgRoot.setAttribute('width', '' + this.canvas.width);
						svgRoot.setAttribute('height', '' + this.canvas.height);

						// Convert the SVG into a data URL that we can use to render into a canvas
						const svgDataUrl =
							'data:image/svg+xml;charset=utf-8,' +
							encodeURIComponent(new XMLSerializer().serializeToString(svgRoot));
						// const svgDataUrl2 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svgRoot2));
						const svgImage = new Image();
						const svgImage2 = new Image();
						svgImage.onload = () => {
							this.context2d.drawImage(svgImage, 0, 0, this.canvas.width, this.canvas.height);
							this.context2d.drawImage(
								svgImage2,
								this.canvas.width / 4,
								this.canvas.height / 4,
								this.canvas.width / 2,
								this.canvas.height / 2,
							);

							const iconIndex = Math.floor((Math.random() * fontAwesomeIconData.length) / 2);
							const iconChar = fontAwesomeIconData[iconIndex * 2];
							const iconGeometricCenter = fontAwesomeIconData[iconIndex * 2 + 1] === '1';
							const iconSize = 150;

							// Render the icon into the canvas, either with geometric or visual centering
							if (iconGeometricCenter) {
								this.renderIcon(this.canvas, iconChar, iconColor, iconSize);
							} else {
								const centerSize = 100;
								const iconCanvas = document.createElement('canvas');
								iconCanvas.width = centerSize;
								iconCanvas.height = centerSize;
								const iconContext = iconCanvas.getContext('2d');
								iconContext.fillStyle = 'black';
								iconContext.fillRect(0, 0, centerSize, centerSize);

								this.renderIcon(iconCanvas, iconChar, iconColor, 40);

								const center = canvasVisualCenter(iconCanvas);
								this.renderIcon(this.canvas, iconChar, iconColor, iconSize, {
									x:
										(0.5 - center.visualLeft) * this.canvas.width +
										iconCanvas.width / centerSize / 2,
									y:
										(0.5 - center.visualTop) * this.canvas.height +
										iconCanvas.height / centerSize / 2,
								});
							}

							this.dataUrl = this.canvas.toDataURL();
							resolve(this.dataUrl);
						};
						svgImage.src = svgDataUrl;
						svgImage2.src = this.imageToShow;
					});
				}),
		);
	}

	async generateUploadImage(
		uploadedImage: string,
		formdata: any,
		useIssuerImageInBadge?: boolean,
		issuerImage?: string,
	): Promise<string> {
		await this.fontPromise;

		const shapeColor = shapeColorsTypes[formdata.badge_category];
		this.context2d.clearRect(0, 0, this.canvas.width, this.canvas.height);

		const shapeImage = shapeImagesTypes[formdata.badge_category] || shapeImagesTypes['participation'];
		const issuerLogoFrame = 'breakdown/static/images/square.svg';

		try {
			const [shapeSvgText, issuerFrameSvgText] = await Promise.all([
				this.http.get(shapeImage, { observe: 'body', responseType: 'text' }).toPromise(),
				this.http.get(issuerLogoFrame, { observe: 'body', responseType: 'text' }).toPromise(),
			]);

			const svgRoot = new DOMParser().parseFromString(shapeSvgText, 'image/svg+xml').documentElement;
			const svgRoot2 = new DOMParser().parseFromString(issuerFrameSvgText, 'image/svg+xml').documentElement;

			this.imageToShow = uploadedImage;

			document.body.appendChild(svgRoot);
			document.body.appendChild(svgRoot2);

			// Recolor non-white elements in the badge shape SVG
			Array.from(svgRoot.querySelectorAll('*'))
				.filter((e): e is HTMLElement => 'style' in e)
				.forEach((e: HTMLElement) => {
					const fill = window.getComputedStyle(e)['fill'];
					if (!fill.match(/^rgb\(255,\s*255,\s*255\s*\)$/)) {
						e.style.fill = shapeColor;
					}
				});

			svgRoot.remove();
			svgRoot2.remove();

			svgRoot.setAttribute('width', '' + this.canvas.width);
			svgRoot.setAttribute('height', '' + this.canvas.height);

			const svgDataUrl =
				'data:image/svg+xml;charset=utf-8,' +
				encodeURIComponent(new XMLSerializer().serializeToString(svgRoot));
			const svgDataUrl2 =
				'data:image/svg+xml;charset=utf-8,' +
				encodeURIComponent(new XMLSerializer().serializeToString(svgRoot2));

			const svgImage = await addImage(svgDataUrl);
			this.context2d.drawImage(svgImage, 0, 0, this.canvas.width, this.canvas.height);

			if (useIssuerImageInBadge && issuerImage) {
				const xWidth = this.formData.badge_category == 'participation' ? 55 : 70;
				const svgImage3 = await addImage(svgDataUrl2);
				this.context2d.drawImage(
					svgImage3,
					this.canvas.width - this.canvas.width / 4 - xWidth,
					this.formData.badge_category == 'learningpath' ? 10 : 0,
					this.canvas.width / 5,
					this.canvas.height / 5,
				);

				const issuerLogo = await addImage(issuerImage);
				const borderPadding = 12;
				const logoX = this.canvas.width - this.canvas.width / 4 - xWidth + borderPadding;
				const logoY = (this.formData.badge_category == 'learningpath' ? 10 : 0) + borderPadding;
				const logoWidth = this.canvas.width / 5 - borderPadding * 2;
				const logoHeight = this.canvas.height / 5 - borderPadding * 2;

				this.context2d.drawImage(issuerLogo, logoX, logoY, logoWidth, logoHeight);
			}

			const uploadedImageElement = await addImage(this.imageToShow);
			this.context2d.drawImage(
				uploadedImageElement,
				this.canvas.width / 4,
				this.canvas.height / 4,
				this.canvas.width / 2,
				this.canvas.height / 2,
			);

			this.dataUrl = this.canvas.toDataURL();
			return this.dataUrl;
		} catch (error) {
			console.error('Error generating upload image:', error);
			throw error;
		}
	}

	generateTypeBadge(formData): Promise<string> {
		return this.fontPromise.then(
			() =>
				new Promise<string>((resolve, reject) => {
					const shapeColor = shapeColors[Math.floor(Math.random() * shapeColors.length)];
					const iconColor = '#0000000';

					this.context2d.clearRect(0, 0, this.canvas.width, this.canvas.height);

					// Grab a random SVG from our set
					this.http
						.get(shapeImages[Math.floor(Math.random() * shapeImages.length)], {
							observe: 'body',
							responseType: 'text',
						})
						.toPromise()
						.then((res) => {
							const svgRoot = new DOMParser().parseFromString(res, 'image/svg+xml').documentElement;

							// We need to attach the SVG to the window so we can compute the style of the elements for re-coloring
							document.body.appendChild(svgRoot);

							// Re-color any non-white elements
							Array.from(svgRoot.querySelectorAll('*'))
								.filter((e): e is HTMLElement => 'style' in e) // Filter out elements that don't have a style to change (this fixes a bug in IE)
								.forEach((e: HTMLElement) => {
									const fill = window.getComputedStyle(e)['fill'];

									if (!fill.match(/^rgb\(255,\s*255,\s*255\s*\)$/)) {
										e.style.fill = shapeColor;
									}
								});

							// And clean up the document
							svgRoot.remove();

							// Work around https://bugzilla.mozilla.org/show_bug.cgi?id=700533
							svgRoot.setAttribute('width', '' + this.canvas.width);
							svgRoot.setAttribute('height', '' + this.canvas.height);

							// Convert the SVG into a data URL that we can use to render into a canvas
							const svgDataUrl =
								'data:image/svg+xml;charset=utf-8,' +
								encodeURIComponent(new XMLSerializer().serializeToString(svgRoot));
							const svgImage = new Image();
							svgImage.onload = () => {
								this.context2d.drawImage(svgImage, 0, 0, this.canvas.width, this.canvas.height);

								const iconIndex = Math.floor((Math.random() * fontAwesomeIconData.length) / 2);
								const iconChar = fontAwesomeIconData[iconIndex * 2];
								const iconGeometricCenter = fontAwesomeIconData[iconIndex * 2 + 1] === '1';
								const iconSize = 150;

								// Render the icon into the canvas, either with geometric or visual centering
								if (iconGeometricCenter) {
									this.renderIcon(this.canvas, iconChar, iconColor, iconSize);
								} else {
									const centerSize = 100;
									const iconCanvas = document.createElement('canvas');
									iconCanvas.width = centerSize;
									iconCanvas.height = centerSize;
									const iconContext = iconCanvas.getContext('2d');
									iconContext.fillStyle = 'black';
									iconContext.fillRect(0, 0, centerSize, centerSize);

									this.renderIcon(iconCanvas, iconChar, iconColor, 40);

									const center = canvasVisualCenter(iconCanvas);
									this.renderIcon(this.canvas, iconChar, iconColor, iconSize, {
										x:
											(0.5 - center.visualLeft) * this.canvas.width +
											iconCanvas.width / centerSize / 2,
										y:
											(0.5 - center.visualTop) * this.canvas.height +
											iconCanvas.height / centerSize / 2,
									});
								}

								this.dataUrl = this.canvas.toDataURL();
								resolve(this.dataUrl);
							};
							svgImage.src = svgDataUrl;
						});
				}),
		);
	}

	private renderIcon(
		iconCanvas: HTMLCanvasElement,
		iconChar: string,
		iconColor: string,
		fontSize: number,
		offset: { x: number; y: number } = { x: 0, y: 0 },
	): HTMLCanvasElement {
		// const iconContext = iconCanvas.getContext("2d");
		// iconContext.font = `${fontSize}px FontAwesome`;
		// iconContext.textAlign = "center";
		// iconContext.fillStyle = iconColor;
		// iconContext.textBaseline = "middle";
		// iconContext.fillText(
		// 	iconChar,
		// 	iconCanvas.width / 2 + offset.x,
		// 	iconCanvas.height / 2 + offset.y
		// );

		const context = iconCanvas.getContext('2d');
		let image = addImage('assets/badges/b2.svg');
		// context.drawImage(image, 200, 500);
		// onload2promise(image);
		// image.onload = function(){
		// }

		return iconCanvas;
	}

	private createImageFromBlob(image: Blob) {
		let reader = new FileReader();
		reader.addEventListener(
			'load',
			() => {
				this.imageToShow = reader.result;
			},
			false,
		);

		if (image) {
			reader.readAsDataURL(image);
		}
	}
}

async function addImage(src: string): Promise<HTMLImageElement> {
	var image = new Image();
	image.crossOrigin = 'Anonymous';
	let imagePromise = onload2promise(image);
	image.src = src;
	await imagePromise;
	return imagePromise;
}

function onload2promise(obj: HTMLImageElement): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		obj.onload = () => resolve(obj);
		obj.onerror = reject;
	});
}

// const shapeColors = [
// 	"#696DE9",
// 	"#008FFF",
// 	"#1EB9E9",
// 	"#5BD1FF",
// 	"#3FDE67",
// 	"#FF4762",
// 	"#FF5428",
// 	"#FFA600",
// 	"#FFD400",
// 	"#9FA0A4",
// 	"#F7402D",
// 	"#EC1460",
// 	"#9D1AB2",
// 	"#6733B9",
// 	"#3D4DB7",
// 	"#1093F5",
// 	"#00A6F7",
// 	"#00BBD6",
// 	"#009687",
// 	"#46B04A",
// 	"#8AC441",
// 	"#CCDD1E",
// 	"#231F20",
// 	"#FFC200",
// 	"#FF9800",
// 	"#FF5405",
// 	"#7A5548",
// 	"#9D9D9D",
// 	"#5F7C8B",
// 	"#475D68",
// ];

const shapeColors = [
	'#cbe0e4', //mitglied
	'#b3d44d', //teilnahme grün
	'#121940', // metakompetenz
	'#09769d', //fachliche kompetenz
];
const shapeColorsTypes = {
	membership: '#cbe0e4',
	ability: '#121940',
	archievement: '#b3d44d',
	skill: '#09769d',
};

const shapeImages = [
	'../../../../breakdown/static/badgestudio/shapes/a2.svg',
	'../../../../breakdown/static/badgestudio/shapes/diamond.svg',
	// "../../../../breakdown/static/badgestudio/shapes/hex.svg",
	// "../../../../breakdown/static/badgestudio/shapes/round-bottom.svg",
	// "../../../../breakdown/static/badgestudio/shapes/round-top.svg",
	// "../../../../breakdown/static/badgestudio/shapes/square.svg",
	// "../../../../breakdown/static/badgestudio/shapes/triangle-bottom.svg",
	// "../../../../breakdown/static/badgestudio/shapes/triangle-top.svg",
];

const shapeImagesTypes = {
	a1: '../../../../breakdown/static/badgestudio/shapes/a1.svg',
	a2: '../../../../breakdown/static/badgestudio/shapes/a2.svg',
	b1: '../../../../breakdown/static/badgestudio/shapes/b1.svg',
	b2: '../../../../breakdown/static/badgestudio/shapes/b2.svg',
	c1: '../../../../breakdown/static/badgestudio/shapes/c1.svg',
	c2: '../../../../breakdown/static/badgestudio/shapes/c2.svg',
	nolvl: '../../../../breakdown/static/badgestudio/shapes/nolvl.svg',
	participation: 'breakdown/static/badgestudio/shapes/participation.svg',
	learningpath: 'breakdown/static/badgestudio/shapes/learningpath.svg',
	competency: 'breakdown/static/badgestudio/shapes/competency.svg',
};

// Created from http://fontawesome.io/cheatsheet/
// Each character is followed by a number indicating if it should be geometrically (1) or visually centered (0).
// This is used instead of a more readable data array to save program space.
const fontAwesomeIconData =
	'10011111111011110000001111111111111' +
	'1111110111100011111111111111001101011111011000' +
	'10001000000111111111000000000000010111010001110' +
	'1111011011101111111111001111011100111111111110' +
	'0111111110111111111111111111111100111100011111' +
	'1010111111110101111011';
