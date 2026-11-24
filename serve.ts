// A tiny static server for game/ (Node 22, standard library only), so the
// entry can be played locally without a build step:
//   node serve.ts [--port 8080]
// Serves game/ on http://localhost:8080. It sends the MIME types a browser
// game needs, refuses any path outside game/, and otherwise does nothing
// clever: a development convenience, not a web server for the internet.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const safe = normalize(join(root, raw === '/' ? 'index.html' : raw));
  if (!safe.startsWith(root + sep) && safe !== root) { res.writeHead(403); res.end(); return; }
  let st;
  try { st = statSync(safe); } catch { res.writeHead(404); res.end(); return; }
  if (!st.isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(safe)] || 'application/octet-stream' });
  createReadStream(safe).pipe(res);
}).listen(port, () => console.log('serving game/ on http://localhost:' + port));
