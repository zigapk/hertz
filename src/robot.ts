import { Robot } from "llamajet-driver-ts";
import { SerialPort } from "serialport";

const port = new SerialPort({
  path: "/dev/ttyACM0",
  baudRate: 115200,
});

export const robot = new Robot(port);
