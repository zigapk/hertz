# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

Hertz is a custom React renderer for hardware peripherals. Instead of rendering to a DOM, it reconciles React state into device operations (motors, digital pins, etc.).

- Package manager: `pnpm` (`packageManager: pnpm@10.13.1`)
- Runtime/dev execution: Node.js + `tsx`
- Build tool: `tsdown`
- Language: TypeScript (`strict` enabled)
- Module mode: `NodeNext` (ESM; local runtime imports should use `.js`)

## Critical Safety Rules (Read First)

This codebase can drive physical hardware. Unsafe execution can damage equipment or injure people.

- Never run hardware-connected examples as an agent.
- Never execute any command that talks to real peripherals.
- Restrict yourself to build, lint, static checks, and code edits.
- Ask the user to run manual hardware tests.

Forbidden commands (agent must not run):

- `pnpm example:*`
- `tsx src/examples/*`
- Any equivalent script that initializes ClearCore / GPIO / serial-connected hardware

## Build, Lint, Typecheck, Test

Use these commands for safe verification:

```bash
pnpm install
pnpm build
pnpm prepare
npx biome check
npx biome check --write
npx biome lint
npx biome format
npx tsc --noEmit
```

### Test Status

There is currently no configured test runner and no `*.test.*` / `*.spec.*` files in the repo.

- `package.json` has no `test` script.
- Single-test execution is therefore not available yet.
- For now, validate with `npx tsc --noEmit` and `npx biome check`.

If a test framework is added later, include and prefer a single-test command in this file (examples: `vitest run path/to/file.test.ts` or `jest path/to/file.test.ts -t "case"`).

## Repository-Specific Architecture

Important paths:

- `src/reconciler/reconciler.ts`: host config and event loop
- `src/reconciler/pheripheral.ts`: base peripheral class and lifecycle utilities
- `src/reconciler/higher-level-component.tsx`: wraps peripherals with React error propagation
- `src/bridges/clearcore/*`: current concrete bridge implementation
- `src/examples/*`: hardware examples (do not execute as an agent)

Core runtime model:

- Peripheral lifecycle: `init()` -> `applyNewPropsToHardware()` -> `queryForChanges()` -> `desconstructPeripheral()`
- Parent-first initialization is enforced through deferred node signals.
- Polling loop runs continuously and calls `queryForChanges()` on initialized peripherals.
- Errors inside decorated lifecycle methods are routed to `onError`, then raised through React error boundaries.

## Code Style and Conventions

### Formatting and Linting

- Follow Biome (`biome.json`) with recommended rules and `nursery/noFloatingPromises` enabled.
- Preserve existing formatting style (tabs are used in current TS files).
- Do not reformat unrelated files.

### TypeScript Rules

- Keep `strict`-safe code; do not bypass type errors casually.
- Prefer explicit return types for exported/public functions and methods.
- Prefer `unknown` over `any` unless impossible.
- If `any` is required (for decorators or advanced extraction), add a targeted `biome-ignore` with a short reason.
- Respect `NodeNext` behavior and import semantics.

### Imports and Exports

- Use `import type` for type-only imports.
- Use `@/*` alias for imports from `src` where established.
- For local runtime imports in ESM modules, include `.js` extension.
  - Example: `import { CCMotorPeripheral } from "./motor.js";`
- Re-export from index files to maintain the existing package surface.

### Naming

- Files: kebab-case (`digital-pin-out.ts`, `higher-level-component.tsx`).
- Classes: PascalCase.
- Peripheral classes: `<Bridge><Unit>Peripheral` (e.g., `CCMotorPeripheral`).
- React wrappers/components: without `Peripheral` suffix (e.g., `CCMotor`).
- Functions/variables: camelCase.
- Types/interfaces: PascalCase.
- Static tag names: lowercase string identifiers (e.g., `"ccmotor"`).

### Peripheral Implementation Patterns

When implementing a new peripheral class:

- Extend `BasePeripheral<Hardware, WritableProps, ReadableValues, RefData>`.
- Implement `PeripheralLifecycleMethods<WritableProps>` as needed.
- Keep immutable hardware identity (e.g., `pin`, `port`) in readonly fields.
- Throw clear errors when immutable identity props change after init.
- Implement `initPeripheral`, `readValuesFromHardware`, relevant `apply*`, optional `disown*`.
- Keep `readValuesFromHardware` minimal and return stable object shapes.

### Error Handling

- Prefer descriptive `Error` messages.
- Convert unknown caught values via `error instanceof Error ? error : new Error(String(error))`.
- Use the existing decorator-based propagation flow for lifecycle methods.
- Do not swallow unexpected errors silently unless codebase pattern explicitly requires it.

### Async and Promises

- Await promises by default.
- If intentionally floating, annotate with `biome-ignore lint/nursery/noFloatingPromises` and a reason.
- Preserve sequencing guarantees around deferred signals and mount/update ordering.

### React and Reconciler Practices

- Keep high-level components using `React.forwardRef` and `displayName`.
- Continue using `onError` state + throw-on-render pattern for boundary propagation.
- Do not add DOM-specific assumptions; this is a hardware renderer.

## Agent Workflow Expectations

- Before edits, scan neighboring code for existing conventions.
- Keep changes focused; avoid drive-by refactors.
- Do not run hardware examples; ask user to validate hardware behavior manually.
- Prefer safe checks after edits: `npx tsc --noEmit`, `npx biome check`, optionally `pnpm build`.
- If verification cannot run, state what was skipped and why.

## Commit Message Guidance

Use conventional commits where possible:

- `feat:` new functionality
- `fix:` bug fixes
- `refactor:` non-functional structural changes
- `docs:` documentation-only updates
- `build:` tooling/build config updates

## Cursor / Copilot Rules

Searched locations:

- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

No Cursor or Copilot instruction files were found in this repository at the time this file was generated.
