/* Ossuary's dev board: a local web page to browse, create, edit and delete the game's content in data/ (artifacts, foes,
   floors, spells, runes, boons, potions, themes, room templates, tuning), checked by the game's own validators after every
   save. Node's standard library only; the page is plain HTML and JS in tools/devboard/public/.

   Run:  npm run devboard                     then open http://127.0.0.1:8770
         npm run devboard -- --port 9000 --open --game http://127.0.0.1:5173/

   Listens on 127.0.0.1 only; refuses other Host headers (DNS rebinding) and writes without JSON plus the X-Dev-Board
   header (so another web page can't post to it). One instance serves every session: check it answers before starting. */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BadRequest, Conflict, Content } from './content';
import { KINDS } from './kinds';
import { hints, unions } from './schema';
import type { Json } from './jsonspan';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ROOT = resolve(opt('--root', join(HERE, '../..')));
const PORT = Number(opt('--port', '8770'));
const GAME = opt('--game', 'http://127.0.0.1:5173/');
const content = new Content(ROOT);

// ---------------- validation (the game's validators, in a fresh process) ----------------

interface Validation { ok: boolean; checks: { name: string; errors: string[] }[]; at: number; sig: string; error?: string }
let validation: Validation | null = null, running: Promise<Validation> | null = null;

function validate(): Promise<Validation> {
  if (running) return running;
  const sig = content.signature();
  running = new Promise<Validation>(done => {
    const p = spawn(process.execPath, ['--import', 'tsx', join(HERE, 'validate.ts')], { cwd: ROOT });
    let out = '', err = '';
    const timer = setTimeout(() => p.kill(), 60000);
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('close', () => {
      clearTimeout(timer);
      const line = out.split('\n').find(l => l.startsWith('VALIDATE_JSON '));
      const v: Validation = line ? { ...JSON.parse(line.slice(14)), at: Date.now(), sig }
        : { ok: false, checks: [], at: Date.now(), sig, error: (err || out || 'the validator printed nothing').trim().split('\n').slice(0, 12).join('\n') };
      validation = v; running = null; done(v);
    });
  });
  return running;
}

// ---------------- HTTP ----------------

const send = (res: ServerResponse, code: number, body: unknown, type = 'application/json') => {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(data);
};

const hostOk = (req: IncomingMessage) => ['127.0.0.1', 'localhost'].includes((req.headers.host ?? '').replace(/:\d+$/, ''));

function body(req: IncomingMessage): Promise<Record<string, Json>> {
  if (req.headers['x-dev-board'] !== '1' || !(req.headers['content-type'] ?? '').startsWith('application/json'))
    return Promise.reject(new Forbidden());
  return new Promise((ok, fail) => {
    let s = '';
    req.on('data', d => { s += d; if (s.length > 2e6) req.destroy(); });
    req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { fail(new BadRequest('bad JSON')); } });
  });
}
class Forbidden extends Error {}

const STATIC: Record<string, string> = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
const TYPES: Record<string, string> = { html: 'text/html', js: 'text/javascript', css: 'text/css' };

async function handle(req: IncomingMessage, res: ServerResponse) {
  if (!hostOk(req)) return send(res, 403, { error: 'bad host' });
  const url = new URL(req.url ?? '/', 'http://127.0.0.1'), path = url.pathname;
  if (req.method === 'GET') {
    const file = STATIC[path];
    if (file) return send(res, 200, readFileSync(join(HERE, 'public', file)), TYPES[file.split('.').pop()!]);
    if (path === '/api/state') {
      const sig = content.signature();
      if (!validation || validation.sig !== sig) void validate();
      return send(res, 200, { sig, validation, validating: !!running, undo: content.undoList() });
    }
    if (path === '/api/content') {
      const kinds: Record<string, unknown> = {}, errors: string[] = [];
      for (const [name, k] of Object.entries(KINDS)) {
        const r = content.entries(name);
        kinds[name] = { ...k, entries: r.entries };
        errors.push(...r.errors);
      }
      return send(res, 200, { sig: content.signature(), kinds, errors, unions: unions(ROOT), hints: hints(ROOT), game: GAME });
    }
    if (path === '/api/refs') {
      return send(res, 200, content.references(url.searchParams.get('kind') ?? '', url.searchParams.get('id') ?? ''));
    }
    return send(res, 404, { error: 'not found' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const d = await body(req);
  const str = (k: string) => String(d[k] ?? ''), num = (k: string) => Number(d[k] ?? 0);
  const routes: Record<string, () => unknown> = {
    '/api/save': () => content.save(str('kind'), num('src'), str('key'), d.data, str('hash'), d.newKey ? str('newKey') : undefined),
    '/api/preview': () => content.preview(str('kind'), num('src'), str('key'), d.data, str('hash'), d.newKey ? str('newKey') : undefined),
    '/api/create': () => content.create(str('kind'), num('src'), d.data, d.key ? str('key') : undefined, d.like != null ? str('like') : undefined),
    '/api/delete': () => content.remove(str('kind'), num('src'), str('key'), str('hash')),
    '/api/undo': () => content.undo(num('i')),
    '/api/validate': () => null,
  };
  const fn = routes[path];
  if (!fn) return send(res, 404, { error: 'not found' });
  const result = fn();
  const v = path === '/api/preview' ? null : await validate();
  send(res, 200, { ok: true, result, validation: v });
}

const server = createServer((req, res) => {
  handle(req, res).catch((e: unknown) => {
    const code = e instanceof Forbidden ? 403 : e instanceof Conflict ? 409 : e instanceof BadRequest ? 400 : 500;
    const msg = e instanceof Forbidden ? 'Write refused (needs a JSON request from the dev board page).' : (e as Error).message;
    if (!res.headersSent) send(res, code, { error: msg });
  });
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.on('error', (e: NodeJS.ErrnoException) => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is taken: the dev board is probably running already (http://127.0.0.1:${PORT}).` : e.message);
    process.exit(1);
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Ossuary dev board on http://127.0.0.1:${PORT}  (data: ${join(ROOT, 'data')})  Ctrl+C stops it.`);
    if (args.includes('--open')) {
      const u = `http://127.0.0.1:${PORT}/`;
      const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', u]] : process.platform === 'darwin' ? ['open', [u]] : ['xdg-open', [u]];
      spawn(cmd[0] as string, cmd[1] as string[], { stdio: 'ignore', detached: true }).on('error', () => undefined).unref();
    }
  });
}

export { server, content };
