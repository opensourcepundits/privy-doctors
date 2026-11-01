import { ageOn, formatDate, formatLongDate, formatTime, liveCopy, liveProcedureYear } from '#lib/format';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;
const CONTENT = PAGE_W - MARGIN * 2;
const BOTTOM = 48;

const BRAND = rgb(13 / 255, 115 / 255, 119 / 255);
const ACCENT = rgb(20 / 255, 184 / 255, 166 / 255);
const INK = rgb(15 / 255, 23 / 255, 42 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const LINE = rgb(226 / 255, 232 / 255, 240 / 255);
const WASH = rgb(244 / 255, 251 / 255, 250 / 255);
const WHITE = rgb(1, 1, 1);
const ALERT = rgb(138 / 255, 78 / 255, 74 / 255);
const ALERT_BG = rgb(248 / 255, 241 / 255, 240 / 255);

const modes: Record<string, string> = {
	in_person: 'In person',
	telehealth: 'Telehealth',
	follow_up: 'Follow-up'
};

const statuses: Record<string, string> = {
	signed: 'Signed',
	finalized: 'Finalized',
	completed: 'Completed',
	in_session: 'In progress',
	incoming: 'Incoming',
	active: 'Active',
	sent: 'Sent'
};

export type ReportPhoto = {
	name: string;
	type: string;
	bytes: Uint8Array | null;
};

export type ReportItem = {
	name: string;
	strength: string;
	form: string;
	route: string;
	frequency: string;
	sig: string;
	indication: string;
	quantity: number | null;
	supply: string;
	refills: string;
	completesOn: Date | string | null;
	scheduleDetail: string;
};

export type ReportPrescription = {
	code: string;
	orderedAt: Date | string | null;
	status: string;
	completesOn: Date | string | null;
	prescriber: string;
	specialty: string;
	facility: string;
	pharmacy: string;
	course: string;
	authThrough: string;
	items: ReportItem[];
};

export type ReportLine = {
	title: string;
	detail: string;
	note: string;
	meta: string;
};

export type ConsultationReport = {
	filename: string;
	timed: boolean;
	generatedAt: Date;
	patient: {
		name: string;
		pid: string;
		dob: Date | string | null;
		sex: string;
		bloodType: string;
		phone: string;
		allergies: string[];
		conditions: string[];
		surgeries: { year: string; name: string }[];
		insurance: string;
		pharmacy: string;
	};
	clinician: {
		name: string;
		credentials: string;
		specialty: string;
		npi: string;
		practice: string;
		location: string;
		phone: string;
	};
	visit: {
		when: Date | string;
		status: string;
		code: string;
		modality: string;
		kind: string;
		focus: string;
		findings: string;
		plan: string;
		narrative: string;
		pharmacy: string;
		completesOn: Date | string | null;
		doctor: string;
		role: string;
		practice: string;
		location: string;
	};
	entries: { kind: string; label: string; detail: string }[];
	prescriptions: ReportPrescription[];
	medications: ReportLine[];
	tests: ReportLine[];
	referralOrders: ReportLine[];
	otherOrders: ReportLine[];
	tasks: ReportLine[];
	referrals: {
		fromName: string;
		toName: string;
		toSpecialty: string;
		toCredentials: string;
		status: string;
		createdAt: Date | string;
		note: string;
	}[];
	photos: ReportPhoto[];
};

function pdfText(value: string) {
	const cleaned = value
		.replace(/\u00a0/g, ' ')
		.replace(/[\u2018\u2019\u2032]/g, "'")
		.replace(/[\u201c\u201d]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/\u2026/g, '...')
		.replace(/[\u2022\u25cf\u25aa\u00b7]/g, '\u00b7');
	let out = '';
	for (const char of cleaned) {
		const code = char.charCodeAt(0);
		if (char === '\n' || char === '\t') {
			out += char;
			continue;
		}
		if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) out += char;
	}
	return out;
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
	const lines: string[] = [];
	for (const paragraph of text.replace(/\r\n/g, '\n').split('\n')) {
		const words = paragraph.split(/\s+/).filter(Boolean);
		if (!words.length) {
			lines.push('');
			continue;
		}
		let line = '';
		const pushLong = (word: string) => {
			let chunk = '';
			for (const char of word) {
				const trial = chunk + char;
				if (font.widthOfTextAtSize(trial, size) > width && chunk) {
					lines.push(chunk);
					chunk = char;
				} else chunk = trial;
			}
			return chunk;
		};
		for (const word of words) {
			const next = line ? `${line} ${word}` : word;
			if (font.widthOfTextAtSize(next, size) <= width) {
				line = next;
				continue;
			}
			if (line) lines.push(line);
			line = font.widthOfTextAtSize(word, size) <= width ? word : pushLong(word);
		}
		if (line) lines.push(line);
	}
	return lines;
}

function fit(text: string, font: PDFFont, size: number, width: number) {
	const clean = pdfText(text);
	if (font.widthOfTextAtSize(clean, size) <= width) return clean;
	let out = clean;
	while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > width) out = out.slice(0, -1);
	return `${out}...`;
}

function statusLabel(value: string) {
	if (!value) return '';
	return statuses[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function signedBy(name: string, credentials: string) {
	if (!credentials) return name;
	if (name.toLowerCase().includes(credentials.toLowerCase())) return name;
	return `${name}, ${credentials}`;
}

function refillLine(value: string) {
	if (!value) return '';
	return /refill/i.test(value) ? value : `Refills ${value}`;
}

type CardLine = { text: string; bold?: boolean; muted?: boolean; italic?: boolean };

function filled(lines: (CardLine | null | undefined | false)[]) {
	const kept: CardLine[] = [];
	for (const line of lines) {
		if (line?.text.trim()) kept.push(line);
	}
	return kept;
}

function dated(value: Date | string | null) {
	if (!value) return '';
	const label = formatDate(value);
	return label || '';
}

class Letter {
	private doc!: PDFDocument;
	private page!: PDFPage;
	private pages: PDFPage[] = [];
	private sans!: PDFFont;
	private bold!: PDFFont;
	private italic!: PDFFont;
	private cursor = 0;
	private frameTop = 0;
	private report!: ConsultationReport;

	async render(report: ConsultationReport) {
		this.report = report;
		this.doc = await PDFDocument.create();
		this.sans = await this.doc.embedFont(StandardFonts.Helvetica);
		this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
		this.italic = await this.doc.embedFont(StandardFonts.HelveticaOblique);
		this.doc.setTitle(`Consultation report - ${report.patient.name}`);
		this.doc.setAuthor(signedBy(report.clinician.name, report.clinician.credentials));
		this.doc.setSubject(report.visit.code || 'Consultation report');
		this.doc.setCreator('Privy');
		this.pages = [];
		this.openPage(true);
		this.patient();
		this.visitFacts();
		this.clinical();
		this.charted();
		this.prescriptions();
		await this.photos();
		this.referrals();
		this.tests();
		this.tasks();
		this.otherOrders();
		this.signature();
		this.finish();
		return this.doc.save();
	}

	private openPage(first: boolean) {
		this.page = this.doc.addPage([PAGE_W, PAGE_H]);
		this.pages.push(this.page);
		if (first) this.paintMasthead();
		else this.paintRunning();
		this.frameTop = this.cursor;
	}

	private paintMasthead() {
		const clinician = this.report.clinician;
		const visit = this.report.visit;
		const when = this.report.timed
			? `${formatLongDate(visit.when)}  ·  ${formatTime(visit.when)}`
			: formatLongDate(visit.when);
		const right = [
			{ text: 'CONSULTATION REPORT', size: 8, font: this.bold, gap: 14 },
			{ text: visit.code || 'Signed visit', size: 12, font: this.bold, gap: 15 },
			...wrap(pdfText(when), this.sans, 9, 200).map((text) => ({ text, size: 9, font: this.sans, gap: 12 }))
		];
		const rightWidth = Math.min(220, Math.max(150, ...right.map((line) => line.font.widthOfTextAtSize(pdfText(line.text), line.size))));
		const leftWidth = CONTENT - rightWidth - 16;
		const identity = [clinician.specialty, clinician.credentials, clinician.npi ? `NPI ${clinician.npi}` : ''].filter(Boolean).join('  ·  ');
		const place = [clinician.location, clinician.phone].filter(Boolean).join('  ·  ');
		const pack = (value: string, size: number, font: PDFFont, gap: number) =>
			value.trim()
				? wrap(pdfText(value), font, size, leftWidth)
						.filter(Boolean)
						.slice(0, 2)
						.map((text) => ({ text, size, font, gap }))
				: [];
		const left = [
			...pack(clinician.practice || 'Privy', 14, this.bold, 18),
			...pack(identity, 9, this.sans, 13),
			...pack(place, 9, this.sans, 13)
		];
		const leftHeight = left.reduce((sum, line) => sum + line.gap, 0);
		const rightHeight = right.reduce((sum, line) => sum + line.gap, 0);
		const band = Math.max(78, 26 + Math.max(leftHeight, rightHeight));
		this.page.drawRectangle({ x: 0, y: PAGE_H - band, width: PAGE_W, height: band, color: BRAND });
		this.page.drawRectangle({ x: 0, y: PAGE_H - band - 3, width: PAGE_W, height: 3, color: ACCENT });
		let baseline = PAGE_H - 30;
		for (const line of left) {
			this.page.drawText(line.text, { x: MARGIN, y: baseline, size: line.size, font: line.font, color: WHITE });
			baseline -= line.gap;
		}
		baseline = PAGE_H - 28;
		for (const line of right) {
			const text = pdfText(line.text);
			const width = line.font.widthOfTextAtSize(text, line.size);
			this.page.drawText(text, { x: PAGE_W - MARGIN - width, y: baseline, size: line.size, font: line.font, color: WHITE });
			baseline -= line.gap;
		}
		this.cursor = band + 22;
	}

	private paintRunning() {
		const band = 34;
		this.page.drawRectangle({ x: 0, y: PAGE_H - band, width: PAGE_W, height: band, color: BRAND });
		this.page.drawRectangle({ x: 0, y: PAGE_H - band - 3, width: PAGE_W, height: 3, color: ACCENT });
		const label = fit(
			`${this.report.patient.name}   ·   ${this.report.visit.code || 'Consultation report'}`,
			this.sans,
			9,
			CONTENT - 130
		);
		this.page.drawText(label, { x: MARGIN, y: PAGE_H - 22, size: 9, font: this.sans, color: WHITE });
		const mark = 'CONSULTATION REPORT';
		const width = this.bold.widthOfTextAtSize(mark, 8);
		this.page.drawText(mark, { x: PAGE_W - MARGIN - width, y: PAGE_H - 21, size: 8, font: this.bold, color: WHITE });
		this.cursor = band + 20;
	}

	private need(space: number) {
		if (this.cursor + space <= PAGE_H - BOTTOM) return;
		if (this.cursor <= this.frameTop + 2) return;
		this.openPage(false);
	}

	private text(value: string, x: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>, width: number) {
		const lines = wrap(pdfText(value), font, size, width);
		const gap = size + 4;
		for (const line of lines) {
			this.need(gap);
			if (line) {
				this.page.drawText(line, { x, y: PAGE_H - this.cursor - size, size, font, color });
			}
			this.cursor += line ? gap : 8;
		}
		return lines.length;
	}

	private section(title: string) {
		this.need(120);
		this.cursor += 12;
		const baseline = PAGE_H - this.cursor - 8;
		this.page.drawRectangle({ x: MARGIN, y: baseline + 2, width: 14, height: 2, color: BRAND });
		let x = MARGIN + 20;
		for (const char of pdfText(title.toUpperCase())) {
			this.page.drawText(char, { x, y: baseline, size: 8, font: this.bold, color: BRAND });
			x += this.bold.widthOfTextAtSize(char, 8) + 0.7;
		}
		this.cursor += 18;
	}

	private rule() {
		this.need(8);
		const y = PAGE_H - this.cursor;
		this.page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.6, color: LINE });
		this.cursor += 10;
	}

	private patient() {
		const patient = this.report.patient;
		const dob = patient.dob ? dated(patient.dob) : '';
		const age = patient.dob ? ageOn(patient.dob) : null;
		const born = dob ? (age != null && age >= 0 && age < 130 ? `${dob}  ·  ${age} yrs` : dob) : '';
		const facts = [
			born ? { label: 'Date of birth', value: born } : null,
			patient.sex ? { label: 'Sex', value: patient.sex } : null,
			patient.bloodType ? { label: 'Blood type', value: patient.bloodType } : null,
			patient.phone ? { label: 'Phone', value: patient.phone } : null,
			patient.insurance ? { label: 'Insurance', value: patient.insurance } : null,
			patient.pharmacy ? { label: 'Preferred pharmacy', value: patient.pharmacy } : null
		].filter((fact): fact is { label: string; value: string } => Boolean(fact));
		const allergies = patient.allergies.length ? patient.allergies.join(', ') : 'No known allergies';
		const allergyAlert = patient.allergies.length > 0;
		const inner = CONTENT - 28;
		const column = inner / 2;
		const nameLines = wrap(pdfText(patient.name), this.bold, 16, inner - 90);
		const allergyLines = wrap(pdfText(allergies), this.sans, 10, inner - 20);
		const factRows: { pair: { label: string; value: string }[]; lines: string[][]; height: number }[] = [];
		for (let index = 0; index < facts.length; index += 2) {
			const pair = facts.slice(index, index + 2);
			const lines = pair.map((fact) => wrap(pdfText(fact.value), this.sans, 10, column - 16).slice(0, 3));
			const height = 24 + Math.max(...lines.map((item) => Math.max(item.length, 1))) * 13;
			factRows.push({ pair, lines, height });
		}
		const factsHeight = factRows.reduce((sum, row) => sum + row.height, 0);
		const allergyHeight = 36 + allergyLines.length * 13;
		const height = 18 + nameLines.length * 20 + factsHeight + allergyHeight + 12;
		this.need(height);
		const top = PAGE_H - this.cursor;
		this.page.drawRectangle({
			x: MARGIN,
			y: top - height,
			width: CONTENT,
			height,
			color: WHITE,
			borderColor: LINE,
			borderWidth: 0.8
		});
		this.page.drawRectangle({ x: MARGIN, y: top - height, width: 4, height, color: BRAND });
		let baseline = top - 22;
		nameLines.forEach((line, index) => {
			this.page.drawText(line, { x: MARGIN + 16, y: baseline, size: 16, font: this.bold, color: INK });
			if (index === 0 && patient.pid) {
				const pid = pdfText(patient.pid);
				const width = this.sans.widthOfTextAtSize(pid, 10);
				this.page.drawText(pid, { x: PAGE_W - MARGIN - 14 - width, y: baseline + 2, size: 10, font: this.sans, color: MUTED });
			}
			baseline -= 20;
		});
		baseline -= 4;
		for (const row of factRows) {
			row.pair.forEach((fact, columnIndex) => {
				const x = MARGIN + 16 + columnIndex * column;
				this.page.drawText(pdfText(fact.label.toUpperCase()), { x, y: baseline, size: 7.5, font: this.bold, color: MUTED });
				row.lines[columnIndex].forEach((line, lineIndex) => {
					this.page.drawText(line, { x, y: baseline - 14 - lineIndex * 13, size: 10, font: this.sans, color: INK });
				});
			});
			baseline -= row.height;
		}
		const barTop = baseline + 4;
		const barHeight = allergyHeight - 10;
		this.page.drawRectangle({
			x: MARGIN + 12,
			y: barTop - barHeight,
			width: CONTENT - 24,
			height: barHeight,
			color: allergyAlert ? ALERT_BG : WASH
		});
		this.page.drawText('ALLERGIES', {
			x: MARGIN + 22,
			y: barTop - 16,
			size: 7.5,
			font: this.bold,
			color: allergyAlert ? ALERT : MUTED
		});
		allergyLines.forEach((line, index) => {
			this.page.drawText(line, {
				x: MARGIN + 22,
				y: barTop - 30 - index * 13,
				size: 10,
				font: this.sans,
				color: allergyAlert ? ALERT : INK
			});
		});
		this.cursor += height + 8;
		if (patient.conditions.length) this.noteLine('Conditions', patient.conditions.join(', '));
		if (patient.surgeries.length) {
			const history = patient.surgeries
				.map((item) => {
					const year = item.year ? liveProcedureYear(item.year).label : '';
					return [year, item.name].filter(Boolean).join(' ');
				})
				.filter(Boolean)
				.join('; ');
			if (history) this.noteLine('Past procedures', history);
		}
	}

	private noteLine(label: string, value: string) {
		this.need(16);
		const caption = pdfText(label.toUpperCase());
		this.page.drawText(caption, { x: MARGIN, y: PAGE_H - this.cursor - 8, size: 7.5, font: this.bold, color: MUTED });
		this.cursor += 12;
		this.text(value, MARGIN, 10.5, this.sans, INK, CONTENT);
		this.cursor += 4;
	}

	private visitFacts() {
		const visit = this.report.visit;
		const setting = modes[visit.modality] ?? visit.modality;
		const facts = [
			setting ? { label: 'Setting', value: setting } : null,
			visit.status ? { label: 'Status', value: statusLabel(visit.status) } : null,
			visit.kind ? { label: 'Visit', value: visit.kind } : null,
			visit.doctor ? { label: 'Clinician', value: [visit.doctor, visit.role].filter(Boolean).join(' · ') } : null,
			visit.location || visit.practice ? { label: 'Where', value: [visit.practice, visit.location].filter(Boolean).join(' · ') } : null,
			visit.pharmacy ? { label: 'Pharmacy for this visit', value: visit.pharmacy } : null,
			visit.completesOn ? { label: 'Course completes', value: dated(visit.completesOn) } : null
		].filter((fact): fact is { label: string; value: string } => Boolean(fact));
		if (!facts.length) return;
		this.cursor += 6;
		const columns = 3;
		const colW = CONTENT / columns;
		for (let index = 0; index < facts.length; index += columns) {
			const row = facts.slice(index, index + columns);
			const lines = row.map((fact) => wrap(pdfText(fact.value), this.sans, 10.5, colW - 12));
			const rowHeight = 28 + Math.max(...lines.map((item) => item.length)) * 13;
			this.need(rowHeight);
			const top = PAGE_H - this.cursor;
			row.forEach((fact, column) => {
				const x = MARGIN + column * colW;
				this.page.drawText(pdfText(fact.label.toUpperCase()), { x, y: top - 8, size: 7.5, font: this.bold, color: MUTED });
				lines[column].forEach((line, lineIndex) => {
					this.page.drawText(line, { x, y: top - 24 - lineIndex * 13, size: 10.5, font: this.sans, color: INK });
				});
			});
			this.cursor += rowHeight;
		}
	}

	private clinical() {
		const visit = this.report.visit;
		const focus = visit.focus.trim();
		const findings = visit.findings.trim();
		const plan = visit.plan.trim();
		let narrative = visit.narrative.trim();
		if (narrative && focus && (narrative === focus || narrative.startsWith(`${focus}\n`) || narrative.startsWith(`${focus} `))) {
			narrative = narrative.slice(focus.length).trim();
		}
		const blocks = [
			findings && findings !== focus ? { label: 'Findings', body: findings } : null,
			plan ? { label: 'Plan', body: plan } : null,
			narrative && narrative !== findings && narrative !== plan ? { label: findings || plan ? 'Note' : '', body: narrative } : null
		].filter((block): block is { label: string; body: string } => Boolean(block));
		this.section('Clinical note');
		if (focus) this.text(focus, MARGIN, 13, this.bold, INK, CONTENT);
		if (!focus && !blocks.length) {
			this.text('No clinical note was filed with this consultation.', MARGIN, 10.5, this.italic, MUTED, CONTENT);
			return;
		}
		for (const block of blocks) {
			if (block.label) {
				this.cursor += 6;
				this.text(block.label.toUpperCase(), MARGIN, 8, this.bold, MUTED, CONTENT);
			}
			this.prose(block.body);
		}
	}

	private prose(value: string) {
		const lines = wrap(pdfText(liveCopy(value)), this.sans, 10.5, CONTENT);
		for (const line of lines) {
			this.need(15);
			if (line) this.page.drawText(line, { x: MARGIN, y: PAGE_H - this.cursor - 10.5, size: 10.5, font: this.sans, color: INK });
			this.cursor += line ? 15 : 7;
		}
	}

	private charted() {
		if (!this.report.entries.length) return;
		this.section('Charted during the visit');
		const preferred = ['Vital Sign', 'Symptom', 'Observation'];
		const kinds = [...new Set(this.report.entries.map((entry) => entry.kind || 'Note'))];
		kinds.sort((a, b) => (preferred.indexOf(a) < 0 ? 99 : preferred.indexOf(a)) - (preferred.indexOf(b) < 0 ? 99 : preferred.indexOf(b)));
		for (const kind of kinds) {
			this.need(84);
			this.cursor += 4;
			this.text(kind, MARGIN, 8, this.bold, BRAND, CONTENT);
			for (const entry of this.report.entries.filter((item) => (item.kind || 'Note') === kind)) {
				this.card(filled([{ text: entry.label, bold: true }, entry.detail ? { text: entry.detail, muted: true } : null]));
			}
		}
	}

	private prescriptions() {
		const orders = this.report.prescriptions;
		if (!orders.length && !this.report.medications.length) {
			if (!this.report.photos.length) {
				this.section('Prescription');
				this.text('No prescription was filed with this consultation.', MARGIN, 10.5, this.italic, MUTED, CONTENT);
			}
			return;
		}
		this.section('Prescription');
		if (!orders.length) {
			for (const order of this.report.medications) this.lineCard(order);
			return;
		}
		for (const order of orders) {
			this.need(36);
			const title = order.code ? `Order ${order.code}` : 'Prescription';
			this.text(title, MARGIN, 12, this.bold, INK, CONTENT);
			const meta = [
				statusLabel(order.status),
				order.orderedAt ? dated(order.orderedAt) : '',
				order.orderedAt && this.report.timed ? formatTime(order.orderedAt) : '',
				order.completesOn ? `Completes ${dated(order.completesOn)}` : '',
				order.authThrough ? `Authorized through ${order.authThrough}` : ''
			]
				.filter(Boolean)
				.join('  ·  ');
			if (meta) this.text(meta, MARGIN, 9, this.sans, MUTED, CONTENT);
			const who = [order.prescriber, order.specialty].filter(Boolean).join(' · ');
			if (who) this.text(who, MARGIN, 10, this.sans, INK, CONTENT);
			const where = [order.facility, order.pharmacy].filter(Boolean).join(' · ');
			if (where) this.text(where, MARGIN, 10, this.sans, MUTED, CONTENT);
			const course = order.course.trim();
			if (course && course !== 'Signed during consultation') this.prose(course);
			if (!order.items.length) {
				this.text(
					this.report.photos.length ? 'The written prescription is attached below.' : 'No medications were listed on this order.',
					MARGIN,
					10,
					this.italic,
					MUTED,
					CONTENT
				);
			}
			for (const item of order.items) this.card(this.itemLines(item));
			this.cursor += 4;
		}
	}

	private itemLines(item: ReportItem) {
		const title = [item.name, item.strength].filter(Boolean).join(' ');
		const form = [item.form, item.route, item.frequency].filter(Boolean).join(' · ');
		const supply = [item.quantity != null ? `Dispense ${item.quantity}` : '', item.supply, refillLine(item.refills), item.completesOn ? `Completes ${dated(item.completesOn)}` : '']
			.filter(Boolean)
			.join(' · ');
		const schedule = item.scheduleDetail && ![item.sig, item.frequency, form].some((part) => part.toLowerCase().includes(item.scheduleDetail.toLowerCase())) ? item.scheduleDetail : '';
		return filled([
			{ text: title || 'Medication', bold: true },
			form ? { text: form, muted: true } : null,
			item.sig ? { text: item.sig, italic: true } : null,
			item.indication ? { text: item.indication } : null,
			schedule ? { text: schedule, muted: true } : null,
			supply ? { text: supply, muted: true } : null
		]);
	}

	private card(lines: CardLine[]) {
		const inner = CONTENT - 28;
		const wrapped = lines.flatMap((line) => {
			const font = line.bold ? this.bold : line.italic ? this.italic : this.sans;
			const size = line.bold ? 11 : 9.5;
			return wrap(pdfText(liveCopy(line.text)), font, size, inner).map((text) => ({ ...line, text, font, size }));
		});
		const height = 24 + wrapped.reduce((sum, line) => sum + (line.text ? line.size + 4 : 6), 0);
		this.need(height + 4);
		if (this.cursor + height > PAGE_H - BOTTOM) {
			for (const line of lines) this.prose(line.text);
			return;
		}
		const top = PAGE_H - this.cursor;
		this.page.drawRectangle({
			x: MARGIN,
			y: top - height,
			width: CONTENT,
			height,
			color: WASH,
			borderColor: LINE,
			borderWidth: 0.7
		});
		this.page.drawRectangle({ x: MARGIN, y: top - height, width: 3, height, color: BRAND });
		let baseline = top - 16;
		for (const line of wrapped) {
			if (line.text) {
				this.page.drawText(line.text, {
					x: MARGIN + 14,
					y: baseline,
					size: line.size,
					font: line.font,
					color: line.muted ? MUTED : INK
				});
			}
			baseline -= line.text ? line.size + 4 : 6;
		}
		this.cursor += height + 8;
	}

	private lineCard(line: ReportLine) {
		this.card(
			filled([
				{ text: line.title, bold: true },
				line.detail ? { text: line.detail } : null,
				line.note ? { text: line.note, muted: true } : null,
				line.meta ? { text: line.meta, muted: true } : null
			])
		);
	}

	private async photos() {
		if (!this.report.photos.length) return;
		this.section('Prescription photographs');
		for (const photo of this.report.photos) {
			const image = await this.embed(photo);
			if (!image) {
				this.text(`Photograph on file in the chart: ${photo.name}`, MARGIN, 10.5, this.italic, MUTED, CONTENT);
				continue;
			}
			const maxW = CONTENT - 16;
			const maxH = 280;
			const scale = Math.min(maxW / image.width, maxH / image.height, 1);
			const width = image.width * scale;
			const height = image.height * scale;
			const block = height + 36;
			this.need(Math.min(block, 320));
			const top = PAGE_H - this.cursor;
			this.page.drawRectangle({
				x: MARGIN,
				y: top - height - 28,
				width: CONTENT,
				height: height + 28,
				color: WHITE,
				borderColor: LINE,
				borderWidth: 0.7
			});
			this.page.drawImage(image, {
				x: MARGIN + (CONTENT - width) / 2,
				y: top - height - 10,
				width,
				height
			});
			const caption = fit(photo.name, this.sans, 8, CONTENT - 16);
			this.page.drawText(caption, { x: MARGIN + 8, y: top - height - 22, size: 8, font: this.sans, color: MUTED });
			this.cursor += height + 36;
		}
	}

	private async embed(photo: ReportPhoto) {
		if (!photo.bytes?.length) return null;
		try {
			const type = photo.type.toLowerCase();
			const png = type.includes('png') || photo.bytes[0] === 0x89;
			const jpeg = type.includes('jpeg') || type.includes('jpg') || photo.bytes[0] === 0xff;
			if (png) return await this.doc.embedPng(photo.bytes);
			if (jpeg) return await this.doc.embedJpg(photo.bytes);
		} catch {
			return null;
		}
		return null;
	}

	private referrals() {
		const visits = this.report.referrals;
		const orders = this.report.referralOrders;
		this.section('Referrals');
		if (!visits.length && !orders.length) {
			this.text('No referral was made from this consultation.', MARGIN, 10.5, this.italic, MUTED, CONTENT);
			return;
		}
		for (const referral of visits) {
			const who = [referral.toSpecialty, referral.toCredentials].filter(Boolean).join(' · ');
			const when = [statusLabel(referral.status), dated(referral.createdAt), formatTime(referral.createdAt)].filter(Boolean).join(' · ');
			this.card(
				filled([
					{ text: `${referral.fromName} to ${referral.toName}`, bold: true },
					who ? { text: who, muted: true } : null,
					when ? { text: when, muted: true } : null,
					referral.note ? { text: referral.note } : null
				])
			);
		}
		if (!visits.length) {
			for (const order of orders) this.lineCard(order);
		}
	}

	private tests() {
		if (!this.report.tests.length) return;
		this.section('Tests ordered');
		for (const order of this.report.tests) this.lineCard(order);
	}

	private tasks() {
		if (!this.report.tasks.length) return;
		this.section('Patient tasks');
		for (const task of this.report.tasks) this.lineCard(task);
	}

	private otherOrders() {
		if (!this.report.otherOrders.length) return;
		this.section('Orders');
		for (const order of this.report.otherOrders) this.lineCard(order);
	}

	private signature() {
		const clinician = this.report.clinician;
		const name = signedBy(clinician.name, clinician.credentials);
		const practice = clinician.practice;
		const specialty = clinician.specialty && !practice.toLowerCase().includes(clinician.specialty.toLowerCase()) ? clinician.specialty : '';
		const role = [specialty, practice].filter(Boolean).join('  ·  ');
		const when = this.report.timed
			? `${formatLongDate(this.report.visit.when)} at ${formatTime(this.report.visit.when)}`
			: formatLongDate(this.report.visit.when);
		this.need(96);
		this.cursor += 16;
		this.rule();
		this.text('Electronically signed', MARGIN, 8, this.bold, BRAND, CONTENT);
		this.text(name, MARGIN, 12, this.bold, INK, CONTENT);
		if (role) this.text(role, MARGIN, 10, this.sans, MUTED, CONTENT);
		this.text(`Signed ${when}`, MARGIN, 10, this.sans, INK, CONTENT);
		this.cursor += 4;
		this.text(
			`Generated ${formatDate(this.report.generatedAt)} at ${formatTime(this.report.generatedAt)} from the signed consultation record. Confidential.`,
			MARGIN,
			8.5,
			this.italic,
			MUTED,
			CONTENT
		);
	}

	private finish() {
		const total = this.pages.length;
		const practice = fit(this.report.clinician.practice || 'Privy', this.sans, 8, CONTENT - 90);
		this.pages.forEach((page, index) => {
			page.drawLine({
				start: { x: MARGIN, y: 34 },
				end: { x: PAGE_W - MARGIN, y: 34 },
				thickness: 0.5,
				color: LINE
			});
			page.drawText(`${practice}   ·   Confidential`, { x: MARGIN, y: 20, size: 8, font: this.sans, color: MUTED });
			const label = `Page ${index + 1} of ${total}`;
			const width = this.sans.widthOfTextAtSize(label, 8);
			page.drawText(label, { x: PAGE_W - MARGIN - width, y: 20, size: 8, font: this.sans, color: MUTED });
			page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 8, color: BRAND });
		});
	}
}

export async function renderConsultationPdf(report: ConsultationReport) {
	return new Letter().render(report);
}
