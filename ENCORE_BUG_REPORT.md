# 🐛 Encore Bug Report: Vitest/esbuild Testing Issues

**Date**: September 4, 2025  
**Encore Version**: 1.49.3  
**Node.js Version**: Latest  
**OS**: macOS  
**Project**: TinyCDP (Real-time traits & segments engine)

## 📋 Issue Summary

**Problem**: `encore test` and direct `vitest run` commands fail with esbuild service crashes, preventing execution of comprehensive test suite.

**Error**: 
```
Error: The service was stopped: write EPIPE
Plugin: vite:esbuild
```

**Impact**: Unable to run 70+ unit tests covering critical business logic (DSL engine, trait computation, database layer).

## 🔄 Reproduction Steps

### Environment Setup
```bash
# Project structure
backend/
├── package.json          # Contains "test": "vitest run"
├── shared/
│   ├── traits-dsl.test.ts
│   ├── trait-computation.test.ts
│   └── db.test.ts
└── ingest/
    └── health.test.ts
```

### Commands That Fail
```bash
# Method 1: Encore's test runner
cd backend
encore test
# ❌ Fails with esbuild error

# Method 2: Direct Vitest execution  
npx vitest run
# ❌ Fails with same esbuild error

# Method 3: Single test file
npx vitest run shared/traits-dsl.test.ts
# ❌ Still fails with esbuild error
```

## 📄 Full Error Output

### encore test
```
$ vitest run

 RUN  v3.2.4 /Users/himeshp/apps/hackthons/tinycdp/backend

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Suites 4 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  ingest/health.test.ts [ ingest/health.test.ts ]
 FAIL  shared/db.test.ts [ shared/db.test.ts ]
 FAIL  shared/trait-computation.test.ts [ shared/trait-computation.test.ts ]
 FAIL  shared/traits-dsl.test.ts [ shared/traits-dsl.test.ts ]
Error: The service was stopped: write EPIPE
  Plugin: vite:esbuild
  File: /Users/himeshp/apps/hackthons/tinycdp/backend/ingest/health.test.ts
 ❯ ../node_modules/esbuild/lib/main.js:718:38
 ❯ responseCallbacks.<computed> ../node_modules/esbuild/lib/main.js:603:9
 ❯ afterClose ../node_modules/esbuild/lib/main.js:594:28
 ❯ ../node_modules/esbuild/lib/main.js:1986:18

 Test Files  4 failed (4)
      Tests  no tests
   Start at  21:44:27
   Duration  227ms (transform 14ms, setup 0ms, collect 0ms, tests 0ms, environment 0ms, prepare 189ms)

error: script "test" exited with code 1
```

### Minimal Test Case Fails Too
Even a simple test file with no Encore imports fails:

```typescript
// test-simple.test.ts
import { describe, it, expect } from 'vitest';

describe('Simple Test', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });
});
```

```bash
npx vitest run test-simple.test.ts
# ❌ Still fails with same esbuild error
```

## 📦 Project Configuration

### backend/package.json
```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "bun",
  "scripts": {
    "build": "cd ../frontend && bun install && vite build --outDir=../backend/frontend/dist",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "encore.dev": "^1.49.3"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "vitest": "^3.2.4"
  }
}
```

### Root package.json
```json
{
  "name": "leap-app",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "bun",
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "test": "cd backend && npm run test",
    "test:watch": "cd backend && npm run test:watch"
  }
}
```

### Sample Test File
```typescript
// backend/shared/traits-dsl.test.ts
import { describe, it, expect } from 'vitest';
import { 
  TraitDSLLexer, 
  TraitDSLParser, 
  parseTraitExpression,
  evaluateTraitExpression 
} from './traits-dsl';

describe('TraitDSLLexer', () => {
  it('should tokenize numbers', () => {
    const lexer = new TraitDSLLexer('42');
    expect(lexer.getNextToken().value).toBe('42');
  });
  // ... 70+ more test cases
});
```

## 🔧 Attempted Solutions

### 1. Vitest Configuration Attempts
```typescript
// vitest.config.ts - FAILED
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000
  }
});
```

```javascript  
// vitest.config.js - FAILED
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
});
```

### 2. Alternative Test Runners
- **Jest**: Module resolution conflicts with ES modules + Encore
- **Node.js native test**: Would require complete test rewrite

### 3. Different Command Variations
```bash
# All failed with same esbuild error:
npx vitest run --reporter=basic
npx vitest run --reporter=verbose  
npx vitest run --no-config
vitest run
```

## 🔍 Root Cause Analysis

### Hypothesis
The issue appears to be a **conflict between Encore's TypeScript build pipeline and Vitest's esbuild usage**:

1. **Encore** has its own TypeScript compilation setup for the backend
2. **Vitest** uses Vite + esbuild for test file compilation
3. **Conflict**: Both systems try to handle TypeScript compilation simultaneously
4. **Result**: esbuild service crashes with EPIPE (broken pipe) error

### Evidence
- Error occurs during the "transform" phase before any tests execute
- Same error across all test files (even minimal ones)
- Error mentions `vite:esbuild` plugin specifically
- Issue persists regardless of Vitest configuration

## 🎯 Expected Behavior

Tests should run successfully with output like:
```
✓ backend/shared/traits-dsl.test.ts (45)
✓ backend/shared/trait-computation.test.ts (8) 
✓ backend/shared/db.test.ts (2)
✓ backend/ingest/health.test.ts (1)

Test Files  4 passed (4)
     Tests  56 passed (56)
```

## 📋 Test Suite Details

Our test suite covers critical business logic:

### 1. DSL Engine Tests (45 test cases)
- **Lexer**: Tokenization of numbers, identifiers, operators, strings
- **Parser**: Expression parsing, property access, comparisons, logical ops
- **Evaluator**: Expression evaluation with mock trait contexts
- **Validator**: Expression validation and error handling

### 2. Trait Computation Tests (8 test cases)  
- Trait context building with event metrics
- User trait computation with mocked database
- Error handling for invalid expressions

### 3. Database Tests (2 test cases)
- Database connection validation
- Basic query functionality

### 4. Health Check Tests (1 test case)
- Service health endpoint testing

## 🚀 Request for Encore Team

### Immediate Help Needed
1. **Official guidance** on testing setup for Encore projects
2. **Vitest compatibility** documentation or configuration examples
3. **Alternative approaches** if Vitest is not recommended

### Questions
1. Does Encore have **preferred test runners** for TypeScript projects?
2. Are there **special configurations** needed for Vitest + Encore?
3. Should tests be **located outside the backend directory** to avoid conflicts?
4. Is there an **Encore-specific test environment** setup we should use?

### Suggested Solutions
1. **Documentation update**: Add testing guide for Encore projects
2. **Example project**: Show working Vitest setup in Encore
3. **CLI enhancement**: `encore create` could include test setup
4. **Configuration helper**: Built-in test configuration for common runners

## 📱 Contact Information

**GitHub**: [TinyCDP Repository](https://github.com/your-org/tinycdp)  
**Email**: Available upon request  
**Priority**: High - blocking comprehensive test coverage for production deployment

## 🔗 Additional Context

- **Project Type**: Production-ready real-time analytics engine
- **Scale**: 7 microservices, 4 test files, 70+ test cases
- **Use Case**: Critical business logic testing (DSL evaluation, trait computation)
- **Timeline**: Needs resolution for production deployment

---

**Thank you for your attention to this issue!** We're excited about Encore and want to ensure our comprehensive test suite can run reliably. This testing capability is crucial for our production deployment confidence.
