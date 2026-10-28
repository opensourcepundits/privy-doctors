import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

function crc32(buf) {
	let c = ~0;
	for (let i = 0; i < buf.length; i++) {
		c ^= buf[i];
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	return ~c >>> 0;
}

function pngChunk(type, data) {
	const typeBuf = Buffer.from(type);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
	return Buffer.concat([length, typeBuf, data, crc]);
}

function hash(x, y) {
	let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
	n = Math.imul(n ^ (n >>> 13), 1274126177);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function clamp(value) {
	return Math.max(0, Math.min(255, Math.round(value)));
}

function gray(value) {
	const channel = clamp(value);
	return [channel, channel, channel];
}

function ellipse(x, y, cx, cy, rx, ry) {
	const dx = (x - cx) / rx;
	const dy = (y - cy) / ry;
	return dx * dx + dy * dy;
}

function writePng(rel, width, height, pixel) {
	const raw = Buffer.alloc((width * 3 + 1) * height);
	for (let y = 0; y < height; y++) {
		const row = y * (width * 3 + 1);
		raw[row] = 0;
		for (let x = 0; x < width; x++) {
			const [r, g, b] = pixel(x, y, width, height);
			const index = row + 1 + x * 3;
			raw[index] = r;
			raw[index + 1] = g;
			raw[index + 2] = b;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	const png = Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		pngChunk('IHDR', ihdr),
		pngChunk('IDAT', deflateSync(raw)),
		pngChunk('IEND', Buffer.alloc(0))
	]);
	const file = new URL(`../static/records/${rel}`, import.meta.url);
	mkdirSync(new URL('./', file), { recursive: true });
	writeFileSync(file, png);
}

export function writeCcta(rel) {
	writePng(rel, 640, 640, (x, y, w, h) => {
		const nx = (x - w / 2) / (w * 0.46);
		const ny = (y - h / 2) / (h * 0.46);
		const radius = Math.hypot(nx, ny);
		const noise = hash(x, y);
		if (radius > 1) {
			const ring = Math.abs(radius - 1.045) < 0.018 ? 46 : 8 + noise * 5;
			return gray(ring);
		}
		let value = 72 + noise * 16;
		if (ellipse(nx, ny, -0.36, 0.02, 0.28, 0.4) < 1) value = 14 + noise * 10;
		if (ellipse(nx, ny, 0.38, 0.0, 0.26, 0.38) < 1) value = 16 + noise * 8;
		if (ellipse(nx, ny, 0.02, 0.62, 0.13, 0.16) < 1) value = 214 + noise * 18;
		if (ellipse(nx, ny, 0, -0.72, 0.09, 0.055) < 1) value = 196;
		if (ellipse(nx, ny, 0.06, 0.06, 0.34, 0.28) < 1) value = 98 + noise * 12;
		if (ellipse(nx, ny, 0.14, 0.1, 0.13, 0.15) < 1) value = 52 + noise * 8;
		if (ellipse(nx, ny, -0.1, 0.02, 0.1, 0.13) < 1) value = 58 + noise * 6;
		if (ellipse(nx, ny, -0.02, -0.2, 0.085, 0.085) < 1) value = 236;
		if (ellipse(nx, ny, 0.2, -0.1, 0.05, 0.028) < 1) value = 248;
		if (ellipse(nx, ny, 0.18, -0.07, 0.016, 0.016) < 1) value = 255;
		const rib = Math.abs(radius - 0.86);
		if (rib < 0.028 && Math.sin(Math.atan2(ny, nx) * 7) > 0.35) value = Math.max(value, 168);
		return gray(value);
	});
}

export function writeEcho(rel) {
	writePng(rel, 720, 480, (x, y, w, h) => {
		const originX = w / 2;
		const originY = 28;
		const angle = Math.atan2(y - originY, x - originX);
		const distance = Math.hypot(x - originX, y - originY);
		const down = Math.PI / 2;
		const half = 0.66;
		const maxR = h * 0.96;
		const noise = hash(x, y);
		const inside = Math.abs(angle - down) < half && distance > 16 && distance < maxR;
		if (!inside) return gray(4 + noise * 3);
		const depth = distance / maxR;
		let value = 22 + noise * 46 * (1 - depth * 0.45) + (1 - depth) * 16;
		const nx = (x - originX) / w;
		const ny = (y - originY) / h;
		const wall = ellipse(nx, ny, 0.02, 0.48, 0.18, 0.22);
		const cavity = ellipse(nx, ny, 0.02, 0.48, 0.11, 0.15);
		if (wall < 1) value = cavity < 1 ? 8 + noise * 7 : 78 + noise * 36;
		if (ellipse(nx, ny, -0.01, 0.26, 0.1, 0.07) < 1) value = 12 + noise * 8;
		if (Math.abs(ny - 0.36) < 0.012 && Math.abs(nx) < 0.09) value = 190 + noise * 20;
		const edge = half - Math.abs(angle - down);
		if (edge < 0.05) value *= edge / 0.05;
		if (distance > maxR - 10) value *= (maxR - distance) / 10;
		return gray(value);
	});
}

export function writeCxr(rel) {
	writePng(rel, 560, 720, (x, y, w, h) => {
		const nx = (x / w) * 2 - 1;
		const ny = y / h;
		const noise = hash(x, y);
		let value = 16 + noise * 8;
		const body = (nx * nx) / 0.92 + ((ny - 0.46) ** 2) / 0.2;
		if (body < 1) value = 40 + noise * 8;
		const lung = (side) => ((nx - side * 0.34) / 0.3) ** 2 + ((ny - 0.4) / 0.2) ** 2;
		if (lung(-1) < 1) value = 22 + noise * 14;
		if (lung(1) < 1) value = 20 + noise * 14;
		if (((nx - 0.1) / 0.22) ** 2 + ((ny - 0.48) / 0.15) ** 2 < 1) value = 62 + noise * 6;
		if (Math.abs(nx) < 0.045 && ny > 0.15 && ny < 0.74) value = 156 + noise * 18;
		const clavicle = (side) => {
			const line = 0.2 + Math.abs(nx) * 0.09;
			return Math.abs(ny - line) < 0.012 && nx * side > 0.06 && Math.abs(nx) < 0.58;
		};
		if (clavicle(-1) || clavicle(1)) value = 176;
		for (let rib = 0; rib < 7; rib++) {
			const arc = 0.26 + rib * 0.045 + nx * nx * 0.1;
			if (Math.abs(ny - arc) < 0.008 && Math.abs(nx) > 0.08 && Math.abs(nx) < 0.64 && ny < 0.62) {
				value = Math.max(value, 124);
			}
		}
		const diaphragm = 0.62 + nx * nx * 0.08;
		if (ny > diaphragm && ny < diaphragm + 0.09 && Math.abs(nx) < 0.66) value = Math.max(value, 50);
		if (((nx - 0.3) / 0.1) ** 2 + ((ny - 0.67) / 0.045) ** 2 < 1) value = 14;
		return gray(value);
	});
}

function pdfEscape(text) {
	return text
		.replace(/[^\x20-\x7E]/g, ' ')
		.replace(/\\/g, '\\\\')
		.replace(/\(/g, '\\(')
		.replace(/\)/g, '\\)');
}

function wrap(text, width = 92) {
	const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
	if (!clean) return [''];
	const lines = [];
	let current = '';
	for (const word of clean.split(' ')) {
		const next = current ? `${current} ${word}` : word;
		if (next.length > width && current) {
			lines.push(current);
			current = word;
		} else current = next;
	}
	if (current) lines.push(current);
	return lines;
}

function paginate(lines) {
	const pages = [];
	let current = [];
	let used = 0;
	for (const line of lines) {
		const cost = line.startsWith('# ') ? 22 : 14;
		if (current.length && used + cost > 690) {
			pages.push(current);
			current = [];
			used = 0;
		}
		current.push(line);
		used += cost;
	}
	if (current.length) pages.push(current);
	return pages.length ? pages : [['# Report']];
}

function paint(lines) {
	const ops = ['BT'];
	let y = 748;
	for (const line of lines) {
		const title = line.startsWith('# ');
		const text = title ? line.slice(2) : line;
		ops.push(`/F1 ${title ? 15 : 10.5} Tf`);
		ops.push(`1 0 0 1 48 ${y.toFixed(1)} Tm`);
		ops.push(`(${pdfEscape(text)}) Tj`);
		y -= title ? 22 : 14;
	}
	ops.push('ET');
	return ops.join('\n');
}

function writePdf(rel, lines) {
	const pages = paginate(lines);
	const fontObj = 3 + pages.length * 2;
	const kids = [];
	const bodies = new Map();
	bodies.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
	let next = 3;
	for (const pageLines of pages) {
		const pageObj = next++;
		const contentObj = next++;
		kids.push(`${pageObj} 0 R`);
		const stream = paint(pageLines);
		bodies.set(
			pageObj,
			`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>`
		);
		bodies.set(contentObj, `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
	}
	bodies.set(2, `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`);
	bodies.set(fontObj, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

	const chunks = ['%PDF-1.4\n'];
	let position = Buffer.byteLength(chunks[0]);
	const offsets = [];
	for (let id = 1; id <= fontObj; id++) {
		offsets[id] = position;
		const text = `${id} 0 obj\n${bodies.get(id)}\nendobj\n`;
		chunks.push(text);
		position += Buffer.byteLength(text);
	}
	let xref = `xref\n0 ${fontObj + 1}\n0000000000 65535 f \n`;
	for (let id = 1; id <= fontObj; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
	xref += `trailer\n<< /Size ${fontObj + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`;
	chunks.push(xref);
	const file = new URL(`../static/records/${rel}`, import.meta.url);
	mkdirSync(new URL('./', file), { recursive: true });
	writeFileSync(file, Buffer.from(chunks.join(''), 'latin1'));
}

export function writeReport(rel, { title, meta = [], sections = [] }) {
	const lines = [`# ${title}`, ''];
	for (const row of meta) lines.push(...wrap(row));
	lines.push('');
	for (const section of sections) {
		lines.push(`# ${section.heading}`);
		for (const paragraph of section.paragraphs ?? []) {
			lines.push(...wrap(paragraph));
			lines.push('');
		}
		for (const row of section.rows ?? []) lines.push(...wrap(row));
		if (section.rows?.length) lines.push('');
	}
	lines.push('careOS clinical record.');
	writePdf(rel, lines);
}
