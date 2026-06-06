// ============================================================================
// SimEngine — in-memory 2D differential-drive robot simulation
// ============================================================================

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface RobotState {
	x: number;
	y: number;
	heading: number; // radians
	radius: number;
	sensorPressed: boolean;
}

export interface SimState {
	robot: RobotState;
	obstacles: Rect[];
	roomSize: number;
}

// ---------------------------------------------------------------------------
// Hardcoded room layout
// ---------------------------------------------------------------------------

const ROOM_SIZE = 800;
const ROBOT_RADIUS = 20;
const MAX_SPEED = 60; // units per second at velocity = 1
const WHEEL_BASE = ROBOT_RADIUS * 2; // distance between virtual left/right wheels

const OBSTACLES: Rect[] = [
	// couch
	{ x: 100, y: 50, w: 200, h: 60 },
	// coffee table
	{ x: 300, y: 300, w: 120, h: 80 },
	// bookshelf
	{ x: 600, y: 100, w: 50, h: 200 },
	// dining table
	{ x: 450, y: 550, w: 160, h: 100 },
	// chair (overlaps dining table a bit)
	{ x: 520, y: 620, w: 50, h: 50 },
	// small side table
	{ x: 80, y: 500, w: 60, h: 60 },
	// cabinet
	{ x: 200, y: 680, w: 180, h: 40 },
];

// ---------------------------------------------------------------------------
// Collision helpers
// ---------------------------------------------------------------------------

/** Closest point on an AABB to a point. */
function closestPointOnRect(
	px: number,
	py: number,
	rect: Rect,
): { cx: number; cy: number } {
	const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
	const cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
	return { cx, cy };
}

/**
 * If circle (px,py,r) overlaps `rect`, return the push-out vector (dx,dy)
 * that moves the circle just outside. Returns null if no overlap.
 */
function circleRectOverlap(
	px: number,
	py: number,
	r: number,
	rect: Rect,
): { dx: number; dy: number } | null {
	const { cx, cy } = closestPointOnRect(px, py, rect);
	const ex = px - cx;
	const ey = py - cy;
	const dist2 = ex * ex + ey * ey;

	if (dist2 >= r * r) return null;

	// Centre is inside the rect → push along shortest axis
	if (dist2 === 0) {
		const midX = rect.x + rect.w / 2;
		const midY = rect.y + rect.h / 2;
		const pushX = px < midX ? -(rect.x - (px - r)) : rect.x + rect.w - (px - r);
		const pushY = py < midY ? -(rect.y - (py - r)) : rect.y + rect.h - (py - r);
		if (Math.abs(pushX) < Math.abs(pushY)) {
			return {
				dx: pushX < 0 ? -(r + (px - rect.x)) : r - (px - (rect.x + rect.w)),
				dy: 0,
			};
		}
		return {
			dx: 0,
			dy: pushY < 0 ? -(r + (py - rect.y)) : r - (py - (rect.y + rect.h)),
		};
	}

	const dist = Math.sqrt(dist2);
	const overlap = r - dist;
	return { dx: (ex / dist) * overlap, dy: (ey / dist) * overlap };
}

/**
 * Push circle inside the room boundaries.
 */
function clampToRoom(
	px: number,
	py: number,
	r: number,
	size: number,
): { x: number; y: number } {
	let x = px;
	let y = py;
	if (x - r < 0) x = r;
	if (y - r < 0) y = r;
	if (x + r > size) x = size - r;
	if (y + r > size) y = size - r;
	return { x, y };
}

// ---------------------------------------------------------------------------
// SimEngine
// ---------------------------------------------------------------------------

export class SimEngine {
	private motorL = 0;
	private motorR = 0;
	private robotX: number;
	private robotY: number;
	private robotHeading: number;
	private sensorPressed = false;

	readonly roomSize = ROOM_SIZE;
	readonly obstacles: Rect[] = OBSTACLES;
	readonly robotRadius = ROBOT_RADIUS;

	constructor() {
		// Start in the centre, facing right
		this.robotX = ROOM_SIZE / 2;
		this.robotY = ROOM_SIZE / 2;
		this.robotHeading = 0;
	}

	// -- Motor API (called by SimMotorPeripheral) ----------------------------

	setMotorVelocity(side: "L" | "R", velocity: number): void {
		const clamped = Math.max(-1, Math.min(1, velocity));
		if (side === "L") {
			this.motorL = clamped;
		} else {
			this.motorR = clamped;
		}
	}

	// -- Sensor API (called by SimFrontSensorPeripheral) ---------------------

	getFrontSensorPressed(): boolean {
		return this.sensorPressed;
	}

	// -- State snapshot (for SSE) --------------------------------------------

	getState(): SimState {
		return {
			robot: {
				x: this.robotX,
				y: this.robotY,
				heading: this.robotHeading,
				radius: this.robotRadius,
				sensorPressed: this.sensorPressed,
			},
			obstacles: this.obstacles,
			roomSize: this.roomSize,
		};
	}

	// -- Physics tick ---------------------------------------------------------

	tick(dt: number): void {
		// Differential drive kinematics
		const v = ((this.motorL + this.motorR) / 2) * MAX_SPEED;
		const omega = ((this.motorR - this.motorL) / WHEEL_BASE) * MAX_SPEED;

		// Update heading
		this.robotHeading += omega * dt;

		// Candidate position
		let nx = this.robotX + v * Math.cos(this.robotHeading) * dt;
		let ny = this.robotY + v * Math.sin(this.robotHeading) * dt;

		// Resolve collisions against obstacles (iterate a few times for stability)
		for (let iter = 0; iter < 3; iter++) {
			for (const rect of this.obstacles) {
				const push = circleRectOverlap(nx, ny, ROBOT_RADIUS, rect);
				if (push) {
					nx += push.dx;
					ny += push.dy;
				}
			}
		}

		// Clamp to room boundaries
		const clamped = clampToRoom(nx, ny, ROBOT_RADIUS, ROOM_SIZE);
		this.robotX = clamped.x;
		this.robotY = clamped.y;

		// Compute front sensor — check the front semicircle
		this.sensorPressed = this.computeFrontSensor();
	}

	private computeFrontSensor(): boolean {
		const r = ROBOT_RADIUS;
		const probeDistance = r + 2; // slightly beyond the body edge

		// Sample the full front semicircle (-90° to +90°) with dense spacing
		const SAMPLE_COUNT = 25;
		for (let i = 0; i < SAMPLE_COUNT; i++) {
			const offset = -Math.PI / 2 + (Math.PI / (SAMPLE_COUNT - 1)) * i;
			const angle = this.robotHeading + offset;
			const px = this.robotX + Math.cos(angle) * probeDistance;
			const py = this.robotY + Math.sin(angle) * probeDistance;

			// Check against room boundaries
			if (px <= 0 || py <= 0 || px >= ROOM_SIZE || py >= ROOM_SIZE) {
				return true;
			}

			// Check against obstacles
			for (const rect of this.obstacles) {
				if (
					px >= rect.x &&
					px <= rect.x + rect.w &&
					py >= rect.y &&
					py <= rect.y + rect.h
				) {
					return true;
				}
			}
		}

		return false;
	}
}
