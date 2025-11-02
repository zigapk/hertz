# Bring your own hardware

This document outlines how to write a bridge for a new peripheral to be wired up to Hertz.

## Prequisites
This shuld be relatively easy but requires a few things:
1. There should be a way to control hardware from Node.js. This might be a library like [pgpio](https://github.com/fivdi/pigpio) for Raspberry Pi.
2. The controll interface must adhere to three rules:
    - **It must be stateless** - you send commands specifying target states and read values, but do not have to remember anything or be carefull in what sequence you do this. **The controller itself might not be stateless, but the interface must be.** If this is a problem, you can first write a wrapper around the libarary in question to make it stateless. 
    - **It must be synchronus** - after the call we should be certain that it went through and did what it was supposed to do. This does not mean that the target state was necessarily reached, but that the hardware controller has acknowledged it.
    - **It must evalaute fast** - we cannot afford to wait for several seconds for a response from the hardware. 

All of those might seem kinda spooky, but are all good design practices and allow us to build anything we want. To that end, let's look at a few examples.

**Example 1**: A digital output pin
It is easy to see why a digital output pin fits all the criteria above - it does not care about the sequence of commands being set, it executes them synchronously and fast.

**Example 2**: A digital input pin
The pin is easily read synchronously and fast.

**Example 2**: A stepper motor
TODO: image
A stepper motor can be controlled via GPIO pins, but we must be smart about the implementation to make the controll synchronous, stateless and fast.

The library that our bridge will connect to has to:
1. Store some information about **current position** and **target position** in some kind of internal state.
2. Have a loop/interval that periodically revisits the state and drives the hardware towards the target position.

Such smart controller can then expose an interface such as the one below to be wired in as a Hertz peripheral:
- `setTargetPosition(position: number)`: Sets the target position for the motor.
- `getCurrentState() : { currentPosition: number, targetPosition: number, targetReached: boolean }`: Returns the current state of the motor.

Here is a list of ideas for other peripherals that might be driven by Hertz (provided there is a controller that adheres to the above rules):
- Stepper motors,
- PC LED lights,
- LED strips,
- Segment displays,
- Roomba vacuum cleaners etc.

Hertz might not always be the best choice, but we'd argue for the cases above, it can make a lot of sense to use it.


## Writing a bridge

Start by defining what (target) values need to/can be specified to the peripehral and what values can be read from it. We'll use Raspberry Pi's digital input pin as an example:

```ts

interface BaseProps {
    pin: number; // We need to specify which pin we're controlling.
}

interface Values {
    value: boolean; // We can read the current value of the pin (true = high, false = low).
}
```

Then, you expand the `Props` using `PeripheralProps`. This will create a type that includes the `on...Change` callbacks for all the keys specified in `Values`. For example:
```ts

import type { PeripheralProps } from "@/reconciler/pheripheral";

export type Props = PeripheralProps<BaseProps, Values>;
/** Expands to:
  * type Props = {
  *   value: boolean;
  *  onValueChange?: (value: boolean, isInitialRead: boolean) => void;
  * }
  **/
```

How, we can create our class that extends the abstract `Peripheral` class.

```ts
import { Peripheral } from "@/reconciler/pheripheral";

// TODO: write it
```
