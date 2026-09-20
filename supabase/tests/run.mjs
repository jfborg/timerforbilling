#!/usr/bin/env node
// Runs the RLS/RPC test suite against a local Postgres instance, without Docker or the
// Supabase CLI's local stack (both need Docker image pulls this sandbox's network policy
// blocks; see DECISIONS.md). Requires a running local `postgres` OS user and cluster
// (already the case in this environment: `service postgresql start`).
//
// Order: drop/recreate a scratch database, apply the auth/storage shim (test-only, never
// applied to a real Supabase project), apply every real migration in supabase/migrations/,
// apply the grants fixture, then run every supabase/tests/database/*.test.sql file in order.
// Any failure (a fixture, a migration, or a `public.test_assert` raising) aborts the whole
// run with a non-zero exit code.

import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
const fixturesPreDir = path.join(here, 'fixtures', 'pre');
const fixturesPostDir = path.join(here, 'fixtures', 'post');
const databaseDir = path.join(here, 'database');

const DB_NAME = 'sealed_test';

// Migrations that only wire up Supabase platform features unavailable locally (pg_cron,
// pg_net, Vault) and have nothing in them the local harness could meaningfully check; see
// each file's own header comment for why.
const SKIP_MIGRATIONS = new Set(['20260920070202_schedule_dispatch_notifications.sql']);

function runAsPostgres(args) {
  return execFileSync('su', ['postgres', '-c', `psql ${args}`], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function runFile(filePath, { database = DB_NAME } = {}) {
  console.log(`  -> ${path.relative(repoRoot, filePath)}`);
  // psql sends NOTICE/ERROR text to stderr; capture both streams explicitly (spawnSync,
  // rather than execFileSync, which inherits stderr straight to the terminal by default) so
  // a passing run prints only our own PASS lines, not raw psql output. Tests that
  // deliberately provoke an error (an unauthorized caller, a locked letter) are expected to
  // have psql log that error; it is not a failure unless the file's exit code is non-zero,
  // which is what actually decides pass/fail here.
  const result = spawnSync(
    'su',
    ['postgres', '-c', `psql -v ON_ERROR_STOP=1 -X -d ${database} -f '${filePath.replace(/'/g, `'\\''`)}'`],
    { encoding: 'utf8' }
  );
  const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const passLines = combined.split('\n').filter((line) => line.includes('NOTICE:  PASS'));
  for (const line of passLines) console.log('     ' + line.trim());

  if (result.status !== 0) {
    const err = new Error(`psql exited ${result.status} for ${filePath}`);
    err.output = combined;
    throw err;
  }
}

function sortedSqlFiles(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(dir, f));
}

try {
  try {
    execFileSync('su', ['postgres', '-c', 'pg_isready'], { stdio: 'pipe' });
  } catch {
    console.error(
      'No local PostgreSQL server reachable as the `postgres` OS user.\n' +
        'See supabase/tests/README.md for prerequisites (e.g. `sudo service postgresql start`).'
    );
    process.exit(1);
  }

  console.log('Resetting scratch database...');
  runAsPostgres(`-v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};"`);
  runAsPostgres(`-v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME};"`);

  console.log('Applying test-only auth/storage shim...');
  for (const f of sortedSqlFiles(fixturesPreDir)) runFile(f);

  console.log('Applying real migrations (supabase/migrations)...');
  for (const f of sortedSqlFiles(migrationsDir)) {
    if (SKIP_MIGRATIONS.has(path.basename(f))) {
      console.log(`  -> ${path.relative(repoRoot, f)} (skipped, see SKIP_MIGRATIONS)`);
      continue;
    }
    runFile(f);
  }

  console.log('Applying grants fixture (after migrations, so tables exist)...');
  for (const f of sortedSqlFiles(fixturesPostDir)) runFile(f);

  console.log('Running database tests (supabase/tests/database)...');
  let failures = 0;
  for (const f of sortedSqlFiles(databaseDir)) {
    try {
      runFile(f);
    } catch (err) {
      failures += 1;
      console.error(`     FILE FAILED: ${path.relative(repoRoot, f)}`);
      console.error(err.output ?? err.message);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} test file(s) failed.`);
    process.exit(1);
  }

  console.log('\nAll backend tests passed.');
} catch (err) {
  console.error('Backend test run failed:');
  console.error(err.stdout?.toString?.() ?? err.message);
  process.exit(1);
}
