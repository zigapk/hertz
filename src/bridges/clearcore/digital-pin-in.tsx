import { type ClearCore, PinMode } from "llamajet-driver-ts";
import { createHigherLevelComponent } from "@/reconciler/higher-level-component";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "@/reconciler/pheripheral";

interface DPinInBaseProps {
	pin: number;
}

interface DPinInValues {
	value: boolean;
}

export type DPinInProps = PeripheralProps<DPinInBaseProps, DPinInValues>;

export class CCDPinInPeripheral
	extends BasePeripheral<ClearCore, DPinInBaseProps, DPinInValues>
	implements PeripheralLifecycleMethods<DPinInBaseProps>
{
	static readonly tagName = "ccdpinin";
	readonly pin: number;

	refData = {};

	constructor(props: DPinInProps, hardware: ClearCore) {
		super(props, hardware);
		this.pin = props.pin;
	}

	async initPeripheral() {
		await this.hardware.setPinsMode(PinMode.DigitalInput, this.pin);
	}

	async applyPin(pin: number) {
		if (pin !== this.pin) {
			throw new Error(
				"Changing the pin after initialization is not supported.",
			);
		}
	}

	// Read the single value from the pin
	async readValuesFromHardware() {
		const values = await this.hardware.readDigitalSensors(this.pin);
		return { value: values[0] };
	}
}
export const CCDPinIn = createHigherLevelComponent(CCDPinInPeripheral);
