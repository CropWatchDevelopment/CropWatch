import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoilDataService } from '../../services/SoilDataService';
import { SoilDataRepository } from '../../repositories/SoilDataRepository';
import { createMockSupabaseClient, createErrorMockSupabaseClient } from '../mocks/MockSupabase';
import { ErrorHandlingService } from '../../errors/ErrorHandlingService';
import type { SoilData } from '../../models/SoilData';
import type { SoilDataDto } from '../../dtos/SoilDataDto';

describe('SoilDataService', () => {
  let soilDataService: SoilDataService;
  let mockRepository: any;
  let errorHandlingService: ErrorHandlingService;

  const mockSoilData: SoilData[] = [
    {
      dev_eui: 'abc123',
      moisture: 45.5,
      temperature: 18.2,
      ph: 6.5,
      nutrient_level: 'medium',
      created_at: '2025-05-01T12:00:00Z',
    },
    {
      dev_eui: 'abc123',
      moisture: 47.0,
      temperature: 18.5,
      ph: 6.7,
      nutrient_level: 'medium',
      created_at: '2025-05-01T13:00:00Z',
    }
  ];

  beforeEach(() => {
    mockRepository = {
      findByDeviceEui: vi.fn(),
      findLatestByDeviceEui: vi.fn(),
      findByDateRange: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    errorHandlingService = new ErrorHandlingService();
    soilDataService = new SoilDataService(mockRepository, errorHandlingService);
  });

  describe('getByDeviceEui', () => {
    it('should return soil data for a device', async () => {
      mockRepository.findByDeviceEui.mockResolvedValue(mockSoilData);

      const result = await soilDataService.getByDeviceEui('abc123');

      expect(mockRepository.findByDeviceEui).toHaveBeenCalledWith('abc123');
      expect(result).toHaveLength(2);
      expect(result[0].moisture).toBe(45.5);
      expect(result[1].ph).toBe(6.7);
    });

    it('should handle errors when getting soil data', async () => {
      mockRepository.findByDeviceEui.mockRejectedValue(new Error('Database error'));

      await expect(soilDataService.getByDeviceEui('abc123')).rejects.toThrow('Database error');
    });
  });

  describe('getLatestByDeviceEui', () => {
    it('should return latest soil data for a device', async () => {
      mockRepository.findLatestByDeviceEui.mockResolvedValue(mockSoilData[1]);

      const result = await soilDataService.getLatestByDeviceEui('abc123');

      expect(mockRepository.findLatestByDeviceEui).toHaveBeenCalledWith('abc123');
      expect(result).toBeDefined();
      expect(result.moisture).toBe(47.0);
    });

    it('should return null when no data exists', async () => {
      mockRepository.findLatestByDeviceEui.mockResolvedValue(null);

      const result = await soilDataService.getLatestByDeviceEui('abc123');

      expect(result).toBeNull();
    });
  });

  describe('getByDateRange', () => {
    it('should return soil data within a date range', async () => {
      mockRepository.findByDateRange.mockResolvedValue(mockSoilData);

      const startDate = new Date('2025-05-01T00:00:00Z');
      const endDate = new Date('2025-05-02T00:00:00Z');

      const result = await soilDataService.getByDateRange('abc123', startDate, endDate);

      expect(mockRepository.findByDateRange).toHaveBeenCalledWith('abc123', startDate, endDate);
      expect(result).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should create new soil data', async () => {
      const soilDataDto: SoilDataDto = {
        dev_eui: 'abc123',
        moisture: 48.5,
        temperature: 19.0,
        ph: 6.8,
        nutrient_level: 'high'
      };

      const createdSoilData: SoilData = {
        ...soilDataDto,
        created_at: '2025-05-01T14:00:00Z'
      };

      mockRepository.create.mockResolvedValue(createdSoilData);

      const result = await soilDataService.create(soilDataDto);

      expect(mockRepository.create).toHaveBeenCalledWith(soilDataDto);
      expect(result).toBeDefined();
      expect(result.moisture).toBe(48.5);
      expect(result.nutrient_level).toBe('high');
      expect(result.created_at).toBeDefined();
    });
  });
});