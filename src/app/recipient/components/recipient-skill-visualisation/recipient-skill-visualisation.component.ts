import { Component, ElementRef, input, OnChanges, SimpleChanges, OnDestroy, inject, viewChild, output } from '@angular/core';
import { ApiRootSkill, ApiSkill } from '../../../common/model/ai-skills.model';
import { debounceTime, fromEvent, Subject, takeUntil, tap } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HlmAccordionModule } from '../../../components/spartan/ui-accordion-helm/src/index';
import { BrnAccordionItem, BrnAccordion, BrnAccordionTrigger } from '@spartan-ng/brain/accordion';
import { HlmIconModule } from '../../../components/spartan/ui-icon-helm/src/index';
import { NgIcon } from '@ng-icons/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { CompetencyAccordionComponent } from '../../../components/accordion.component';
import { HourPipe } from '../../../common/pipes/hourPipe';
import { VISUALISATION_BREAKPOINT_MAX_WIDTH } from '../../constants/visualisation.constants';
import { lucideClockFading } from '@ng-icons/lucide';
import {
	lucideLifeBuoy,
	lucideLightbulb,
	lucideCalendar1,
	lucideSpeech,
	lucideDumbbell,
	lucidePodcast,
	lucideHandshake,
	lucideBinoculars,
	lucideHandHeart,
	lucideSquarePen,
	lucideMonitorCheck,
	lucideTruck,
	lucideHardHat,
	lucideDrill,
	lucideBrain,
	lucideGraduationCap,
	lucideDrama,
	lucideNewspaper,
	lucideScale,
	lucideAtom,
	lucideBinary,
	lucideBrainCircuit,
	lucideSprout,
	lucideAmbulance,
	lucidePhoneCall,
	lucideMessageSquare,
	lucideLanguages,
	lucideRocket,
	lucideEarth,
} from '@ng-icons/lucide';

import * as d3 from 'd3';
import d3ForceBoundary from 'd3-force-boundary';

import futureSkills from './recipient-skill-visualisation.future.json';

interface ExtendedApiSkill extends Partial<ApiSkill> {
	id: string;
	name: string;
	description: string;
	type: string;
	studyLoad: number;
	concept_uri: string;
	ancestors: Set<string>;
	height: number;
	depth: number;
	parents: Set<string>;
	children: string[];
	leafs: string[];
	leaf: boolean;
	group: number;
	mouseover: boolean;
	clickable: boolean;
}

interface SkillLink {
	source: string;
	target: string;
}

/**
 * Data emitted when a top-level competency area bubble is clicked.
 * Contains information needed to fetch detailed statistics from the backend.
 */
export interface CompetencyAreaClickData {
	/** Display name of the competency area */
	areaName: string;
	/** ESCO concept URI of the area (for identification) */
	areaConceptUri: string;
	/** Total study load (hours) for this area */
	studyLoad: number;
	/** ESCO URIs of all individual competencies belonging to this area */
	competencyUris: string[];
}

const skillIconMap = {
	'/esco/skill/b94686e3-cce5-47a2-a8d8-402a0d0ed44e': lucideLifeBuoy,
	'/esco/skill/8267ecb5-c976-4b6a-809b-4ceecb954967': lucideLightbulb,
	'/esco/skill/021a23e1-907e-4627-b05a-555f889cbb65': lucideCalendar1,
	'/esco/skill/552c4f35-a2d1-49c2-8fda-afe26695c44a': lucideSpeech,
	'/esco/skill/12022223-8c30-418a-8f83-658396c9fec2': lucideDumbbell,
	'/esco/skill/4ef78abc-e983-4cc7-84a1-52532a0159dc': lucidePodcast,
	'/esco/skill/dc06de9f-dd3a-4f28-b58f-b01b5ae72ab8': lucideHandshake,
	'/esco/skill/0a2d70ee-d435-4965-9e96-702b2fb65740': lucideBinoculars,
	'/esco/skill/c73521be-c039-4e22-b037-3b01b3f6f9d9': lucideHandHeart,
	'/esco/skill/869fc2ce-478f-4420-8766-e1f02cec4fb2': lucideSquarePen,
	'/esco/skill/243eb885-07c7-4b77-ab9c-827551d83dc4': lucideMonitorCheck,
	'/esco/skill/03e0b95b-67d1-457a-b3f7-06c407cf6bec': lucideTruck,
	'/esco/skill/2ae39fc8-0f1b-4284-9e73-3f2739471f63': lucideHardHat,
	'/esco/skill/9b8bb484-dcba-49af-8ae0-cfe8b6e9ed45': lucideDrill,
	'/esco/isced-f/00': lucideBrain,
	'/esco/isced-f/01': lucideGraduationCap,
	'/esco/isced-f/02': lucideDrama,
	'/esco/isced-f/03': lucideNewspaper,
	'/esco/isced-f/04': lucideScale,
	'/esco/isced-f/05': lucideAtom,
	'/esco/isced-f/06': lucideBinary,
	'/esco/isced-f/07': lucideBrainCircuit,
	'/esco/isced-f/08': lucideSprout,
	'/esco/isced-f/09': lucideAmbulance,
	'/esco/isced-f/10': lucidePhoneCall,
	'/esco/skill/43f425aa-f45d-4bb4-a200-6f82fa211b66': lucideMessageSquare,
	'/esco/skill/e434e71a-f068-44ed-8059-d1af9eb592d7': lucideLanguages,
	'future-skills': lucideRocket,
	bne: lucideEarth,
};

@Component({
	selector: 'recipient-skill-visualisation',
	templateUrl: './recipient-skill-visualisation.component.html',
	styleUrl: './recipient-skill-visualisation.component.scss',
	standalone: true,
	providers: [BrnAccordionItem, BrnAccordion, BrnAccordionTrigger],
	imports: [
		TranslateModule,
		HlmAccordionModule,
		HlmIconModule,
		OebButtonComponent,
		NgIcon,
		CompetencyAccordionComponent,
		HourPipe,
	],
})
export class RecipientSkillVisualisationComponent implements OnChanges, OnDestroy {
	private translate = inject(TranslateService);

	readonly d3canvas = viewChild.required<ElementRef<HTMLElement>>('d3canvas');

	skills = input<ApiRootSkill[]>([]);

	/**
	 * Whether to show the intro text above the visualisation
	 * Default: true (shows intro text)
	 */
	showIntroText = input<boolean>(true);

	/**
	 * i18n key for the intro text. Use different keys for different contexts:
	 * - 'RecBadge.skillVisualisationIntro' (default): "In diesen Bereichen hast du am meisten Kompetenzen gestärkt:"
	 * - 'RecBadge.skillVisualisationIntroLearners': "In diesen Bereichen haben die Lernenden am meisten Kompetenzen gestärkt:"
	 */
	introTextKey = input<string>('RecBadge.skillVisualisationIntro');

	/**
	 * Whether to show the help text (mouse hover instruction)
	 * Default: true
	 */
	showHelpText = input<boolean>(true);

	/**
	 * Whether to show the legend (ESCO-Bereiche, Future Skills)
	 * Default: true
	 */
	showLegend = input<boolean>(true);

	/**
	 * Whether clicking on a top-level competency area should emit an event
	 * for opening a detail view (instead of just showing description).
	 * Default: false (original behavior - shows description on click)
	 */
	enableAreaClick = input<boolean>(false);

	/**
	 * Compact mode: only shows top-level area bubbles without hover expansion.
	 * Useful for dashboard overview where space is limited.
	 * Default: false (full visualization with hover effects)
	 */
	compactMode = input<boolean>(false);

	/**
	 * Emitted when a top-level competency area bubble is clicked
	 * (only when enableAreaClick is true).
	 * Contains the area data including all ESCO URIs of child competencies.
	 */
	areaClick = output<CompetencyAreaClickData>();

	skillTree: Map<string, ExtendedApiSkill>;
	d3data: { nodes: ExtendedApiSkill[]; links: SkillLink[] } = {
		nodes: [],
		links: [],
	};

	mobile = window.innerWidth <= VISUALISATION_BREAKPOINT_MAX_WIDTH;
	hasFutureSkills = false;

	resizeSubject$ = new Subject<void>();

	selectedNode: ExtendedApiSkill | null = null;
	selectedNodeNumber: string | undefined = undefined;
	showSingleNode: boolean = false;

	constructor() {
		fromEvent(window, 'resize')
			.pipe(
				debounceTime(300),
				tap((event: UIEvent) => {
					const width = event.target['innerWidth'];
					const wasMobile = this.mobile;
					this.mobile = window.innerWidth <= VISUALISATION_BREAKPOINT_MAX_WIDTH;
					if ((wasMobile && !this.mobile) || (!wasMobile && this.mobile)) {
						this.initD3();
					}
				}, takeUntil(this.resizeSubject$)), // cleanup
			)
			.subscribe();
	}

	ngOnDestroy() {
		this.resizeSubject$.next();
		this.resizeSubject$.complete();
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['skills'] && changes['skills'].currentValue.length) {
			this.prepareData(changes['skills'].currentValue);
			this.initD3();
		}
	}

	prepareData(skills: ApiRootSkill[]) {
		this.skillTree = new Map();
		this.hasFutureSkills = false;

		// DEBUG: add your own future skill for testing
		// futureSkills['escoMap']['/esco/skill/2c6439c2-77a5-436a-b222-5e12d435c3eb'] = 'lernkompetenz';

		skills.forEach((s) => {
			const breadcrumbs = s.breadcrumb_paths;

			// add future skills to breadcrumbs if applicable
			if (futureSkills['escoMap'][s.concept_uri]) {
				const emptyFs = {
					preferred_label: '',
					concept_uri: '',
					description: '',
					type: '',
					alt_labels: [],
					reuse_level: null,
				};
				const baseFs = futureSkills['futureSkills'][futureSkills['escoMap'][s.concept_uri]];
				const futureSkill = {
					...emptyFs,
					...{
						concept_uri: baseFs['concept_uri'],
						preferred_label: baseFs[this.translate.currentLang]['preferred_label'],
						description: baseFs[this.translate.currentLang]['description'],
					},
				};

				breadcrumbs.push([
					emptyFs,
					{
						...emptyFs,
						...{
							preferred_label: 'future skills',
							concept_uri: 'future-skills',
						},
					},
					futureSkill,
					s,
				]);

				this.hasFutureSkills = true;
			}

			// loop breadcrumbs to augment skill data
			breadcrumbs.forEach((breadcrumb) => {
				let ancestor = null;
				breadcrumb.forEach((bc, j) => {
					const previous = breadcrumb[j - 1];
					// skips esco top level 'skills'
					if (previous) {
						const id = bc.concept_uri;

						// get skill from tree set or create new
						const entry = this.skillTree.get(id) || {
							id: id,
							name: bc.preferred_label,
							description: bc.description,
							type: bc.type,
							studyload: bc.studyLoad,
							concept_uri: bc.concept_uri,
							depth: j,
							height: breadcrumb.length - j,
							parents: new Set(),
							ancestors: new Set(),
							children: [],
							leafs: [],
							studyLoad: 0,
							leaf: j == breadcrumb.length - 1,
							group: j == breadcrumb.length - 1 ? 2 : 1,
							mouseover: false,
							clickable: !!bc.description,
						};

						// studyload does not exist on breadcrumb entries, take from top level json
						if (entry.id == s.concept_uri) {
							entry.studyLoad = s.studyLoad;
						}

						if (ancestor && !entry.ancestors.has(ancestor)) {
							entry.ancestors.add(ancestor);
						}

						Object.assign(entry, {
							height: Math.max(breadcrumb.length - j, entry.height),
						});

						if (j == 1) {
							ancestor = id;
						}
						if (j > 1 && previous?.concept_uri) {
							entry.parents.add(previous.concept_uri);
						}
						this.skillTree.set(id, entry);
					}
				});
			});
		});

		// sum up leaf studyLoads on top level ancestors
		Array.from(this.skillTree.values()).forEach((v) => {
			if (v.leaf) {
				for (let a of v.ancestors.values()) {
					this.skillTree.get(a).studyLoad += v.studyLoad;
				}
			}
		});

		const hasFuture = Array.from(this.skillTree.values()).reduce((c, s) => {
			return s.id == 'future-skills' || c;
		}, false);
		// find top level nodes with highest studyLoad, either top 5 or 4 if future skills exist
		const topAncestors = new Set(
			Array.from(this.skillTree.values())
				.filter((s) => !s.ancestors.size && s.id != 'future-skills')
				.sort((a, b) => {
					return b.studyLoad - a.studyLoad;
				})
				.map((s) => s.id)
				.slice(0, hasFuture ? 4 : 5),
		);
		// add future skills if available
		if (hasFuture) {
			topAncestors.add('future-skills');
		}

		// add nodes that either are topAncestors or have a topAncestor or are in future skills
		this.d3data.nodes = Array.from(this.skillTree.values()).filter((s) => {
			const intersection = <T>(a: Set<T>, b: Set<T>): Set<T> => new Set([...a].filter((x) => b.has(x)));
			const intersections = intersection(s.ancestors, topAncestors);
			return (
				topAncestors.has(s.id) || // is topAncestor
				(s.ancestors.size > 0 && // is not top level (should also be depth == 1)
					intersections.size >= 1) // is beneath at least one topAncestor
			);
		});
		const d3NodeIds = this.d3data.nodes.map((n) => n.id);

		this.d3data.links = [];
		this.d3data.nodes.forEach((node) => {
			if (node.leaf) {
				for (let ancestor of node.ancestors.values()) {
					this.skillTree.get(ancestor).leafs.push(node.id);
				}
			}
			node.parents.forEach((parentId) => {
				const parent = this.skillTree.get(parentId);
				if (parent) {
					// parents might have been removed in topancestors filter
					if (d3NodeIds.includes(parent.id)) {
						parent.children.push(node.id);
						this.d3data.links.push({
							source: node.id,
							target: parentId,
						});
					}
				}
			});
		});
	}

	getTopLevelSkills() {
		return this.d3data.nodes.filter((d) => d.depth == 1);
	}

	getTopLevelSkillsSorted() {
		const topLevelSkills = this.getTopLevelSkills();
		const maxStudyLoad = topLevelSkills.reduce((current, d) => Math.max(current, d.studyLoad), 0);
		return topLevelSkills.sort((a, b) => b.studyLoad / maxStudyLoad - a.studyLoad / maxStudyLoad);
	}

	getAllDescendantsForTopLevelSkill(topLevelSkill: ExtendedApiSkill): ExtendedApiSkill[] {
		const descendants = new Set<ExtendedApiSkill>();
		const visited = new Set<string>();

		const collectDescendants = (skill: ExtendedApiSkill) => {
			if (visited.has(skill.id)) return;
			visited.add(skill.id);

			skill.children.forEach((childId) => {
				const child = this.d3data.nodes.find((node) => node.id === childId);
				if (child) {
					// Always recurse to explore all paths
					collectDescendants(child);

					// Add to descendants only if user earned it
					if (this.skills().some((s) => s.concept_uri == child.concept_uri)) {
						descendants.add(child);
					}
				}
			});
		};

		collectDescendants(topLevelSkill);
		return Array.from(descendants);
	}

	initD3() {
		// Compact mode uses smaller canvas optimized for only top-level bubbles
		// This makes the bubbles fill more of the available space percentage-wise
		const width = this.compactMode() ? 320 : (this.mobile ? 540 : 1144);
		const height = this.compactMode() ? 320 : width;

		// Larger relative node sizes in compact mode to fill available space
		const nodeBaseSize = this.compactMode() ? 50 : (this.showSingleNode ? 100 : 60);
		const nodeMaxAdditionalSize = this.compactMode() ? 45 : 100;
		const topLevelSkills = this.getTopLevelSkills();
		const maxStudyLoad = topLevelSkills.reduce((current, d) => Math.max(current, d.studyLoad), 0);
		const minStudyLoad = topLevelSkills.reduce(
			(current, d) => Math.min(current, d.studyLoad),
			Number.MAX_SAFE_INTEGER,
		);

		const nodeRadius = (d: ExtendedApiSkill) => {
			if (d.depth == 1) {
				// calculate node sizes based on studyLoad for top level skills
				const size = d.studyLoad / maxStudyLoad;
				return nodeBaseSize + (nodeMaxAdditionalSize * size) / 2;
			} else {
				// return default size for everything else
				return nodeBaseSize;
			}
		};

		// Set the position attributes of links and nodes each time the simulation ticks.
		const onTick = () => {
			link.attr('x1', (d) => d.source.x)
				.attr('y1', (d) => d.source.y)
				.attr('x2', (d) => d.target.x)
				.attr('y2', (d) => d.target.y);

			node.attr('transform', (d) => `translate(${d.x}, ${d.y})`);

			node.sort((d1, d2) => {
				if (d1.mouseover) return 1;
				if (d2.mouseover) return -1;
				return d1.depth - d2.depth;
			});
		};

		// The force simulation mutates links and nodes, so create a copy
		// so that re-evaluating this cell produces the same result.
		let links = [];
		let nodes = [];
		// compactMode: only show top-level (depth 1) nodes without links
		if (this.compactMode()) {
			nodes = this.d3data.nodes.filter((d) => d.depth == 1).map((d) => ({ ...d }));
			// No links in compact mode
		} else if (!this.mobile) {
			links = this.d3data.links.map((d) => ({ ...d }));
			nodes = this.d3data.nodes.map((d) => ({ ...d }));
		} else {
			if (this.showSingleNode && this.selectedNode) {
				nodes = [{ ...this.selectedNode }];
			} else {
				nodes = this.d3data.nodes.filter((d) => d.depth == 1).map((d) => ({ ...d }));
			}
		}

		// Create a simulation with several forces.
		// Compact mode: tighter packing, stronger center force, smaller boundary
		const boundaryFactor = this.compactMode() ? 0.42 : 0.46;
		const chargeStrength = this.compactMode() ? -300 : -1000;
		const collisionMultiplier = this.compactMode() ? 1.05 : 1.1;

		const simulation = d3
			.forceSimulation(nodes)
			// center all nodes on the middle
			.force('center', d3.forceCenter(0, 0).strength(this.compactMode() ? 1.5 : 1))
			// keep nodes inside SVG bounds
			.force(
				'bounds',
				d3ForceBoundary(width * -boundaryFactor, height * -boundaryFactor, width * boundaryFactor, height * boundaryFactor)
					.strength(this.compactMode() ? 0.2 : 0.1)
					.border(this.compactMode() ? 5 : 10),
			)
			// force between links
			.force(
				'link',
				d3
					.forceLink(links)
					.id((d) => (d as ExtendedApiSkill).id)
					.distance(10)
					.strength(1),
			)
			// force between nodes ("charged" magentism)
			.force(
				'charge',
				d3.forceManyBody().strength((d) => {
					return (d as ExtendedApiSkill).depth == 1 ? chargeStrength : -500;
				}),
			)
			// prevent overlapping nodes
			.force(
				'collide',
				d3.forceCollide((d) => nodeRadius(d) * collisionMultiplier),
			)
			// forces nodes into "rings", basically creating a ring of nodes for each depth level
			// which helps keeping distances uniform
			.force(
				'inner',
				d3
					.forceRadial((d) => {
						if ((d as ExtendedApiSkill).depth == 1) {
							return 0;
						}
						return ((d as ExtendedApiSkill).depth - 1) * (nodeBaseSize * 3);
					})
					.strength((d) => {
						return (d as ExtendedApiSkill).depth == 1 ? 3 : 0.1;
					}),
			);

		// skip ticks do skip "start animation"
		for (var i = 0; i < 1000; i++) {
			simulation.tick();
		}

		simulation.on('tick', onTick);

		// Create the SVG container.
		const svg = d3
			.create('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', [-width / 2, -height / 2, width, height])
			.attr('style', 'max-width: 100%; height: auto; margin: 0 auto;');

		// Add a line for each link, and a circle for each node.
		const link = svg
			.append('g')
			.attr('stroke', '#999')
			.attr('stroke-opacity', 1)
			.selectAll('line')
			.data(links)
			.join('line')
			.attr('stroke-width', '2')
			.attr('class', 'link');

		const node = svg
			.append('g')
			.attr('stroke', '#fff')
			.attr('stroke-width', 1.5)
			.selectAll('g')
			.data(nodes)
			.join('g');

		node.append('circle').attr('r', (d) => nodeRadius(d));

		// add foreignObject for text styling / positioning
		// Compact mode uses slightly smaller font for tighter layout
		const fontSizeMultiplier = this.compactMode() ? 0.16 : 0.175;
		const nodeText = node
			.append('foreignObject')
			.attr('x', (d) => nodeRadius(d) * -1)
			.attr('y', (d) => nodeRadius(d) * -1)
			.attr('height', (d) => nodeRadius(d) * 2)
			.attr('width', (d) => nodeRadius(d) * 2)
			.attr('class', 'fo-name')
			.append('xhtml:div')
			// DEBUG: output studyload if not 0
			// .text(d => { return d.name.replace("/", " / ") + (d.studyLoad !== 0 ? ` (${d.studyLoad} min)` : '') })
			.attr('style', (d) => `font-size: ${nodeRadius(d) * fontSizeMultiplier}px;`)
			.attr('class', 'name');

		if (this.mobile) {
			if (!this.showSingleNode) {
				// show numbers based on bubble size (01 for biggest bubble)
				const sortedNodes = [...nodes].sort((a, b) => nodeRadius(b) - nodeRadius(a));
				const nodeRankMap = new Map();
				sortedNodes.forEach((node, index) => {
					nodeRankMap.set(node.id, index + 1);
				});
				nodeText.html(
					(d) => `
					<div class="studyload__wrapper">
						${skillIconMap[d.id] ? skillIconMap[d.id] : ''}
						${this.padStart(nodeRankMap.get(d.id))}
					</div>
				`,
				);
			} else {
				nodeText.html(
					(d) => `
					<div class="studyload__wrapper">
						${skillIconMap[d.id] ? skillIconMap[d.id] : ''}
						${this.selectedNodeNumber}
					</div>
				`,
				);
			}
		} else {
			nodeText.html((d) => {
				if (d.depth == 1) {
					const p = new HourPipe();
					const studyLoadNode = `<span>${p.transform(d.studyLoad)} h</span>`;
					return `
					<div class="studyload__wrapper">
					${skillIconMap[d.id] ? skillIconMap[d.id] : ''}
						<div>${d.name.replace('/', ' / ')}</div>
						<div class="studyload">${lucideClockFading}${studyLoadNode}</div>
					</div>`;
				}

				return `<div>${d.name.replace('/', ' / ')}</div>`;
			});
		}

		// add foreignObject for description text popover
		node.append('foreignObject')
			.attr('x', (d) => nodeRadius(d) * 0.25)
			.attr('y', (d) => nodeRadius(d) * -0.5 + nodeBaseSize)
			.attr('width', (d) => nodeBaseSize)
			.attr('height', (d) => nodeBaseSize)
			.attr('class', 'fo-description')
			.append('xhtml:div')
			.attr('data-title', (d) => d.description)
			.attr('class', 'description');

		node.attr(
			'class',
			(d) => `
				${d.leaf ? 'leaf' : 'group'}
				level-${d.depth}
				${d.clickable ? 'clickable' : ''}
				${d.id == 'future-skills' ? 'future' : ''}
			`,
		);

		node.sort((d1, d2) => {
			return d1.depth - d2.depth;
		});

		node.on('click', (e, d) => {
			if (d.description) {
				const others = d3
					.selectAll<SVGElement, ExtendedApiSkill>('g.leaf, g.group')
					.filter((d2) => d2.id != d.id);
				others.data().forEach((d2) => {
					d2.mouseover = false;
				});
				others.nodes().forEach((n) => {
					n.classList.remove('show-description');
				});

				const n = d3
					.selectAll<SVGElement, ExtendedApiSkill>('g.leaf, g.group')
					.filter((d2) => d2.id == d.id)
					.node();
				if (n.classList.contains('show-description')) {
					n.classList.remove('show-description');
					d.mouseover = false;
				} else {
					n.classList.add('show-description');
					d.mouseover = true;
				}

				// needed to reset node order?
				simulation.alphaTarget(0).restart();
			} else {
				const descriptionNodes = d3.selectAll<SVGElement, ExtendedApiSkill>('.show-description').nodes();
				for (const n of descriptionNodes) n.classList.remove('show-description');
			}
		})
			.attr('style', (d) => `font-size: 12px;`)
			.attr('text-anchor', 'top')
			.attr('class', 'description');

		node.attr(
			'class',
			(d) => `
				${d.leaf ? 'leaf' : 'group'}
				level-${d.depth}
				${d.clickable ? 'clickable' : ''}
				${d.id == 'future-skills' ? 'future' : ''}
				${d.parents.has('future-skills') ? 'future-sub' : ''}
			`,
		);

		node.sort((d1, d2) => {
			return d1.depth - d2.depth;
		});

		node.on('click', (e, d) => {
			if (this.mobile && !this.showSingleNode) {
				const sortedNodes = [...nodes].sort((a, b) => nodeRadius(b) - nodeRadius(a));
				const nodeIndex = sortedNodes.indexOf(d);
				if (nodeIndex != -1) {
					this.selectedNodeNumber = this.padStart(String(nodeIndex + 1));
				}
				this.selectedNode = d;
				this.showSingleNode = true;
				this.initD3();
				return;
			}

			// If area click is enabled and this is a top-level node (depth == 1),
			// emit the click event instead of showing description
			if (this.enableAreaClick() && d.depth === 1) {
				// Collect all leaf competency URIs that belong to this top-level area
				const competencyUris = this.collectCompetencyUris(d);
				const clickData: CompetencyAreaClickData = {
					areaName: d.name,
					areaConceptUri: d.concept_uri,
					studyLoad: d.studyLoad,
					competencyUris: competencyUris,
				};
				this.areaClick.emit(clickData);
				return;
			}

			// TODO: dynamically resize description popover, reposition if out of screen?

			if (d.description) {
				const others = svg
					.selectAll<SVGElement, ExtendedApiSkill>('g.leaf, g.group')
					.filter((d2) => d2.id != d.id);
				others.data().forEach((d2) => {
					d2.mouseover = false;
				});
				others.nodes().forEach((n) => {
					n.classList.remove('show-description');
				});

				const n = svg
					.selectAll<SVGElement, ExtendedApiSkill>('g.leaf, g.group')
					.filter((d2) => d2.id == d.id)
					.node();
				if (n.classList.contains('show-description')) {
					n.classList.remove('show-description');
					d.mouseover = false;
				} else {
					n.classList.add('show-description');
					d.mouseover = true;
				}

				// needed to reset node order?
				simulation.alphaTarget(0).restart();
			} else {
				const descriptionNodes = svg.selectAll<SVGElement, ExtendedApiSkill>('.show-description').nodes();
				for (const n of descriptionNodes) n.classList.remove('show-description');
			}
		});

		// Only add hover effects if not in compactMode
		if (!this.compactMode()) {
			node.on('mouseenter', (e, d) => {
				// find all node parents and links to toggle show
				let ancestors = [d.id];
				if (d.depth > 1) {
					ancestors = Array.from(d.ancestors.values());
				}
				// in case of multiple ancestors show all breadcrumb paths
				ancestors.forEach((id) => {
					d = this.skillTree.get(id);
					const children = svg
						.selectAll<SVGElement, ExtendedApiSkill>('g.leaf, g.group')
						.filter((d2) => d2.ancestors.has(d.id));
					const linkedIds = [d.id, ...children.data().map((c) => c.id)];
					children.nodes().forEach((n) => {
						n.classList.add('show');
					});
					const links = svg
						.selectAll<SVGElement, d3.HierarchyLink<ExtendedApiSkill>>('line')
						.filter((l) => [l.target.id, l.source.id].every((i) => linkedIds.includes(i)));
					links.nodes().forEach((n) => {
						n.classList.add('show');
					});
				});
			})
				.on('mouseout', (e, d) => {
					let ancestors = [d.id];
					if (d.depth > 1) {
						ancestors = Array.from(d.ancestors.values());
					}
					ancestors.forEach((id) => {
						d = this.skillTree.get(id);
						const children = svg
							.selectAll<SVGElement, ExtendedApiSkill>('g.leaf, g.group')
							.filter((d2) => d2.ancestors.has(d.id));
						const linkedIds = [d.id, ...children.data().map((c) => c.id)];
						children.nodes().forEach((n) => {
							n.classList.remove('show');
						});
						const links = svg
							.selectAll<SVGElement, d3.HierarchyLink<ExtendedApiSkill>>('line')
							.filter((l) => [l.target.id, l.source.id].every((i) => linkedIds.includes(i)));
						links.nodes().forEach((n) => {
							n.classList.remove('show');
						});
					});

					// hide all descriptions
					const descriptionNodes = svg.selectAll<SVGElement, ExtendedApiSkill>('.show-description').nodes();
					for (const n of descriptionNodes) n.classList.remove('show-description');
				});
		}

		// clear previous versions (on mobile change)
		const d3canvas = this.d3canvas();
		d3canvas.nativeElement.innerHTML = '';
		d3canvas.nativeElement.append(svg.node());
	}

	selectSkillForSingleView(skill: ExtendedApiSkill, index: number) {
		if (this.mobile) {
			// If area click is enabled, emit event instead of showing single view
			if (this.enableAreaClick() && skill.depth === 1) {
				const competencyUris = this.collectCompetencyUris(skill);
				const clickData: CompetencyAreaClickData = {
					areaName: skill.name,
					areaConceptUri: skill.concept_uri,
					studyLoad: skill.studyLoad,
					competencyUris: competencyUris,
				};
				this.areaClick.emit(clickData);
				return;
			}

			this.selectedNode = skill;
			this.showSingleNode = true;
			this.selectedNodeNumber = this.padStart(index);
			this.initD3();
		}
	}

	goBackToFullView() {
		this.showSingleNode = false;
		this.selectedNode = null;
		this.selectedNodeNumber = undefined;
		this.initD3();
	}

	padStart(str: string | number) {
		if (typeof str == 'number') {
			return String(str).padStart(2, '0');
		}
		return str.padStart(2, '0');
	}

	getFormattedSkillText(idx: number, name: string): string {
		return `<span class="tw-font-extrabold tw-mr-1">${this.padStart(idx + 1)}</span> ${name}`;
	}

	/**
	 * Collect all ESCO URIs of leaf competencies belonging to a top-level skill area.
	 * These URIs are needed for the backend to aggregate statistics.
	 */
	private collectCompetencyUris(topLevelSkill: ExtendedApiSkill): string[] {
		const uris: string[] = [];

		// Use the leafs array that was populated during data preparation
		if (topLevelSkill.leafs && topLevelSkill.leafs.length > 0) {
			for (const leafId of topLevelSkill.leafs) {
				const leaf = this.skillTree.get(leafId);
				if (leaf && leaf.concept_uri) {
					// Convert relative ESCO URI to full URI format
					const fullUri = leaf.concept_uri.startsWith('http')
						? leaf.concept_uri
						: `http://data.europa.eu${leaf.concept_uri}`;
					uris.push(fullUri);
				}
			}
		}

		return uris;
	}
}
