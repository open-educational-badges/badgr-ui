import { Component, input, Input, OnChanges, inject } from '@angular/core';
import { AppConfigService } from '../../app-config.service';
import { CmsManager } from '../../services/cms-manager.service';
import { ShadowDomComponent } from '../shadow-dom/shadow-dom.component';

@Component({
	selector: 'cms-content',
	template: `
		<div class="oeb">
			<div class="tw-overflow-hidden">
				@if (headline() || image()) {
					<div class="page-padding">
						@if (headline()) {
							<h1
								class="lg:tw-pl-[10%] tw-font-extrabold tw-text-purple md:tw-leading-[55.2px] md:tw-text-[46px] tw-leading-[36px] tw-text-[30px] tw-mb-4"
							>
								{{ headline() }}
							</h1>
						}
						@if (image()) {
							<img class="md:tw-w-[100%]" [src]="image()" alt="headline()" />
						}
					</div>
				}
				<shadow-dom
					[content]="_content"
					[styles]="styles"
					[script]="configService.apiConfig.baseUrl + '/cms/script'"
				/>
			</div>
		</div>
	`,
	imports: [ShadowDomComponent],
	standalone: true,
})
export class CmsContentComponent implements OnChanges {
	configService = inject(AppConfigService);
	private cmsManager = inject(CmsManager);

	headline = input<string>();
	image = input<string>();
	content = input<string>();
	_content: string;

	styles: string;
	styleUrls: string[];

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const cmsManager = this.cmsManager;

		// styles as <style> element
		cmsManager.styles$.subscribe((s) => {
			this.styles = s;
		});
	}

	ngOnChanges() {
		if (this.content()) {
			// make sure styles were loaded first
			this.cmsManager.styles$.subscribe((s) => {
				this._content = `
					${this.content()}
				`;
			});
		}
	}
}
