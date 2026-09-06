/**
 * Shared harness for the file-only self-checks in `frontend/scripts/`.
 *
 * Every script follows the same contract:
 *   1. create a suite,
 *   2. group assertions with `section()` / `check()`,
 *   3. end with `finish()` which sets the exit code.
 *
 * Keeping the counter + logging in one place removes the copy-pasted
 * `let failures = 0 / function check(...) / process.exit(...)` block that
 * used to drift between files (some exited on first failure, some counted).
 */

export interface Suite {
  /** Log `ok:` on truthy, `FAIL:` + count on falsy. Returns the condition. */
  check(desc: string, cond: boolean, detail?: unknown): boolean;
  /** Strict-equality assertion with a diff dump on mismatch. */
  checkEqual<T>(desc: string, actual: T, expected: T): boolean;
  /** Print a `--- TITLE ---` separator. */
  section(title: string): void;
  /** Print the summary and set `process.exitCode`. Returns the code. */
  finish(successMessage?: string): number;
  readonly failures: number;
}

export function createSuite(scriptName: string): Suite {
  let failures = 0;
  let started = false;

  const header = () => {
    if (!started) {
      started = true;
      console.log(`\n[${scriptName}]`);
    }
  };

  return {
    get failures() {
      return failures;
    },

    check(desc, cond, detail) {
      header();
      if (!cond) {
        failures += 1;
        console.error(`FAIL: ${desc}`);
        if (detail !== undefined) console.error(detail);
        return false;
      }
      console.log(`ok: ${desc}`);
      return true;
    },

    checkEqual(desc, actual, expected) {
      const pass = actual === expected;
      if (!pass) {
        header();
        failures += 1;
        console.error(`FAIL: ${desc}`);
        console.error(`  expected: ${JSON.stringify(expected)}`);
        console.error(`  actual:   ${JSON.stringify(actual)}`);
        return false;
      }
      header();
      console.log(`ok: ${desc}`);
      return true;
    },

    section(title) {
      header();
      console.log(`\n--- ${title} ---`);
    },

    finish(successMessage = 'All checks passed.') {
      header();
      if (failures === 0) {
        console.log(`\nALL PASS: ${successMessage}`);
      } else {
        console.error(`\n${failures} FAILURE${failures === 1 ? '' : 'S'}`);
      }
      process.exitCode = failures === 0 ? 0 : 1;
      return process.exitCode;
    },
  };
}
