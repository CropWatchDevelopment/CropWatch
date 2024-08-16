import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';
import CwDeviceOwnersRepository from '$lib/repositories/CwDeviceOwnerRepository';

type ProfileType = Tables<'profiles'>;
type CwDeviceOwners = Tables<'cw_device_owners'>;
type CwDeviceOwnersInsert = Tables<'cw_device_owners'>;
type CwDeviceOwnersUpdate = Tables<'cw_device_owners'>;

class CwDeviceOwnersService {
    private repository: CwDeviceOwnersRepository;

    constructor(client: SupabaseClient) {
        this.repository = new CwDeviceOwnersRepository(client);
    }

    async getById(id: number): Promise<CwDeviceOwners | null> {
        return await this.repository.findById(id);
    }

    async getByDeviceByDevEui(dev_eui: string): Promise<CwDeviceOwners[]> {
        return await this.repository.findByDeviceEui(dev_eui);
    }

    async getDeviceOwnerByOwnerId(uuid: string): Promise<ProfileType[]> {
        return await this.repository.findDeviceOwnerByDevEui();
    }

    async getAll(): Promise<CwDeviceOwners[]> {
        return await this.repository.findAll();
    }

    async add(data: CwDeviceOwnersInsert): Promise<CwDeviceOwners | null> {
        return await this.repository.insert(data);
    }

    async update(id: number, data: CwDeviceOwnersUpdate): Promise<CwDeviceOwners | null> {
        return await this.repository.update(id, data);
    }

    async remove(id: number): Promise<boolean> {
        return await this.repository.delete(id);
    }
}

export default CwDeviceOwnersService;
