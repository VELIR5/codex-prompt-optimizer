// Command-line bridge used by the Windows companion so it shares src/optimizer.mjs
// with the panel. Text is exchanged through UTF-8 files to avoid console code-page issues.
//
//   node scripts/optimize-cli.mjs --input <file> --output <file> [--config <templates.json>]
//   node scripts/optimize-cli.mjs --init-config <templates.json>
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG_TEXT, parseConfig, resolveTemplate } from '../src/config.mjs';
import { optimizePrompt } from '../src/optimizer.mjs';

const USAGE = 'Usage: optimize-cli.mjs --input <file> --output <file> [--config <file>] | --init-config <file>';

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument "${key}". ${USAGE}`);
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${key}. ${USAGE}`);
    args[key.slice(2)] = value;
  }
  return args;
}

/** Create the default config only when the file does not exist yet. */
export async function initConfig(path) {
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, DEFAULT_CONFIG_TEXT, { encoding: 'utf8', flag: 'wx' });
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
}

/** Read and resolve templates.json. The file is only ever read, never rewritten or deleted. */
export async function loadTemplate(configPath) {
  if (!configPath) return resolveTemplate(null);
  let raw;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { ...resolveTemplate(null), warning: `Config not found at ${configPath}; using the built-in "task" template.` };
  }
  const parsed = parseConfig(raw);
  const resolved = resolveTemplate(parsed.config);
  const warning = [
    parsed.warning && `${parsed.warning} Using the built-in "task" template; your file was not changed.`,
    resolved.warning
  ].filter(Boolean).join(' ') || null;
  return { ...resolved, warning };
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (args['init-config']) {
    console.log((await initConfig(args['init-config'])) ? 'created' : 'exists');
    return;
  }
  if (!args.input || !args.output) throw new Error(USAGE);
  const input = (await readFile(args.input, 'utf8')).replace(/^\uFEFF/, '');
  const { template, instruction, language, warning } = await loadTemplate(args.config);
  const text = optimizePrompt(input, template, { language, instruction });
  await writeFile(args.output, JSON.stringify({ text, warning }), 'utf8');
}

const isMain = process.argv[1]
  && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
