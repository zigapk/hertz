import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    main: 'src/index.ts',
    'jsx-runtime': 'src/jsx-runtime.ts',
  },
  dts: true,
})
