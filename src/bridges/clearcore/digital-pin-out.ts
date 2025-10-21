import type { ClearCore } from "llamajet-driver-ts";
import { PinMode } from "llamajet-driver-ts";
import { Peripheral, type PeripheralProps } from "@/reconciler/pheripheral";
import type { EmptyObject } from "@/reconciler/types-utils";

interface DPinOutBaseProps {
	pin: number;
	value: boolean;
}

// Base props here equal PheripheralProps (because EmptyObject generates not onXYZChange callbacks), but we do this anyway for the sake of consistency.
export type DPinOutProps = PeripheralProps<DPinOutBaseProps, EmptyObject>;

export class DPinOut extends Peripheral<ClearCore, DPinOutProps, EmptyObject> {
	static readonly tagName = "dpinout";
	readonly pin: number;

	constructor(props: DPinOutProps, hardware: ClearCore) {
		super(props, hardware);
		this.pin = props.pin;
	}

	async initPeripheral(): Promise<void> {
		await this.hardware.setPinsMode(PinMode.DigitalOutput, this.pin);
		await this.hardware.writeDigitalPins({
			id: this.pin,
			value: this.props.value,
		});
	}

	// Nothing to disconnect here
	async disconnectPeripheral(): Promise<void> {}

	override async applyNewPropsToHardware(props: DPinOutProps): Promise<void> {
		await super.applyNewPropsToHardware(props);

		if (props.pin !== this.pin) {
			throw new Error(
				"Cannot change pin after the fact - unmount and remount the component.",
			);
		}

		// Write the value to the pin
		await this.hardware.writeDigitalPins({
			id: this.pin,
			value: props.value,
		});
	}

	async readValuesFromHardware(): Promise<EmptyObject> {
		return {};
	}
}
