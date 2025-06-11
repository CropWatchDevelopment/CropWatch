import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AirDataService } from '../../services/AirDataService';
import { AirDataRepository } from '../../repositories/AirDataRepository';
import { ErrorHandlingService } from '../../errors/ErrorHandlingService';
import type { AirData } from '../../models/AirData';
import type { AirDataDto } from '../../dtos/AirDataDto';

describe('AirDataService', () => {
  let airDataService: AirDataService;
  let mockRepository: any;
  let errorHandlingService: ErrorHandlingService;
  
  const mockAirData: AirData[] = [
    {
      dev_eui: 'abc123',
      temperature: 25.5,
      humidity: 65.2,
      created_at: '2025-05-01T12:00:00Z',
    },
    {
      dev_eui: 'abc123',
      temperature: 26.0,
      humidity: 66.5,
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
    airDataService = new AirDataService(mockRepository, errorHandlingService);
  });
  
  describe('getAirDataByDevice', () => {
    it('should return air data for a device', async () => {
      mockRepository.findByDeviceEui.mockResolvedValue(mockAirData);
      
      const result = await airDataService.getAirDataByDevice('abc123');
      
      expect(mockRepository.findByDeviceEui).toHaveBeenCalledWith('abc123');
      expect(result).toHaveLength(2);
      expect(result[0].temperature).toBe(25.5);
      expect(result[1].humidity).toBe(66.5);
    });
    
    it('should handle errors when getting air data', async () => {
      mockRepository.findByDeviceEui.mockRejectedValue(new Error('Database error'));
      
      await expect(airDataService.getAirDataByDevice('abc123')).rejects.toThrow('Database error');
    });
  });
  
  describe('getLatestAirDataByDevice', () => {
    it('should return latest air data for a device', async () => {
      mockRepository.findLatestByDeviceEui.mockResolvedValue(mockAirData[1]);
      
      const result = await airDataService.getLatestAirDataByDevice('abc123');
      
      expect(mockRepository.findLatestByDeviceEui).toHaveBeenCalledWith('abc123');
      expect(result).toBeDefined();
      expect(result.temperature).toBe(26.0);
    });
    
    it('should return null when no data exists', async () => {
      mockRepository.findLatestByDeviceEui.mockResolvedValue(null);
      
      const result = await airDataService.getLatestAirDataByDevice('abc123');
      
      expect(result).toBeNull();
    });
  });
  
  describe('getAirDataByDateRange', () => {
    it('should return air data within a date range', async () => {
      mockRepository.findByDateRange.mockResolvedValue(mockAirData);
      
      const startDate = new Date('2025-05-01T00:00:00Z');
      const endDate = new Date('2025-05-02T00:00:00Z');
      
      const result = await airDataService.getAirDataByDateRange('abc123', startDate, endDate);
      
      expect(mockRepository.findByDateRange).toHaveBeenCalledWith('abc123', startDate, endDate);
      expect(result).toHaveLength(2);
    });
  });
  
  describe('create', () => {
    it('should create new air data', async () => {
      const airDataDto: AirDataDto = {
        dev_eui: 'abc123',
        temperature: 27.5,
        humidity: 68.0
      };
      
      const createdAirData: AirData = {
        ...airDataDto,
        created_at: '2025-05-01T14:00:00Z'
      };
      
      mockRepository.create.mockResolvedValue(createdAirData);
      
      const result = await airDataService.createAirData(airDataDto);
      
      expect(mockRepository.create).toHaveBeenCalledWith(airDataDto);
      expect(result).toBeDefined();
      expect(result.temperature).toBe(27.5);
      expect(result.created_at).toBeDefined();
    });
  });
});