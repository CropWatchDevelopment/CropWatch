import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportTemplateService } from '../../services/ReportTemplateService';
import type { ReportTemplate } from '../../models/ReportTemplate';

describe('ReportTemplateService', () => {
  let service: ReportTemplateService;
  let repo: any;
  const mockReports: ReportTemplate[] = [
    { id: 1, name: 'R1', owner_id: 'user1', created_at: '2024-01-01', dev_eui: null, recipients: null, template: {} }
  ];

  beforeEach(() => {
    repo = {
      findByOwner: vi.fn().mockResolvedValue(mockReports),
      findById: vi.fn().mockResolvedValue(mockReports[0]),
      create: vi.fn().mockResolvedValue(mockReports[0]),
      update: vi.fn().mockResolvedValue(mockReports[0]),
      delete: vi.fn().mockResolvedValue(true)
    };
    service = new ReportTemplateService(repo);
  });

  it('returns user reports', async () => {
    const res = await service.getUserReports('user1');
    expect(repo.findByOwner).toHaveBeenCalledWith('user1');
    expect(res).toHaveLength(1);
  });

  it('creates report', async () => {
    await service.createReport({ name: 'N', template: {}, owner_id: 'user1' } as any);
    expect(repo.create).toHaveBeenCalled();
  });
});
