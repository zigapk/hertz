import type { RIO } from "rpi-io";
import { createHigherLevelComponent } from "@/reconciler/higher-level-component";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "@/reconciler/pheripheral";
import type { RpiHardware } from "./hardware.js";

interface RpiDPinInBaseProps {
	gpio: number;
}

interface RpiDPinInValues {
	value: boolean;
}

export type RpiDPinInProps = PeripheralProps<
	RpiDPinInBaseProps,
	RpiDPinInValues
>;

export class RpiDPinInPeripheral
	extends BasePeripheral<RpiHardware, RpiDPinInBaseProps, RpiDPinInValues>
	implements PeripheralLifecycleMethods<RpiDPinInBaseProps>
{
	static readonly tagName = "rpidpinin";
	readonly gpio: number;

	refData = {};

	private rio: RIO | null = null;

	constructor(props: RpiDPinInProps, hardware: RpiHardware) {
		super(props, hardware);
		this.gpio = props.gpio;
	}

	async initPeripheral(): Promise<void> {
		const { RIO } = await import("rpi-io");
		this.rio = new RIO(this.gpio, "input");
	}

	async applyGpio(gpio: number): Promise<void> {
		if (gpio !== this.gpio) {
			throw new Error(
				"Changing the gpio after initialization is not supported.",
			);
		}
	}

	async readValuesFromHardware(): Promise<RpiDPinInValues> {
		if (!this.rio) {
			throw new Error("RIO instance not initialized.");
		}
		return { value: Boolean(this.rio.read()) };
	}
}

export const RpiDIn = createHigherLevelComponent(RpiDPinInPeripheral);
