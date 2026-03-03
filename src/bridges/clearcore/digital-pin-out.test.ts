import type { ClearCore } from "llamajet-driver-ts";
import { PinMode } from "llamajet-driver-ts";
import { describe, expect, it, vi } from "vitest";
import { CCDPinOutPeripheral, type DPinOutProps } from "./digital-pin-out.js";

function createProps(overrides: Partial<DPinOutProps> = {}): DPinOutProps {
	return {
		pin: 3,
		value: false,
		onError: vi.fn(),
		...overrides,
	};
}

function createHardwareMock() {
	return {
		setPinsMode: vi.fn(async () => {}),
		writeDigitalPins: vi.fn(async () => {}),
	} as unknown as ClearCore;
}

describe("CCDPinOutPeripheral", () => {
	it("initializes output mode and writes the initial value", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCDPinOutPeripheral(
			createProps({ value: true }),
			hardware,
		);

		await peripheral.initPeripheral();

		expect(hardware.setPinsMode).toHaveBeenCalledWith(PinMode.DigitalOutput, 3);
		expect(hardware.writeDigitalPins).toHaveBeenCalledWith({
			id: 3,
			value: true,
		});
	});

	it("writes changed output values", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCDPinOutPeripheral(createProps(), hardware);

		await peripheral.applyValue(true);

		expect(hardware.writeDigitalPins).toHaveBeenCalledWith({
			id: 3,
			value: true,
		});
	});

	it("disowns output by driving pin low", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCDPinOutPeripheral(
			createProps({ value: true }),
			hardware,
		);

		await peripheral.disownValue();

		expect(hardware.writeDigitalPins).toHaveBeenCalledWith({
			id: 3,
			value: false,
		});
	});

	it("throws when changing pin after initialization", async () => {
		const peripheral = new CCDPinOutPeripheral(
			createProps({ pin: 3 }),
			createHardwareMock(),
		);

		await expect(peripheral.applyPin(4)).rejects.toThrow(
			"Changing the pin after initialization is not supported.",
		);
	});
});
