import { createHigherLevelComponent } from "../reconciler/higher-level-component.js";
import {
	BasePeripheral,
	type PeripheralLifecycleMethods,
	type PeripheralProps,
} from "../reconciler/pheripheral.js";
import type { IntrinsicPeripherals } from "../reconciler/types-utils.js";

type MockOutputState = Map<number, boolean>;
type MockInputState = Map<number, boolean>;

export interface MockHardware {
	readonly log: string[];
	readonly outputState: MockOutputState;
	readonly inputState: MockInputState;
	readonly eStopPins: number[];
	setOutput: (channel: number, value: boolean) => Promise<void>;
	readInput: (channel: number) => Promise<boolean>;
	setEStopPin: (pin: number) => Promise<void>;
	record: (message: string) => void;
}

export function createMockHardware(): MockHardware {
	const log: string[] = [];
	const outputState: MockOutputState = new Map();
	const inputState: MockInputState = new Map();
	const eStopPins: number[] = [];

	return {
		log,
		outputState,
		inputState,
		eStopPins,
		record(message: string) {
			log.push(message);
		},
		async setOutput(channel: number, value: boolean) {
			log.push(`setOutput:${channel}:${String(value)}`);
			outputState.set(channel, value);
		},
		async readInput(channel: number) {
			log.push(`readInput:${channel}`);
			return inputState.get(channel) ?? false;
		},
		async setEStopPin(pin: number) {
			log.push(`setEStopPin:${pin}`);
			eStopPins.push(pin);
		},
	};
}

interface MockBusProps {
	name: string;
}

interface MockBusRefData {
	kind: "mockbus";
}

type MockBusPeripheralProps = PeripheralProps<
	MockBusProps,
	Record<string, never>
>;

export class MockBusPeripheral
	extends BasePeripheral<
		MockHardware,
		MockBusProps,
		Record<string, never>,
		MockBusRefData
	>
	implements PeripheralLifecycleMethods<MockBusProps>
{
	static readonly tagName = "mockbus";
	readonly name: string;
	readonly refData: MockBusRefData;

	constructor(props: MockBusPeripheralProps, hardware: MockHardware) {
		super(props, hardware);
		this.name = props.name;
		this.refData = { kind: "mockbus" };
	}

	async initPeripheral(): Promise<void> {
		this.hardware.record(`init:bus:${this.name}`);
	}

	async applyName(name: string): Promise<void> {
		if (name !== this.name) {
			throw new Error(
				"Changing bus name after initialization is not supported.",
			);
		}
	}

	async readValuesFromHardware(): Promise<Record<string, never>> {
		return {};
	}
}

interface MockOutputProps {
	channel: number;
	value?: boolean;
}

interface MockOutputRefData {
	kind: "mockoutput";
	channel: number;
}

type MockOutputPeripheralProps = PeripheralProps<
	MockOutputProps,
	Record<string, never>
>;

export class MockOutputPeripheral
	extends BasePeripheral<
		MockHardware,
		MockOutputProps,
		Record<string, never>,
		MockOutputRefData
	>
	implements PeripheralLifecycleMethods<MockOutputProps>
{
	static readonly tagName = "mockoutput";
	readonly channel: number;
	readonly refData: MockOutputRefData;

	constructor(props: MockOutputPeripheralProps, hardware: MockHardware) {
		super(props, hardware);
		this.channel = props.channel;
		this.refData = { kind: "mockoutput", channel: this.channel };
	}

	async initPeripheral(): Promise<void> {
		this.hardware.record(`init:output:${this.channel}`);
	}

	async applyChannel(channel: number): Promise<void> {
		if (channel !== this.channel) {
			throw new Error(
				"Changing channel after initialization is not supported.",
			);
		}
	}

	async applyValue(value: boolean): Promise<void> {
		await this.hardware.setOutput(this.channel, value);
	}

	async disownValue(): Promise<void> {
		await this.hardware.setOutput(this.channel, false);
	}

	async readValuesFromHardware(): Promise<Record<string, never>> {
		return {};
	}
}

interface MockInputProps {
	channel: number;
}

interface MockInputValues {
	value: boolean;
}

interface MockInputRefData {
	kind: "mockinput";
	channel: number;
}

type MockInputPeripheralProps = PeripheralProps<
	MockInputProps,
	MockInputValues
>;

export class MockInputPeripheral
	extends BasePeripheral<
		MockHardware,
		MockInputProps,
		MockInputValues,
		MockInputRefData
	>
	implements PeripheralLifecycleMethods<MockInputProps>
{
	static readonly tagName = "mockinput";
	readonly channel: number;
	readonly refData: MockInputRefData;

	constructor(props: MockInputPeripheralProps, hardware: MockHardware) {
		super(props, hardware);
		this.channel = props.channel;
		this.refData = { kind: "mockinput", channel: this.channel };
	}

	async initPeripheral(): Promise<void> {
		this.hardware.record(`init:input:${this.channel}`);
	}

	async applyChannel(channel: number): Promise<void> {
		if (channel !== this.channel) {
			throw new Error(
				"Changing channel after initialization is not supported.",
			);
		}
	}

	async readValuesFromHardware(): Promise<MockInputValues> {
		const value = await this.hardware.readInput(this.channel);
		return { value };
	}
}

interface MockMotorProps {
	port: number;
	eStopPin?: number;
	enabled?: boolean;
}

interface MockMotorValues {
	enabled: boolean;
}

interface MockMotorRefData {
	kind: "mockmotor";
	port: number;
}

type MockMotorPeripheralProps = PeripheralProps<
	MockMotorProps,
	MockMotorValues
>;

export class MockMotorPeripheral
	extends BasePeripheral<
		MockHardware,
		MockMotorProps,
		MockMotorValues,
		MockMotorRefData
	>
	implements PeripheralLifecycleMethods<MockMotorProps>
{
	static readonly tagName = "mockmotor";
	readonly port: number;
	readonly eStopPin?: number;
	readonly refData: MockMotorRefData;

	constructor(props: MockMotorPeripheralProps, hardware: MockHardware) {
		super(props, hardware);
		this.port = props.port;
		this.eStopPin = props.eStopPin;
		this.refData = { kind: "mockmotor", port: this.port };
	}

	async initPeripheral(): Promise<void> {
		if (this.eStopPin !== undefined) {
			await this.hardware.setEStopPin(this.eStopPin);
		}
		this.hardware.record(`init:motor:${this.port}`);
	}

	async applyPort(port: number): Promise<void> {
		if (port !== this.port) {
			throw new Error("Changing port after initialization is not supported.");
		}
	}

	async applyEStopPin(pin: number): Promise<void> {
		if (pin !== this.eStopPin) {
			throw new Error(
				"Changing eStopPin after initialization is not supported.",
			);
		}
	}

	async applyEnabled(enabled: boolean): Promise<void> {
		this.hardware.record(`setEnabled:${this.port}:${String(enabled)}`);
	}

	async disownEnabled(): Promise<void> {
		this.hardware.record(`setEnabled:${this.port}:false`);
	}

	async readValuesFromHardware(): Promise<MockMotorValues> {
		return { enabled: false };
	}
}

export const MockBus = createHigherLevelComponent(MockBusPeripheral);
export const MockOutput = createHigherLevelComponent(MockOutputPeripheral);
export const MockInput = createHigherLevelComponent(MockInputPeripheral);
export const MockMotor = createHigherLevelComponent(MockMotorPeripheral);

export const mockPeripherals = [
	MockBusPeripheral,
	MockOutputPeripheral,
	MockInputPeripheral,
	MockMotorPeripheral,
] as const;

declare module "react" {
	namespace JSX {
		interface IntrinsicElements
			extends IntrinsicPeripherals<(typeof mockPeripherals)[number]> {}
	}
}
