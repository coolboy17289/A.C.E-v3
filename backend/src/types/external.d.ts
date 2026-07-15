// Ambient module declarations for platforms and modules we only use on a
// real Raspberry Pi image. They keep `tsc` happy without forcing every
// dev laptop to install the native deps.
//
// `rpi-gpio` is loaded dynamically in services/gpio.ts, but tsc still
// needs a type to resolve the symbol. The shape below matches the public
// surface we use; we accept it being slightly out of date with upstream.

declare module 'rpi-gpio' {
  export type Direction = 'in' | 'out';
  export function setup(pin: number, direction: Direction): Promise<void>;
  export function write(pin: number, value: boolean): Promise<void>;
  export function read(pin: number): Promise<boolean>;
  export function unexport(pin: number): Promise<void>;
}

declare module 'onoff' {
  export default class Gpio {
    constructor(pin: number, direction: 'in' | 'out');
    writeSync(value: 0 | 1 | boolean): void;
    readSync(): 0 | 1;
    unexport(): void;
  }
}
