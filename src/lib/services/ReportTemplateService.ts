import { ReportTemplateRepository } from '../repositories/ReportTemplateRepository';
import type {
	ReportTemplate,
	ReportTemplateInsert,
	ReportTemplateUpdate
} from '../models/ReportTemplate';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

export class ReportTemplateService {
	constructor(
		private repo: ReportTemplateRepository,
		private errorHandler: ErrorHandlingService = new ErrorHandlingService()
	) {}

	async getUserReports(userId: string): Promise<ReportTemplate[]> {
		return this.repo.findByOwner(userId);
	}

	async getReport(id: number): Promise<ReportTemplate | null> {
		return this.repo.findById(id);
	}

	async createReport(report: ReportTemplateInsert): Promise<ReportTemplate> {
		return this.repo.create(report);
	}

	async updateReport(id: number, report: ReportTemplateUpdate): Promise<ReportTemplate | null> {
		return this.repo.update(id, report);
	}

	async deleteReport(id: number): Promise<boolean> {
		return this.repo.delete(id);
	}
}
