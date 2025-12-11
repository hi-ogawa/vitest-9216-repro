# Vitest Issue #9216 Reproduction

Reproduces bloated reporter data issue: https://github.com/vitest-dev/vitest/issues/9216

## Quick Test

```bash
# Generate 100 test files with 1000 shared dependencies
node generate-tests.js 100 1000

# Run with blob reporter
pnpm vitest run --reporter=blob

# Check blob size
stat -c%s .vitest-reports/blob.json
```

## Results (100 files, 1000 deps)

| Version | Blob Size | Bloat Factor |
|---------|-----------|--------------|
| v3.1.4  | 210 KB    | baseline     |
| v4.0.15 | 16.2 MB   | **75.6x**    |

## Crash Threshold

Node.js max string length is 512 MB. The blob reporter crashes with `RangeError: Invalid string length` when:

- 2000 files × 2000 deps (confirmed crash)
- 10,000 files × 500 deps (estimated)

See [docs.md](./docs.md) for full analysis.
