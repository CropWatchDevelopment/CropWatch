import type { Database } from '../../../database.types';

type CwRuleRow = Database['public']['Tables']['cw_rules']['Row'];

export interface Alert extends CwRuleRow {

}
