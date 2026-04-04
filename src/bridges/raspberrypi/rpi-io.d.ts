/**
 * Type declarations for the rpi-io module.
 * rpi-io is a native ESM module for controlling Raspberry Pi GPIO via libgpiod.
 * It only compiles and runs on ARM Linux (Raspberry Pi).
 *
 * @see https://github.com/gdorbes/rpi-io
 */
declare module "rpi-io" {
	type RIOMode = "input" | "output" | "pwm";
	type RIOBias = "disable" | "pull-up" | "pull-down";
	type RIOEdge = "rising" | "falling" | "both";

	interface RIOOptions {
		/** Initial value for output mode (0 or 1). Default: 0 */
		value?: number;
		/** Circuit bias for input mode. Default: "disable" */
		bias?: RIOBias;
		/** PWM export delay in ms (-1 for auto). Default: -1 */
		exportTime?: number;
		/** PWM period in microseconds. Default: 20000 (~50Hz) */
		period?: number;
		/** PWM duty min in microseconds. Default: 0 */
		dutyMin?: number;
		/** PWM duty max in microseconds. Default: 20000 */
		dutyMax?: number;
	}

	/**
	 * GPIO line controller. Each instance manages a single GPIO line.
	 */
	export class RIO {
		/** BCM GPIO line number */
		readonly line: number;
		/** Operating mode */
		readonly mode: RIOMode;
		/** Whether the instance has been closed */
		closed: boolean;

		/**
		 * Create a new GPIO line controller.
		 * @param line - BCM GPIO number (e.g. 17, 27)
		 * @param mode - "input", "output", or "pwm"
		 * @param opt - Mode-specific options
		 */
		constructor(line: number, mode: RIOMode, opt?: RIOOptions);

		/**
		 * Write a value to an output GPIO line.
		 * @param value - 0 (LOW) or 1 (HIGH)
		 */
		write(value: number): void;

		/**
		 * Read the current value from an input GPIO line.
		 * @returns 0 (LOW) or 1 (HIGH)
		 */
		read(): number;

		/** Close the instance and free resources. */
		close(): void;

		/**
		 * Start monitoring input events.
		 * @param callback - Called with the edge type on each event
		 * @param edge - Which edges to monitor. Default: "both"
		 * @param bounce - Debounce threshold in ms. Default: 0
		 */
		monitoringStart(
			callback: (edge: RIOEdge) => void,
			edge?: RIOEdge,
			bounce?: number,
		): void;

		/** Stop monitoring input events. */
		monitoringStop(): void;

		/** Close all RIO instances. */
		static closeAll(): void;

		/**
		 * Get the Raspberry Pi model string.
		 * @returns Model identifier ("5B", "4B", "3B", "Zero2", "Zero", or "")
		 */
		static model(): string;
	}

	/**
	 * Register a callback for Ctrl+C (SIGINT) handling.
	 * @param callback - Function to call on interrupt
	 */
	export function ctrlC(callback: () => void): void;

	/**
	 * Async sleep utility.
	 * @param ms - Milliseconds to sleep
	 */
	export function sleep(ms: number): Promise<void>;
}
