import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceService } from '../../services/DeviceService';
import { DeviceRepository } from '../../repositories/DeviceRepository';
import { createMockSupabaseClient, createErrorMockSupabaseClient } from '../mocks/MockSupabase';
import { ErrorHandlingService } from '../../errors/ErrorHandlingService';
import { NotFoundError } from '../../errors/SpecificErrors';
import type { Device } from '../../models/Device';
import type { CreateDeviceDto, UpdateDeviceDto } from '../../dtos/DeviceDto';

describe('DeviceService', () => {
  // Mock data
  const mockDevices: Device[] = [
    {
      dev_eui: 'device-001',
      name: 'Test Device 1',
      type: 1,
      location_id: 100,
      lat: 40.7128,
      long: -74.006
    },
    {
      dev_eui: 'device-002',
      name: 'Test Device 2',
      type: 2,
      location_id: 101
    }
  ];

  // Mock implementations
  let deviceService: DeviceService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let deviceRepository: DeviceRepository;
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    // Create test mocks
    mockSupabase = createMockSupabaseClient({
      'cw_devices': mockDevices
    });
    
    errorHandlingService = new ErrorHandlingService();
    vi.spyOn(errorHandlingService, 'logError');
    
    deviceRepository = new DeviceRepository(mockSupabase, errorHandlingService);
    deviceService = new DeviceService(deviceRepository);
  });

  describe('getAllDevices', () => {
    it('should return all devices', async () => {
      const devices = await deviceService.getAllDevices();
      expect(devices).toHaveLength(2);
      expect(devices[0].dev_eui).toBe('device-001');
      expect(devices[1].dev_eui).toBe('device-002');
    });

    it('should handle errors when retrieving devices', async () => {
      const errorSupabase = createErrorMockSupabaseClient();
      const errorRepo = new DeviceRepository(errorSupabase, errorHandlingService);
      const errorService = new DeviceService(errorRepo);

      try {
        await errorService.getAllDevices();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(errorHandlingService.logError).toHaveBeenCalled();
      }
    });
  });

  describe('getDeviceByEui', () => {
    it('should return a device by EUI', async () => {
      const device = await deviceService.getDeviceByEui('device-001');
      expect(device).not.toBeNull();
      expect(device?.dev_eui).toBe('device-001');
      expect(device?.name).toBe('Test Device 1');
    });

    it('should return null for non-existent device', async () => {
      vi.spyOn(deviceRepository, 'findById').mockResolvedValue(null);
      
      const device = await deviceService.getDeviceByEui('non-existent-device');
      expect(device).toBeNull();
    });
  });

  describe('createDevice', () => {
    it('should create a new device', async () => {
      const newDevice: CreateDeviceDto = {
        dev_eui: 'new-device',
        name: 'New Test Device',
        type: 3,
        location_id: 102
      };

      vi.spyOn(deviceRepository, 'create').mockResolvedValue({
        ...newDevice,
        lat: null,
        long: null,
        serial_number: null,
        upload_interval: null
      } as Device);

      const createdDevice = await deviceService.createDevice(newDevice);
      expect(createdDevice.dev_eui).toBe('new-device');
      expect(createdDevice.name).toBe('New Test Device');
      expect(deviceRepository.create).toHaveBeenCalledWith(newDevice);
    });
  });

  describe('updateDevice', () => {
    it('should update an existing device', async () => {
      const updateData: UpdateDeviceDto = {
        name: 'Updated Device Name',
        lat: 41.8781,
        long: -87.6298
      };

      vi.spyOn(deviceRepository, 'update').mockResolvedValue({
        ...mockDevices[0],
        name: updateData.name,
        lat: updateData.lat,
        long: updateData.long
      });

      const updatedDevice = await deviceService.updateDevice('device-001', updateData);
      expect(updatedDevice).not.toBeNull();
      expect(updatedDevice?.name).toBe('Updated Device Name');
      expect(updatedDevice?.lat).toBe(41.8781);
      expect(deviceRepository.update).toHaveBeenCalledWith('device-001', updateData);
    });

    it('should throw NotFoundError when device does not exist', async () => {
      const updateData: UpdateDeviceDto = { name: 'Invalid Update' };
      
      vi.spyOn(deviceRepository, 'update').mockImplementation(() => {
        throw new NotFoundError('Device not found with identifier: non-existent-device');
      });

      await expect(deviceService.updateDevice('non-existent-device', updateData))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deleteDevice', () => {
    it('should delete an existing device', async () => {
      vi.spyOn(deviceRepository, 'delete').mockResolvedValue(true);
      
      const result = await deviceService.deleteDevice('device-001');
      expect(result).toBe(true);
      expect(deviceRepository.delete).toHaveBeenCalledWith('device-001');
    });
  });
});