
# React Hertz 💡


![Let a picture speak a thousand words.](docs/assets/blink.gif).

Hertz is a React framework (or reconciler/renderer) for driving hardware peripherals. **It projects the internal state of your React app to the physical world** instead of a [screen](https://www.npmjs.com/package/react-dom), [video](https://www.remotion.dev/) or [terminal](https://github.com/vadimdemedes/ink).

**NOTE**: Ihis is very much a work in progress. The docs are lacking, the API is not stable and tests are largely non-existent. However, you are very much welcome to play around with the project.

Curious or sceptical? Checkout the [soon-to-be blog post](https://www.youtube.com/watch?v=xvFZjo5PgG0&list=RDxvFZjo5PgG0&start_radio=1).

## Quick start

You'll need some hardware to control. For now, Hertz supports:
- [ClearCore](https://clearcore.ai/) - [docs](./src/bridges/clearcore/README.md)
- [Arduino](https://www.arduino.cc/) - [docs](./src/bridges/arduino/README.md)
- [Raspberry Pi](https://www.raspberrypi.com/) - [docs](./src/bridges/raspberry/README.md)
- writing your own bridge. This is quite easy, see [Bring Your Own Peripheral](./docs/bring-your-own-peripheral.md).

Hertz needs to run **within a Node.js-like environment**. This means that:
1. Rasppbery Pi can control the hardware on the defice itself.
2. Arduino and other controlers incapable of running Node need to be controller from a computer (for example using a serial connection).
3. You cannot run it in a browser. There appears to be no reason why Hertz would be incompatible with Deno or Bun, but we did not test this as of yet.

### Project Setup and Installation
We suggest starting with a typescript project within node and using `tsx` to run the code. Then, install Hertz (only installation from GitHub is supported ATM):

```
pnpm add github:zigapk/hertz
```















TODO:
- docs
- add arduino and clearcore bridges
- add ci
- expose this as a package installable from github
