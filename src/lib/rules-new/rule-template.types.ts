export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface RuleTemplateCriterionDto {
	id: number;
	templateId: number;
	subject: string;
	operator: string;
	triggerValue: number;
	resetValue: number;
	createdAt: string | null;
}

export interface RuleTemplateActionDto {
	id: number;
	templateId: number;
	actionType: string;
	config: Json;
	createdAt: string | null;
}

export interface RuleTemplateStateDto {
	id: number;
	devEui: string;
	templateId: number;
	isTriggered: boolean;
	lastTriggeredAt: string | null;
	lastResetAt: string | null;
}

export interface RuleTemplateAssignmentDto {
	id: number;
	devEui: string;
	templateId: number;
	isActive: boolean;
	createdAt: string | null;
	deviceName: string | null;
	permissionLevel: number | null;
	state: RuleTemplateStateDto | null;
}

export interface RuleTemplateDto {
	id: number;
	name: string;
	description: string | null;
	deviceTypeId: number | null;
	isActive: boolean;
	createdAt: string | null;
	assignments: RuleTemplateAssignmentDto[];
	criteria: RuleTemplateCriterionDto[];
	actions: RuleTemplateActionDto[];
}

export interface RuleTemplateCriterionInput {
	id?: number | null;
	subject: string;
	operator: string;
	triggerValue: number;
	resetValue: number;
}

export interface RuleTemplateActionInput {
	id?: number | null;
	actionType: string;
	config: Json;
}

export interface RuleTemplateSaveRequest {
	name: string;
	description?: string | null;
	deviceTypeId?: number | null;
	isActive?: boolean;
	devEuis: string[];
	criteria: RuleTemplateCriterionInput[];
	actions: RuleTemplateActionInput[];
}

export interface RuleTemplateListQuery {
	search?: string;
}
