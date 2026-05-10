#!/usr/bin/env node
"use strict";

// Generates assets/icon.png — a 128x128 PNG using only built-in Node.js modules.

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ── CRC-32 ──────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[i] = c;
	}
	return t;
})();

function crc32(buf) {
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG chunk builder ────────────────────────────────────────────────────────

function chunk(type, data) {
	const typeBytes = Buffer.from(type, "ascii");
	const lenBuf = Buffer.alloc(4);
	lenBuf.writeUInt32BE(data.length, 0);
	const crcInput = Buffer.concat([typeBytes, data]);
	const crcBuf = Buffer.alloc(4);
	crcBuf.writeUInt32BE(crc32(crcInput), 0);
	return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ── PNG builder (RGB, 8-bit) ─────────────────────────────────────────────────

function makePNG(width, height, pixels) {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 2; // color type: RGB truecolor

	// Raw pixel rows: filter byte (0 = None) + RGB triples
	const raw = Buffer.alloc(height * (1 + width * 3));
	for (let y = 0; y < height; y++) {
		const rowOffset = y * (1 + width * 3);
		raw[rowOffset] = 0;
		for (let x = 0; x < width; x++) {
			const rgb = pixels[y * width + x];
			raw[rowOffset + 1 + x * 3] = (rgb >> 16) & 0xff;
			raw[rowOffset + 1 + x * 3 + 1] = (rgb >> 8) & 0xff;
			raw[rowOffset + 1 + x * 3 + 2] = rgb & 0xff;
		}
	}

	const idat = zlib.deflateSync(raw, { level: 9 });

	return Buffer.concat([
		signature,
		chunk("IHDR", ihdr),
		chunk("IDAT", idat),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

const S = 128;

function px(pixels, x, y, color) {
	if (x < 0 || x >= S || y < 0 || y >= S) return;
	pixels[y * S + x] = color;
}

function fillRect(pixels, x, y, w, h, color) {
	for (let py = y; py < y + h; py++)
		for (let px2 = x; px2 < x + w; px2++) px(pixels, px2, py, color);
}

function outlineRect(pixels, x, y, w, h, t, color) {
	fillRect(pixels, x, y, w, t, color); // top
	fillRect(pixels, x, y + h - t, w, t, color); // bottom
	fillRect(pixels, x, y, t, h, color); // left
	fillRect(pixels, x + w - t, y, t, h, color); // right
}

function fillCircle(pixels, cx, cy, r, color) {
	for (let y = cy - r; y <= cy + r; y++)
		for (let x = cx - r; x <= cx + r; x++)
			if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(pixels, x, y, color);
}

function fillTriangle(pixels, x1, y1, x2, y2, x3, y3, color) {
	const minY = Math.max(0, Math.min(y1, y2, y3));
	const maxY = Math.min(S - 1, Math.max(y1, y2, y3));
	const edges = [
		[x1, y1, x2, y2],
		[x2, y2, x3, y3],
		[x3, y3, x1, y1],
	];
	for (let y = minY; y <= maxY; y++) {
		const xs = [];
		for (const [ax, ay, bx, by] of edges) {
			if ((ay <= y && by > y) || (by <= y && ay > y)) {
				xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
			}
		}
		if (xs.length >= 2) {
			xs.sort((a, b) => a - b);
			for (let x = Math.round(xs[0]); x <= Math.round(xs[xs.length - 1]); x++)
				px(pixels, x, y, color);
		}
	}
}

// ── Icon design ──────────────────────────────────────────────────────────────
// Dark background, white photo-frame outline, mountain + sun inside,
// green arrow in bottom-right corner.

const BG = 0x1e1e2e; // dark purple
const FRAME = 0xe2e2e2; // light grey (frame border)
const FILL = 0x2a2a3e; // slightly lighter bg inside frame
const SKY = 0x4a90d9; // blue sky strip
const MTN1 = 0xffffff; // mountain peak
const MTN2 = 0xcccccc; // second mountain
const SUN = 0xf5c842; // sun yellow
const ARROW = 0x4ec94e; // import arrow green
const ARROW_DARK = 0x2e7a2e; // arrow shadow/outline

const pixels = new Int32Array(S * S).fill(BG);

// Frame outer border (rounded-ish with corner cutoffs)
const FX = 16,
	FY = 20,
	FW = 88,
	FH = 72;
outlineRect(pixels, FX, FY, FW, FH, 4, FRAME);
// Interior fill
fillRect(pixels, FX + 4, FY + 4, FW - 8, FH - 8, FILL);

// Sky strip inside frame (top 40%)
const skyH = Math.floor((FH - 8) * 0.42);
fillRect(pixels, FX + 4, FY + 4, FW - 8, skyH, SKY);

// Sun (circle, top-right of frame interior)
fillCircle(pixels, FX + FW - 20, FY + 14, 8, SUN);

// Mountain 1 (taller, white, centred)
fillTriangle(pixels, FX + 44, FY + 4 + skyH, FX + 24, FY + FH - 5, FX + 64, FY + FH - 5, MTN1);

// Mountain 2 (shorter, grey, left side)
fillTriangle(pixels, FX + 24, FY + 12 + skyH, FX + 8, FY + FH - 5, FX + 44, FY + FH - 5, MTN2);

// ── Import arrow (bottom-right, outside frame) ───────────────────────────────
// Arrow points right (→) made of a rectangle shaft + triangle head
const AX = 97,
	AY = 86;
// Shaft
fillRect(pixels, AX, AY + 5, 16, 8, ARROW);
// Arrowhead (triangle pointing right)
fillTriangle(pixels, AX + 16, AY, AX + 28, AY + 9, AX + 16, AY + 18, ARROW);
// Thin dark outline to make it pop on any bg
outlineRect(pixels, AX - 1, AY + 4, 18, 10, 1, ARROW_DARK);

// ── Write PNG ────────────────────────────────────────────────────────────────

const outPath = path.resolve(__dirname, "../assets/icon.png");
fs.writeFileSync(outPath, makePNG(S, S, pixels));
console.log(`Icon written to ${outPath}`);
