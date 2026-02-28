declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean;
}

// Enables React's act() integration checks in non-DOM test environments.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export {};
