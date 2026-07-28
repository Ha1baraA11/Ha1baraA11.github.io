import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const siteOrigin = 'https://zetazero.top';
const discoverIndexFiles = (directory) => {
  const files = [];
  const visit = (current) => {
    for (const entry of readdirSync(resolve(root, current), { withFileTypes: true })) {
      const next = resolve(root, current, entry.name);
      if (entry.isDirectory()) {
        visit(relative(root, next));
      } else if (entry.name === 'index.html') {
        files.push(relative(root, next).split(sep).join('/'));
      }
    }
  };
  visit(directory);
  return files.sort();
};

const postPages = discoverIndexFiles('blog');
const canonicalFor = (file) => `${siteOrigin}/${dirname(file).split(sep).join('/')}/`;
const publicPages = [
  ['index.html', `${siteOrigin}/`],
  ['about.html', `${siteOrigin}/about`],
  ...postPages.map((file) => [file, canonicalFor(file)])
];
const errors = [];

const read = (file) => readFileSync(resolve(root, file), 'utf8');
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) errors.push(message);
};
const compareSets = (actual, expected, label) => {
  for (const value of expected) {
    if (!actual.has(value)) errors.push(`${label}: missing ${value}`);
  }
  for (const value of actual) {
    if (!expected.has(value)) errors.push(`${label}: unexpected ${value}`);
  }
};

const index = read('index.html');
const styleVersion = index.match(/assets\/css\/style\.css\?v=(\d+)/)?.[1];
if (!styleVersion) errors.push('index.html: missing versioned shared stylesheet');

for (const [file, canonical] of publicPages) {
  const html = read(file);
  requireMatch(html, /<meta name="description" content="[^"]+">/, `${file}: missing description`);
  requireMatch(html, /<meta http-equiv="Content-Security-Policy"/, `${file}: missing CSP`);
  requireMatch(html, /<meta property="og:title"/, `${file}: missing Open Graph title`);
  requireMatch(html, /<meta property="og:description"/, `${file}: missing Open Graph description`);
  requireMatch(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`), `${file}: incorrect canonical URL`);
  requireMatch(html, /rel="alternate" type="application\/atom\+xml"/, `${file}: missing feed discovery`);
  requireMatch(html, new RegExp(`assets/css/style\\.css\\?v=${styleVersion}`), `${file}: stale stylesheet version`);
  requireMatch(html, /class="skip-link" href="#main-content"/, `${file}: missing skip link`);
  requireMatch(html, /<main id="main-content"/, `${file}: missing main-content target`);
  requireMatch(html, /class="site-title"/, `${file}: missing semantic site title`);
  const navigation = html.match(/<nav>[\s\S]*?<\/nav>/i)?.[0] || '';
  if (/<h1>/i.test(navigation)) errors.push(`${file}: navigation must not create a second h1`);

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

  const tableCount = (html.match(/<table>/g) || []).length;
  const tableWrapperCount = (html.match(/class="table-scroll"/g) || []).length;
  if (tableCount !== tableWrapperCount) errors.push(`${file}: every table needs a scroll container`);

  if (postPages.includes(file)) {
    const structuredDataSource = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (!structuredDataSource) {
      errors.push(`${file}: missing BlogPosting structured data`);
    } else {
      try {
        const structuredData = JSON.parse(structuredDataSource);
        if (structuredData['@type'] !== 'BlogPosting') errors.push(`${file}: structured data is not BlogPosting`);
        if (structuredData.mainEntityOfPage !== canonical) errors.push(`${file}: structured data URL does not match canonical`);
        const published = html.match(/<meta property="article:published_time" content="([^"]+)">/)?.[1];
        if (structuredData.datePublished !== published) errors.push(`${file}: structured data date does not match published time`);
      } catch {
        errors.push(`${file}: invalid JSON-LD`);
      }
    }
  }
}

const notFoundPage = read('404.html');
requireMatch(notFoundPage, new RegExp(`assets/css/style\\.css\\?v=${styleVersion}`), '404.html: stale stylesheet version');
requireMatch(notFoundPage, /class="skip-link" href="#main-content"/, '404.html: missing skip link');
requireMatch(notFoundPage, /<main id="main-content"/, '404.html: missing main-content target');

for (const file of [...publicPages.map(([name]) => name), '404.html', 'p/k7x9m2/index.html']) {
  const html = read(file);
  const inlineExecutableScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*\btype="(?:text\/plain|application\/ld\+json)")[^>]*>/gi)];
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
const postCanonicals = new Set(postPages.map(canonicalFor));
const indexPostMatches = [...index.matchAll(/href="(\/blog\/[^"]+\/)"/g)];
const feedEntryMatches = [...feed.matchAll(/<entry>[\s\S]*?<id>([^<]+)<\/id>/g)];
const sitemapLocationMatches = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)];
const indexPostUrls = new Set(
  indexPostMatches.map((match) => `${siteOrigin}${match[1]}`)
);
const feedPostUrls = new Set(
  feedEntryMatches.map((match) => match[1])
);
const sitemapUrls = new Set(sitemapLocationMatches.map((match) => match[1]));
const expectedPublicUrls = new Set(publicPages.map(([, canonical]) => canonical));
if (indexPostMatches.length !== postPages.length) errors.push('index.html post list contains duplicates or omissions');
if (feedEntryMatches.length !== postPages.length) errors.push('feed.xml contains duplicate or missing entries');
if (sitemapLocationMatches.length !== publicPages.length) errors.push('sitemap.xml contains duplicate or missing URLs');
compareSets(indexPostUrls, postCanonicals, 'index.html post list');
compareSets(feedPostUrls, postCanonicals, 'feed.xml entries');
compareSets(sitemapUrls, expectedPublicUrls, 'sitemap.xml URLs');
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

console.log(`Site validation passed: ${publicPages.length} public pages, ${postPages.length} feed entries, ${sitemapUrls.size} sitemap URLs.`);
