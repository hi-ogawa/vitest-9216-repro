#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configs = [
  { files: 10, depth: 0 },
  { files: 50, depth: 0 },
  { files: 10, depth: 3 },
  { files: 50, depth: 3 },
  { files: 10, depth: 10 },
  { files: 50, depth: 10 },
];

console.log('files,dep_depth,html_gz_bytes,html_uncompressed_bytes');

for (const { files, depth } of configs) {
  // Generate tests
  execSync(`node generate-tests.js ${files} ${depth}`, { stdio: 'ignore' });

  // Run vitest with HTML reporter
  execSync('pnpm vitest run --reporter=html', { stdio: 'ignore' });

  // Measure sizes
  const gzPath = path.join(__dirname, 'html', 'html.meta.json.gz');
  const gzSize = fs.statSync(gzPath).size;
  const gzContent = fs.readFileSync(gzPath);
  const uncompressed = zlib.gunzipSync(gzContent).length;

  console.log(`${files},${depth},${gzSize},${uncompressed}`);

  // Cleanup
  fs.rmSync(path.join(__dirname, 'html'), { recursive: true });
}
