/**
 * Minimal hardware marker for the Raspberry Pi bridge.
 *
 * Unlike ClearCore where a single driver instance is shared across peripherals,
 * on RPi each peripheral creates its own RIO instance for direct GPIO access.
 * This class satisfies the reconciler's generic Hardware parameter.
 */
export class RpiHardware {
	/** A label to identify this hardware type in logs/errors. */
	readonly name = "RaspberryPi";
}
