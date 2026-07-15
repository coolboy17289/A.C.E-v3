#!/usr/bin/env node
// Blink the requested BCM pin a few times. Intended as a sanity-check
// during first boot to confirm libgpiod / onoff can talk to the pins.
//
// Usage: node blink.js 17
//
// Falls back to console logging if `onoff` isn't installed (developer
// laptop, CI etc.).
import process from 'node:process';

const pin = Number(process.argv[2] ?? 17);
const cycles = Number(process.argv[3] ?? 4);

async function main() {
  let Gpio = null;
  try { Gpio = (await import('onoff')).default; } catch { /* stub mode */ }

  if (!Gpio) {
    console.log(`[ace-gpio:stub] no onoff-installed, would blink BCM ${pin} ${cycles} times`);
    return;
  }

  const output = new Gpio(pin, 'out');
  console.log(`[ace-gpio] blinking BCM ${pin} ${cycles} times`);
  try {
    for (let i = 0; i < cycles; i++) {
      output.writeSync(1);
      await new Promise((r) => setTimeout(r, 350));
      output.writeSync(0);
      await new Promise((r) => setTimeout(r, 350));
    }
  } finally {
    output.unexport();
  }
}

main().catch((err) => {
  console.error('[ace-gpio] failed', err);
  process.exit(1);
});
