import { Injectable, inject } from '@angular/core';
import { IssuerApiService } from './issuer-api.service';
import { Issuer } from '../models/issuer.model';
import {
	ApiIssuer,
	ApiIssuerForCreation,
	ApiIssuerForEditing,
	ApiNetwork,
	IssuerSlug,
} from '../models/issuer-api.model';
import { combineLatest, firstValueFrom, Observable, of, race } from 'rxjs';
import { StandaloneEntitySet } from '../../common/model/managed-entity-set';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';
import { catchError, filter, first, map, mergeMap } from 'rxjs/operators';
import { NetworkApiService } from './network-api.service';
import { Network } from '../network.model';

@Injectable({ providedIn: 'root' })
export class IssuerManager {
	issuerApiService = inject(IssuerApiService);
	networkApiService = inject(NetworkApiService);
	commonEntityManager = inject(CommonEntityManager);

	issuersList = new StandaloneEntitySet<Issuer, ApiIssuer>(
		(apiModel) => new Issuer(this.commonEntityManager),
		(apiModel) => apiModel.json.id,
		() => this.issuerApiService.listIssuers(),
	);

	networksList = new StandaloneEntitySet<Network, ApiNetwork>(
		(apiModel) => new Network(this.commonEntityManager),
		(apiModel) => apiModel.json.id,
		() => this.networkApiService.listNetworks(),
	);

	allIssuersList = new StandaloneEntitySet<Issuer, ApiIssuer>(
		(apiModel) => new Issuer(this.commonEntityManager),
		(apiModel) => apiModel.json.id,
		() => this.issuerApiService.listAllIssuers(),
	);

	createIssuer(initialIssuer: ApiIssuerForCreation): Promise<Issuer> {
		return this.issuerApiService
			.createIssuer(initialIssuer)
			.then((newIssuer) => this.issuersList.addOrUpdate(newIssuer));
	}

	get myIssuers$(): Observable<Issuer[]> {
		return this.issuersList.loaded$.pipe(map((l) => l.entities));
	}

	get myNetworks$(): Observable<Network[]> {
		return this.networksList.loaded$.pipe(map((l) => l.entities));
	}

	get allIssuers$(): Observable<Issuer[]> {
		return this.allIssuersList.loaded$.pipe(map((l) => l.entities));
	}

	getAllIssuers(): Observable<Issuer[]> {
		return this.allIssuersList.loaded$.pipe(map((l) => l.entities));
	}

	editIssuer(issuerSlug: IssuerSlug, initialIssuer: ApiIssuerForEditing): Promise<Issuer> {
		return this.issuerApiService
			.editIssuer(issuerSlug, initialIssuer)
			.then((newIssuer) => this.issuersList.addOrUpdate(newIssuer));
	}

	deleteIssuer(issuerSlug: IssuerSlug, issuerToDelete: Issuer): Promise<boolean> {
		return this.issuerApiService
			.deleteIssuer(issuerSlug)
			.then((response) => this.issuersList.remove(issuerToDelete));
	}

	issuerBySlug(issuerSlug: IssuerSlug): Promise<Issuer> {
		return firstValueFrom(
			combineLatest([
				this.allIssuersList.loaded$.pipe(map((l) => l.entities)),
				this.issuersList.loaded$.pipe(
					catchError((err: any) => of()),
					map((l) => l.entities),
				),
			]).pipe(
				map(([all, mine]) => {
					return mine.concat(all.filter((f) => mine.findIndex((m) => m.slug === f.slug) === -1));
				}),
			),
		).then(
			(issuers) =>
				issuers.find((i) => i.slug === issuerSlug) || this.throwError(`Issuer Slug '${issuerSlug}' not found`),
		);
	}

	issuerOrNetworkBySlug(issuerSlug: IssuerSlug): Promise<Issuer | Network> {
		try {
			const loadIssuer = this.issuerApiService.getIssuer(issuerSlug);
			const loadNetwork = this.networkApiService.getNetwork(issuerSlug);
			return Promise.allSettled([loadIssuer, loadNetwork]).then(([i, n]) => {
				if (i.status === 'fulfilled' && !i.value.is_network)
					return new Issuer(this.commonEntityManager, i.value);
				else if (i.status === 'fulfilled' && i.value.is_network) {
					if (n.status === 'fulfilled') return new Network(this.commonEntityManager, n.value);
					else throw new Error('Could not properly load network information');
				}
			});
		} catch (e) {
			this.throwError(`Issuer/Network Slug '${issuerSlug}' not found`);
		}
	}

	issuersByUrls(issuerUrls: string[]): Promise<Issuer[]> {
		if (!issuerUrls || issuerUrls.length === 0) {
			return Promise.resolve([]);
		}

		const uniqueUrls = [...new Set(issuerUrls)];

		return this.allIssuers$
			.pipe(first())
			.toPromise()
			.then((issuers) => issuers.filter((i) => uniqueUrls.indexOf(i.issuerUrl) >= 0));
	}

	issuersBySlugs(slugs: string[]): Promise<Issuer[]> {
		if (!slugs || slugs.length === 0) {
			return Promise.resolve([]);
		}

		const uniqueSlugs = [...new Set(slugs)];

		return this.allIssuers$
			.pipe(first())
			.toPromise()
			.then((issuers) => issuers.filter((i) => uniqueSlugs.includes(i.slug)));
	}

	private throwError(message: string): never {
		throw new Error(message);
	}
}
