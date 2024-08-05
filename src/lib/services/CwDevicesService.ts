import type { SupabaseClient } from '@supabase/supabase-js';
import CwDevicesRepository from '$lib/repositories/CwDevicesRepository';
import type { Tables } from '$lib/types/supabaseSchema';
import CwDeviceTypeRepository from '$lib/repositories/CwDeviceTypeRepository';

type CwDevices = Tables<'cw_devices'>;
type CwDevicesInsert = Tables<'cw_devices'>;
type CwDevicesUpdate = Tables<'cw_devices'>;
type CwDeviceType = Tables<'cw_device_type'>;

class CwDevicesService {
  private repository: CwDevicesRepository;
  private deviceTypeRepository: CwDeviceTypeRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CwDevicesRepository(client);
    this.deviceTypeRepository = new CwDeviceTypeRepository(client);
  }

  async getDeviceById(dev_eui: string): Promise<CwDevices | null> {
    return await this.repository.findById(dev_eui);
  }
  
  async getDeviceByEui(dev_eui: string): Promise<CwDevices | null> {
    return await this.repository.findByDeviceEui(dev_eui);
  }

  async getDeviceTypeById(typeId: number | null): Promise<CwDeviceType | null> {
    if (typeId === null) return null;
    return await this.deviceTypeRepository.findById(typeId);
  }

  // async getDeviceTypeByDevEui(devEui: string | null): Promise<CwDeviceType | null> {
  //   if (devEui === null) return null;
  //   return await this.deviceTypeRepository.findByDevEui(devEui);
  // }

  async getLatestDataByDeviceEui(dev_eui: string, data_table: string): Promise<any | null> {
    if (!dev_eui) {
      console.error('Error fetching latest data: dev_eui is required');
      return null;
    }
    if (!data_table) {
      console.error('Error fetching latest data: data_table is required');
      return null;
    }
    const data = await this.repository.findLatestDataByDevice(dev_eui, data_table);
    if (data === null) {
      console.error('Error fetching latest data');
      return null;
    }

    return data;
  }

  async getDevicesByLocationId(location_id: number): Promise<CwDevices[]> {
    return await this.repository.findByLocationId(location_id);
  }

  async getAllDevices(): Promise<CwDevices[]> {
    return await this.repository.findAll();
  }

  async addDevice(device: CwDevicesInsert): Promise<CwDevices | null> {
    return await this.repository.insert(device);
  }

  async updateDevice(dev_eui: string, device: CwDevicesUpdate): Promise<CwDevices | null> {
    return await this.repository.update(dev_eui, device);
  }

  async removeDevice(dev_eui: string): Promise<boolean> {
    return await this.repository.delete(dev_eui);
  }
}

export default CwDevicesService;
