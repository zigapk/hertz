import * as http from "node:http";
import type { SimEngine } from "./engine.js";

const DEFAULT_PORT = 3100;

/**
 * Starts an HTTP server that streams simulation state to clients via SSE.
 * Also handles CORS so the viewer HTML can be opened as a file:// URL.
 */
export function startSSEServer(
	engine: SimEngine,
	port = DEFAULT_PORT,
): { broadcast: () => void; server: http.Server } {
	const clients = new Set<http.ServerResponse>();

	const server = http.createServer((req, res) => {
		// CORS headers for every response
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");

		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		if (req.url === "/events") {
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			});

			// Send initial state immediately
			const data = JSON.stringify(engine.getState());
			res.write(`data: ${data}\n\n`);

			clients.add(res);
			req.on("close", () => {
				clients.delete(res);
			});
			return;
		}

		// Default: simple info page
		res.writeHead(200, { "Content-Type": "text/plain" });
		res.end(
			"Hertz Sim SSE server. Connect to /events for the simulation stream.",
		);
	});

	server.listen(port, () => {
		console.log(
			`[sim] SSE server listening on http://localhost:${port}/events`,
		);
	});

	function broadcast(): void {
		const data = JSON.stringify(engine.getState());
		const message = `data: ${data}\n\n`;
		for (const client of clients) {
			client.write(message);
		}
	}

	return { broadcast, server };
}
