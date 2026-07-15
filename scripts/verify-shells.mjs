#!/usr/bin/env node
// scripts/verify-shells.mjs — quick smoke test for the A.C.E backend.
//
// All six port shells depend on two endpoints being live:
//   * GET /api/health           → { ok, service, ts }
//   * GET /api/users/me         → { id, name, preferences: {…} }
//
// This script GETs both against the local backend (defaults to
// http://127.0.0.1:4318, matching the express service in `backend/`)
// and reports whether each returned the expected shape. Useful in CI
// and from dev terminals where one shell is being tested in isolation.
//
// Network failures are caught and reported as a clean diagnostic
// instead of an uncaught `fetch failed` stack trace — the previous
// version would crash on a stopped backend, which made the smoke
// test impossible to use as a "is the backend up?" check.
//
// A soft probe of `POST /api/refresh` is included. As of this writing
// the backend does not implement that route, so a 404 is treated as
// "not yet implemented" and reported as a warning rather than a
// failure. The check still fails if the server is reachable but
// returns a 5xx, which is the actual signal we want to catch.

const BACKEND = process.env.ACE_PORT
  ? `http://127.0.0.1:${process.env.ACE_PORT}`
  : process.env.ACE_BACKEND?.replace(/\/+$/, '')
    ?? 'http://127.0.0.1:4318';

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

async function post(path, body) {
  const res = await fetch(BACKEND + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status };
}

let problems = 0;
let warnings = 0;

function pass(label, actual) {
  console.log(`✅ ${label}: ${JSON.stringify(actual).slice(0, 140)}`);
}

function fail(label, detail) {
  console.log(`❌ ${label}: ${detail}`);
  problems++;
}

function warn(label, detail) {
  console.log(`⚠️  ${label}: ${detail}`);
  warnings++;
}

(async () => {
  console.log(`\nVerifying ${BACKEND}\n`);

  // GET /api/health. We expect 200 + a JSON object with `ok: boolean`.
  let h;
  try {
    h = await get('/api/health');
  } catch (e) {
    fail('GET /api/health', `network: ${e?.cause?.code ?? e?.message ?? e}`);
    console.log('\nBackend is not reachable. Is the API server running on :4318?');
    process.exit(1);
  }
  if (h.status === 200 && h.json && typeof h.json.ok === 'boolean') {
    pass('GET /api/health', h.json);
  } else {
    fail('GET /api/health', `status=${h.status} body=${h.text?.slice(0, 120)}`);
  }

  // GET /api/users/me. We expect 200 + a JSON object with `name: string`.
  let u;
  try {
    u = await get('/api/users/me');
  } catch (e) {
    fail('GET /api/users/me', `network: ${e?.cause?.code ?? e?.message ?? e}`);
  }
  if (u && u.status === 200 && u.json && typeof u.json.name === 'string') {
    pass('GET /api/users/me', u.json);
  } else if (u) {
    fail('GET /api/users/me', `status=${u.status} body=${u.text?.slice(0, 120)}`);
  }

  // Soft probe of POST /api/refresh. The route is currently a
  // placeholder in the spec — treat 404 as "not yet implemented".
  // Any 2xx counts as pass; any 5xx counts as a hard fail.
  try {
    const r = await post('/api/refresh', { source: 'verify-shells' });
    if (r.status >= 200 && r.status < 300) {
      pass('POST /api/refresh', { status: r.status });
    } else if (r.status === 404 || r.status === 405) {
      warn('POST /api/refresh', `not implemented (status=${r.status}) — shells will fall back to a second GET`);
    } else {
      fail('POST /api/refresh', `status=${r.status}`);
    }
  } catch (e) {
    // Connection refused here means the backend went away between
    // the two GETs — soft-fail so the original GET verdicts still
    // surface in CI output.
    warn('POST /api/refresh', `network: ${e?.cause?.code ?? e?.message ?? e}`);
  }

  if (problems > 0) {
    console.log(`\n${problems} check(s) failed${warnings ? `, ${warnings} warning(s)` : ''}. Is the backend running on :4318?`);
    process.exit(1);
  }
  if (warnings > 0) {
    console.log(`\nAll shell-shared endpoints responded as expected (${warnings} soft warning(s)).`);
  } else {
    console.log('\nAll shell-shared endpoints responded as expected.');
  }
})();
