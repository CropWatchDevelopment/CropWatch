import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwPermissionLevelTypes = Tables<'cw_permission_level_types'>;
type CwPermissionLevelTypesInsert = Tables<'cw_permission_level_types'>;
type CwPermissionLevelTypesUpdate = Tables<'cw_permission_level_types'>;

class CwPermissionLevelTypesRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(id: number): Promise<CwPermissionLevelTypes | null> {
    const { data, error } = await this.client
      .from('cw_permission_level_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching cw_permission_level_types by id:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwPermissionLevelTypes[]> {
    const { data, error } = await this.client
      .from('cw_permission_level_types')
      .select('*');

    if (error) {
      console.error('Error fetching all cw_permission_level_types:', error.message);
      return [];
    }

    return data;
  }

  async insert(permissionLevelType: CwPermissionLevelTypesInsert): Promise<CwPermissionLevelTypes | null> {
    const { data, error } = await this.client
      .from('cw_permission_level_types')
      .insert(permissionLevelType)
      .single();

    if (error) {
      console.error('Error inserting cw_permission_level_types:', error.message);
      return null;
    }

    return data;
  }

  async update(id: number, permissionLevelType: CwPermissionLevelTypesUpdate): Promise<CwPermissionLevelTypes | null> {
    const { data, error } = await this.client
      .from('cw_permission_level_types')
      .update(permissionLevelType)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error updating cw_permission_level_types:', error.message);
      return null;
    }

    return data;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await this.client
      .from('cw_permission_level_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cw_permission_level_types:', error.message);
      return false;
    }

    return true;
  }
}

export default CwPermissionLevelTypesRepository;
