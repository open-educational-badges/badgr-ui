import {
	ApiPDFTemplate,
	PDFTemplateRef,
	PDFTemplateAlignment,
	PDFTemplateFormat,
} from '../../common/model/pdftemplate-api.model';
import { ManagedEntity } from '../../common/model/managed-entity';
import { ApiEntityRef } from '../../common/model/entity-ref';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';

export class PDFTemplate extends ManagedEntity<ApiPDFTemplate, PDFTemplateRef> {
	get slug(): string {
		return this.apiModel.slug;
	}

	get name(): string {
		return this.apiModel.name;
	}

	set name(name: string) {
		this.apiModel.name = name;
	}

	get format(): PDFTemplateFormat {
		return this.apiModel.format;
	}

	set format(format: PDFTemplateFormat) {
		this.apiModel.format = format;
	}

	get alignment(): PDFTemplateAlignment {
		return this.apiModel.alignment;
	}

	set alignment(alignment: PDFTemplateAlignment) {
		this.apiModel.alignment = alignment;
	}

	get posX(): number {
		return this.apiModel.posX;
	}

	set posX(posX: number) {
		this.apiModel.posX = posX;
	}

	get posY(): number {
		return this.apiModel.posY;
	}

	set posY(posY: number) {
		this.apiModel.posY = posY;
	}

	get scale(): number {
		return this.apiModel.scale;
	}

	set scale(scale: number) {
		this.apiModel.scale = scale;
	}

	get image(): string {
		return this.apiModel.image;
	}
	set image(image: string) {
		this.apiModel.image = image;
	}

	get issuer_id() {
		return this.apiModel.issuer_id;
	}

	set issuer_id(slug: string) {
		this.apiModel.issuer_id = slug;
	}

	get createdBy(): string {
		return this.apiModel.created_by;
	}

	constructor(
		commonManager: CommonEntityManager,
		initialEntity: ApiPDFTemplate = null,
		onUpdateSubscribed: () => void = undefined,
	) {
		super(commonManager, onUpdateSubscribed);

		if (initialEntity != null) {
			this.applyApiModel(initialEntity);
		}
	}

	protected buildApiRef(): ApiEntityRef {
		return {
			'@id': '',
			slug: this.apiModel.slug,
		};
	}

	save(): Promise<this> {
		return this.pdfTemplateManager.pdfTemplateApi
			.updatePDFTemplate(this.issuer_id, this.slug, this.apiModel)
			.catch((e) => {
				this.revertChanges();
				throw e;
			})
			.then((apiPDFTemplate) => this.applyApiModel(apiPDFTemplate));
	}
}

export const pdfTemplateFormats = [
	{
		value: '0',
		label: 'PDFTemplate.formatPortrait',
	},
	{
		value: '1',
		label: 'PDFTemplate.formatLandscape',
	},
];

export const pdfTemplateAlignments = [
	{
		value: '0',
		label: 'PDFTemplate.alignmentLeft',
		icon: 'lucideAlignLeft',
	},
	{
		value: '1',
		label: 'PDFTemplate.alignmentCenter',
		icon: 'lucideAlignCenter',
	},
];
