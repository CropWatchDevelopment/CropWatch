import { SupabaseClient, Session } from '@supabase/supabase-js'
import { Database } from './DatabaseDefinitions'

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>
      // getSession(): Promise<{ user: User | null }>
      safeGetSession(): Promise<{ session: Session | null; user: User | null }>
    }
    interface PageData {
      // supabase: SupabaseClient,
      // user: User | null
      session: Session | null
      user: User | null,
    }
    // interface Error {}
    // interface Platform {}
  }
  namespace Superforms {
    type Message = {
      type: 'error' | 'success', text: string
    }
  }
}