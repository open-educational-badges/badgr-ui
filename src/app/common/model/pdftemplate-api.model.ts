import { ApiEntityRef } from '../../common/model/entity-ref';

export type PDFTemplateSlug = string;
export type PDFTemplateSqlId = number;
export type PDFTemplateRef = ApiEntityRef;

export type PDFTemplateAlignment = 0 | 1;
export type PDFTemplateFormat = 0 | 1;

export interface ApiPDFTemplateForCreation {
	issuer_id: string;
	name: string;
	format: PDFTemplateFormat;
	alignment: PDFTemplateAlignment;
	posX: number;
	posY: number;
	scale: number;
	image: string;
}

export interface ApiPDFTemplate extends ApiPDFTemplateForCreation {
	id: PDFTemplateSqlId;
	slug: PDFTemplateSlug;
	created_at?: Date | null;
	created_by: string;
	used: boolean;
}
