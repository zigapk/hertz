import type { RIO } from "rpi-io";
import { createHigherLevelComponent } from "@/reconciler/higher-level-component";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "@/reconciler/pheripheral";
import type { EmptyObject } from "@/reconciler/types-utils";
import type { RpiHardware } from "./hardware.js";

interface RpiDPinOutBaseProps {
	gpio: number;
	value: boolean;
}

export type RpiDPinOutProps = PeripheralProps<RpiDPinOutBaseProps, EmptyObject>;

export class RpiDPinOutPeripheral
	extends BasePeripheral<RpiHardware, RpiDPinOutBaseProps, EmptyObject>
	implements PeripheralLifecycleMethods<RpiDPinOutBaseProps>
{
	static readonly tagName = "rpidpinout";
	readonly gpio: number;

	refData = {};

	private rio: RIO | null = null;

	constructor(props: RpiDPinOutProps, hardware: RpiHardware) {
		super(props, hardware);
		this.gpio = props.gpio;
	}

	async initPeripheral(): Promise<void> {
		const { RIO } = await import("rpi-io");
		this.rio = new RIO(this.gpio, "output", {
			value: this.props.value ? 1 : 0,
		});
	}

	async applyGpio(gpio: number): Promise<void> {
		if (gpio !== this.gpio) {
			throw new Error(
				"Changing the gpio after initialization is not supported.",
			);
		}
	}

	async applyValue(value: boolean): Promise<void> {
		if (!this.rio) {
			throw new Error("RIO instance not initialized.");
		}
		this.rio.write(value ? 1 : 0);
	}

	async disownValue(): Promise<void> {
		if (this.rio) {
			this.rio.write(0);
			this.rio.close();
			this.rio = null;
		}
	}

	async readValuesFromHardware(): Promise<EmptyObject> {
		return {};
	}
}

export const RpiDOut = createHigherLevelComponent(RpiDPinOutPeripheral);
