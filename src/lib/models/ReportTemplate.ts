import type { Database } from '../../../database.types';

export type ReportTemplate = Database['public']['Tables']['reports_templates']['Row'];
export type ReportTemplateInsert = Database['public']['Tables']['reports_templates']['Insert'];
export type ReportTemplateUpdate = Database['public']['Tables']['reports_templates']['Update'];
