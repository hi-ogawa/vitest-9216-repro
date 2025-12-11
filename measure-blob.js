#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configs = [
  { files: 10, deps: 0 },
  { files: 50, deps: 0 },
  { files: 10, deps: 3 },
  { files: 50, deps: 3 },
  { files: 10, deps: 10 },
  { files: 50, deps: 10 },
];

const version = execSync('pnpm vitest --version').toString().trim();
console.log(`# Vitest version: ${version}`);
console.log('files,deps,blob_size_bytes');

for (const { files, deps } of configs) {
  // Generate tests
  execSync(`node generate-tests.js ${files} ${deps}`, { stdio: 'ignore' });

  // Run vitest with blob reporter (uses default output)
  execSync('pnpm vitest run --reporter=blob', { stdio: 'ignore' });

  // Measure size from default location
  const blobPath = path.join(__dirname, '.vitest-reports', 'blob.json');
  const size = fs.statSync(blobPath).size;

  console.log(`${files},${deps},${size}`);

  // Cleanup
  fs.unlinkSync(blobPath);
}
