# ClearCore firmware and serial protocol

This firmware (`firmware.ino`) runs on the ClearCore board and exposes a serial command protocol used by the Hertz ClearCore bridge.

On the Node side, Hertz uses `llamajet-driver-ts`, which speaks this protocol over USB serial. Firmware and driver must stay protocol-compatible.

## Flashing

1. Open `firmware.ino` in Arduino IDE.
2. Open Preferences.
3. Add this URL to `Additional Boards Manager URLs`:

```text
https://www.teknic.com/files/downloads/package_clearcore_index.json
```

4. Install the Teknic ClearCore board package from Board Manager.
5. Select the ClearCore board in Tools > Board.
6. Select the serial port and upload.

## Protocol basics

- Transport: USB serial
- Baud rate: `115200`
- Delimiter: `;`
- Command terminator: `\n`
- Buffer reset command: `\r`
- Numeric encoding: decimal integers

## Command format

```text
MESSAGE_ID;COMMAND;ARG_COUNT;ARG0;ARG1;...;ARGN;\n
```

- `MESSAGE_ID`: caller-defined correlation id
- `COMMAND`: command identifier
- `ARG_COUNT`: number of numeric arguments
- `ARG0..ARGN`: integer arguments

## Response format

```text
MESSAGE_ID;ERROR_CODE;RES0;RES1;...;RESN;\n
```

- `MESSAGE_ID`: echoes command id
- `ERROR_CODE`: `0` means success
- `RES0..RESN`: command result payload (may be empty)

## Error codes

| Error code | Name |
| --- | --- |
| `0` | `OK` |
| `1` | `ERR_COMMAND_UNKNOWN` |
| `2` | `ERR_PORT_UNAVAILABLE` |
| `3` | `ERR_PORT_MODE_INVALID` |
| `4` | `ERR_ABS_ENCODER_NOT_CONNECTED` |

## Supported commands

| Command | Args | Result |
| --- | --- | --- |
| `GET_VERSION` | none | firmware version bytes |
| `MOTORS_STATE` | selector | per-motor state tuples |
| `MOTORS_ENABLE` | selector | none |
| `MOTORS_MOVE` | selector + triplets | none |
| `MOTORS_HOME` | selector | none |
| `MOTORS_SET_VELOCITY` | selector + pairs | none |
| `MOTORS_STOP_ABRUPT` | selector | none |
| `DSENSORS_STATE` | selector | digital values |
| `ASENSORS_STATE` | selector | analog values (mV) |
| `DPINS_SET` | selector + values | none |
| `MOTORS_SET_ESTOP_PIN` | pin index | none |
| `EXPANSION_BOARDS_STATE` | none | board count + port count |
| `PINS_MODE_SET` | selector + mode | none |
| `ABS_ENCODER_POSITION` | none | absolute encoder value |

## Notes

- Selector arguments are bitmasks. For example, selector `5` (`0101` in binary) targets indices 0 and 2.
- `GET_VERSION` in source defaults to all zeroes unless replaced during build/distribution.
- Commands and responses are line-based; always send terminating `\n`.
