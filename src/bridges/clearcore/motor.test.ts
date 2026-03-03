import type { ClearCore, MotorState } from "llamajet-driver-ts";
import { describe, expect, it, vi } from "vitest";
import { CCMotorPeripheral } from "./motor.js";

function createHardwareMock(position = 0): ClearCore {
	const motorState = { position } as unknown as MotorState;

	return {
		motorsSetEStopPin: vi.fn(async () => {}),
		enableMotors: vi.fn(async () => {}),
		disableMotors: vi.fn(async () => {}),
		stopMotors: vi.fn(async () => {}),
		setMotorsVelocity: vi.fn(async () => {}),
		moveMotors: vi.fn(async () => {}),
		readMotors: vi.fn(async () => [motorState]),
		setMotorsHome: vi.fn(async () => {}),
	} as unknown as ClearCore;
}

function createProps(
	overrides: Partial<ConstructorParameters<typeof CCMotorPeripheral>[0]> = {},
) {
	return {
		port: 1,
		onError: vi.fn(),
		enabled: true,
		...overrides,
	};
}

describe("CCMotorPeripheral", () => {
	it("configures eStop pin even when pin is 0", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCMotorPeripheral(
			createProps({ eStopPin: 0 }),
			hardware,
		);

		await peripheral.initPeripheral();

		expect(hardware.motorsSetEStopPin).toHaveBeenCalledWith(0);
	});

	it("enables and disables motor based on enabled prop", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCMotorPeripheral(createProps(), hardware);

		await peripheral.applyEnabled(true);
		await peripheral.applyEnabled(false);

		expect(hardware.enableMotors).toHaveBeenCalledWith(1);
		expect(hardware.disableMotors).toHaveBeenCalledWith(1);
	});

	it("applies velocity target movement", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCMotorPeripheral(createProps(), hardware);

		await peripheral.applyTarget({ targetVelocity: 120, acceleration: 500 });

		expect(hardware.stopMotors).toHaveBeenCalledWith(1);
		expect(hardware.setMotorsVelocity).toHaveBeenCalledWith({
			id: 1,
			velocity: 120,
			acceleration: 500,
		});
	});

	it("applies position target movement using current position diff", async () => {
		const hardware = createHardwareMock(10);
		const peripheral = new CCMotorPeripheral(createProps(), hardware);

		await peripheral.applyTarget({
			targetPosition: 40,
			targetVelocity: 200,
			acceleration: 50,
		});

		expect(hardware.moveMotors).toHaveBeenCalledWith({
			id: 1,
			steps: 30,
			velocity: 200,
			acceleration: 50,
		});
	});

	it("throws for non-positive acceleration", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCMotorPeripheral(createProps(), hardware);

		await expect(
			peripheral.applyTarget({ targetVelocity: 100, acceleration: 0 }),
		).rejects.toThrow("Acceleration must be positive");
	});

	it("throws when target shape is invalid", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCMotorPeripheral(createProps(), hardware);

		await expect(
			peripheral.applyTarget({
				targetPosition: 10,
				// biome-ignore lint/suspicious/noExplicitAny: Intentionally invalid runtime shape for test coverage
				targetVelocity: undefined as any,
				acceleration: 10,
			}),
		).rejects.toThrow("Target must be set");
	});

	it("disowns enabled and target props by stopping and disabling", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCMotorPeripheral(createProps(), hardware);

		await peripheral.disownEnabled();
		await peripheral.disownTarget();

		expect(hardware.stopMotors).toHaveBeenCalledWith(1);
		expect(hardware.disableMotors).toHaveBeenCalledWith(1);
	});

	it("exposes setHome in refData", async () => {
		const hardware = createHardwareMock();
		const peripheral = new CCMotorPeripheral(createProps(), hardware);

		await peripheral.refData.setHome();

		expect(hardware.setMotorsHome).toHaveBeenCalledWith(1);
	});
});
