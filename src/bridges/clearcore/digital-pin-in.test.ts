import { type ClearCore, PinMode } from "llamajet-driver-ts";
import { describe, expect, it, vi } from "vitest";
import { CCDPinInPeripheral, type DPinInProps } from "./digital-pin-in.js";

function createProps(overrides: Partial<DPinInProps> = {}): DPinInProps {
	return {
		pin: 4,
		onError: vi.fn(),
		onValueChange: vi.fn(),
		...overrides,
	};
}

function createHardwareMock(readValue = false): ClearCore {
	return {
		setPinsMode: vi.fn(async () => {}),
		readDigitalSensors: vi.fn(async () => [readValue]),
	} as unknown as ClearCore;
}

describe("CCDPinInPeripheral", () => {
	it("initializes input mode", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCDPinInPeripheral(createProps(), hardware);

		await peripheral.initPeripheral();

		expect(hardware.setPinsMode).toHaveBeenCalledWith(PinMode.DigitalInput, 4);
	});

	it("reads the input value from hardware", async () => {
		const hardware = createHardwareMock(true);
		const peripheral = new CCDPinInPeripheral(createProps(), hardware);

		await expect(peripheral.readValuesFromHardware()).resolves.toEqual({
			value: true,
		});
		expect(hardware.readDigitalSensors).toHaveBeenCalledWith(4);
	});

	it("throws when changing pin after initialization", async () => {
		const peripheral = new CCDPinInPeripheral(
			createProps({ pin: 4 }),
			createHardwareMock(),
		);

		await expect(peripheral.applyPin(5)).rejects.toThrow(
			"Changing the pin after initialization is not supported.",
		);
	});
});
