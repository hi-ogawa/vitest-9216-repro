# Vitest Issue #9216 Reproduction

Reproduces bloated reporter data issue: https://github.com/vitest-dev/vitest/issues/9216

## Quick Test

```bash
# Generate 100 test files with 1000 shared dependencies
node generate-tests.js 100 1000

# Run with blob reporter
pnpm vitest run --reporter=blob --reporter=default

# Check blob size
ls -lh .vitest-reports/blob.json
```

## Results (100 files, 1000 deps)

| Version | Blob Size | Bloat Factor |
|---------|-----------|--------------|
| v3.1.4  | 210 KB    | baseline     |
| v4.0.15 | 15 MB     | **75.6x**    |
| [PR-9255](https://github.com/vitest-dev/vitest/pull/9255) | 1.4 MB    | - |

## Crash Threshold

Node.js max string length is 512 MB. The blob reporter crashes with `RangeError: Invalid string length` when:

- 2000 files × 2000 deps (confirmed crash)
- 10,000 files × 500 deps (estimated)

See [docs.md](./docs.md) for full analysis.

## includeImportDurations

https://github.com/vitest-dev/vitest/pull/9262

```bash
pnpm vitest run --reporter=blob --reporter=default --includeImportDurations=false

# Check blob size
ls -lh .vitest-reports/blob.json
```

- 100 x 1000 -> 239K
- 1000 x 1000 -> 1.5M
