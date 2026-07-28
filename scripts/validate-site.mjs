import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const publicPages = [
  ['index.html', 'https://zetazero.top/'],
  ['about.html', 'https://zetazero.top/about'],
  ['blog/2026/05/04/hello-world/index.html', 'https://zetazero.top/blog/2026/05/04/hello-world/'],
  ['blog/2026/05/04/building-with-github-pages/index.html', 'https://zetazero.top/blog/2026/05/04/building-with-github-pages/'],
  ['blog/2026/06/01/building-with-impeccable/index.html', 'https://zetazero.top/blog/2026/06/01/building-with-impeccable/'],
  ['blog/2026/06/01/things-obsidian-sync-workflow/index.html', 'https://zetazero.top/blog/2026/06/01/things-obsidian-sync-workflow/'],
  ['blog/2026/07/12/one-password-as-my-security-home/index.html', 'https://zetazero.top/blog/2026/07/12/one-password-as-my-security-home/']
];
const errors = [];

const read = (file) => readFileSync(resolve(root, file), 'utf8');
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) errors.push(message);
};

for (const [file, canonical] of publicPages) {
  const html = read(file);
  requireMatch(html, /<meta name="description" content="[^"]+">/, `${file}: missing description`);
  requireMatch(html, /<meta http-equiv="Content-Security-Policy"/, `${file}: missing CSP`);
  requireMatch(html, /<meta property="og:title"/, `${file}: missing Open Graph title`);
  requireMatch(html, /<meta property="og:description"/, `${file}: missing Open Graph description`);
  requireMatch(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`), `${file}: incorrect canonical URL`);
  requireMatch(html, /rel="alternate" type="application\/atom\+xml"/, `${file}: missing feed discovery`);
  requireMatch(html, /assets\/css\/style\.css\?v=19/, `${file}: stale stylesheet version`);

  if (/(fonts\.googleapis|fonts\.gstatic)/i.test(html)) {
    errors.push(`${file}: contains a remote font dependency`);
  }

  const hasControls = /id="theme-toggle"|class="lang-toggle"/.test(html);
  if ((file === 'index.html') !== hasControls) {
    errors.push(`${file}: theme/language controls are outside their intended homepage scope`);
  }
  if (file !== 'index.html') {
    requireMatch(html, /<script src="\/assets\/js\/article\.js"><\/script>/, `${file}: missing shared article behavior`);
  }
}

for (const file of [...publicPages.map(([name]) => name), '404.html', 'p/k7x9m2/index.html']) {
  const html = read(file);
  const inlineExecutableScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*\btype="text\/plain")[^>]*>/gi)];
  if (inlineExecutableScripts.length) errors.push(`${file}: contains executable inline JavaScript`);

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (!reference.startsWith('/') || reference.startsWith('//')) continue;
    const clean = reference.split(/[?#]/, 1)[0];
    if (!clean || clean === '/about' || clean.endsWith('/')) continue;
    if (!existsSync(resolve(root, clean.slice(1)))) errors.push(`${file}: missing local target ${clean}`);
  }
}

const feed = read('feed.xml');
const sitemap = read('sitemap.xml');
if ((feed.match(/<entry>/g) || []).length !== 5) errors.push('feed.xml: expected five post entries');
if ((sitemap.match(/<url>/g) || []).length !== 7) errors.push('sitemap.xml: expected seven public URLs');
if (/\/p\//.test(feed) || /\/p\//.test(sitemap)) errors.push('feed or sitemap exposes the protected route');

const access = read('assets/js/access.js');
const privateShell = read('p/k7x9m2/index.html');
const ciphertext = read('p/k7x9m2/data.bin').trim();
requireMatch(access, /PBKDF2_ITERATIONS\s*=\s*600000/, 'access.js: expected hardened PBKDF2 iteration count');
requireMatch(access, /SALT_HEX\s*=\s*'[0-9a-f]{32}'/, 'access.js: expected a 128-bit hexadecimal salt');
if (/VERIFIER|100000/.test(access)) errors.push('access.js: obsolete public verifier or KDF settings remain');
requireMatch(privateShell, /id="payload-iv"/, 'private shell: missing payload IV');
requireMatch(privateShell, /\/assets\/js\/pako\.min\.js/, 'private shell: compressed payload runtime is not local');
requireMatch(privateShell, /\/assets\/js\/private-loader\.js/, 'private shell: missing external loader');
const iv = privateShell.match(/id="payload-iv" type="text\/plain">([^<]+)</)?.[1] || '';
if (Buffer.from(iv, 'base64').byteLength !== 12) errors.push('private shell: expected a 96-bit AES-GCM IV');
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(ciphertext) || Buffer.from(ciphertext, 'base64').byteLength < 17) {
  errors.push('data.bin: invalid encrypted payload');
}

if (errors.length) {
  console.error(`Site validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site validation passed: ${publicPages.length} public pages, 5 feed entries, 7 sitemap URLs.`);
