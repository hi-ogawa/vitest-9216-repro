#!/usr/bin/env node

// Usage: node generate-tests.js <num_files> [dep_count]
//
// Structure:
//   test/generated_1.test.ts -> src/index.js -> [src/dep1.js, src/dep2.js, ...]
//   test/generated_2.test.ts -> src/index.js
//   ...

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const numFiles = parseInt(process.argv[2]) || 10;
const depCount = parseInt(process.argv[3]) || 0;
const testDir = path.join(__dirname, 'test');
const srcDir = path.join(__dirname, 'src');

// Ensure directories exist
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir);
}

// Clean up any previously generated files
for (const file of fs.readdirSync(testDir)) {
  if (file.startsWith('generated_') && file.endsWith('.test.ts')) {
    fs.unlinkSync(path.join(testDir, file));
  }
}
for (const file of fs.readdirSync(srcDir)) {
  fs.unlinkSync(path.join(srcDir, file));
}

// Create src/index.js that imports all deps
if (depCount > 0) {
  const imports = [];
  const exports = [];

  for (let d = 1; d <= depCount; d++) {
    fs.writeFileSync(
      path.join(srcDir, `dep${d}.js`),
      `export const dep${d}Value = ${d};\n`
    );
    imports.push(`import { dep${d}Value } from './dep${d}.js';`);
    exports.push(`dep${d}Value`);
  }

  fs.writeFileSync(
    path.join(srcDir, 'index.js'),
    `${imports.join('\n')}
export const sum = ${exports.join(' + ')};
`
  );
} else {
  fs.writeFileSync(
    path.join(srcDir, 'index.js'),
    `export const sum = 0;\n`
  );
}

// Generate test files - all import src/index.js
const expectedSum = depCount > 0 ? (depCount * (depCount + 1)) / 2 : 0;

for (let i = 1; i <= numFiles; i++) {
  const testContent = `import { expect, test } from 'vitest'
import { sum } from '../src/index.js'

test('generated test ${i} - a', () => {
  expect(sum).toBe(${expectedSum})
})

test('generated test ${i} - b', () => {
  expect(2 * 2).toBe(4)
})
`;
  fs.writeFileSync(path.join(testDir, `generated_${i}.test.ts`), testContent);
}

console.log(`Generated ${numFiles} test files`);
if (depCount > 0) {
  console.log(`Structure: test/*.test.ts -> src/index.js -> [${Array.from({ length: depCount }, (_, i) => `dep${i + 1}.js`).join(', ')}]`);
} else {
  console.log(`Structure: test/*.test.ts -> src/index.js (no deps)`);
}
