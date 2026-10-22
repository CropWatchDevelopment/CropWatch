import type {
	ReportFormContextDto,
	ReportRegenerationItemDto,
	ReportRegenerationRequestInput,
	ReportTemplateDto,
	ReportTemplateHistoryItemDto,
	ReportTemplateListQuery,
	ReportTemplateSaveRequest
} from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams } from '../http/url';

/** Report templates, generated reports (history, downloads) and regeneration requests. */
export interface ReportRepository {
	getReportTemplates(
		query?: ReportTemplateListQuery,
		options?: RequestSignalOptions
	): Promise<ReportTemplateDto[]>;
	getReportTemplate(id: number, options?: RequestSignalOptions): Promise<ReportTemplateDto>;
	getReportTemplateHistory(
		id: number,
		options?: RequestSignalOptions
	): Promise<ReportTemplateHistoryItemDto[]>;
	getReportRegenerations(
		id: number,
		options?: RequestSignalOptions
	): Promise<ReportRegenerationItemDto[]>;
	requestReportRegeneration(
		id: number,
		payload: ReportRegenerationRequestInput
	): Promise<ReportRegenerationItemDto>;
	/** Devices, recipients and the like for the report form; the template too when editing. */
	getReportFormContext(
		templateId?: number,
		options?: RequestSignalOptions
	): Promise<ReportFormContextDto>;
	createReportTemplate(
		payload: ReportTemplateSaveRequest,
		options?: RequestSignalOptions
	): Promise<ReportTemplateDto>;
	updateReportTemplate(
		id: number,
		payload: ReportTemplateSaveRequest,
		options?: RequestSignalOptions
	): Promise<ReportTemplateDto>;
	deleteReportTemplate(id: number, options?: RequestSignalOptions): Promise<{ id: number }>;
	/** A short-lived URL for one generated report file. */
	getReportTemplateDownloadUrl(
		devEui: string,
		reportName: string,
		options?: RequestSignalOptions
	): Promise<{ url: string }>;
}

export class HttpReportRepository implements ReportRepository {
	readonly #http: HttpClient;
	readonly #templatesEndpoint: string;
	readonly #templateByIdEndpoint: string;

	public constructor(http: HttpClient, endpoints: { reportTemplates: string }) {
		this.#http = http;
		this.#templatesEndpoint = endpoints.reportTemplates;
		this.#templateByIdEndpoint = `${endpoints.reportTemplates}/{id}`;
	}

	public getReportTemplates(
		query: ReportTemplateListQuery = {},
		options: RequestSignalOptions = {}
	): Promise<ReportTemplateDto[]> {
		return this.#http.request<ReportTemplateDto[]>(this.#templatesEndpoint, {
			method: 'GET',
			signal: options.signal,
			query: {
				search: query.search
			}
		});
	}

	public getReportTemplate(
		id: number,
		options: RequestSignalOptions = {}
	): Promise<ReportTemplateDto> {
		return this.#http.request<ReportTemplateDto>(
			replacePathParams(this.#templateByIdEndpoint, { id }),
			{ method: 'GET', signal: options.signal }
		);
	}

	public getReportTemplateHistory(
		id: number,
		options: RequestSignalOptions = {}
	): Promise<ReportTemplateHistoryItemDto[]> {
		return this.#http.request<ReportTemplateHistoryItemDto[]>(
			replacePathParams(`${this.#templatesEndpoint}/{id}/history`, { id }),
			{ method: 'GET', signal: options.signal }
		);
	}

	public getReportRegenerations(
		id: number,
		options: RequestSignalOptions = {}
	): Promise<ReportRegenerationItemDto[]> {
		return this.#http.request<ReportRegenerationItemDto[]>(
			replacePathParams(`${this.#templatesEndpoint}/{id}/regenerations`, { id }),
			{ method: 'GET', signal: options.signal }
		);
	}

	public requestReportRegeneration(
		id: number,
		payload: ReportRegenerationRequestInput
	): Promise<ReportRegenerationItemDto> {
		return this.#http.request<ReportRegenerationItemDto>(
			replacePathParams(`${this.#templatesEndpoint}/{id}/regenerate`, { id }),
			{ method: 'POST', body: payload }
		);
	}

	public getReportFormContext(
		templateId?: number,
		options: RequestSignalOptions = {}
	): Promise<ReportFormContextDto> {
		return this.#http.request<ReportFormContextDto>(`${this.#templatesEndpoint}/form-context`, {
			method: 'GET',
			signal: options.signal,
			query: typeof templateId === 'number' ? { templateId } : undefined
		});
	}

	public createReportTemplate(
		payload: ReportTemplateSaveRequest,
		options: RequestSignalOptions = {}
	): Promise<ReportTemplateDto> {
		return this.#http.request<ReportTemplateDto>(this.#templatesEndpoint, {
			method: 'POST',
			body: payload,
			signal: options.signal
		});
	}

	public updateReportTemplate(
		id: number,
		payload: ReportTemplateSaveRequest,
		options: RequestSignalOptions = {}
	): Promise<ReportTemplateDto> {
		return this.#http.request<ReportTemplateDto>(
			replacePathParams(this.#templateByIdEndpoint, { id }),
			{ method: 'PATCH', body: payload, signal: options.signal }
		);
	}

	public deleteReportTemplate(
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

	public getReportTemplateDownloadUrl(
		devEui: string,
		reportName: string,
		options: RequestSignalOptions = {}
	): Promise<{ url: string }> {
		return this.#http.request<{ url: string }>(
			replacePathParams(`${this.#templatesEndpoint}/download/{dev_eui}/{reportName}`, {
				dev_eui: devEui,
				reportName
			}),
			{ method: 'GET', signal: options.signal }
		);
	}
}
