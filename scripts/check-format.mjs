// Dependency-free repository checks. Run with `npm run format:check`.
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIRS = ['src', 'scripts', 'test'];
const ROOT_EXTENSIONS = new Set(['.md', '.json']);
const TEXT_EXTENSIONS = new Set(['.mjs', '.js', '.json', '.md', '.css', '.html', '.ps1']);
const decoder = new TextDecoder('utf-8', { fatal: true });

async function collectFiles() {
  const files = [];
  for (const entry of await readdir(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && ROOT_EXTENSIONS.has(extname(entry.name))) files.push(entry.name);
  }
  for (const dir of SOURCE_DIRS) {
    for (const entry of await readdir(join(ROOT, dir), { withFileTypes: true, recursive: true })) {
      if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))) {
        files.push(relative(ROOT, join(entry.parentPath ?? entry.path, entry.name)));
      }
    }
  }
  return files.sort();
}

function checkPowerShellSyntax(file, report) {
  const script = '$errors = $null; [void][System.Management.Automation.Language.Parser]::ParseFile($env:PROMPT_LENS_PS1, [ref]$null, [ref]$errors); if ($errors) { $errors | ForEach-Object { "line $($_.Extent.StartLineNumber): $($_.Message)" }; exit 1 }';
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    env: { ...process.env, PROMPT_LENS_PS1: join(ROOT, file) }
  });
  if (result.error) console.warn(`Skipped PowerShell syntax check for ${file}: ${result.error.message}`);
  else if (result.status !== 0) report(file, `PowerShell syntax error:\n${result.stdout.trim()}`);
}

const files = await collectFiles();
const problems = [];
const report = (file, message) => problems.push(`${file}: ${message}`);

for (const file of files) {
  const extension = extname(file);
  let text;
  try {
    text = decoder.decode(await readFile(join(ROOT, file)));
  } catch {
    report(file, 'is not valid UTF-8');
    continue;
  }
  if (text.charCodeAt(0) === 0xfeff) report(file, 'starts with a byte order mark');
  if (text.includes('\r')) report(file, 'uses CRLF line endings (use LF)');
  if (text.length > 0 && !text.endsWith('\n')) report(file, 'does not end with a newline');
  if (extension !== '.md') {
    text.split('\n').forEach((line, index) => {
      if (/[ \t]+$/.test(line)) report(file, `line ${index + 1} has trailing whitespace`);
    });
  }
  if (extension === '.json') {
    try { JSON.parse(text); } catch (error) { report(file, `invalid JSON: ${error.message}`); }
  }
  if (extension === '.mjs' || extension === '.js') {
    const result = spawnSync(process.execPath, ['--check', join(ROOT, file)], { encoding: 'utf8' });
    if (result.status !== 0) report(file, `syntax error:\n${result.stderr.trim()}`);
  }
  if (extension === '.ps1') {
    // Windows PowerShell 5.1 reads BOM-less scripts with the ANSI code page.
    if (/[^\x00-\x7f]/.test(text)) report(file, 'must be ASCII-only (Windows PowerShell 5.1 would misread it)');
    if (process.platform === 'win32') checkPowerShellSyntax(file, report);
  }
}

if (problems.length > 0) {
  console.error(`Format check failed with ${problems.length} problem(s):\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} files.`);
}
