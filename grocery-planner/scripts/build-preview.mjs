// Builds the app into one self-contained HTML file.
//
// For sharing a link someone can open on a phone: no install, no server, no
// second request. The output is page *content* — no doctype, html, head or
// body wrapper — because the host that serves it supplies that skeleton.
//
//     node scripts/build-preview.mjs
//     → client/dist-preview/preview.html
//
// The build itself (SINGLE_FILE=1) produces one JS chunk and stubs out the
// Anthropic SDK, which a sandboxed preview can't reach anyway.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIENT = resolve(fileURLToPath(new URL('../client', import.meta.url)));
const OUT_DIR = join(CLIENT, 'dist-preview');

const TITLE = 'Weekly Meal Planner';

console.log('Building single-file preview…');
execFileSync('npx', ['vite', 'build'], {
  cwd: CLIENT,
  env: { ...process.env, SINGLE_FILE: '1' },
  stdio: 'inherit',
});

const assets = readdirSync(join(OUT_DIR, 'assets'));
const jsFiles = assets.filter((name) => name.endsWith('.js'));
const cssFiles = assets.filter((name) => name.endsWith('.css'));

if (jsFiles.length !== 1) {
  throw new Error(
    `Expected exactly one JS chunk to inline, found ${jsFiles.length}: ${jsFiles.join(', ')}`
  );
}

const js = readFileSync(join(OUT_DIR, 'assets', jsFiles[0]), 'utf8');
const css = cssFiles.map((name) => readFileSync(join(OUT_DIR, 'assets', name), 'utf8')).join('\n');

// A literal "</script" anywhere in the bundle would close the tag early. The
// escaped form is identical to the JS parser and inert to the HTML one.
const inlineSafe = (code) => code.replace(/<\/script/gi, '<\\/script');

const html = `<title>${TITLE}</title>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${inlineSafe(js)}
</script>
`;

const outFile = join(OUT_DIR, 'preview.html');
writeFileSync(outFile, html);

const kb = (bytes) => `${Math.round(bytes / 1024)} kB`;
console.log(`\n  ${outFile}`);
console.log(`  ${kb(Buffer.byteLength(html))} total — ${kb(js.length)} JS, ${kb(css.length)} CSS\n`);
