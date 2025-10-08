import { MotorState, PinMode } from "llamajet-driver-ts";
import { robot } from "./robot";

// TODO: there is still a dream of auto onXYZChange memoization
// @ts-expect-error
export abstract class Pheripheral<Props, Values extends object> {
  constructor() {}

  abstract initPheripheral(): void;
  abstract onPropsChange(props: Props): Promise<void>;
  abstract queryForChanges(): Promise<void>;
}

interface DPinOutProps {
  pin: number;
  value: boolean;
}

export class DPinOut extends Pheripheral<DPinOutProps, {}> {
  readonly pin: number;
  value: boolean;

  constructor(props: DPinOutProps) {
    super();
    this.pin = props.pin;
    this.value = props.value;
  }

  async initPheripheral(): Promise<void> {
    await robot.setPinsMode(PinMode.DigitalOutput, this.pin);
  }

  async onPropsChange(props: DPinOutProps): Promise<void> {
    // Pin cannot be changed because we'd then need to re-init the peripheral
    if (props.pin !== this.pin) {
      throw new Error(
        "Cannot change pin after the fact - unmount and remount the component.",
      );
    }

    this.value = props.value;
    await robot.writeDigitalPins({
      id: this.pin,
      value: this.value,
    });
  }

  async queryForChanges(): Promise<void> {}
}

interface DPinInProps {
  pin: number;
  onChange?: (value: boolean) => void;
}

interface DPinInValues {
  value: boolean;
}

export class DPinIn extends Pheripheral<DPinInProps, DPinInValues> {
  readonly pin: number;
  onChange?: (value: boolean) => void;
  lastValue?: boolean;

  constructor(props: DPinInProps) {
    super();
    this.pin = props.pin;
    this.onChange = props.onChange;
  }

  async initPheripheral(): Promise<void> {
    await robot.setPinsMode(PinMode.DigitalInput, this.pin);
  }

  override onPropsChange(props: DPinInProps): Promise<void> {
    // Pin cannot be changed because we'd then need to re-init the peripheral
    if (props.pin !== this.pin) {
      throw new Error(
        "Cannot change pin after the fact - unmount and remount the component.",
      );
    }

    this.onChange = props.onChange;

    return Promise.resolve();
  }

  async queryForChanges(): Promise<void> {
    const values = await robot.readDigitalSensors(this.pin);
    const value = values[0];

    if (this.lastValue !== value) {
      this.lastValue = value;
      this.onChange?.(value);
    }
  }
}

// Motor taget is either a position with velocity or just velocity. Both need acceleration
type MotorTargetProps =
  | { targetPosition: number; targetVelocity: number; acceleration: number }
  | { targetVelocity: number; targetPosition: never; acceleration: number }
  | { targetPosition: never; targetVelocity: never; acceleration: never };

interface BaseMotorProps {
  port: number;
  onChange?: (value: MotorState) => void;
  enabled?: boolean;
  eStopPin?: number;
}

type MotorProps = BaseMotorProps & MotorTargetProps;

export class Motor extends Pheripheral<MotorProps, MotorState> {
  readonly port: number;
  onChange?: (value: MotorState) => void;
  enabled?: boolean;
  readonly eStopPin?: number;
  targetPosition?: number;
  targetVelocity?: number;
  acceleration?: number;
  lastMotorState?: MotorState;

  constructor(props: MotorProps) {
    super();
    this.port = props.port;
    this.onChange = props.onChange;
    this.enabled = props.enabled;
    this.eStopPin = props.eStopPin;
    this.targetPosition = props.targetPosition;
    this.targetVelocity = props.targetVelocity;
    this.acceleration = props.acceleration;
  }

  initPheripheral(): void {
    if (this.eStopPin) {
      robot.motorsSetEStopPin(this.eStopPin);
    }
  }

  override async onPropsChange(props: MotorProps): Promise<void> {
    // Port and estop pin cannot be changed because we'd then need to re-init the peripheral
    if (props.port !== this.port || props.eStopPin !== this.eStopPin) {
      throw new Error(
        "Cannot change port or estop pin after the fact - unmount and remount the component.",
      );
    }

    // Handle easy props
    this.onChange = props.onChange;
    this.acceleration = props.acceleration;

    // Handle enabled state
    if (this.enabled !== props.enabled) {
      this.enabled = props.enabled;

      if (this.enabled) {
        await robot.enableMotors(this.port);
      } else {
        await robot.disableMotors(this.port);
      }
    }

    // Handle any actual movement
    if (
      props.targetPosition != null &&
      props.targetVelocity != null &&
      this.targetPosition !== props.targetPosition
    ) {
      // Handle target position
      this.targetPosition = props.targetPosition;
      this.targetVelocity = props.targetVelocity;
      await robot.stopMotors(this.port);

      // Once stopped, read current position and calculate the diff
      const motorState = (await robot.readMotors(this.port))[0];
      const currentPosition = motorState.position;
      const diff = this.targetPosition - currentPosition;

      // Move to the new position
      await robot.moveMotors({
        id: this.port,
        velocity: this.targetVelocity,
        acceleration: this.acceleration,
        steps: diff,
      });
    } else if (
      props.targetVelocity != null &&
      this.targetVelocity !== props.targetVelocity
    ) {
      // Handle velocity movement
      this.targetVelocity = props.targetVelocity;
      await robot.stopMotors(this.port);
      // Init the velocity movement
      await robot.setMotorsVelocity({
        id: this.port,
        velocity: this.targetVelocity,
        acceleration: this.acceleration,
      });
    }
  }

  async queryForChanges(): Promise<void> {
    const newMotorState = (await robot.readMotors(this.port))[0];

    const hasStateChanged =
      JSON.stringify(newMotorState) !== JSON.stringify(this.lastMotorState);

    if (hasStateChanged) {
      this.lastMotorState = newMotorState;
      this.onChange?.(newMotorState);
    }
  }
}
