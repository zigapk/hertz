import type { ClearCore } from "llamajet-driver-ts";
import { PinMode } from "llamajet-driver-ts";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "@/reconciler/pheripheral";
import type { EmptyObject } from "@/reconciler/types-utils";

interface DPinOutBaseProps {
	pin: number;
	value: boolean;
}

// Base props here equal PheripheralProps (because EmptyObject generates not onXYZChange callbacks), but we do this anyway for the sake of consistency.
export type DPinOutProps = PeripheralProps<DPinOutBaseProps, EmptyObject>;

export class DPinOut
	extends BasePeripheral<ClearCore, DPinOutProps, EmptyObject>
	implements PeripheralLifecycleMethods<DPinOutBaseProps>
{
	static readonly tagName = "dpinout";
	readonly pin: number;

	refData = {};

	constructor(props: DPinOutProps, hardware: ClearCore) {
		super(props, hardware);
		this.pin = props.pin;
	}

	async initPeripheral() {
		await this.hardware.setPinsMode(PinMode.DigitalOutput, this.pin);
		await this.hardware.writeDigitalPins({
			id: this.pin,
			value: this.props.value,
		});
	}

	async applyPin(pin: number) {
		if (pin !== this.pin) {
			throw new Error(
				"Changing the pin after initialization is not supported.",
			);
		}
	}

	async applyValue(value: boolean) {
		await this.hardware.writeDigitalPins({
			id: this.pin,
			value,
		});
	}

	async disownValue() {
		await this.hardware.writeDigitalPins({
			id: this.pin,
			value: false,
		});
	}

	async readValuesFromHardware() {
		return {};
	}
}
