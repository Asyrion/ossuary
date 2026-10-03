/* The project's milestones on GitHub (the owner's ask, 2026-10-03): every milestone in docs/GDD.md's roadmap is a GitHub
   milestone of the same title ("M6 RPG growth"), open while it is being built and closed once it is finished (all its
   plan's steps built, its close included). A new milestone is created here when it is added to the roadmap; a finished one
   is closed here in the same commit that marks it built.

   Usage: npm run milestone -- list
          npm run milestone -- open "M9 Name" "Its goal, from the roadmap table" [docs/M9-plan.md]
          npm run milestone -- close M6
          npm run milestone -- reopen M6
   It calls the GitHub API with curl (in a cloud session the agent proxy signs the request; elsewhere set GITHUB_TOKEN).
   OSSUARY_REPO overrides the repository (default Asyrion/ossuary). */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const REPO = process.env.OSSUARY_REPO ?? 'Asyrion/ossuary', API = `https://api.github.com/repos/${REPO}/milestones`;
interface Milestone { number: number; title: string; state: 'open' | 'closed'; description: string | null; html_url: string }

function call(method: string, url: string, body?: object): unknown {
  const env = { ...process.env }; delete env.GH_TOKEN; // (a stale token in the session would override the proxy's)
  const args = ['-sS', '-X', method, '-H', 'Accept: application/vnd.github+json', '-H', 'Content-Type: application/json'];
  if (process.env.GITHUB_TOKEN) args.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);
  if (body) args.push('-d', JSON.stringify(body));
  const out = JSON.parse(execFileSync('curl', [...args, url], { encoding: 'utf8', env }));
  if (out && !Array.isArray(out) && out.message) throw new Error(`${method} ${url}: ${out.message}`);
  return out;
}
const all = () => call('GET', `${API}?state=all&per_page=100`) as Milestone[];
/** The milestone whose title is `id` or starts with `id ` ("M6" finds "M6 RPG growth"). */
function find(id: string) {
  const m = all().find(x => x.title === id || x.title.startsWith(id + ' '));
  if (!m) throw new Error(`no milestone "${id}" on ${REPO}`);
  return m;
}

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === 'list' || !cmd) for (const m of all()) console.log(`${m.state === 'open' ? '○' : '●'} #${m.number} ${m.title}`);
else if (cmd === 'open') {
  if (!a || !b) throw new Error('usage: npm run milestone -- open "M9 Name" "Its goal" [docs/M9-plan.md]');
  if (all().some(x => x.title === a)) throw new Error(`"${a}" is there already`);
  const plan = c ?? `docs/${a.split(' ')[0]}-plan.md`;
  const m = call('POST', API, { title: a, description: `${b}.${existsSync(plan) ? ` Plan: ${plan}.` : ''} Scope: docs/GDD.md, Roadmap and milestones.` }) as Milestone;
  console.log(`created #${m.number} ${m.title} ${m.html_url}`);
} else if (cmd === 'close' || cmd === 'reopen') {
  if (!a) throw new Error(`usage: npm run milestone -- ${cmd} M6`);
  const m = find(a), state = cmd === 'close' ? 'closed' : 'open';
  call('PATCH', `${API}/${m.number}`, { state });
  console.log(`${state} #${m.number} ${m.title}`);
} else throw new Error(`unknown command "${cmd}": list, open, close or reopen`);
