import { Injectable, inject } from '@angular/core';
import { QuotaApiService } from './quota-api.service';
import { ApiQuota, QuotaApiResponse } from '../models/quotas.model';
import { map, Observable } from 'rxjs';
import { UpdatableSubject } from '~/common/util/updatable-subject';

@Injectable({ providedIn: 'root' })
export class QuotaManager {
	quotaApi = inject(QuotaApiService);

	private loadedSubject: UpdatableSubject<QuotaApiResponse>;

	quotasEnabled: number | null = null;
	quotasList: ApiQuota[] = null;

	constructor() {
		this.loadedSubject = new UpdatableSubject<QuotaApiResponse>();
		(async () => {
			const response = await this.quotaApi.getQuotas();
			this.quotasList = response.quotas;
			this.quotasEnabled = response.enabled_date;
			this.loadedSubject.next(response);
		})();
	}

	get loaded$() {
		return this.loadedSubject.asObservable();
	}
	get quotasEnabled$(): Observable<number | null> {
		return this.loaded$.pipe(map((l) => l.enabled_date));
	}
	get quotas$(): Observable<ApiQuota[]> {
		return this.loaded$.pipe(map((l) => l.quotas));
	}

	private throwError(message: string): never {
		throw new Error(message);
	}
}
