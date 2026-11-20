/* Writes the list of files and a version (a hash of their contents) into sw.js:  node kaidoneta/tools/update-sw.js
 * Run it after changing any file of the app, so phones fetch the new version. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const files = ['index.html', 'manifest.webmanifest'];
['css', 'js', 'icons'].forEach((d) => fs.readdirSync(path.join(ROOT, d)).sort().forEach((f) => files.push(d + '/' + f)));
const hash = crypto.createHash('sha256');
files.forEach((f) => hash.update(f).update(fs.readFileSync(path.join(ROOT, f))));
const version = 'kaido-' + hash.digest('hex').slice(0, 10);
const swPath = path.join(ROOT, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(/\/\* BEGIN SHELL \*\/[\s\S]*\/\* END SHELL \*\//, '/* BEGIN SHELL */\n  \'./\',\n' + files.map((f) => `  '${f}'`).join(',\n') + '\n  /* END SHELL */');
fs.writeFileSync(swPath, sw);
console.log(version + ' · ' + (files.length + 1) + ' files');
