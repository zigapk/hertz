# Raspberry Pi bridge

This bridge connects Hertz peripherals directly to Raspberry Pi GPIO pins using the `rpi-io` native module.

Unlike the ClearCore bridge (which communicates with an external controller over serial), the Raspberry Pi bridge runs Hertz on the Pi itself and accesses GPIO directly through `libgpiod`.

## What is included

- `RpiDOut` (`rpidpinout`): write digital GPIO values (HIGH/LOW).
- `RpiDIn` (`rpidpinin`): read digital GPIO values and emit `onValueChange`.

Exports are available from `@/bridges` via `rpiPeripherals` and the component wrappers.

## Prerequisites

- Raspberry Pi 4B, 5, or Zero 2 (other models may work but are untested).
- Raspberry Pi OS (64-bit) Bookworm or Trixie.
- Node.js >= 23 (for `require(esm)` support).
- `libgpiod` (installed by default on recent Raspberry Pi OS).
- Your user must be in the `gpio` group to access GPIO without `sudo`:

```bash
sudo usermod -a -G gpio $USER
# Log out and back in for the change to take effect.
```

## Installation

`rpi-io` is listed as an optional dependency of Hertz. It installs and compiles its native C addon automatically on ARM Linux. On other platforms (x86, macOS), it is silently skipped.

```bash
pnpm add react github:zigapk/hertz
```

## GPIO numbering

All `gpio` props use **BCM GPIO numbers** (not physical header pin numbers). See [pinout.xyz](https://pinout.xyz/) for the mapping between physical pins and BCM GPIO numbers.

For example, physical pin 11 on the header corresponds to GPIO 17.

## Minimal setup

```tsx
import { RpiDOut, rpiPeripherals, RpiHardware } from "@/bridges";
import { createReconciler } from "@/reconciler";

const Program = () => <RpiDOut gpio={17} value={true} />;

async function main() {
	const hardware = new RpiHardware();

	const { render, runEventLoop } = createReconciler(
		rpiPeripherals,
		hardware,
	);

	render(<Program />);
	await runEventLoop();
}

void main();
```

## Components

### `<RpiDOut>`

Digital output. Drives a GPIO pin HIGH or LOW.

| Prop | Type | Description |
|------|------|-------------|
| `gpio` | `number` | BCM GPIO number (immutable after mount) |
| `value` | `boolean` | `true` for HIGH, `false` for LOW |

On unmount, the pin is driven LOW and the GPIO handle is released.

### `<RpiDIn>`

Digital input. Reads a GPIO pin and fires a callback when the value changes.

| Prop | Type | Description |
|------|------|-------------|
| `gpio` | `number` | BCM GPIO number (immutable after mount) |
| `onValueChange` | `(value: boolean, isInitialRead: boolean) => void` | Called when the pin value changes |

The input is polled by the Hertz event loop. Polling frequency depends on loop speed (typically sub-10ms).

## Examples

See `src/examples` for full programs:

- `src/examples/rpi-blink.tsx` -- blink an LED on GPIO 17.
- `src/examples/rpi-follow.tsx` -- output mirrors an input pin.
- `src/examples/rpi-loopback-test.tsx` -- toggle output and verify via input with timing.

## Architecture note

The Raspberry Pi bridge uses a lightweight `RpiHardware` marker class as the reconciler's hardware parameter. Each peripheral creates its own `RIO` instance via dynamic `import("rpi-io")` during initialization. This differs from the ClearCore bridge where a single shared driver is passed to all peripherals.

## Notes

- Identity props (`gpio`) are immutable after mount, as enforced by peripheral implementations.
