import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '$lib/types/supabaseSchema';

type CwProfile = Tables<'profiles'>;

class CwProfileRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(uuid: string): Promise<CwProfile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', uuid)
      .single();

    if (error) {
      console.error('Error fetching Profile by id:', error.message);
      return null;
    }

    return data;
  }

  async findByEmail(email: string): Promise<CwProfile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('email', email)
      .select()
      .single();

    if (error) {
      console.error('Error fetching Profile by Email:', error.message);
      return null;
    }

    return data;
  }

  async findAll(): Promise<CwProfile[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error fetching all Profiles:', error.message);
      return [];
    }

    return data;
  }
}

export default CwProfileRepository;
