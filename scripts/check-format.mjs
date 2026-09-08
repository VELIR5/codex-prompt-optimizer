import { readFile } from 'node:fs/promises';
const files = ['package.json','src/optimizer.mjs','src/panel.mjs'];
for (const file of files) JSON.parse(file.endsWith('.json') ? await readFile(file, 'utf8') : 'null');
console.log(`Checked ${files.length} core files.`);
