#!/usr/bin/env node
// scripts/verify-shells.mjs — quick smoke test for the A.C.E backend.
//
// All six port shells depend on two endpoints being live:
//   * GET /api/health           → { ok, service, ts }
//   * GET /api/users/me         → { id, name, preferences: {…} }
//
// This script POSTs GET requests for both against the local backend
// (defaults to http://localhost:4318, matching the express service
// in `backend/`) and reports whether each returned the expected
// shape. Useful in CI and from dev terminals where one shell is
// being tested in isolation.

const BACKEND = process.env.ACE_PORT
  ? `http://localhost:${process.env.ACE_PORT}`
  : 'http://localhost:4318';

async function get(path) {
  const res = await fetch(BACKEND + path);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave null */
  }
  return { status: res.status, json, text };
}

function expect(label, actual, check) {
  const ok = check(actual);
  console.log(`${ok ? '✅' : '❌'} ${label}: ${JSON.stringify(actual).slice(0, 140)}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  console.log(`\nVerifying ${BACKEND}\n`);

  const h = await get('/api/health');
  expect('GET /api/health', h, (x) =>
    x.status === 200 && x.json && typeof x.json.ok === 'boolean',
  );

  const u = await get('/api/users/me');
  expect('GET /api/users/me', u, (x) =>
    x.status === 200 && x.json && typeof x.json.name === 'string',
  );

  if (process.exitCode) {
    console.log('\nOne or more checks failed. Is the backend running on :4318?');
    process.exit(1);
  }
  console.log('\nAll shell-shared endpoints responded as expected.');
})();
