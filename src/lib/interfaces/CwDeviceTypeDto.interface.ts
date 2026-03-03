export interface CwDeviceType {
  id: number
  name: string
  model: string
  decoder: string
  isActive: boolean
  created_at: string
  data_table: string
  manufacturer: string
  primary_data: string
  data_table_v2: string
  secondary_data: string
  primary_data_v2: string
  primary_divider: number
  secondary_data_v2: string
  secondary_divider: number
  TTI_application_id: string
  primary_multiplier: number
  secondary_multiplier: number
  primary_data_notation: string
  default_upload_interval: number
  secondary_data_notation: string
}