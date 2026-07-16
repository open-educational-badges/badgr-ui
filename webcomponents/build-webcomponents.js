#!/usr/bin/env node
import { execSync } from 'child_process';

// first argument after '--' is the environment (production|staging|develop)
const env = process.argv[2];
if (!env) {
	console.error('Usage: npm run build:web-components -- <environment>');
	process.exit(1);
}

// optional second argument is the component name; if omitted we run the generic build
const component = process.argv[3];

// map of components to build
const components = [
	'oeb-version',
	'oeb-skill-visualisation',
	'oeb-badge-creation',
	'oeb-earned-badges-overview',
	'oeb-competency-overview',
	'oeb-learningpaths-overview',
	'oeb-backpack',
	'oeb-dashboard',
];

if (component && !components.includes(component)) {
	console.error(`No component named  ${component}`);
	process.exit(1);
} else if (component) {
	execSync(`ng build web-components-cli --configuration ${component},${env}`, { stdio: 'inherit' });
	process.exit(0);
}

for (let c of components) execSync(`ng build web-components-cli --configuration ${c},${env}`, { stdio: 'inherit' });
