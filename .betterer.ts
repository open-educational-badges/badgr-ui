import { typescript } from '@betterer/typescript';
import type { CompilerOptions } from 'typescript';

// Incremental TypeScript `strict` adoption ratchet.
//
// Each test below enables one strict-mode flag (or a bundle of cheap ones) on
// top of the production tsconfig and records the current error count in
// `.betterer.results`. The count can only go *down*: betterer fails CI if a
// change introduces new violations for any flag. Follow-up tickets burn each
// number down to zero, after which the flag can be promoted into
// `tsconfig.json` and its betterer test removed.
//
// We extend `tsconfig.app.json` so spec files are excluded (it already excludes
// `src/**/*.spec.ts`), matching how the baseline counts were measured.
const TSCONFIG = './tsconfig.app.json';
const INCLUDE = './src/**/*.ts';
const EXCLUDE = /\.spec\.ts$/;

// `noEmit` keeps betterer's type-check from writing compiled output to the
// tsconfig's `outDir` (./out-tsc). Each test gets only its one flag on top.
const ratchet = (flags: CompilerOptions) =>
	typescript(TSCONFIG, { noEmit: true, ...flags })
		.include(INCLUDE)
		.exclude(EXCLUDE);

export default {
	'strict: strictNullChecks': () => ratchet({ strictNullChecks: true }),

	'strict: noImplicitAny': () => ratchet({ noImplicitAny: true }),

	// strictPropertyInitialization only takes effect when strictNullChecks is
	// also enabled, so we turn both on and measure the incremental cost.
	'strict: strictPropertyInitialization': () =>
		ratchet({ strictNullChecks: true, strictPropertyInitialization: true }),

	// Bundle of cheap flags (few or zero violations each) rolled out together.
	'strict: cheap flags': () =>
		ratchet({
			strictFunctionTypes: true,
			strictBindCallApply: true,
			noImplicitThis: true,
			useUnknownInCatchVariables: true,
			noFallthroughCasesInSwitch: true,
		}),

	'lint: noUnusedLocals': () => ratchet({ noUnusedLocals: true }),
};
