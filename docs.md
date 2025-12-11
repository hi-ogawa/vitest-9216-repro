# Investigation: Vitest Issue #9216 - Bloated Reporter Data

## Issue Summary

GitHub Issue: https://github.com/vitest-dev/vitest/issues/9216

Reporter data sizes have dramatically increased in Vitest versions after 3.1.4. The bloat stems from "metrics from import durations" that are collected unconditionally, causing:

- HTML reporter failures with `RangeError: Invalid string length`
- Blob reporter failures with the same error
- Up to 20x larger data in production environments with ~10,000 tests

## Test Environment

- Vitest versions tested: 3.1.4 (baseline), 4.0.15 (affected)
- Platform: linux-x64
- Node: v22.21.1

## Methodology

### 1. Test File Generation

A script `generate-tests.js` generates N test files with shared dependencies:

```bash
node generate-tests.js <num_files> [dep_count]
```

**Dependency structure:**
```
test/generated_1.test.ts ─┐
test/generated_2.test.ts ─┼─> src/index.js ─> [src/dep1.js, src/dep2.js, ...]
test/generated_N.test.ts ─┘
```

All test files import the same `src/index.js`, which imports N dependencies.

### 2. Running Tests with Blob Reporter

```bash
pnpm vitest run --reporter=blob
```

Output: `.vitest-reports/blob.json`

### 3. Data Collection

Automated via `measure-blob.js`:

```bash
node measure-blob.js
```

## Data Collection Results

### Version Comparison: 3.1.4 vs 4.0.15

| Files | Deps | v3.1.4 (bytes) | v4.0.15 (bytes) | Bloat Factor |
|-------|------|----------------|-----------------|--------------|
| 10    | 0    | 10,179         | 19,041          | 1.87x        |
| 50    | 0    | 50,217         | 95,213          | 1.90x        |
| 10    | 3    | 10,465         | 23,940          | 2.29x        |
| 50    | 3    | 50,565         | 118,328         | 2.34x        |
| 10    | 10   | 11,254         | 35,367          | 3.14x        |
| 50    | 10   | 51,232         | 173,632         | 3.39x        |
| 100   | 100  | 112,848        | 1,771,512       | **15.7x**    |
| 100   | 1000 | 215,120        | 16,267,941      | **75.6x**    |

**Key observations:**
- Base bloat (no deps): **1.9x larger** in v4.0.15
- With 100 shared deps: **15.7x larger**
- With 1000 shared deps: **75.6x larger**
- Bloat scales multiplicatively with dependencies

### Per-File Overhead

| Deps | v3.1.4 (bytes/file) | v4.0.15 (bytes/file) | Overhead |
|------|---------------------|----------------------|----------|
| 0    | ~1,000              | ~1,900               | +900     |
| 3    | ~1,010              | ~2,360               | +1,350   |
| 10   | ~1,025              | ~3,470               | +2,445   |

## Analysis

### Linear Scaling

The data shows linear scaling with both file count and dependency count:

- **File scaling**: Both versions scale linearly with file count
- **Dependency scaling**: v4.0.15 adds ~155 bytes per dependency per file vs ~3 bytes in v3.1.4

### Extrapolation to Large Test Suites

Estimated blob sizes for v4.0.15 based on model: `size ≈ files × (1900 + deps × 155)` bytes

| Files   | Deps | v4.0.15 Est. | Status |
|---------|------|--------------|--------|
| 1,000   | 100  | 17 MB        | OK     |
| 5,000   | 100  | 83 MB        | OK     |
| 10,000  | 100  | 166 MB       | OK     |
| 10,000  | 200  | 314 MB       | OK     |
| 10,000  | 500  | 757 MB       | CRASH  |
| 20,000  | 200  | 628 MB       | CRASH  |

### Crash Threshold

Node.js max string length: **512 MB**

The `stringify()` call in blob reporter will crash when blob exceeds this limit:

| Dependencies | Max Files Before Crash |
|--------------|------------------------|
| 100          | ~30,800                |
| 200          | ~16,300                |
| 500          | ~6,760                 |
| 2000         | ~1,640                 |

**Confirmed crash:** 2000 files × 2000 deps → `RangeError: Invalid string length`
- Estimated size: ~624 MB (exceeds 512 MB limit)

Real-world projects with 10,000+ tests and 200+ transitive dependencies will hit this limit.

### Key Finding

The `importDurations` field in v4.0.15 stores timing data for each import per test file, even when imports are shared. This causes:

1. **Base overhead**: ~900 bytes extra per test file in v4.0.15
2. **Per-dependency overhead**: ~155 bytes per dependency per test file
3. **Multiplicative effect**: Files × Dependencies = rapidly growing data

## Conclusion

The bloat issue is reproducible and stems from unconditional collection of `importDurations` metrics. The data grows proportionally with:

1. Number of test files
2. Number of dependencies (even shared ones)
3. Length of file paths (absolute paths stored)

A fix should make `importDurations` collection opt-in or strip it from reporter output when not needed.
