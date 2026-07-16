import { Component, Input } from '@angular/core';
import { preloadImageURL } from '../util/file-util';

declare function require(path: string): string;

const iconsSvgPath = preloadImageURL('../../../assets/@concentricsky/badgr-style/dist/images/icons.svg');

@Component({
	selector: 'svg[icon]',
	template: ` <svg:use [attr.xlink:href]="iconHref"></svg:use> `,
})
export class SvgIconComponent {
	@Input() icon: PatternLibraryIconName;

	get iconHref() {
		if (this.icon) {
			return iconsSvgPath + '#' + this.icon;
		} else {
			return '';
		}
	}
}

export type PatternLibraryIconName =
	| 'icon_add'
	| 'icon_arrow'
	| 'icon_checkmark_circle'
	| 'icon_checkmark'
	| 'icon_close'
	| 'icon_collapse'
	| 'icon_complete'
	| 'icon_copy'
	| 'icon_dot'
	| 'icon_dropdown'
	| 'icon_edit'
	| 'icon_error'
	| 'icon_exit_to_app'
	| 'icon_expand'
	| 'icon_export'
	| 'icon_external_link'
	| 'icon_group'
	| 'icon_help'
	| 'icon_import'
	| 'icon_info'
	| 'icon_link'
	| 'icon_member'
	| 'icon_more'
	| 'icon_move'
	| 'icon_pending'
	| 'icon_ping'
	| 'icon_preview'
	| 'icon_priority_high'
	| 'icon_refresh'
	| 'icon_remove'
	| 'icon_revert'
	| 'icon_search'
	| 'icon_server'
	| 'icon_lock'
	| 'icon_settings'
	| 'icon_share'
	| 'icon_sign_out'
	| 'icon_step_arrow'
	| 'icon_toggle'
	| 'icon_json'
	| 'icon_LTI'
	| 'icon_upload'
	| 'icon_doublecheck'
	| 'icon_compare'
	| 'icon_thumbsup'
	| 'icon_file'
	| 'icon_list'
	| 'icon_grid'
	| 'icon_print'
	| 'icon_email'
	| 'icon_badgeaward'
	| 'icon_issuer'
	| 'icon_issuer2'
	| 'icon_badge'
	| 'icon_narrative'
	| 'icon_tags'
	| 'icon_markdown'
	| 'icon_arrow2'
	| '';
