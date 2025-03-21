"use client";

import { useEffect } from 'react';

interface OscillatorOptions {
	phase?: number;
	offset?: number;
	frequency?: number;
	amplitude?: number;
}

class Oscillator {
	phase: number;
	offset: number;
	frequency: number;
	amplitude: number;

	constructor({ phase = 0, offset = 0, frequency = 0.001, amplitude = 1 }: OscillatorOptions = {}) {
		this.phase = phase;
		this.offset = offset;
		this.frequency = frequency;
		this.amplitude = amplitude;
	}

	update(): number {
		this.phase += this.frequency;
		return this.offset + Math.sin(this.phase) * this.amplitude;
	}
}

class Node {
	x: number = 0;
	y: number = 0;
	vx: number = 0;
	vy: number = 0;
}

interface LineOptions {
	spring: number;
}

interface Settings {
	friction: number;
	trails: number;
	size: number;
	dampening: number;
	tension: number;
}

const SETTINGS: Settings = {
	friction: 0.5,
	trails: 20,
	size: 50,
	dampening: 0.25,
	tension: 0.98,
};

interface CustomCanvasContext extends CanvasRenderingContext2D {
	running?: boolean;
}

interface CursorPos {
	x: number;
	y: number;
}

// Global cursor position, initialized to the window center.
const cursorPos: CursorPos = { x: 0, y: 0 };
let lines: Line[] = [];
let ctx: CustomCanvasContext;
let oscillator: Oscillator;

class Line {
	spring: number;
	friction: number;
	nodes: Node[];

	constructor({ spring }: LineOptions) {
		this.spring = spring + (Math.random() * 0.1 - 0.02);
		this.friction = SETTINGS.friction + (Math.random() * 0.01 - 0.002);
		this.nodes = Array.from({ length: SETTINGS.size }, () => new Node());
		// Initialize each node to the current cursor position.
		this.nodes.forEach((node) => {
			node.x = cursorPos.x;
			node.y = cursorPos.y;
		});
	}

	update(): void {
		let factor = this.spring;
		let node = this.nodes[0];

		// Update the first node using the cursor position.
		node.vx += (cursorPos.x - node.x) * factor;
		node.vy += (cursorPos.y - node.y) * factor;
		node.vx *= this.friction;
		node.vy *= this.friction;
		node.x += node.vx;
		node.y += node.vy;
		factor *= SETTINGS.tension;

		// Update subsequent nodes based on previous node values.
		for (let i = 1; i < this.nodes.length; i++) {
			const prevNode = this.nodes[i - 1];
			node = this.nodes[i];
			node.vx += (prevNode.x - node.x) * factor + prevNode.vx * SETTINGS.dampening;
			node.vy += (prevNode.y - node.y) * factor + prevNode.vy * SETTINGS.dampening;
			node.vx *= this.friction;
			node.vy *= this.friction;
			node.x += node.vx;
			node.y += node.vy;
			factor *= SETTINGS.tension;
		}
	}

	draw(ctx: CustomCanvasContext): void {
		ctx.beginPath();
		ctx.moveTo(this.nodes[0].x, this.nodes[0].y);

		for (let i = 1; i < this.nodes.length - 1; i++) {
			const current = this.nodes[i];
			const next = this.nodes[i + 1];
			const midX = (current.x + next.x) / 2;
			const midY = (current.y + next.y) / 2;
			ctx.quadraticCurveTo(current.x, current.y, midX, midY);
		}
		ctx.stroke();
		ctx.closePath();
	}
}

const updateCursorPosition = (e: MouseEvent | TouchEvent): void => {
	if (typeof window === "undefined") return; // Ensure it's only running on client

	if ('touches' in e && e.touches.length > 0) {
		cursorPos.x = e.touches[0].pageX;
		cursorPos.y = e.touches[0].pageY;
	} else if ('clientX' in e) {
		cursorPos.x = e.clientX;
		cursorPos.y = e.clientY;
	}
	e.preventDefault();
};

const initializeLines = (): void => {
	lines = Array.from({ length: SETTINGS.trails }, (_, i) =>
		new Line({ spring: 0.4 + (i / SETTINGS.trails) * 0.025 })
	);
};

const render = (): void => {
	if (!ctx.running) return;

	// Clear the canvas.
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	// Update the oscillator for a changing stroke hue.
	ctx.strokeStyle = `hsla(${Math.round(oscillator.update())}, 50%, 50%, 0.2)`;
	ctx.lineWidth = 1;

	// Update and draw each line.
	lines.forEach((line) => {
		line.update();
		line.draw(ctx);
	});

	requestAnimationFrame(render);
};

const resizeCanvas = (): void => {
	if (typeof window !== "undefined" && ctx) {
		ctx.canvas.width = window.innerWidth;
		ctx.canvas.height = window.innerHeight;
	}
};

const initializeCanvas = (): void => {
	if (typeof window === "undefined") return; // Prevent running on SSR

	const canvasElement = document.getElementById('canvas') as HTMLCanvasElement | null;
	if (!canvasElement) {
		console.error('Canvas element with id "canvas" not found.');
		return;
	}
	
	const context = canvasElement.getContext('2d');
	if (!context) {
		console.error('Failed to get 2D context.');
		return;
	}
	
	ctx = context as CustomCanvasContext;
	ctx.running = true;

	resizeCanvas();

	// Set the initial cursor position to the center of the canvas.
	cursorPos.x = ctx.canvas.width / 2;
	cursorPos.y = ctx.canvas.height / 2;

	oscillator = new Oscillator({
		phase: Math.random() * 2 * Math.PI,
		amplitude: 85,
		frequency: 0.0015,
		offset: 285,
	});

	// Set up event listeners for mouse and touch interactions.
	document.addEventListener('mousemove', updateCursorPosition);
	document.addEventListener('touchstart', updateCursorPosition);
	document.addEventListener('touchmove', updateCursorPosition);
	window.addEventListener('resize', resizeCanvas);

	initializeLines();
	render();
};

const useCanvasCursor = (): void => {
	useEffect(() => {
		if (typeof window !== "undefined") {
			initializeCanvas();
		}

		return () => {
			if (ctx) ctx.running = false;
			window.removeEventListener("resize", resizeCanvas);
			document.removeEventListener("mousemove", updateCursorPosition);
			document.removeEventListener("touchstart", updateCursorPosition);
			document.removeEventListener("touchmove", updateCursorPosition);
		};
	}, []);
};

export default useCanvasCursor;
