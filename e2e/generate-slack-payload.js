const fs = require('fs');

const results = JSON.parse(fs.readFileSync('./test-results/results.json', 'utf8'));
const environment = process.env.ENVIRONMENT || 'unknown';
const runUrl = process.env.RUN_URL || '';
const reportUrl = process.env.REPORT_URL || '';
const startTime = parseInt(process.env.START_TIME || '0', 10);
const durationSec = startTime ? Math.round(Date.now() / 1000 - startTime) : null;
const duration = durationSec
	? durationSec >= 60
		? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
		: `${durationSec}s`
	: null;

const fileCategories = {
	'badge-participation.spec.ts': 'Badge creation & issuance',
	'badge-competency.spec.ts': 'Badge creation & issuance',
	'badge-learning-path.spec.ts': 'Badge creation & issuance',
	'badge-edit.spec.ts': 'Badge editing',
	'badge-copy.spec.ts': 'Badge copying',
	'badge-details.spec.ts': 'Badge detail verification',
};

function getSpecs(suite) {
	return [...(suite.specs || []), ...(suite.suites || []).flatMap(getSpecs)];
}

const allSpecs = results.suites.flatMap(getSpecs);
const failCount = allSpecs.filter((s) => !s.ok).length;
const durationLabel = duration ? ` _(${duration})_` : '';
const header =
	failCount === 0
		? `✅ All test cases passed on *${environment}*${durationLabel}`
		: `❌ ${failCount} test(s) failed on *${environment}*${durationLabel}`;

const lines = [header, ''];

const grouped = {};
for (const suite of results.suites) {
	const category = fileCategories[suite.title] || suite.title;
	const specs = getSpecs(suite);
	if (!specs.length) continue;
	if (!grouped[category]) grouped[category] = [];
	grouped[category].push(...specs);
}

for (const [category, specs] of Object.entries(grouped)) {
	lines.push(`*${category}*`);
	for (const spec of specs) {
		const annotations = spec.tests?.[0]?.annotations || [];
		const badgeUrl = annotations.find((a) => a.type === 'badge-url')?.description;
		const suffix = badgeUrl ? ` · <${badgeUrl}|Badge ansehen>` : '';
		lines.push(`${spec.ok ? '✅' : '❌'} ${spec.title}${suffix}`);
	}
	lines.push('');
}

if (reportUrl) {
	lines.push(`<${runUrl}|View run> · <${reportUrl}|View report>`);
} else {
	lines.push(`<${runUrl}|View run & download report>`);
}

fs.writeFileSync('slack-payload.json', JSON.stringify({ text: lines.join('\n') }));
