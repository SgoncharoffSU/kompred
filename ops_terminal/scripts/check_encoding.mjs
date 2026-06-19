import fs from 'fs';
import path from 'path';

const root = path.resolve('d:/project/bathhouse/php_hosting/public');
const files = [
  'index.php',
  'api/index.php',
  'site/index.php',
].map(file => path.join(root, file));

const broken = [
  ['BOM', 'buffer', buffer => buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf],
  ['replacement-char', 'text', text => text.includes('\ufffd')],
  ['broken-degree', 'text', text => text.includes('0\u0412\u00b0')],
  ['broken-ruble', 'text', text => text.includes('\u0432\u201a')],
  ['broken-arrow/check', 'text', text => text.includes('\u0432\u045a')],
  ['broken-emoji-prefix', 'text', text => text.includes('\u0440\u045f')],
  ['latin1-utf8-markers', 'text', text => text.includes('\u00d0') || text.includes('\u00d1') || text.includes('\u00c2')],
  ['cyrillic-mojibake-pair', 'text', text => /[\u0420\u0421][\u0402-\u040F\u0452-\u045F]/.test(text)],
  ['cyrillic-mojibake-wide', 'text', text => /[\u0420\u0421][\u0080-\u00ff\u0400-\u040f\u0450-\u045f\u0490-\u0491\u2010-\u203f\u20ac\u2116]/.test(text)],
  ['emoji-mojibake-wide', 'text', text => /[\u0440\u0432][\u0080-\u00ff\u0400-\u040f\u0450-\u045f\u2010-\u203f\u20ac]/.test(text)],
];

let failed = false;
for (const file of files) {
  const buffer = fs.readFileSync(file);
  const text = buffer.toString('utf8');
  for (const [name, target, test] of broken) {
    if (test(target === 'buffer' ? buffer : text)) {
      console.error(`encoding check failed: ${path.relative(root, file)}: ${name}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('encoding check ok');
