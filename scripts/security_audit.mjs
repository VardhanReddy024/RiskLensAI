import { spawnSync } from 'node:child_process';

const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--audit-level=high', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  stdio: ['ignore', 'pipe', 'pipe'],
});

let report;
try {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  report = JSON.parse(start >= 0 && end > start ? output.slice(start, end + 1) : '');
} catch {
  console.error(result.stderr || result.stdout || 'npm audit did not return JSON');
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const names = Object.keys(vulnerabilities);
const acceptedXlsx = names.length === 1 && names[0] === 'xlsx' && vulnerabilities.xlsx.severity === 'high';

if (acceptedXlsx) {
  console.warn('Accepted documented exception: xlsx has no upstream fix. Excel parsing is bounded by MAX_UPLOAD_BYTES and MAX_WORKSHEET_ROWS.');
  process.exit(0);
}

if (names.length > 0) {
  console.error(`Unexpected audit vulnerabilities: ${names.join(', ')}`);
  process.exit(1);
}

process.exit(0);
