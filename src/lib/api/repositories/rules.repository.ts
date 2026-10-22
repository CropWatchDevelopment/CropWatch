import type {
	RuleFormContextDto,
	RuleTemplateDto,
	RuleTemplateListQuery,
	RuleTemplateSaveRequest,
	RuleTriggerLogDto,
	TriggeredRulesCountResponse
} from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams } from '../http/url';

/** Alert rule templates, their trigger history, and the rules currently triggered. */
export interface RuleRepository {
	getTriggeredRules(): Promise<RuleTemplateDto[]>;
	getTriggeredRulesCount(): Promise<TriggeredRulesCountResponse>;
	getRuleTemplates(
		query?: RuleTemplateListQuery,
		options?: RequestSignalOptions
	): Promise<RuleTemplateDto[]>;
	getRuleTemplateHistory(id: number, options?: RequestSignalOptions): Promise<RuleTriggerLogDto[]>;
	/** Devices, locations and action types for the rule form; the template too when editing. */
	getRuleFormContext(
		templateId?: number,
		options?: RequestSignalOptions
	): Promise<RuleFormContextDto>;
	createRuleTemplate(
		payload: RuleTemplateSaveRequest,
		options?: RequestSignalOptions
	): Promise<RuleTemplateDto>;
	updateRuleTemplate(
		id: number,
		payload: RuleTemplateSaveRequest,
		options?: RequestSignalOptions
	): Promise<RuleTemplateDto>;
	deleteRuleTemplate(id: number, options?: RequestSignalOptions): Promise<{ id: number }>;
}

export class HttpRuleRepository implements RuleRepository {
	readonly #http: HttpClient;
	readonly #templatesEndpoint: string;
	readonly #templateByIdEndpoint: string;

	public constructor(http: HttpClient, endpoints: { ruleTemplates: string }) {
		this.#http = http;
		this.#templatesEndpoint = endpoints.ruleTemplates;
		this.#templateByIdEndpoint = `${endpoints.ruleTemplates}/{id}`;
	}

	public getTriggeredRules(): Promise<RuleTemplateDto[]> {
		return this.#http.request<RuleTemplateDto[]>(`${this.#templatesEndpoint}/triggered`, {
			method: 'GET'
		});
	}

	public getTriggeredRulesCount(): Promise<TriggeredRulesCountResponse> {
		return this.#http.request<TriggeredRulesCountResponse>(
			`${this.#templatesEndpoint}/triggered/count`,
			{ method: 'GET' }
		);
	}

	public getRuleTemplates(
		query: RuleTemplateListQuery = {},
		options: RequestSignalOptions = {}
	): Promise<RuleTemplateDto[]> {
		return this.#http.request<RuleTemplateDto[]>(this.#templatesEndpoint, {
			method: 'GET',
			signal: options.signal,
			query: {
				search: query.search
			}
		});
	}

	public getRuleTemplateHistory(
		id: number,
		options: RequestSignalOptions = {}
	): Promise<RuleTriggerLogDto[]> {
		return this.#http.request<RuleTriggerLogDto[]>(
			replacePathParams(`${this.#templatesEndpoint}/{id}/history`, { id }),
			{ method: 'GET', signal: options.signal }
		);
	}

	public getRuleFormContext(
		templateId?: number,
		options: RequestSignalOptions = {}
	): Promise<RuleFormContextDto> {
		return this.#http.request<RuleFormContextDto>(`${this.#templatesEndpoint}/form-context`, {
			method: 'GET',
			signal: options.signal,
			query: typeof templateId === 'number' ? { templateId } : undefined
		});
	}

	public createRuleTemplate(
		payload: RuleTemplateSaveRequest,
		options: RequestSignalOptions = {}
	): Promise<RuleTemplateDto> {
		return this.#http.request<RuleTemplateDto>(this.#templatesEndpoint, {
			method: 'POST',
			body: payload,
			signal: options.signal
		});
	}

	public updateRuleTemplate(
		id: number,
		payload: RuleTemplateSaveRequest,
		options: RequestSignalOptions = {}
	): Promise<RuleTemplateDto> {
		return this.#http.request<RuleTemplateDto>(
			replacePathParams(this.#templateByIdEndpoint, { id }),
			{ method: 'PATCH', body: payload, signal: options.signal }
		);
	}

	public deleteRuleTemplate(
		id: number,
		options: RequestSignalOptions = {}
	): Promise<{ id: number }> {
		return this.#http.request<{ id: number }>(
			replacePathParams(this.#templateByIdEndpoint, { id }),
			{
				method: 'DELETE',
				signal: options.signal
			}
		);
	}
}
