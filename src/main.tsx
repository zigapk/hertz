import { render, runEventLoop } from "./reconciler";
import React from "react";
import { robot } from "./robot";

function Follow() {
  const [value, setValue] = React.useState(0);
  return (
    <>
      {/* @ts-expect-error */}
      <dpinin pin={0} onChange={(value) => setValue(value)} />
      {/* @ts-expect-error */}
      <dpinout pin={1} value={value} />
    </>
  );
}

async function main() {
  await robot.connect();
  render(<Follow />);
  await runEventLoop();
}

main();

// TODO: if possible also add timeout for too long renreders
// TODO: why are there more listeners added to serial port?
// TODO: implement 'memoizable' class that will be able to call all onChange handlers automatically
