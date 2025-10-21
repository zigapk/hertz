import { type ClearCore, PinMode } from "llamajet-driver-ts";
import { Peripheral, type PeripheralProps } from "@/reconciler/pheripheral";

interface DPinInBaseProps {
	pin: number;
}

interface DPinInValues {
	value: boolean;
}

export type DPinInProps = PeripheralProps<DPinInBaseProps, DPinInValues>;

export class DPinIn extends Peripheral<
	ClearCore,
	DPinInBaseProps,
	DPinInValues
> {
	static readonly tagName = "dpinin";
	readonly pin: number;

	constructor(props: DPinInProps, hardware: ClearCore) {
		super(props, hardware);
		this.pin = props.pin;
	}

	async initPeripheral(): Promise<void> {
		await this.hardware.setPinsMode(PinMode.DigitalInput, this.pin);
	}

	// Nothing to disconnect here
	async disconnectPeripheral(): Promise<void> {}

	// There is nothing really to apply
	override async applyNewPropsToHardware(props: DPinInProps): Promise<void> {
		if (props.pin !== this.pin) {
			throw new Error(
				"Cannot change pin after the fact - unmount and remount the component.",
			);
		}
		await super.applyNewPropsToHardware(props);
	}

	// Read the single value from the pin
	async readValuesFromHardware(): Promise<DPinInValues> {
		const values = await this.hardware.readDigitalSensors(this.pin);
		return { value: values[0] };
	}
}
