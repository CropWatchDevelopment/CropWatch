import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocationService } from '../../services/LocationService';
import { LocationRepository } from '../../repositories/LocationRepository';
import { ErrorHandlingService } from '../../errors/ErrorHandlingService';
import type { Location } from '../../models/Location';
import type { LocationDto } from '../../dtos/LocationDto';

describe('LocationService', () => {
  let locationService: LocationService;
  let mockRepository: any;
  let errorHandlingService: ErrorHandlingService;
  
  const mockLocations: Location[] = [
    {
      id: '1',
      name: 'Greenhouse 1',
      coordinates: { lat: 35.6812, lng: 139.7671 },
      user_id: 'user_123',
      created_at: '2025-05-01T10:00:00Z'
    },
    {
      id: '2',
      name: 'Field A',
      coordinates: { lat: 35.6813, lng: 139.7675 },
      user_id: 'user_123',
      created_at: '2025-05-01T11:00:00Z'
    }
  ];
  
  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    errorHandlingService = new ErrorHandlingService();
    locationService = new LocationService(mockRepository, errorHandlingService);
  });
  
  describe('getAll', () => {
    it('should return all locations', async () => {
      mockRepository.findAll.mockResolvedValue(mockLocations);
      
      const result = await locationService.getAll();
      
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Greenhouse 1');
      expect(result[1].name).toBe('Field A');
    });
    
    it('should handle errors when getting all locations', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database error'));
      
      await expect(locationService.getAll()).rejects.toThrow('Database error');
    });
  });
  
  describe('getById', () => {
    it('should return a location by id', async () => {
      mockRepository.findById.mockResolvedValue(mockLocations[0]);
      
      const result = await locationService.getById('1');
      
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Greenhouse 1');
    });
    
    it('should return null when location does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);
      
      const result = await locationService.getById('999');
      
      expect(result).toBeNull();
    });
  });
  
  describe('getByUserId', () => {
    it('should return locations for a user', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockLocations);
      
      const result = await locationService.getByUserId('user_123');
      
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user_123');
      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe('user_123');
    });
  });
  
  describe('create', () => {
    it('should create a new location', async () => {
      const locationDto: LocationDto = {
        name: 'Greenhouse 2',
        coordinates: { lat: 35.6820, lng: 139.7680 },
        user_id: 'user_123'
      };
      
      const createdLocation: Location = {
        ...locationDto,
        id: '3',
        created_at: '2025-05-02T10:00:00Z'
      };
      
      mockRepository.create.mockResolvedValue(createdLocation);
      
      const result = await locationService.create(locationDto);
      
      expect(mockRepository.create).toHaveBeenCalledWith(locationDto);
      expect(result).toBeDefined();
      expect(result.id).toBe('3');
      expect(result.name).toBe('Greenhouse 2');
    });
  });
  
  describe('update', () => {
    it('should update an existing location', async () => {
      const locationDto: LocationDto = {
        name: 'Greenhouse 1 Updated',
        coordinates: { lat: 35.6812, lng: 139.7671 },
        user_id: 'user_123'
      };
      
      const updatedLocation: Location = {
        ...locationDto,
        id: '1',
        created_at: '2025-05-01T10:00:00Z'
      };
      
      mockRepository.update.mockResolvedValue(updatedLocation);
      
      const result = await locationService.update('1', locationDto);
      
      expect(mockRepository.update).toHaveBeenCalledWith('1', locationDto);
      expect(result).toBeDefined();
      expect(result.name).toBe('Greenhouse 1 Updated');
    });
    
    it('should return null when location to update does not exist', async () => {
      mockRepository.update.mockResolvedValue(null);
      
      const result = await locationService.update('999', { name: 'Test', coordinates: { lat: 0, lng: 0 }, user_id: 'user_123' });
      
      expect(result).toBeNull();
    });
  });
  
  describe('delete', () => {
    it('should delete a location', async () => {
      mockRepository.delete.mockResolvedValue({ success: true });
      
      const result = await locationService.delete('1');
      
      expect(mockRepository.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ success: true });
    });
  });
});