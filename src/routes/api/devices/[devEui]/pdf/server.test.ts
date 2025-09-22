import { GET } from './+server';
import { jest } from '@jest/globals';
import { createPDFDataTable } from '$lib/pdf/pdfDataTable';
import { addFooterPageNumber } from '$lib/pdf/pdfFooterPageNumber';
import { createPDFLineChartImage } from '$lib/pdf/pdfLineChartImage';

jest.mock('$lib/pdf/pdfDataTable');
jest.mock('$lib/pdf/pdfFooterPageNumber');
jest.mock('$lib/pdf/pdfLineChartImage');

describe('GET /api/devices/[devEui]/pdf', () => {
	it('should return a PDF response with correct headers', async () => {
		const mockSupabase = {
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: { user: { id: 'user-id' } },
					error: null
				})
			},
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest
							.fn()
							.mockResolvedValue({ data: { full_name: 'Test User', employer: 'Test Company' } })
					})
				})
			})
		};

		const params = { devEui: 'test-devEui' };
		const url = new URL(
			'http://localhost/api/devices/test-devEui/pdf?start=2025-05-01&end=2025-06-06&timezone=Asia/Tokyo&locale=ja'
		);
		const locals = { supabase: mockSupabase };

		const response = await GET({ params, url, locals });

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/pdf');
		expect(response.headers.get('Content-Disposition')).toContain('device-test-devEui-report.pdf');
	});

	it('should return 401 if supabase is not provided', async () => {
		const params = { devEui: 'test-devEui' };
		const url = new URL('http://localhost/api/devices/test-devEui/pdf');
		const locals = { supabase: null };

		const response = await GET({ params, url, locals });

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized access' });
	});
});
