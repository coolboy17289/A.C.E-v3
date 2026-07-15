/**
 * GPIO service stub.
 *
 * On a Raspberry Pi we'd dynamically import either `rpi-gpio` or `onoff`
 * to toggle the requested pin. We deliberately do NOT take that hard
 * dependency when running on a dev laptop because the native build often
 * fails (libgpiod headers missing). The HTTP layer always returns 200 so
 * the React UI keeps working in dev.
 *
 * To enable real GPIO control on a Pi, set ACE_HARDWARE=real and
 * `npm install rpi-gpio` in the image build pipeline.
 */

interface LedState {
  pin: number;
  on: boolean;
  ts: number;
}

const leds = new Map<number, LedState>();
const REAL_GPIO = process.env.ACE_HARDWARE === 'real';

export interface LedResult {
  ok: boolean;
  pin: number;
  on: boolean;
  mode: 'real' | 'stub';
  error?: string;
}

export async function setLed(pin: number, on: boolean): Promise<LedResult> {
  leds.set(pin, { pin, on, ts: Date.now() });
  if (REAL_GPIO) {
    try {
      // Real-Pi path. We import lazily so a missing native module doesn't
      // crash the dev backend.
      const rpi = (await import('rpi-gpio').catch(() => null)) as unknown as {
        setup?: (pin: number, dir: 'out' | 'in') => Promise<void>;
        write?: (pin: number, value: boolean) => Promise<void>;
      } | null;
      if (rpi && typeof rpi.setup === 'function' && typeof rpi.write === 'function') {
        await rpi.setup(pin, 'out');
        await rpi.write(pin, on);
        return { ok: true, pin, on, mode: 'real' };
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ace-gpio] real write failed, reporting stub mode', err);
      return { ok: false, pin, on, mode: 'stub', error: String((err as Error).message ?? err) };
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[ace-gpio:stub] pin=${pin} on=${on}`);
  return { ok: true, pin, on, mode: 'stub' };
}

export function ledState(): LedState[] {
  return Array.from(leds.values());
}
