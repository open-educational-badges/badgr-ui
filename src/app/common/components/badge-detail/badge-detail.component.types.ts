import { OB3EvidenceItem, PublicApiLearningPath } from '../../../public/models/public-api.model';
import { ApiLearningPath } from '../../model/learningpath-api.model';
import { LinkEntry } from '../bg-breadcrumbs/bg-breadcrumbs.component';
import { BadgeClassCopyPermissions } from '../../../issuer/models/badgeclass-api.model';
import { Issuer } from '~/issuer/models/issuer.model';
import { ApiBadgeInstanceEvidenceItem } from '~/issuer/models/badgeinstance-api.model';

type MenuItemBase = {
	title: string;
	routerLink?: string[] | string;
	icon?: any;
	disabled?: boolean;
	action?: (args?: any) => void;
	children?: MenuItem[];
};

type MenuItemWithLink = MenuItemBase & {
	routerLink: string[];
	action?: never;
};

type MenuItemWithAction = MenuItemBase & {
	routerLink?: never;
	action: (args?: any) => void;
};

export type MenuItem = MenuItemWithLink | MenuItemWithAction;

type HeaderButtonBase = {
	title: string;
	disabled?: boolean;
};

type HeaderButtonWithLink = HeaderButtonBase & {
	routerLink: string[];
	action?: never;
};

type HeaderButtonWithAction = HeaderButtonBase & {
	routerLink?: never;
	action: () => void;
};

type QrCodeButton = {
	show: boolean;
	title?: string;
	disabled?: boolean;
	action?: () => void;
};

type HeaderButton = HeaderButtonWithLink | HeaderButtonWithAction;

export type CompetencyType = {
	name: string;
	description: string;
	studyLoad: number;
	category?: string;
	framework?: string;
	framework_identifier?: string;
};

export interface PageConfig {
	crumbs?: LinkEntry[] | null;
	badgeTitle: string;
	headerButton?: HeaderButton | null;
	issueQrRouterLink?: string[] | null;
	qrCodeButton?: QrCodeButton;
	issuerSlug: string;
	slug: string;
	menuitems?: MenuItem[];
	createdAt?: Date;
	updatedAt?: Date;
	issuedOn?: Date;
	issuedTo?: string;
	validUntil?: Date;
	activity_start_date?: Date;
	activity_end_date?: Date;
	courseUrl?: string;
	duration?: string;
	activity_city?: string;
	category: string;
	tags: string[];
	issuerName: string;
	issuerImagePlacholderUrl: string;
	issuerImage: string;
	awardingIssuers?: Issuer[];
	networkBadge?: boolean;
	networkImage?: string;
	networkName?: string;
	sharedOnNetwork?: { slug: string; name: string; image: string | null; description: string | null } | null;
	badgeLoadingImageUrl: string;
	badgeFailedImageUrl: string;
	badgeImage: string;
	badgeDescription: string;
	criteria?: Array<string | object>;
	competencies?: CompetencyType[];
	evidence_items?: (ApiBadgeInstanceEvidenceItem | OB3EvidenceItem)[];
	license?: boolean;
	id?: string;
	shareButton?: boolean;
	badgeInstanceSlug?: string;
	learningPaths?: PublicApiLearningPath[] | ApiLearningPath[];
	copy_permissions?: BadgeClassCopyPermissions[];
	awardCriteria?: Array<{ name: string; description: string }>;
	version?: string;
	expiration?: number;
}
