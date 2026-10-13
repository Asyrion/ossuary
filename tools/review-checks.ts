/* The mechanical part of a review against the project's rules (the rules reviewer's tool,
   .claude/agents/rules-reviewer.md): what a script can find in a diff, so the reviewer reads only what it flags
   and the code it changed. Rule numbers are the reviewer's checklist.

   Usage: npm run review-checks -- [range] [--no-tests]
     range        the commits to review (default origin/main...HEAD); uncommitted changes are included
     --no-tests   skip the typecheck and unit tests (when they have just been run) */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2),
  noTests = args.includes('--no-tests');
const range = args.find((a) => !a.startsWith('--')) ?? 'origin/main...HEAD';
const sh = (cmd: string) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }).trim();
  } catch (e) {
    return String((e as { stdout?: string }).stdout ?? '').trim();
  }
};
const found: Record<string, string[]> = {};
const flag = (rule: string, text: string) => (found[rule] ??= []).push(text);
const CAP = 12; // at most this many hints per rule; the reviewer reads the diff for the rest

// the diff: every added line with its file and line number (committed range and the working tree)
const base = range.includes('...')
  ? sh(`git merge-base ${range.split('...')[0]} ${range.split('...')[1] || 'HEAD'}`)
  : range.split('..')[0];
const files = sh(`git diff --name-only ${base}`).split('\n').filter(Boolean);
const added: { file: string; line: number; text: string }[] = [];
let file = '',
  line = 0;
for (const l of sh(`git diff -U0 ${base}`).split('\n')) {
  if (l.startsWith('+++ ')) file = l.slice(6);
  else if (l.startsWith('@@')) line = +(/\+(\d+)/.exec(l)?.[1] ?? 0);
  else if (l.startsWith('+')) added.push({ file, line: line++, text: l.slice(1) });
}
const newFiles = sh(`git diff --name-only --diff-filter=A ${base}`).split('\n').filter(Boolean);
const where = (a: { file: string; line: number }) => `${a.file}:${a.line}`;
const src = (a: { file: string }) => a.file.startsWith('src/');

// 10. commits: the attribution lines, no model names or ids elsewhere, no scratch files or screenshots
const MODEL = /\bclaude[- ](opus|sonnet|haiku|fable)|\b(opus|sonnet|haiku) \d|\bclaude-\w+-\d/i;
for (const hash of sh(`git log --format=%H ${range}`).split('\n').filter(Boolean)) {
  const msg = sh(`git log -1 --format=%B ${hash}`),
    subject = msg.split('\n')[0];
  if (!/^Co-Authored-By: .+$/m.test(msg) || !/^Claude-Session: https:\/\/claude\.ai\/code\/\S+$/m.test(msg))
    flag('10', `${hash.slice(0, 7)} "${subject}" lacks the Co-Authored-By or Claude-Session line`);
  const body = msg
    .split('\n')
    .filter((l) => !l.startsWith('Co-Authored-By:'))
    .join('\n');
  if (MODEL.test(body)) flag('10', `${hash.slice(0, 7)} "${subject}" names a model outside the attribution line`);
}
for (const f of files)
  if (
    /\.tmp\./.test(f) ||
    (/\.(png|jpe?g)$/.test(f) && !f.startsWith('public/') && !f.startsWith('tests/fixtures/')) ||
    f.startsWith('test-results/')
  )
    flag('10', `${f}: a scratch file or screenshot in the change`);

// 9. data files stay valid JSON
for (const f of files.filter((f) => f.endsWith('.json') && existsSync(f))) {
  try {
    JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    flag('9', `${f}: not valid JSON (${(e as Error).message})`);
  }
}

// 3. player-facing strings outside strings.ts
for (const a of added.filter((a) => src(a) && !a.file.endsWith('strings.ts')))
  if (
    /\b(toast|banner|showLore|showPrompt)\(\s*['"`][A-Za-z]/.test(a.text) ||
    /\.(textContent|innerHTML|title)\s*=\s*['"`][A-Z][a-z]+ [a-z]/.test(a.text)
  )
    flag('3', `${where(a)}: text on screen written in code: ${a.text.trim().slice(0, 90)}`);

// 2. numbers in logic: comparisons, timers and chances with literal fractions outside config and data
for (const a of added.filter((a) => src(a) && !/config\.ts$|Data\.ts$|strings\.ts$/.test(a.file))) {
  const t = a.text.replace(/\/\/.*$/, '');
  if (
    /(Geometry|Material|position\.set|scale\.set|rotation|\.add\(|glow\(|burst\(|blob\(|mesh\(|Color|0x[0-9a-f]+)/i.test(
      t,
    )
  )
    continue; // looks: small sizes and colours are fine
  if (/([<>]=?|[*/] |Math\.random\(\) <)\s*\d*\.\d+|\bafter\(\s*\d|\bsetTimeout\([^,]+,\s*\d/.test(t))
    flag('2', `${where(a)}: ${t.trim().slice(0, 100)}`);
}

// 6. materials and geometries made where things are made often: shared, or disposed
for (const a of added.filter(src))
  if (
    /new THREE\.\w+(Material|Geometry)\(/.test(a.text) &&
    !/markShared|shared\(|userData\.shared|geo\(|std\(/.test(a.text)
  )
    flag(
      '6',
      `${where(a)}: a new material or geometry not marked shared (fine if it is disposed with its object): ${a.text.trim().slice(0, 90)}`,
    );

// 11 and 9. new dev hooks and new source files named in the docs (docs/architecture.md says where things are)
const claude = ['CLAUDE.md', 'docs/architecture.md']
  .map((f) => (existsSync(f) ? readFileSync(f, 'utf8') : ''))
  .join('\n');
const hooksAdded = added.filter((a) => a.file === 'src/dev/hooks.ts');
for (const a of hooksAdded) {
  if (!/^\s{4}\S/.test(a.text)) continue; // (the hooks sit four spaces in, one or more to a line)
  for (const m of a.text.matchAll(/(?:^|[,{]\s*)(?:get\s+)?(\w+)(?:\s*\(|\s*:)/g))
    if (
      !['get', 'set', 'return', 'x', 'z', 'kind', 'spell', 'text'].includes(m[1]) &&
      !claude.includes(`__game.${m[1]}`) &&
      !claude.includes(`\`${m[1]}`)
    )
      flag('11', `${where(a)}: hook "${m[1]}" is not in docs/architecture.md (if it is a __game hook)`);
}
for (const f of newFiles.filter((f) => f.startsWith('src/') || f.startsWith('tools/'))) {
  const name = f.split('/').pop()!;
  if (!claude.includes(name)) flag('9', `${f}: new file not mentioned in docs/architecture.md`);
}
if (
  files.some((f) => f.startsWith('src/') || f.startsWith('data/')) &&
  !files.some((f) => f.startsWith('docs/') || f === 'CLAUDE.md')
)
  flag('9', 'code or data changed but no doc did (GDD, docs/architecture.md, the plan)');

// 1. the dev menu: new features, but dev/menu.ts untouched
const newExports = added.filter(
  (a) => /^src\/(world|items|magic|combat|actors)\//.test(a.file) && /^export function \w+/.test(a.text),
);
if (newExports.length && !files.includes('src/dev/menu.ts'))
  flag(
    '1',
    `${newExports.length} new exported functions (${newExports
      .slice(0, 4)
      .map((a) => a.text.match(/function (\w+)/)?.[1])
      .join(', ')}...) but dev/menu.ts is untouched: check new features have an entry`,
  );

// 8. tests: code without tests, and tests that depend on luck
if (files.some((f) => /^src\/.*\.ts$/.test(f)) && !files.some((f) => f.startsWith('tests/')))
  flag('8', 'src/ changed but no test did');
for (const a of added.filter((a) => a.file.startsWith('tests/'))) {
  if (/Math\.random\(/.test(a.text)) flag('8', `${where(a)}: a test using Math.random`);
  if (/\?room=[\w&=]+['"`]/.test(a.text) && !/seed=/.test(a.text) && /calls|count|toBe\(\d/.test(a.text))
    flag('8', `${where(a)}: a measured room without a fixed seed`);
}

// 4. lore to read: new lore and names in data and strings (the reviewer reads these against the lore limits)
const lore = added.filter(
  (a) =>
    (/^data\/.*\.json$/.test(a.file) && /"(lore|name|text)"\s*:/.test(a.text)) ||
    (a.file === 'src/strings.ts' && /['"`][A-Z][^'"`]{12,}/.test(a.text)),
);
for (const a of lore) flag('4', `${where(a)}: ${a.text.trim().slice(0, 110)}`);

// the typecheck and the unit tests
let tests = 'skipped (--no-tests)';
if (!noTests) {
  const tsc = sh('npx tsc --noEmit -p . 2>&1');
  const vitest = sh('npx vitest run 2>&1 | tail -6');
  tests = `typecheck: ${tsc ? `errors\n${tsc.split('\n').slice(0, 10).join('\n')}` : 'clean'}; unit tests: ${/Tests\s+(.+)/.exec(vitest)?.[1] ?? vitest.split('\n').slice(-3).join(' ')}`;
}

// lint and format, on the changed code only (CI runs both over everything)
const code = files.filter((f) => /\.(ts|js)$/.test(f) && existsSync(f)).join(' ');
let style = 'no code changed';
if (code) {
  const eslint = 'tools/lint/node_modules/eslint/bin/eslint.js';
  const lint = existsSync(eslint)
    ? sh(`node ${eslint} ${code} 2>&1`) || 'clean'
    : 'not installed (npm run lint:install)';
  const unformatted = sh(`npx prettier --list-different ${code} 2>&1`);
  style = `lint: ${lint.split('\n').slice(0, 10).join('\n')}; format: ${unformatted ? `not formatted: ${unformatted.split('\n').join(' ')}` : 'clean'}`;
}

// the report
console.log(`review checks for ${range} (${files.length} files, ${added.length} lines added)`);
const order = ['1', '2', '3', '4', '6', '8', '9', '10', '11'];
for (const r of order) {
  const list = found[r];
  if (!list?.length) continue;
  console.log(`rule ${r}: ${list.length} hint${list.length > 1 ? 's' : ''}`);
  for (const h of list.slice(0, CAP)) console.log(`  ${h}`);
  if (list.length > CAP) console.log(`  ...and ${list.length - CAP} more`);
}
if (!Object.keys(found).length) console.log('no hints');
console.log(tests);
console.log(style);
console.log(
  `files for the adversarial read (rule 12): ${files.filter((f) => /^(src|tools)\/.*\.ts$/.test(f)).join(' ') || 'none'}`,
);
