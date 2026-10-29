import {
	boolean,
	date,
	integer,
	jsonb,
	numeric,
	pgTable,
	serial,
	text,
	time,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role').notNull(),
	name: text('name').notNull()
});

export const doctors = pgTable('doctors', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	name: text('name').notNull(),
	credentials: text('credentials').notNull(),
	specialty: text('specialty').notNull(),
	gender: text('gender').notNull(),
	npi: text('npi'),
	practice: text('practice').notNull(),
	location: text('location').notNull(),
	phone: text('phone')
});

export const patients = pgTable('patients', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	primaryDoctorId: integer('primary_doctor_id').references(() => doctors.id),
	pid: text('pid').notNull().unique(),
	recordToken: text('record_token').unique(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	dob: date('dob').notNull(),
	sex: text('sex').notNull(),
	bloodType: text('blood_type'),
	allergies: jsonb('allergies').notNull(),
	conditions: jsonb('conditions').notNull(),
	surgeries: jsonb('surgeries').notNull(),
	phone: text('phone'),
	nic: text('nic').unique(),
	passport: text('passport').unique(),
	conciergeNote: text('concierge_note'),
	insuranceName: text('insurance_name'),
	insuranceGroup: text('insurance_group'),
	insuranceMember: text('insurance_member'),
	pharmacyName: text('pharmacy_name'),
	pharmacyAddress: text('pharmacy_address'),
	pharmacyPhone: text('pharmacy_phone')
});

export const appointments = pgTable('appointments', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	doctorId: integer('doctor_id').notNull(),
	startsAt: timestamp('starts_at').notNull(),
	durationMin: integer('duration_min').notNull(),
	title: text('title').notNull(),
	reason: text('reason').notNull(),
	status: text('status').notNull(),
	location: text('location'),
	lastVisitLabel: text('last_visit_label'),
	responseNote: text('response_note'),
	respondedAt: timestamp('responded_at')
});

export const availability = pgTable('availability', {
	id: serial('id').primaryKey(),
	doctorId: integer('doctor_id').notNull().references(() => doctors.id),
	kind: text('kind').notNull(),
	weekday: integer('weekday').notNull(),
	startTime: time('start_time').notNull(),
	endTime: time('end_time').notNull()
});

export const encounters = pgTable('encounters', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	doctorName: text('doctor_name').notNull(),
	doctorRole: text('doctor_role').notNull(),
	practice: text('practice'),
	occurredOn: date('occurred_on').notNull(),
	kind: text('kind').notNull(),
	focus: text('focus').notNull(),
	findings: text('findings'),
	plan: text('plan'),
	location: text('location'),
	status: text('status').notNull(),
	consultationId: integer('consultation_id')
});

export const vitals = pgTable('vitals', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	recordedAt: timestamp('recorded_at').notNull(),
	systolic: integer('systolic'),
	diastolic: integer('diastolic'),
	heartRate: integer('heart_rate'),
	source: text('source').notNull(),
	note: text('note')
});

export const prescriptions = pgTable('prescriptions', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	code: text('code').notNull(),
	prescriber: text('prescriber').notNull(),
	specialty: text('specialty'),
	facility: text('facility'),
	pharmacy: text('pharmacy'),
	orderedAt: timestamp('ordered_at').notNull(),
	status: text('status').notNull(),
	authThrough: text('auth_through'),
	courseLabel: text('course_label'),
	completesOn: date('completes_on')
});

export const prescriptionItems = pgTable('prescription_items', {
	id: serial('id').primaryKey(),
	prescriptionId: integer('prescription_id').notNull(),
	name: text('name').notNull(),
	strength: text('strength'),
	form: text('form'),
	route: text('route'),
	frequency: text('frequency'),
	sig: text('sig'),
	indication: text('indication'),
	quantity: integer('quantity'),
	supplyLabel: text('supply_label'),
	refills: text('refills'),
	scheduleSlot: text('schedule_slot'),
	scheduleDetail: text('schedule_detail'),
	remainingLabel: text('remaining_label'),
	dueLabel: text('due_label'),
	sortOrder: integer('sort_order').notNull(),
	completesOn: date('completes_on')
});

export const doseLogs = pgTable('dose_logs', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	itemName: text('item_name').notNull(),
	slot: text('slot').notNull(),
	label: text('label').notNull(),
	status: text('status').notNull(),
	logDate: date('log_date').notNull()
});

export const labs = pgTable('labs', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	uid: text('uid'),
	consultationUid: text('consultation_uid'),
	orderUid: text('order_uid'),
	name: text('name').notNull(),
	category: text('category').notNull(),
	collectedOn: date('collected_on'),
	dueLabel: text('due_label'),
	facility: text('facility'),
	status: text('status').notNull(),
	orderingMd: text('ordering_md'),
	specimen: text('specimen'),
	panelId: text('panel_id'),
	note: text('note'),
	acknowledged: boolean('acknowledged').notNull(),
	reportPath: text('report_path')
});

export const labResults = pgTable('lab_results', {
	id: serial('id').primaryKey(),
	labId: integer('lab_id').notNull(),
	name: text('name').notNull(),
	detail: text('detail'),
	valueNum: numeric('value_num'),
	valueText: text('value_text'),
	unit: text('unit'),
	refLow: numeric('ref_low'),
	refHigh: numeric('ref_high'),
	flag: text('flag'),
	sortOrder: integer('sort_order').notNull()
});

export const imagingStudies = pgTable('imaging_studies', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	modality: text('modality').notNull(),
	title: text('title').notNull(),
	performedOn: date('performed_on'),
	facility: text('facility'),
	equipment: text('equipment'),
	radiologist: text('radiologist'),
	protocol: text('protocol'),
	summary: text('summary'),
	impression: text('impression'),
	meta: text('meta'),
	calciumScore: integer('calcium_score'),
	patientQuote: text('patient_quote'),
	outlook: text('outlook'),
	vessels: jsonb('vessels').notNull(),
	status: text('status').notNull(),
	imagePath: text('image_path'),
	reportPath: text('report_path')
});

export const careOrders = pgTable('care_orders', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	uid: text('uid'),
	consultationUid: text('consultation_uid'),
	orderUid: text('order_uid'),
	kind: text('kind').notNull(),
	title: text('title').notNull(),
	orderedBy: text('ordered_by').notNull(),
	status: text('status').notNull(),
	scheduleLabel: text('schedule_label'),
	facility: text('facility'),
	instructions: text('instructions')
});

export const invoices = pgTable('invoices', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	code: text('code').notNull(),
	title: text('title').notNull(),
	issuedOn: date('issued_on').notNull(),
	dueOn: date('due_on'),
	status: text('status').notNull(),
	insuranceNote: text('insurance_note'),
	patientDue: numeric('patient_due').notNull(),
	paidVia: text('paid_via'),
	paidOn: date('paid_on')
});

export const invoiceLines = pgTable('invoice_lines', {
	id: serial('id').primaryKey(),
	invoiceId: integer('invoice_id').notNull(),
	description: text('description').notNull(),
	amount: numeric('amount').notNull()
});

export const consultations = pgTable('consultations', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	doctorId: integer('doctor_id').notNull(),
	code: text('code').notNull(),
	uid: text('uid'),
	status: text('status').notNull(),
	modality: text('modality').notNull(),
	narrative: text('narrative'),
	pharmacy: text('pharmacy'),
	completesOn: date('completes_on'),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull()
});

export const consultationEntries = pgTable('consultation_entries', {
	id: serial('id').primaryKey(),
	consultationId: integer('consultation_id').notNull(),
	kind: text('kind').notNull(),
	label: text('label').notNull(),
	detail: text('detail')
});

export const consultationOrders = pgTable('consultation_orders', {
	id: serial('id').primaryKey(),
	consultationId: integer('consultation_id').notNull(),
	uid: text('uid'),
	kind: text('kind').notNull(),
	title: text('title').notNull(),
	detail: text('detail'),
	note: text('note'),
	completesOn: date('completes_on')
});

export const patientTasks = pgTable('patient_tasks', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	consultationId: integer('consultation_id').notNull(),
	uid: text('uid'),
	orderId: integer('order_id'),
	orderUid: text('order_uid'),
	title: text('title').notNull(),
	detail: text('detail'),
	note: text('note'),
	status: text('status').notNull(),
	fileName: text('file_name'),
	storedName: text('stored_name'),
	uploadedAt: timestamp('uploaded_at')
});

export const referrals = pgTable('referrals', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	fromDoctorId: integer('from_doctor_id').notNull(),
	toDoctorId: integer('to_doctor_id').notNull(),
	sourceConsultId: integer('source_consult_id'),
	orderId: integer('order_id'),
	followConsultId: integer('follow_consult_id'),
	note: text('note'),
	status: text('status').notNull(),
	createdAt: timestamp('created_at').notNull()
});

export const patientAccess = pgTable(
	'patient_access',
	{
		id: serial('id').primaryKey(),
		patientId: integer('patient_id').notNull(),
		doctorId: integer('doctor_id').notNull(),
		status: text('status').notNull(),
		source: text('source').notNull(),
		createdAt: timestamp('created_at').notNull()
	},
	(table) => [uniqueIndex('patient_access_pair_idx').on(table.patientId, table.doctorId)]
);

export const accessCodes = pgTable('access_codes', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	code: text('code').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	usedAt: timestamp('used_at'),
	usedBy: integer('used_by')
});

export const selfReports = pgTable('self_reports', {
	id: serial('id').primaryKey(),
	patientId: integer('patient_id').notNull(),
	occurredOn: date('occurred_on').notNull(),
	title: text('title').notNull(),
	detail: text('detail'),
	duration: text('duration'),
	severity: text('severity'),
	medsTaken: text('meds_taken'),
	ongoing: boolean('ongoing').notNull(),
	createdAt: timestamp('created_at').notNull()
});

export const selfReportFiles = pgTable('self_report_files', {
	id: serial('id').primaryKey(),
	reportId: integer('report_id').notNull(),
	fileName: text('file_name').notNull(),
	storedName: text('stored_name').notNull(),
	contentType: text('content_type').notNull(),
	createdAt: timestamp('created_at').notNull()
});

export const selfReportAlerts = pgTable('self_report_alerts', {
	id: serial('id').primaryKey(),
	reportId: integer('report_id').notNull(),
	doctorId: integer('doctor_id').notNull(),
	createdAt: timestamp('created_at').notNull()
});

export const selfReportEdits = pgTable('self_report_edits', {
	id: serial('id').primaryKey(),
	reportId: integer('report_id').notNull(),
	changedAt: timestamp('changed_at').notNull(),
	changes: jsonb('changes').notNull()
});

export const notifications = pgTable('notifications', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').notNull(),
	title: text('title').notNull(),
	body: text('body').notNull(),
	createdAt: timestamp('created_at').notNull(),
	seenAt: timestamp('seen_at')
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id').notNull(),
	expiresAt: timestamp('expires_at').notNull()
});
