import { TranslateService } from '@ngx-translate/core';
import * as fabric from 'fabric';

export const px_to_pt: number = 4 / 3;

export class PreviewCanvas {
	private translate: TranslateService;

	canvas?: fabric.Canvas;
	canvasTextBlock?: fabric.Group;
	canvasPageNumBlock?: fabric.Textbox;
	canvasTextBlockBorderColor: string = '#FF4849';
	pdfOrigWidth: number;
	pdfOrigHeight: number;
	pdfOrigBlockWidth: number;
	pdfTextColor: string = '#323232';
	pdfLinkColor: string = '#1400FF';
	pdfGreyBgColor: string = '#F5F5F5';

	format: string = 'portrait';
	scale: number = 100;
	alignment: string = 'left';
	posX: number = 0;
	posY: number = 0;
	background: string;
	page: number = 1;
	canvasId: string = 'previewCanvas';
	badgeImageURL: string = '/breakdown/static/images/pdfPreviewBadgeImage.svg';
	qrImageURL: string = '/breakdown/static/images/pdfPreviewQrImage.svg';
	clockImageURL: string = '/breakdown/static/images/pdfPreviewClockImage.png';
	extLinkImageURL: string = '/breakdown/static/images/external-link.svg';
	editable: boolean;

	constructor(
		translate: TranslateService,
		format: string = 'portrait',
		scale: number = 100,
		alignment: string = 'left',
		posX: number = 0,
		posY: number = 0,
		background: string = '',
		page: number = 1,
		canvasId: string = 'previewCanvas',
		badgeImageURL: string = '/breakdown/static/images/pdfPreviewBadgeImage.svg',
		editable: boolean = true,
	) {
		this.translate = translate;
		this.format = format;
		this.scale = scale;
		this.alignment = alignment;
		this.posX = posX;
		this.posY = posY;
		this.background = background;
		this.page = page;
		this.canvasId = canvasId;
		this.badgeImageURL = badgeImageURL;
		this.editable = editable;

		this.canvas = new fabric.Canvas(this.canvasId);
		this.setDimensions();

		if (this.editable) {
			this.canvasTextBlock = new fabric.Group([], {
				padding: 5,
				borderColor: this.canvasTextBlockBorderColor,
				borderDashArray: [3],
				hasBorders: true,
				hasControls: false,
			});
			this.canvas.add(this.canvasTextBlock);
			this.canvas.setActiveObject(this.canvasTextBlock);
			this.canvas.on('selection:cleared', () => {
				this.canvas.setActiveObject(this.canvasTextBlock);
			});
		} else {
			this.canvasTextBlock = new fabric.Group([], {
				hasControls: false,
				selectable: false,
				hoverCursor: 'initial',
			});
			this.canvas.add(this.canvasTextBlock);
		}

		this.recalcCanvas();
	}

	async recalcCanvas() {
		this.canvasTextBlock.removeAll();
		this.canvas.remove(this.canvasPageNumBlock);

		const img = await fabric.FabricImage.fromURL(this.background);
		img.scaleX = this.canvas.width / img.width;
		img.scaleY = this.canvas.height / img.height;
		this.canvas.backgroundImage = img;

		let scaleCoeff = this.scale / 100;
		const blockWidth = this.pdfOrigBlockWidth * scaleCoeff;

		this.canvasTextBlock.width = blockWidth;

		this.addPageNum(this.page, scaleCoeff);

		if (this.page == 1) {
			await this.drawCoverPage(scaleCoeff, blockWidth, this.posX, this.posY, this.alignment);
		} else if (this.page == 2) {
			await this.drawCompetenciesPage(scaleCoeff, blockWidth, this.posX, this.posY, this.alignment);
		} else if (this.page == 3) {
			await this.drawOptDetailsPage(scaleCoeff, blockWidth, this.posX, this.posY, this.alignment);
		}

		this.canvas.renderAll();
	}

	addPageNum(page: number, scaleCoeff: number) {
		this.canvasPageNumBlock = new fabric.Textbox(String(page) + '/3', {
			fontSize: 10 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.5,
			fill: this.pdfTextColor,
			hasControls: false,
			selectable: false,
			hoverCursor: 'initial',
		});

		this.canvasPageNumBlock.left = this.canvas.width - 40 * px_to_pt - this.canvasPageNumBlock.width;
		this.canvasPageNumBlock.top = this.canvas.height - 36 * px_to_pt - this.canvasPageNumBlock.height;

		this.canvas.add(this.canvasPageNumBlock);
	}

	async drawCoverPage(
		scaleCoeff: number,
		blockWidth: number,
		blockLeft: number,
		internalBlockY: number,
		blockAlignment: string,
	) {
		const name1 = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasNameText1'), {
			fontSize: 16 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			fontWeight: 700,
			lineHeight: 1.2,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		internalBlockY += name1.height;

		const name2 = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasNameText2'), {
			fontSize: 16 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			fontWeight: 700,
			lineHeight: 1.2,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		internalBlockY += name2.height;
		internalBlockY += 8 * px_to_pt * scaleCoeff;

		this.canvasTextBlock.add(name1, name2);

		const dateTimeText1 = this.translate.instant('PDFTemplate.previewCanvasDateText1');
		const dateTimeText2 = this.translate.instant('PDFTemplate.previewCanvasDateText2');
		const dateTimeText3 = this.translate.instant('PDFTemplate.previewCanvasDateText3');
		const dateTimeText4 = this.translate.instant('PDFTemplate.previewCanvasDateText4');
		const completeDateTimeText = dateTimeText1 + dateTimeText2 + dateTimeText3 + dateTimeText4;
		const date = new fabric.Textbox(completeDateTimeText, {
			fontSize: 14 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		date.setSelectionStyles({ fontWeight: 500 }, dateTimeText1.length, dateTimeText1.length + dateTimeText2.length);
		date.setSelectionStyles(
			{ fontWeight: 500 },
			dateTimeText1.length + dateTimeText2.length + dateTimeText3.length,
			dateTimeText1.length + dateTimeText2.length + dateTimeText3.length + dateTimeText4.length,
		);
		internalBlockY += date.height;

		const timeText1 = this.translate.instant('PDFTemplate.previewCanvasHoursText1');
		const timeText2 = this.translate.instant('PDFTemplate.previewCanvasHoursText2');
		const time = new fabric.Textbox(timeText1 + timeText2, {
			fontSize: 14 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		time.setSelectionStyles({ fontWeight: 500 }, timeText1.length, timeText1.length + timeText2.length);
		internalBlockY += time.height;

		const aquiredText = this.translate.instant('PDFTemplate.previewCanvasAquiredText');
		const aquired = new fabric.Textbox(aquiredText, {
			fontSize: 14 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		internalBlockY += aquired.height;
		internalBlockY += 24 * px_to_pt * scaleCoeff;

		this.canvasTextBlock.add(date, time, aquired);

		const badge = await fabric.FabricImage.fromURL(this.badgeImageURL);
		const badgeScale = (160 * px_to_pt * scaleCoeff) / badge.width;
		badge.top = internalBlockY;
		badge.scale(badgeScale);
		const imgCenterPos = blockLeft + (blockWidth - badge.width * badgeScale) / 2;
		badge.left = blockAlignment == 'center' ? imgCenterPos : blockLeft;
		internalBlockY += badge.height * badgeScale;
		internalBlockY += 20 * px_to_pt * scaleCoeff;

		this.canvasTextBlock.add(badge);

		const title1 = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasBadgeTitleText1'), {
			fontSize: 16 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			fontWeight: 700,
			lineHeight: 1.2,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		internalBlockY += title1.height;

		const title2 = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasBadgeTitleText2'), {
			fontSize: 16 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			fontWeight: 700,
			lineHeight: 1.2,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		internalBlockY += title2.height;
		internalBlockY += 8 * px_to_pt * scaleCoeff;

		this.canvasTextBlock.add(title1, title2);

		const desc = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasBadgeDescText'), {
			fontSize: 12 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		internalBlockY += desc.height;
		internalBlockY += 24 * px_to_pt * scaleCoeff;

		this.canvasTextBlock.add(desc);

		const rect = new fabric.Rect({
			rx: 5,
			ry: 5,
			fill: this.pdfGreyBgColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
			height: 58 * px_to_pt * scaleCoeff,
		});

		const qr = await fabric.FabricImage.fromURL(this.qrImageURL);
		const qrScale = (50 * px_to_pt * scaleCoeff) / qr.width;
		qr.top = internalBlockY + 4 * px_to_pt * scaleCoeff;
		qr.scale(qrScale);
		qr.left = blockLeft + 4 * px_to_pt * scaleCoeff;

		const createdText1 = this.translate.instant('PDFTemplate.previewCanvasCreatedText1');
		const createdText2 = this.translate.instant('PDFTemplate.previewCanvasCreatedText2');
		const created = new fabric.Textbox(createdText1 + createdText2, {
			fontSize: 10 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			fontWeight: 700,
			lineHeight: 1.3,
			fill: this.pdfTextColor,
			left: blockLeft + 59 * px_to_pt * scaleCoeff,
			width: blockWidth - 59 * px_to_pt * scaleCoeff,
		});
		created.top = internalBlockY + (58 * px_to_pt * scaleCoeff - 10 * px_to_pt * scaleCoeff * 1.3 * 3) / 2;
		created.setSelectionStyles(
			{
				fill: this.pdfLinkColor,
				underline: true,
			},
			createdText1.length,
			createdText1.length + createdText2.length - 1,
		);

		const digital = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasDigitalText'), {
			fontSize: 10 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			fill: this.pdfTextColor,
			top: created.top + created.height * 1.3,
			left: blockLeft + 59 * px_to_pt * scaleCoeff,
			width: blockWidth - 59 * px_to_pt * scaleCoeff,
		});

		this.canvasTextBlock.add(rect, qr, created, digital);
	}

	async drawCompetenciesPage(
		scaleCoeff: number,
		blockWidth: number,
		blockLeft: number,
		internalBlockY: number,
		blockAlignment: string,
	) {
		const headline = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasCompetenceHeadlineText'), {
			fontSize: 16 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			fontWeight: 500,
			lineHeight: 1.5,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		internalBlockY += headline.height;
		internalBlockY += 4 * px_to_pt * scaleCoeff;

		const sublineText1 = this.translate.instant('PDFTemplate.previewCanvasCompetenceSublineText1');
		const sublineText2 = this.translate.instant('PDFTemplate.previewCanvasCompetenceSublineText2');
		const sublineText3 = this.translate.instant('PDFTemplate.previewCanvasCompetenceSublineText3');
		const sublineText4 = this.translate.instant('PDFTemplate.previewCanvasCompetenceSublineText4');
		const subline = new fabric.Textbox(sublineText1 + sublineText2 + sublineText3 + sublineText4, {
			fontSize: 12 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		subline.setSelectionStyles({ fontWeight: 500 }, 0, sublineText1.length);
		subline.setSelectionStyles(
			{ fontWeight: 500 },
			sublineText1.length + sublineText2.length,
			sublineText1.length + sublineText2.length + sublineText3.length,
		);
		internalBlockY += subline.height;
		internalBlockY += 16 * px_to_pt * scaleCoeff;

		this.canvasTextBlock.add(headline, subline);

		let numCompetencies = 14;
		if (this.format != 'portrait') {
			numCompetencies = 11;
		}
		for (let i = 0; i < numCompetencies; i++) {
			if (i != 0) {
				internalBlockY += 8 * px_to_pt * scaleCoeff;
			}

			const rect = new fabric.Rect({
				rx: 8,
				ry: 8,
				fill: this.pdfGreyBgColor,
				top: internalBlockY,
				left: blockLeft,
				width: blockWidth,
				height: 36 * px_to_pt * scaleCoeff,
				strokeWidth: 1,
				stroke: this.pdfTextColor,
			});

			const competenceText = this.translate.instant('PDFTemplate.previewCanvasCompetenceExampleText');
			const competence = new fabric.Textbox(competenceText, {
				fontSize: 10 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				fontWeight: 500,
				lineHeight: 1.2,
				fill: this.pdfTextColor,
				left: blockLeft + 13 * px_to_pt * scaleCoeff,
				width: blockWidth - 13 * px_to_pt * scaleCoeff,
			});
			competence.top = internalBlockY + (36 * px_to_pt * scaleCoeff - competence.height) / 2;
			competence.setSelectionStyles({ underline: true }, competenceText.length - 2, competenceText.length - 1);
			competence.setSelectionStyles(
				{ fill: this.pdfLinkColor },
				competenceText.length - 3,
				competenceText.length,
			);

			const time = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasCompetenceTimeText'), {
				fontSize: 10 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				fontWeight: 500,
				lineHeight: 1.2,
				fill: this.pdfTextColor,
				left: blockLeft + blockWidth - (13 + 28) * px_to_pt * scaleCoeff,
				width: 31 * px_to_pt * scaleCoeff,
			});
			time.top = internalBlockY + (36 * px_to_pt * scaleCoeff - time.height) / 2;

			const clock = await fabric.FabricImage.fromURL(this.clockImageURL);
			const clockScale = (13 * px_to_pt * scaleCoeff) / clock.width;
			clock.scale(clockScale);
			clock.top = internalBlockY + ((36 - 13) * px_to_pt * scaleCoeff) / 2;
			clock.left = blockLeft + blockWidth - (13 + 6 + 28 + 13) * px_to_pt * scaleCoeff;

			internalBlockY += rect.height;

			this.canvasTextBlock.add(rect, competence, time, clock);
		}

		const spacer = new fabric.Rect({
			fill: 'transparent',
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
			height: 4.864 * px_to_pt * scaleCoeff,
		});
		if (this.format != 'portrait') {
			spacer.height = 31.096 * px_to_pt * scaleCoeff;
		}
		this.canvasTextBlock.add(spacer);
	}

	async drawOptDetailsPage(
		scaleCoeff: number,
		blockWidth: number,
		blockLeft: number,
		internalBlockY: number,
		blockAlignment: string,
	) {
		const competenciesHeadline = new fabric.Textbox(
			this.translate.instant('PDFTemplate.previewCanvasCompetenceHeadlineText'),
			{
				fontSize: 16 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				fontWeight: 500,
				lineHeight: 1.5,
				textAlign: blockAlignment,
				fill: this.pdfTextColor,
				top: internalBlockY,
				left: blockLeft,
				width: blockWidth,
			},
		);
		internalBlockY += competenciesHeadline.height;
		internalBlockY += 4 * px_to_pt * scaleCoeff;

		const sublineText1 = this.translate.instant('PDFTemplate.previewCanvasCompetenceSublineText1');
		const sublineText2 = this.translate.instant('PDFTemplate.previewCanvasCompetenceSublineText2');
		const sublineText3 = this.translate.instant('PDFTemplate.previewCanvasCompetenceSublineText3');
		const sublineText4 = this.translate.instant('PDFTemplate.previewCanvasCompetenceSublineText4');
		const competenciesSubline = new fabric.Textbox(sublineText1 + sublineText2 + sublineText3 + sublineText4, {
			fontSize: 12 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		competenciesSubline.setSelectionStyles({ fontWeight: 500 }, 0, sublineText1.length);
		competenciesSubline.setSelectionStyles(
			{ fontWeight: 500 },
			sublineText1.length + sublineText2.length,
			sublineText1.length + sublineText2.length + sublineText3.length,
		);
		internalBlockY += competenciesSubline.height;
		internalBlockY += 18 * px_to_pt * scaleCoeff;

		this.canvasTextBlock.add(competenciesHeadline, competenciesSubline);

		for (let i = 0; i < 3; i++) {
			if (i != 0) {
				internalBlockY += 8 * px_to_pt * scaleCoeff;
			}

			const rect = new fabric.Rect({
				rx: 8,
				ry: 8,
				fill: this.pdfGreyBgColor,
				top: internalBlockY,
				left: blockLeft,
				width: blockWidth,
				height: 36 * px_to_pt * scaleCoeff,
				strokeWidth: 1,
				stroke: this.pdfTextColor,
			});

			const competenceText = this.translate.instant('PDFTemplate.previewCanvasCompetenceExampleText');
			const competence = new fabric.Textbox(competenceText, {
				fontSize: 10 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				fontWeight: 500,
				lineHeight: 1.2,
				fill: this.pdfTextColor,
				left: blockLeft + 13 * px_to_pt * scaleCoeff,
				width: blockWidth - 13 * px_to_pt * scaleCoeff,
			});
			competence.top = internalBlockY + (36 * px_to_pt * scaleCoeff - competence.height) / 2;
			competence.setSelectionStyles({ underline: true }, competenceText.length - 2, competenceText.length - 1);
			competence.setSelectionStyles(
				{ fill: this.pdfLinkColor },
				competenceText.length - 3,
				competenceText.length,
			);

			const time = new fabric.Textbox(this.translate.instant('PDFTemplate.previewCanvasCompetenceTimeText'), {
				fontSize: 10 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				fontWeight: 500,
				lineHeight: 1.2,
				fill: this.pdfTextColor,
				left: blockLeft + blockWidth - (13 + 28) * px_to_pt * scaleCoeff,
				width: 31 * px_to_pt * scaleCoeff,
			});
			time.top = internalBlockY + (36 * px_to_pt * scaleCoeff - time.height) / 2;

			const clock = await fabric.FabricImage.fromURL(this.clockImageURL);
			const clockScale = (13 * px_to_pt * scaleCoeff) / clock.width;
			clock.scale(clockScale);
			clock.top = internalBlockY + ((36 - 13) * px_to_pt * scaleCoeff) / 2;
			clock.left = blockLeft + blockWidth - (13 + 6 + 28 + 13) * px_to_pt * scaleCoeff;

			internalBlockY += rect.height;

			this.canvasTextBlock.add(rect, competence, time, clock);
		}

		internalBlockY += 40 * px_to_pt * scaleCoeff;

		const criteriaHeadline = new fabric.Textbox(
			this.translate.instant('PDFTemplate.previewCanvasCriteriaHeadlineText'),
			{
				fontSize: 16 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				fontWeight: 500,
				lineHeight: 1.5,
				textAlign: blockAlignment,
				fill: this.pdfTextColor,
				top: internalBlockY,
				left: blockLeft,
				width: blockWidth,
			},
		);
		internalBlockY += criteriaHeadline.height;
		internalBlockY += 4 * px_to_pt * scaleCoeff;

		const criteriaSubline1 = new fabric.Textbox(
			this.translate.instant('PDFTemplate.previewCanvasCriteriaSubline1Text'),
			{
				fontSize: 12 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				lineHeight: 1.3,
				textAlign: blockAlignment,
				fill: this.pdfTextColor,
				top: internalBlockY,
				left: blockLeft,
				width: blockWidth,
			},
		);
		internalBlockY += criteriaSubline1.height;

		const criteriaSubline2 = new fabric.Textbox(
			this.translate.instant('PDFTemplate.previewCanvasCriteriaSubline2Text'),
			{
				fontSize: 12 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				lineHeight: 1.3,
				textAlign: blockAlignment,
				fill: this.pdfTextColor,
				top: internalBlockY,
				left: blockLeft,
				width: blockWidth,
			},
		);
		internalBlockY += criteriaSubline2.height;

		this.canvasTextBlock.add(criteriaHeadline, criteriaSubline1, criteriaSubline2);

		internalBlockY += 40 * px_to_pt * scaleCoeff;

		const narrativeHeadline = new fabric.Textbox(
			this.translate.instant('PDFTemplate.previewCanvasNarrativeHeadlineText'),
			{
				fontSize: 16 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				fontWeight: 500,
				lineHeight: 1.5,
				textAlign: blockAlignment,
				fill: this.pdfTextColor,
				top: internalBlockY,
				left: blockLeft,
				width: blockWidth,
			},
		);
		internalBlockY += narrativeHeadline.height;
		internalBlockY += 8 * px_to_pt * scaleCoeff;

		const narrativeSubline1Text = this.translate.instant('PDFTemplate.previewCanvasNarrativeSubline1Text');
		const narrativeSubline1 = new fabric.Textbox(narrativeSubline1Text, {
			fontSize: 12 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			textAlign: blockAlignment,
			fill: this.pdfLinkColor,
			underline: true,
			top: internalBlockY,
			left: blockLeft + 20 * px_to_pt * scaleCoeff,
			width: blockWidth,
		});
		narrativeSubline1.width = narrativeSubline1.calcTextWidth();

		const ext = await fabric.FabricImage.fromURL(this.extLinkImageURL);
		const extScale = (15 * px_to_pt * scaleCoeff) / ext.width;
		ext.scale(extScale);
		ext.top = internalBlockY;
		ext.left = blockLeft + 2 * px_to_pt * scaleCoeff;

		if (blockAlignment == 'center') {
			const lineWidth = ext.width + 5 * px_to_pt * scaleCoeff + narrativeSubline1.width;
			ext.left = blockLeft + (blockWidth - lineWidth) / 2;
			narrativeSubline1.left = ext.left + ext.width + 5 * px_to_pt * scaleCoeff;
		}

		internalBlockY += narrativeSubline1.height;
		internalBlockY += 8 * px_to_pt * scaleCoeff;

		const narrativeSubline2 = new fabric.Textbox(
			this.translate.instant('PDFTemplate.previewCanvasNarrativeSubline2Text'),
			{
				fontSize: 12 * px_to_pt * scaleCoeff,
				fontFamily: 'Rubik',
				lineHeight: 1.3,
				textAlign: blockAlignment,
				fill: this.pdfTextColor,
				top: internalBlockY,
				left: blockLeft,
				width: blockWidth,
			},
		);
		internalBlockY += narrativeSubline2.height;

		this.canvasTextBlock.add(narrativeHeadline, ext, narrativeSubline1, narrativeSubline2);

		internalBlockY += 40 * px_to_pt * scaleCoeff;

		const footnoteText1 = this.translate.instant('PDFTemplate.previewCanvasFootnoteText1');
		const footnoteText2 = this.translate.instant('PDFTemplate.previewCanvasFootnoteText2');
		const footnote = new fabric.Textbox(footnoteText1 + footnoteText2, {
			fontSize: 9 * px_to_pt * scaleCoeff,
			fontFamily: 'Rubik',
			lineHeight: 1.3,
			textAlign: blockAlignment,
			fill: this.pdfTextColor,
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
		});
		footnote.setSelectionStyles(
			{
				underline: true,
				fill: this.pdfLinkColor,
			},
			footnoteText1.length,
			footnoteText1.length + footnoteText2.length - 1,
		);
		internalBlockY += footnote.height;

		this.canvasTextBlock.add(footnote);

		const spacer = new fabric.Rect({
			fill: 'transparent',
			top: internalBlockY,
			left: blockLeft,
			width: blockWidth,
			height: 219.852 * px_to_pt * scaleCoeff,
		});
		if (this.format != 'portrait') {
			spacer.height = 127.305 * px_to_pt * scaleCoeff;
		}
		this.canvasTextBlock.add(spacer);
	}

	setDimensions() {
		if (this.format == 'portrait') {
			this.pdfOrigWidth = fabric.util.parseUnit('210mm');
			this.pdfOrigHeight = fabric.util.parseUnit('297mm');
			this.pdfOrigBlockWidth = this.pdfOrigWidth * 0.4815;
		} else {
			this.pdfOrigWidth = fabric.util.parseUnit('297mm');
			this.pdfOrigHeight = fabric.util.parseUnit('210mm');
			this.pdfOrigBlockWidth = this.pdfOrigWidth * 0.6283;
		}

		if (this.editable) {
			this.pdfOrigBlockWidth += 10;
		}

		this.canvas.width = this.pdfOrigWidth;
		this.canvas.height = this.pdfOrigHeight;
	}

	updateValues(
		format: string,
		scale: number,
		alignment: string,
		posX: number,
		posY: number,
		background: string,
		page: number = 1,
	) {
		this.format = format;
		this.scale = scale;
		this.alignment = alignment;
		this.posX = posX;
		this.posY = posY;
		this.background = background;
		this.page = page;

		this.setDimensions();
		this.recalcCanvas();
	}
}
