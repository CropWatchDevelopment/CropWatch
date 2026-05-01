import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { ApiService } from '$lib/api/api.service';
import type { DeviceDto } from '$lib/api/api.dtos';
import type {
	Json,
	RuleTemplateActionDto,
	RuleTemplateActionInput,
	RuleTemplateAssignmentDto,
	RuleTemplateCriterionDto,
	RuleTemplateCriterionInput,
	RuleTemplateDto,
	RuleTemplateListQuery,
	RuleTemplateSaveRequest,
	RuleTemplateStateDto
} from '$lib/rules-new/rule-template.types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type FetchLike = typeof fetch;

interface RuleTemplatesDatabase {
	public: {
		Tables: {
			cw_device_rule_assignments: {
				Row: {
					created_at: string | null;
					dev_eui: string;
					id: number;
					is_active: boolean | null;
					template_id: number;
				};
				Insert: {
					created_at?: string | null;
					dev_eui: string;
					id?: number;
					is_active?: boolean | null;
					template_id: number;
				};
				Update: {
					created_at?: string | null;
					dev_eui?: string;
					id?: number;
					is_active?: boolean | null;
					template_id?: number;
				};
				Relationships: [];
			};
			cw_rule_templates: {
				Row: {
					created_at: string | null;
					description: string | null;
					device_type_id: number | null;
					id: number;
					is_active: boolean | null;
					name: string;
				};
				Insert: {
					created_at?: string | null;
					description?: string | null;
					device_type_id?: number | null;
					id?: number;
					is_active?: boolean | null;
					name: string;
				};
				Update: {
					created_at?: string | null;
					description?: string | null;
					device_type_id?: number | null;
					id?: number;
					is_active?: boolean | null;
					name?: string;
				};
				Relationships: [];
			};
			cw_rule_template_criteria: {
				Row: {
					created_at: string | null;
					id: number;
					operator: string;
					reset_value: number;
					subject: string;
					template_id: number;
					trigger_value: number;
				};
				Insert: {
					created_at?: string | null;
					id?: number;
					operator: string;
					reset_value: number;
					subject: string;
					template_id: number;
					trigger_value: number;
				};
				Update: {
					created_at?: string | null;
					id?: number;
					operator?: string;
					reset_value?: number;
					subject?: string;
					template_id?: number;
					trigger_value?: number;
				};
				Relationships: [];
			};
			cw_rule_template_actions: {
				Row: {
					action_type: string;
					config: Json;
					created_at: string | null;
					id: number;
					template_id: number;
				};
				Insert: {
					action_type: string;
					config: Json;
					created_at?: string | null;
					id?: number;
					template_id: number;
				};
				Update: {
					action_type?: string;
					config?: Json;
					created_at?: string | null;
					id?: number;
					template_id?: number;
				};
				Relationships: [];
			};
			cw_rule_state: {
				Row: {
					dev_eui: string;
					id: number;
					is_triggered: boolean;
					last_reset_at: string | null;
					last_triggered_at: string | null;
					template_id: number;
				};
				Insert: {
					dev_eui: string;
					id?: number;
					is_triggered?: boolean;
					last_reset_at?: string | null;
					last_triggered_at?: string | null;
					template_id: number;
				};
				Update: {
					dev_eui?: string;
					id?: number;
					is_triggered?: boolean;
					last_reset_at?: string | null;
					last_triggered_at?: string | null;
					template_id?: number;
				};
				Relationships: [];
			};
		};
		Views: Record<never, never>;
		Functions: Record<never, never>;
		Enums: Record<never, never>;
		CompositeTypes: Record<never, never>;
	};
}

type RuleTemplateRow = RuleTemplatesDatabase['public']['Tables']['cw_rule_templates']['Row'];
type RuleAssignmentRow =
	RuleTemplatesDatabase['public']['Tables']['cw_device_rule_assignments']['Row'];
type RuleCriterionRow =
	RuleTemplatesDatabase['public']['Tables']['cw_rule_template_criteria']['Row'];
type RuleActionRow = RuleTemplatesDatabase['public']['Tables']['cw_rule_template_actions']['Row'];
type RuleStateRow = RuleTemplatesDatabase['public']['Tables']['cw_rule_state']['Row'];

interface RuleTemplateRepositoryContext {
	authToken: string;
	userId: string;
	fetchFn: FetchLike;
}

interface ManagedDevice {
	devEui: string;
	name: string | null;
	permissionLevel: number | null;
	canView: boolean;
	canManage: boolean;
	type: number | null;
}

interface NormalizedRuleTemplateSaveRequest {
	name: string;
	description: string | null;
	deviceTypeId: number | null;
	isActive: boolean;
	devEuis: string[];
	criteria: RuleTemplateCriterionInput[];
	actions: RuleTemplateActionInput[];
}

export class RuleTemplateRepositoryError extends Error {
	public readonly status: number;

	public constructor(status: number, message: string) {
		super(message);
		this.name = 'RuleTemplateRepositoryError';
		this.status = status;
	}
}

export async function listRuleTemplatesForUser(
	context: RuleTemplateRepositoryContext,
	query: RuleTemplateListQuery = {}
): Promise<RuleTemplateDto[]> {
	const devices = await listManagedDevices(context);
	const viewableDevices = devices.filter((device) => device.canView);
	if (viewableDevices.length === 0) return [];

	const client = createRuleTemplateClient(context.authToken);
	const assignmentsResult = await client
		.from('cw_device_rule_assignments')
		.select('created_at, dev_eui, id, is_active, template_id')
		.in(
			'dev_eui',
			viewableDevices.map((device) => device.devEui)
		);

	if (assignmentsResult.error) {
		throwSupabaseError('Failed to load rule assignments', assignmentsResult.error);
	}

	const assignments = assignmentsResult.data ?? [];
	const templateIds = uniqueIds(assignments.map((assignment) => assignment.template_id));
	if (templateIds.length === 0) return [];

	const templates = await loadTemplatesByIds(client, templateIds);
	const criteria = await loadCriteriaByTemplateIds(client, templateIds);
	const actions = await loadActionsByTemplateIds(client, templateIds);
	const states = await loadStates(
		client,
		templateIds,
		assignments.map((assignment) => assignment.dev_eui)
	);

	const rules = buildRuleTemplates({
		templates,
		assignments,
		criteria,
		actions,
		states,
		devices
	});

	const search = query.search?.trim().toLowerCase();
	if (!search) return rules;

	return rules.filter((rule) => matchesSearch(rule, search));
}

export async function getRuleTemplateForUser(
	context: RuleTemplateRepositoryContext,
	templateId: number
): Promise<RuleTemplateDto> {
	const devices = await listManagedDevices(context);
	const viewableDevices = devices.filter((device) => device.canView);
	if (viewableDevices.length === 0) {
		throw new RuleTemplateRepositoryError(404, 'Rule template not found.');
	}

	const client = createRuleTemplateClient(context.authToken);
	const [template, assignmentsResult] = await Promise.all([
		loadTemplateById(client, templateId),
		client
			.from('cw_device_rule_assignments')
			.select('created_at, dev_eui, id, is_active, template_id')
			.eq('template_id', templateId)
			.in(
				'dev_eui',
				viewableDevices.map((device) => device.devEui)
			)
	]);

	if (assignmentsResult.error) {
		throwSupabaseError('Failed to load rule assignments', assignmentsResult.error);
	}

	const assignments = assignmentsResult.data ?? [];
	if (assignments.length === 0) {
		throw new RuleTemplateRepositoryError(404, 'Rule template not found.');
	}

	const [criteria, actions, states] = await Promise.all([
		loadCriteriaByTemplateIds(client, [templateId]),
		loadActionsByTemplateIds(client, [templateId]),
		loadStates(
			client,
			[templateId],
			assignments.map((assignment) => assignment.dev_eui)
		)
	]);

	const [rule] = buildRuleTemplates({
		templates: [template],
		assignments,
		criteria,
		actions,
		states,
		devices
	});

	if (!rule) {
		throw new RuleTemplateRepositoryError(404, 'Rule template not found.');
	}

	return rule;
}

export async function createRuleTemplateForUser(
	context: RuleTemplateRepositoryContext,
	input: unknown
): Promise<RuleTemplateDto> {
	const payload = normalizeRuleTemplateSaveRequest(input);
	const devices = await listManagedDevices(context);
	assertDevicesCanBeManaged(devices, payload.devEuis);

	const client = createRuleTemplateClient(context.authToken);
	const insertResult = await client
		.from('cw_rule_templates')
		.insert({
			name: payload.name,
			description: payload.description,
			device_type_id: payload.deviceTypeId,
			is_active: payload.isActive
		})
		.select('created_at, description, device_type_id, id, is_active, name')
		.single();

	if (insertResult.error) {
		throwSupabaseError('Failed to create rule template', insertResult.error);
	}

	const template = insertResult.data;
	try {
		await replaceTemplateChildren(client, template.id, payload);
	} catch (error) {
		await deleteTemplateBestEffort(client, template.id);
		throw error;
	}

	return getRuleTemplateForUser(context, template.id);
}

export async function updateRuleTemplateForUser(
	context: RuleTemplateRepositoryContext,
	templateId: number,
	input: unknown
): Promise<RuleTemplateDto> {
	const payload = normalizeRuleTemplateSaveRequest(input);
	const existing = await getRuleTemplateForUser(context, templateId);
	const devices = await listManagedDevices(context);

	assertDevicesCanBeManaged(
		devices,
		uniqueIds([...existing.assignments.map((assignment) => assignment.devEui), ...payload.devEuis])
	);

	const client = createRuleTemplateClient(context.authToken);
	const updateResult = await client
		.from('cw_rule_templates')
		.update({
			name: payload.name,
			description: payload.description,
			device_type_id: payload.deviceTypeId,
			is_active: payload.isActive
		})
		.eq('id', templateId);

	if (updateResult.error) {
		throwSupabaseError('Failed to update rule template', updateResult.error);
	}

	await replaceTemplateChildren(client, templateId, payload);
	await deleteTemplateState(client, templateId);

	return getRuleTemplateForUser(context, templateId);
}

export async function deleteRuleTemplateForUser(
	context: RuleTemplateRepositoryContext,
	templateId: number
): Promise<{ id: number }> {
	const existing = await getRuleTemplateForUser(context, templateId);
	const devices = await listManagedDevices(context);
	assertDevicesCanBeManaged(
		devices,
		existing.assignments.map((assignment) => assignment.devEui)
	);

	const client = createRuleTemplateClient(context.authToken);
	await deleteTemplateState(client, templateId);
	await deleteTemplateChildren(client, templateId);

	const deleteResult = await client.from('cw_rule_templates').delete().eq('id', templateId);
	if (deleteResult.error) {
		throwSupabaseError('Failed to delete rule template', deleteResult.error);
	}

	return { id: templateId };
}

function createRuleTemplateClient(authToken: string): SupabaseClient<RuleTemplatesDatabase> {
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
		throw new RuleTemplateRepositoryError(500, 'Supabase is not configured.');
	}

	return createClient<RuleTemplatesDatabase>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		},
		global: {
			headers: {
				Authorization: `Bearer ${authToken}`
			}
		}
	});
}

async function listManagedDevices(
	context: RuleTemplateRepositoryContext
): Promise<ManagedDevice[]> {
	const api = new ApiService({ fetchFn: context.fetchFn, authToken: context.authToken });
	const devices = await api.getAllDevices().catch((error) => {
		console.error('Failed to load devices for rule template access checks:', error);
		return [];
	});

	return devices.map((device) => normalizeManagedDevice(device, context.userId));
}

function normalizeManagedDevice(device: DeviceDto, userId: string): ManagedDevice {
	const permissionLevel = readDevicePermissionLevel(device, userId);
	const devEui = typeof device.dev_eui === 'string' ? device.dev_eui : '';
	const name = typeof device.name === 'string' && device.name.trim() ? device.name : null;
	const type = typeof device.type === 'number' && Number.isFinite(device.type) ? device.type : null;

	return {
		devEui,
		name,
		type,
		permissionLevel,
		canView: devEui.length > 0 && (permissionLevel == null || permissionLevel <= 3),
		canManage: devEui.length > 0 && (permissionLevel == null || permissionLevel <= 2)
	};
}

function readDevicePermissionLevel(device: DeviceDto, userId: string): number | null {
	const directPermissionLevel = readFiniteNumber(
		(device as Record<string, unknown>).permission_level
	);
	if (directPermissionLevel !== null) return directPermissionLevel;

	if (device.user_id === userId) return 1;

	const owners = Array.isArray(device.cw_device_owners) ? device.cw_device_owners : [];
	const owner = owners.find((entry) => entry.user_id === userId);
	const ownerPermissionLevel = readFiniteNumber(owner?.permission_level);

	return ownerPermissionLevel;
}

function assertDevicesCanBeManaged(devices: ManagedDevice[], devEuis: string[]): void {
	const manageableDeviceIds = new Set(
		devices.filter((device) => device.canManage).map((device) => device.devEui)
	);
	const missingDevice = devEuis.find((devEui) => !manageableDeviceIds.has(devEui));

	if (missingDevice) {
		throw new RuleTemplateRepositoryError(
			403,
			'You do not have permission to manage one or more selected devices.'
		);
	}
}

async function loadTemplateById(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateId: number
): Promise<RuleTemplateRow> {
	const result = await client
		.from('cw_rule_templates')
		.select('created_at, description, device_type_id, id, is_active, name')
		.eq('id', templateId)
		.maybeSingle();

	if (result.error) {
		throwSupabaseError('Failed to load rule template', result.error);
	}

	if (!result.data) {
		throw new RuleTemplateRepositoryError(404, 'Rule template not found.');
	}

	return result.data;
}

async function loadTemplatesByIds(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateIds: number[]
): Promise<RuleTemplateRow[]> {
	const result = await client
		.from('cw_rule_templates')
		.select('created_at, description, device_type_id, id, is_active, name')
		.in('id', templateIds);

	if (result.error) {
		throwSupabaseError('Failed to load rule templates', result.error);
	}

	return result.data ?? [];
}

async function loadCriteriaByTemplateIds(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateIds: number[]
): Promise<RuleCriterionRow[]> {
	const result = await client
		.from('cw_rule_template_criteria')
		.select('created_at, id, operator, reset_value, subject, template_id, trigger_value')
		.in('template_id', templateIds);

	if (result.error) {
		throwSupabaseError('Failed to load rule criteria', result.error);
	}

	return result.data ?? [];
}

async function loadActionsByTemplateIds(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateIds: number[]
): Promise<RuleActionRow[]> {
	const result = await client
		.from('cw_rule_template_actions')
		.select('action_type, config, created_at, id, template_id')
		.in('template_id', templateIds);

	if (result.error) {
		throwSupabaseError('Failed to load rule actions', result.error);
	}

	return result.data ?? [];
}

async function loadStates(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateIds: number[],
	devEuis: string[]
): Promise<RuleStateRow[]> {
	const uniqueDevEuis = uniqueIds(devEuis);
	if (templateIds.length === 0 || uniqueDevEuis.length === 0) return [];

	const result = await client
		.from('cw_rule_state')
		.select('dev_eui, id, is_triggered, last_reset_at, last_triggered_at, template_id')
		.in('template_id', templateIds)
		.in('dev_eui', uniqueDevEuis);

	if (result.error) {
		throwSupabaseError('Failed to load rule state', result.error);
	}

	return result.data ?? [];
}

async function replaceTemplateChildren(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateId: number,
	payload: NormalizedRuleTemplateSaveRequest
): Promise<void> {
	await deleteTemplateChildren(client, templateId);

	const assignments = payload.devEuis.map((devEui) => ({
		dev_eui: devEui,
		template_id: templateId,
		is_active: true
	}));
	const criteria = payload.criteria.map((criterion) => ({
		template_id: templateId,
		subject: criterion.subject,
		operator: criterion.operator,
		trigger_value: criterion.triggerValue,
		reset_value: criterion.resetValue
	}));
	const actions = payload.actions.map((action) => ({
		template_id: templateId,
		action_type: action.actionType,
		config: action.config
	}));

	const [assignmentsResult, criteriaResult, actionsResult] = await Promise.all([
		client.from('cw_device_rule_assignments').insert(assignments),
		client.from('cw_rule_template_criteria').insert(criteria),
		client.from('cw_rule_template_actions').insert(actions)
	]);

	if (assignmentsResult.error) {
		throwSupabaseError('Failed to save rule assignments', assignmentsResult.error);
	}
	if (criteriaResult.error) {
		throwSupabaseError('Failed to save rule criteria', criteriaResult.error);
	}
	if (actionsResult.error) {
		throwSupabaseError('Failed to save rule actions', actionsResult.error);
	}
}

async function deleteTemplateChildren(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateId: number
): Promise<void> {
	const [assignmentsResult, criteriaResult, actionsResult] = await Promise.all([
		client.from('cw_device_rule_assignments').delete().eq('template_id', templateId),
		client.from('cw_rule_template_criteria').delete().eq('template_id', templateId),
		client.from('cw_rule_template_actions').delete().eq('template_id', templateId)
	]);

	if (assignmentsResult.error) {
		throwSupabaseError('Failed to remove rule assignments', assignmentsResult.error);
	}
	if (criteriaResult.error) {
		throwSupabaseError('Failed to remove rule criteria', criteriaResult.error);
	}
	if (actionsResult.error) {
		throwSupabaseError('Failed to remove rule actions', actionsResult.error);
	}
}

async function deleteTemplateState(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateId: number
): Promise<void> {
	const result = await client.from('cw_rule_state').delete().eq('template_id', templateId);
	if (result.error) {
		throwSupabaseError('Failed to reset rule state', result.error);
	}
}

async function deleteTemplateBestEffort(
	client: SupabaseClient<RuleTemplatesDatabase>,
	templateId: number
): Promise<void> {
	try {
		await deleteTemplateChildren(client, templateId);
		await client.from('cw_rule_templates').delete().eq('id', templateId);
	} catch (error) {
		console.error('Failed to clean up partially-created rule template:', { templateId, error });
	}
}

function buildRuleTemplates({
	templates,
	assignments,
	criteria,
	actions,
	states,
	devices
}: {
	templates: RuleTemplateRow[];
	assignments: RuleAssignmentRow[];
	criteria: RuleCriterionRow[];
	actions: RuleActionRow[];
	states: RuleStateRow[];
	devices: ManagedDevice[];
}): RuleTemplateDto[] {
	const devicesById = new Map(devices.map((device) => [device.devEui, device]));
	const assignmentsByTemplateId = groupBy(assignments, (assignment) => assignment.template_id);
	const criteriaByTemplateId = groupBy(criteria, (criterion) => criterion.template_id);
	const actionsByTemplateId = groupBy(actions, (action) => action.template_id);
	const statesByTemplateAndDevice = new Map(
		states.map((state) => [`${state.template_id}:${state.dev_eui}`, state])
	);

	return templates
		.map((template): RuleTemplateDto | null => {
			const ruleAssignments = assignmentsByTemplateId.get(template.id) ?? [];
			if (ruleAssignments.length === 0) return null;

			return {
				id: template.id,
				name: template.name,
				description: template.description,
				deviceTypeId: template.device_type_id,
				isActive: template.is_active ?? true,
				createdAt: template.created_at,
				assignments: ruleAssignments.map((assignment): RuleTemplateAssignmentDto => {
					const device = devicesById.get(assignment.dev_eui);
					const state = statesByTemplateAndDevice.get(
						`${assignment.template_id}:${assignment.dev_eui}`
					);

					return {
						id: assignment.id,
						devEui: assignment.dev_eui,
						templateId: assignment.template_id,
						isActive: assignment.is_active ?? true,
						createdAt: assignment.created_at,
						deviceName: device?.name ?? null,
						permissionLevel: device?.permissionLevel ?? null,
						state: state ? mapState(state) : null
					};
				}),
				criteria: (criteriaByTemplateId.get(template.id) ?? []).map(mapCriterion),
				actions: (actionsByTemplateId.get(template.id) ?? []).map(mapAction)
			};
		})
		.filter((rule): rule is RuleTemplateDto => rule !== null)
		.sort((a, b) => a.name.localeCompare(b.name));
}

function mapCriterion(row: RuleCriterionRow): RuleTemplateCriterionDto {
	return {
		id: row.id,
		templateId: row.template_id,
		subject: row.subject,
		operator: row.operator,
		triggerValue: row.trigger_value,
		resetValue: row.reset_value,
		createdAt: row.created_at
	};
}

function mapAction(row: RuleActionRow): RuleTemplateActionDto {
	return {
		id: row.id,
		templateId: row.template_id,
		actionType: row.action_type,
		config: row.config,
		createdAt: row.created_at
	};
}

function mapState(row: RuleStateRow): RuleTemplateStateDto {
	return {
		id: row.id,
		devEui: row.dev_eui,
		templateId: row.template_id,
		isTriggered: row.is_triggered,
		lastTriggeredAt: row.last_triggered_at,
		lastResetAt: row.last_reset_at
	};
}

function normalizeRuleTemplateSaveRequest(input: unknown): NormalizedRuleTemplateSaveRequest {
	if (!isRecord(input)) {
		throw new RuleTemplateRepositoryError(400, 'Invalid rule template payload.');
	}

	const name = typeof input.name === 'string' ? input.name.trim() : '';
	if (!name) {
		throw new RuleTemplateRepositoryError(400, 'Rule name is required.');
	}

	const devEuis = normalizeStringArray(input.devEuis);
	if (devEuis.length === 0) {
		throw new RuleTemplateRepositoryError(400, 'At least one device is required.');
	}

	const criteria = normalizeCriteria(input.criteria);
	if (criteria.length === 0) {
		throw new RuleTemplateRepositoryError(400, 'At least one condition is required.');
	}

	const actions = normalizeActions(input.actions);
	if (actions.length === 0) {
		throw new RuleTemplateRepositoryError(400, 'At least one action is required.');
	}

	return {
		name,
		description:
			typeof input.description === 'string' && input.description.trim()
				? input.description.trim()
				: null,
		deviceTypeId: readFiniteNumber(input.deviceTypeId),
		isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
		devEuis,
		criteria,
		actions
	};
}

function normalizeCriteria(input: unknown): RuleTemplateCriterionInput[] {
	if (!Array.isArray(input)) {
		throw new RuleTemplateRepositoryError(400, 'Rule criteria must be an array.');
	}

	return input.map((item, index) => {
		if (!isRecord(item)) {
			throw new RuleTemplateRepositoryError(400, `Condition ${index + 1} is invalid.`);
		}

		const subject = typeof item.subject === 'string' ? item.subject.trim() : '';
		const operator = typeof item.operator === 'string' ? item.operator.trim() : '';
		const triggerValue = readFiniteNumber(item.triggerValue);
		const resetValue = readFiniteNumber(item.resetValue);

		if (!subject || !operator || triggerValue === null || resetValue === null) {
			throw new RuleTemplateRepositoryError(
				400,
				`Condition ${index + 1} must include a field, operator, trigger value, and reset value.`
			);
		}

		return {
			id: readFiniteNumber(item.id),
			subject,
			operator,
			triggerValue,
			resetValue
		};
	});
}

function normalizeActions(input: unknown): RuleTemplateActionInput[] {
	if (!Array.isArray(input)) {
		throw new RuleTemplateRepositoryError(400, 'Rule actions must be an array.');
	}

	return input.map((item, index) => {
		if (!isRecord(item)) {
			throw new RuleTemplateRepositoryError(400, `Action ${index + 1} is invalid.`);
		}

		const actionType = typeof item.actionType === 'string' ? item.actionType.trim() : '';
		if (!actionType) {
			throw new RuleTemplateRepositoryError(400, `Action ${index + 1} needs a type.`);
		}

		const config = item.config;
		if (!isJson(config)) {
			throw new RuleTemplateRepositoryError(400, `Action ${index + 1} has invalid config.`);
		}

		return {
			id: readFiniteNumber(item.id),
			actionType,
			config
		};
	});
}

function normalizeStringArray(input: unknown): string[] {
	if (!Array.isArray(input)) return [];

	return uniqueIds(
		input
			.map((value) => (typeof value === 'string' ? value.trim() : ''))
			.filter((value) => value.length > 0)
	);
}

function matchesSearch(rule: RuleTemplateDto, search: string): boolean {
	const deviceText = rule.assignments
		.map((assignment) => `${assignment.deviceName ?? ''} ${assignment.devEui}`)
		.join(' ');

	return [rule.name, rule.description ?? '', deviceText].join(' ').toLowerCase().includes(search);
}

function groupBy<T, TKey>(items: T[], key: (item: T) => TKey): Map<TKey, T[]> {
	const result = new Map<TKey, T[]>();
	for (const item of items) {
		const groupKey = key(item);
		const existing = result.get(groupKey) ?? [];
		existing.push(item);
		result.set(groupKey, existing);
	}
	return result;
}

function uniqueIds<T extends string | number>(values: T[]): T[] {
	return [...new Set(values)];
}

function readFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function isJson(value: unknown): value is Json {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return typeof value !== 'number' || Number.isFinite(value);
	}

	if (Array.isArray(value)) {
		return value.every(isJson);
	}

	if (!isRecord(value)) {
		return false;
	}

	return Object.values(value).every((entry) => entry === undefined || isJson(entry));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwSupabaseError(context: string, error: { message: string }): never {
	throw new RuleTemplateRepositoryError(500, `${context}: ${error.message}`);
}
