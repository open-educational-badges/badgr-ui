// TypeScript strict-mode ratchet (count-based).
//
// Type-checks src (specs excluded) with individual strict-mode flags enabled on
// top of tsconfig.app.json and compares the *number* of errors per flag against
// a committed baseline in typecheck-baseline.json.
//
// The count can only go down: CI fails if any flag's error count increases,
// which is what stops new type errors from being added. Because it tracks only
// the count — not the line/column of each error — edits that merely shift lines
// in files with existing errors do NOT trip it, so unrelated PRs pay no tax.
//
//   node scripts/typecheck-ratchet.mjs            # check against baseline (CI)
//   node scripts/typecheck-ratchet.mjs --update   # rewrite the baseline
//
// Follow-up tickets burn a flag's count down to zero, run --update to lock it
// in, then promote the flag into tsconfig.json and drop it from FLAG_SETS here.

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TSCONFIG = path.join(ROOT, 'tsconfig.app.json');
const BASELINE = path.join(ROOT, 'typecheck-baseline.json');

// One entry per flag (or bundle) we plan to roll out. strictPropertyInitialization
// is inert without strictNullChecks, so it enables both.
const FLAG_SETS = {
	strictNullChecks: { strictNullChecks: true },
	noImplicitAny: { noImplicitAny: true },
	strictPropertyInitialization: { strictNullChecks: true, strictPropertyInitialization: true },
	// Cheap flags (few or zero errors each) rolled out as one bundle.
	cheapFlags: {
		strictFunctionTypes: true,
		strictBindCallApply: true,
		noImplicitThis: true,
		useUnknownInCatchVariables: true,
		noFallthroughCasesInSwitch: true,
	},
	noUnusedLocals: { noUnusedLocals: true },
};

function parseBaseConfig() {
	const parsed = ts.getParsedCommandLineOfConfigFile(
		TSCONFIG,
		{},
		{
			...ts.sys,
			onUnRecoverableConfigFileDiagnostic: (d) => {
				throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
			},
		},
	);
	if (!parsed) throw new Error(`Could not read ${TSCONFIG}`);
	return parsed;
}

function countErrors(extraOptions) {
	const parsed = parseBaseConfig();
	const program = ts.createProgram({
		rootNames: parsed.fileNames,
		options: { ...parsed.options, ...extraOptions, noEmit: true },
	});
	let count = 0;
	for (const d of ts.getPreEmitDiagnostics(program)) {
		const file = d.file?.fileName;
		// Only count real errors in src, excluding spec files. Global/option
		// diagnostics (no file) are ignored so they can't inflate the baseline.
		if (!file) continue;
		if (!file.includes('/src/')) continue;
		if (file.endsWith('.spec.ts')) continue;
		count++;
	}
	return count;
}

const update = process.argv.includes('--update');
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};

const current = {};
for (const [name, flags] of Object.entries(FLAG_SETS)) {
	current[name] = countErrors(flags);
}

if (update) {
	fs.writeFileSync(BASELINE, JSON.stringify(current, null, '\t') + '\n');
	console.log('Updated typecheck-baseline.json:');
	for (const [name, n] of Object.entries(current)) console.log(`  ${name}: ${n}`);
	process.exit(0);
}

let regressed = false;
let improved = false;
for (const name of Object.keys(FLAG_SETS)) {
	const base = baseline[name] ?? Infinity;
	const cur = current[name];
	if (cur > base) {
		regressed = true;
		console.error(`✗ ${name}: ${base} → ${cur}  (+${cur - base} new error${cur - base === 1 ? '' : 's'})`);
	} else if (cur < base) {
		improved = true;
		console.log(`↓ ${name}: ${base} → ${cur}  (${base - cur} fewer 🎉)`);
	} else {
		console.log(`✓ ${name}: ${cur}`);
	}
}

if (regressed) {
	console.error('\nNew type errors were introduced. Fix them before merging.');
	console.error('If the increase is genuinely intended, run: npm run typecheck:update');
	process.exit(1);
}
if (improved) {
	console.log(
		'\nType errors decreased. Run `npm run typecheck:update` and commit typecheck-baseline.json to lock in the lower baseline.',
	);
}
console.log('\nNo new type errors. ✅');
process.exit(0);
