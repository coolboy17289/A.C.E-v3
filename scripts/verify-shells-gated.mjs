#!/usr/bin/env node
// scripts/verify-shells-gated.mjs
//
// Thin wrapper around scripts/verify-shells.mjs that skips the
// shells smoke test when the A.C.E backend is not reachable on
// `ACE_PORT` (default 4318). This lets `npm run verify` succeed on
// machines where the backend isn't running — for example in CI that
// only runs the typecheck + unit-test path, or in a fresh clone
// where the developer hasn't started the dev server yet.
//
// Behaviour:
//   * If the port is open and accepts a TCP connection within
//     500 ms, delegate to verify-shells.mjs (which performs the
//     actual JSON shape checks). Any failure there is propagated.
//   * If the port is closed, print a single warning explaining that
//     the smoke test was skipped, and exit 0 so the broader
//     `npm run verify` pipeline stays green.
//
// To force the smoke test even when the backend is down (e.g. to
// surface a clean error in CI), use `npm run verify:full` or
// `npm run shells:verify` directly.

import net from 'node:net';

const PORT = Number(process.env.ACE_PORT ?? 4318);
const HOST = process.env.ACE_HOST ?? '127.0.0.1';
const TIMEOUT_MS = 500;

function probe(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(TIMEOUT_MS);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, HOST);
  });
}

const child = new URL('./verify-shells.mjs', import.meta.url);

if (await probe(PORT)) {
  // Re-exec the real smoke test, inheriting stdio so its output
  // and exit code are visible to the caller. This keeps a single
  // source of truth for the actual assertions.
  const { spawn } = await import('node:child_process');
  const proc = spawn(process.execPath, [child.pathname], {
    stdio: 'inherit',
    env: process.env,
  });
  proc.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.warn(
    `[verify-shells-gated] backend not reachable on ${HOST}:${PORT} — ` +
      `skipping shells smoke test. Start the backend with ` +
      `\`npm run dev:backend\` to include it, or run ` +
      `\`npm run verify:full\` to force the check.`,
  );
  process.exit(0);
}
