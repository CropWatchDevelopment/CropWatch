export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key: string | null
          created_at: string
          Description: string | null
          expires_at: string | null
          id: number
          owner_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          Description?: string | null
          expires_at?: string | null
          id?: number
          owner_id?: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          Description?: string | null
          expires_at?: string | null
          id?: number
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      babylon_connection_types: {
        Row: {
          created_at: string
          id: number
          name: string
          type_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          type_id?: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          type_id?: number
        }
        Relationships: []
      }
      babylon_decoders: {
        Row: {
          created_at: string
          decoder: string | null
          decoder_id: number
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          decoder?: string | null
          decoder_id?: number
          id?: number
          name?: string
        }
        Update: {
          created_at?: string
          decoder?: string | null
          decoder_id?: number
          id?: number
          name?: string
        }
        Relationships: []
      }
      babylon_in_connections: {
        Row: {
          connection_id: number
          connection_name: string
          created_at: string
          endpoint: string
          id: number
          password: string | null
          port: number | null
          profile_id: string
          type: number
          username: string | null
        }
        Insert: {
          connection_id?: number
          connection_name: string
          created_at?: string
          endpoint: string
          id?: number
          password?: string | null
          port?: number | null
          profile_id: string
          type: number
          username?: string | null
        }
        Update: {
          connection_id?: number
          connection_name?: string
          created_at?: string
          endpoint?: string
          id?: number
          password?: string | null
          port?: number | null
          profile_id?: string
          type?: number
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_babylon_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_babylon_in_connections_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "babylon_connection_types"
            referencedColumns: ["type_id"]
          },
        ]
      }
      babylon_input_output: {
        Row: {
          created_at: string
          id: number
          in_id: number
          out_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          in_id: number
          out_id: number
        }
        Update: {
          created_at?: string
          id?: number
          in_id?: number
          out_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "babylon_input_output_in_id_fkey"
            columns: ["in_id"]
            isOneToOne: false
            referencedRelation: "babylon_in_connections"
            referencedColumns: ["connection_id"]
          },
          {
            foreignKeyName: "babylon_input_output_out_id_fkey"
            columns: ["out_id"]
            isOneToOne: false
            referencedRelation: "babylon_out_connections"
            referencedColumns: ["connection_id"]
          },
        ]
      }
      babylon_notifiers: {
        Row: {
          api_key: string | null
          created_at: string
          host: string | null
          id: number
          isSecure: boolean
          name: string
          notifier_id: number | null
          password: string | null
          port: number | null
          type: number | null
          username: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          host?: string | null
          id?: number
          isSecure?: boolean
          name: string
          notifier_id?: number | null
          password?: string | null
          port?: number | null
          type?: number | null
          username?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string
          host?: string | null
          id?: number
          isSecure?: boolean
          name?: string
          notifier_id?: number | null
          password?: string | null
          port?: number | null
          type?: number | null
          username?: string | null
        }
        Relationships: []
      }
      babylon_notifiers_out_connections: {
        Row: {
          created_at: string
          id: number
          notifier_id: number
          out_connection_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          notifier_id: number
          out_connection_id: number
        }
        Update: {
          created_at?: string
          id?: number
          notifier_id?: number
          out_connection_id?: number
        }
        Relationships: []
      }
      babylon_out_connections: {
        Row: {
          connection_id: number
          connection_name: string
          created_at: string
          decoder: number | null
          endpoint: string | null
          id: number
          password: string | null
          port: number | null
          profile_id: string
          type: number
          username: string | null
        }
        Insert: {
          connection_id?: number
          connection_name: string
          created_at?: string
          decoder?: number | null
          endpoint?: string | null
          id?: number
          password?: string | null
          port?: number | null
          profile_id: string
          type: number
          username?: string | null
        }
        Update: {
          connection_id?: number
          connection_name?: string
          created_at?: string
          decoder?: number | null
          endpoint?: string | null
          id?: number
          password?: string | null
          port?: number | null
          profile_id?: string
          type?: number
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_babylon_out_connections_decoder_fkey"
            columns: ["decoder"]
            isOneToOne: false
            referencedRelation: "babylon_decoders"
            referencedColumns: ["decoder_id"]
          },
          {
            foreignKeyName: "public_babylon_out_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_babylon_out_connections_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "babylon_connection_types"
            referencedColumns: ["type_id"]
          },
        ]
      }
      communication_methods: {
        Row: {
          communication_method_id: number
          created_at: string
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          communication_method_id?: number
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
        }
        Update: {
          communication_method_id?: number
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      cw_air_data: {
        Row: {
          battery_level: number | null
          co: number | null
          co2: number | null
          created_at: string
          dev_eui: string
          humidity: number | null
          is_simulated: boolean
          lux: number | null
          pressure: number | null
          rainfall: number | null
          smoke_detected: boolean | null
          temperature_c: number | null
          uv_index: number | null
          vape_detected: boolean | null
          wind_direction: number | null
          wind_speed: number | null
        }
        Insert: {
          battery_level?: number | null
          co?: number | null
          co2?: number | null
          created_at?: string
          dev_eui: string
          humidity?: number | null
          is_simulated?: boolean
          lux?: number | null
          pressure?: number | null
          rainfall?: number | null
          smoke_detected?: boolean | null
          temperature_c?: number | null
          uv_index?: number | null
          vape_detected?: boolean | null
          wind_direction?: number | null
          wind_speed?: number | null
        }
        Update: {
          battery_level?: number | null
          co?: number | null
          co2?: number | null
          created_at?: string
          dev_eui?: string
          humidity?: number | null
          is_simulated?: boolean
          lux?: number | null
          pressure?: number | null
          rainfall?: number | null
          smoke_detected?: boolean | null
          temperature_c?: number | null
          uv_index?: number | null
          vape_detected?: boolean | null
          wind_direction?: number | null
          wind_speed?: number | null
        }
        Relationships: []
      }
      cw_air_data_duplicate: {
        Row: {
          battery_level: number | null
          co: number | null
          co2: number | null
          created_at: string
          dev_eui: string
          humidity: number | null
          is_simulated: boolean
          lux: number | null
          pressure: number | null
          rainfall: number | null
          smoke_detected: boolean | null
          temperature_c: number | null
          uv_index: number | null
          vape_detected: boolean | null
          wind_direction: number | null
          wind_speed: number | null
        }
        Insert: {
          battery_level?: number | null
          co?: number | null
          co2?: number | null
          created_at?: string
          dev_eui: string
          humidity?: number | null
          is_simulated?: boolean
          lux?: number | null
          pressure?: number | null
          rainfall?: number | null
          smoke_detected?: boolean | null
          temperature_c?: number | null
          uv_index?: number | null
          vape_detected?: boolean | null
          wind_direction?: number | null
          wind_speed?: number | null
        }
        Update: {
          battery_level?: number | null
          co?: number | null
          co2?: number | null
          created_at?: string
          dev_eui?: string
          humidity?: number | null
          is_simulated?: boolean
          lux?: number | null
          pressure?: number | null
          rainfall?: number | null
          smoke_detected?: boolean | null
          temperature_c?: number | null
          uv_index?: number | null
          vape_detected?: boolean | null
          wind_direction?: number | null
          wind_speed?: number | null
        }
        Relationships: []
      }
      cw_data_metadata: {
        Row: {
          adder: number
          created_at: string
          formatting: string | null
          icon: string | null
          id: number
          multiplier: number
          name: string
          notation: string
          public_name: string | null
        }
        Insert: {
          adder?: number
          created_at?: string
          formatting?: string | null
          icon?: string | null
          id?: number
          multiplier?: number
          name: string
          notation?: string
          public_name?: string | null
        }
        Update: {
          adder?: number
          created_at?: string
          formatting?: string | null
          icon?: string | null
          id?: number
          multiplier?: number
          name?: string
          notation?: string
          public_name?: string | null
        }
        Relationships: []
      }
      cw_device_gateway: {
        Row: {
          created_at: string
          dev_eui: string
          gateway_id: string
          id: number
          last_update: string
          rssi: number | null
          snr: number | null
        }
        Insert: {
          created_at?: string
          dev_eui: string
          gateway_id: string
          id?: number
          last_update?: string
          rssi?: number | null
          snr?: number | null
        }
        Update: {
          created_at?: string
          dev_eui?: string
          gateway_id?: string
          id?: number
          last_update?: string
          rssi?: number | null
          snr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_device_gateway_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "cw_device_gateway_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "cw_gateways"
            referencedColumns: ["gateway_id"]
          },
        ]
      }
      cw_device_owners: {
        Row: {
          dev_eui: string
          id: number
          owner_id: number
          permission_level: number
          user_id: string
        }
        Insert: {
          dev_eui: string
          id?: number
          owner_id?: number
          permission_level?: number
          user_id: string
        }
        Update: {
          dev_eui?: string
          id?: number
          owner_id?: number
          permission_level?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cw_device_owners_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "cw_device_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_device_type: {
        Row: {
          created_at: string
          data_table: string | null
          data_table_v2: string
          decoder: string | null
          default_upload_interval: number | null
          id: number
          isActive: boolean
          manufacturer: string | null
          model: string | null
          name: string
          primary_data: string | null
          primary_data_notation: string
          primary_data_v2: string
          primary_divider: number
          primary_multiplier: number | null
          secondary_data: string
          secondary_data_notation: string
          secondary_data_v2: string
          secondary_divider: number
          secondary_multiplier: number
          TTI_application_id: string | null
        }
        Insert: {
          created_at?: string
          data_table?: string | null
          data_table_v2: string
          decoder?: string | null
          default_upload_interval?: number | null
          id?: number
          isActive?: boolean
          manufacturer?: string | null
          model?: string | null
          name: string
          primary_data?: string | null
          primary_data_notation?: string
          primary_data_v2: string
          primary_divider?: number
          primary_multiplier?: number | null
          secondary_data?: string
          secondary_data_notation?: string
          secondary_data_v2: string
          secondary_divider?: number
          secondary_multiplier?: number
          TTI_application_id?: string | null
        }
        Update: {
          created_at?: string
          data_table?: string | null
          data_table_v2?: string
          decoder?: string | null
          default_upload_interval?: number | null
          id?: number
          isActive?: boolean
          manufacturer?: string | null
          model?: string | null
          name?: string
          primary_data?: string | null
          primary_data_notation?: string
          primary_data_v2?: string
          primary_divider?: number
          primary_multiplier?: number | null
          secondary_data?: string
          secondary_data_notation?: string
          secondary_data_v2?: string
          secondary_divider?: number
          secondary_multiplier?: number
          TTI_application_id?: string | null
        }
        Relationships: []
      }
      cw_device_x_cw_data_metadata: {
        Row: {
          created_at: string
          cw_data_metadata: number
          device_type_id: number
          id: number
          relation_id: number
        }
        Insert: {
          created_at?: string
          cw_data_metadata: number
          device_type_id: number
          id?: number
          relation_id?: number
        }
        Update: {
          created_at?: string
          cw_data_metadata?: number
          device_type_id?: number
          id?: number
          relation_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_device_x_cw_data_metadata_cw_data_metadata_fkey"
            columns: ["cw_data_metadata"]
            isOneToOne: false
            referencedRelation: "cw_data_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cw_device_x_cw_data_metadata_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "cw_device_type"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_devices: {
        Row: {
          battery_changed_at: string | null
          battery_level: number | null
          dev_eui: string
          group: string | null
          installed_at: string | null
          last_data_updated_at: string | null
          lat: number | null
          location_id: number | null
          long: number | null
          name: string
          primary_data: number | null
          report_endpoint: string | null
          secondary_data: number | null
          sensor_serial: string | null
          sensor1_serial: string | null
          sensor2_serial: string | null
          tti_name: string | null
          type: number | null
          upload_interval: number | null
          user_id: string | null
          warranty_start_date: string | null
        }
        Insert: {
          battery_changed_at?: string | null
          battery_level?: number | null
          dev_eui: string
          group?: string | null
          installed_at?: string | null
          last_data_updated_at?: string | null
          lat?: number | null
          location_id?: number | null
          long?: number | null
          name?: string
          primary_data?: number | null
          report_endpoint?: string | null
          secondary_data?: number | null
          sensor_serial?: string | null
          sensor1_serial?: string | null
          sensor2_serial?: string | null
          tti_name?: string | null
          type?: number | null
          upload_interval?: number | null
          user_id?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          battery_changed_at?: string | null
          battery_level?: number | null
          dev_eui?: string
          group?: string | null
          installed_at?: string | null
          last_data_updated_at?: string | null
          lat?: number | null
          location_id?: number | null
          long?: number | null
          name?: string
          primary_data?: number | null
          report_endpoint?: string | null
          secondary_data?: number | null
          sensor_serial?: string | null
          sensor1_serial?: string | null
          sensor2_serial?: string | null
          tti_name?: string | null
          type?: number | null
          upload_interval?: number | null
          user_id?: string | null
          warranty_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "cw_locations"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "cw_devices_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "cw_device_type"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_gateways: {
        Row: {
          created_at: string
          gateway_id: string
          gateway_name: string
          id: number
          is_online: boolean
          is_public: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          gateway_id: string
          gateway_name: string
          id?: number
          is_online: boolean
          is_public?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          gateway_id?: string
          gateway_name?: string
          id?: number
          is_online?: boolean
          is_public?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      cw_gateways_owners: {
        Row: {
          created_at: string
          gateway_id: number
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          gateway_id: number
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string
          gateway_id?: number
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cw_gateways_owners_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "cw_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cw_gateways_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_location_owners: {
        Row: {
          admin_user_id: string
          description: string | null
          id: number
          is_active: boolean | null
          location_id: number
          owner_id: number
          permission_level: number | null
          user_id: string
        }
        Insert: {
          admin_user_id: string
          description?: string | null
          id?: number
          is_active?: boolean | null
          location_id: number
          owner_id?: number
          permission_level?: number | null
          user_id: string
        }
        Update: {
          admin_user_id?: string
          description?: string | null
          id?: number
          is_active?: boolean | null
          location_id?: number
          owner_id?: number
          permission_level?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cw_location_owners_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "cw_locations"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "cw_location_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_locations: {
        Row: {
          created_at: string
          description: string | null
          group: string | null
          lat: number | null
          location_id: number
          long: number | null
          map_zoom: number | null
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          group?: string | null
          lat?: number | null
          location_id?: number
          long?: number | null
          map_zoom?: number | null
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          group?: string | null
          lat?: number | null
          location_id?: number
          long?: number | null
          map_zoom?: number | null
          name?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_locations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_notifier_types: {
        Row: {
          created_at: string
          id: number
          name: string
          notifier_id: number
          notifier_value: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          notifier_id: number
          notifier_value: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          notifier_id?: number
          notifier_value?: number
        }
        Relationships: []
      }
      cw_permission_level_types: {
        Row: {
          created_at: string
          id: number
          name: string
          permission_level_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          permission_level_id?: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          permission_level_id?: number
        }
        Relationships: []
      }
      cw_power_data: {
        Row: {
          created_at: string
          current: number | null
          dev_eui: string
          id: number
          voltage: number | null
          watts: number | null
        }
        Insert: {
          created_at?: string
          current?: number | null
          dev_eui: string
          id?: number
          voltage?: number | null
          watts?: number | null
        }
        Update: {
          created_at?: string
          current?: number | null
          dev_eui?: string
          id?: number
          voltage?: number | null
          watts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_power_data_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      cw_relay_data: {
        Row: {
          created_at: string
          dev_eui: string
          id: number
          last_update: string
          relay_1: boolean | null
          relay_2: boolean | null
        }
        Insert: {
          created_at?: string
          dev_eui: string
          id?: number
          last_update: string
          relay_1?: boolean | null
          relay_2?: boolean | null
        }
        Update: {
          created_at?: string
          dev_eui?: string
          id?: number
          last_update?: string
          relay_1?: boolean | null
          relay_2?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_relay_data_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: true
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      cw_rule_criteria: {
        Row: {
          created_at: string
          criteria_id: number | null
          id: number
          operator: string
          parent_id: string | null
          reset_value: number | null
          ruleGroupId: string
          subject: string
          trigger_value: number
        }
        Insert: {
          created_at?: string
          criteria_id?: number | null
          id?: number
          operator: string
          parent_id?: string | null
          reset_value?: number | null
          ruleGroupId: string
          subject: string
          trigger_value: number
        }
        Update: {
          created_at?: string
          criteria_id?: number | null
          id?: number
          operator?: string
          parent_id?: string | null
          reset_value?: number | null
          ruleGroupId?: string
          subject?: string
          trigger_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_cw_rule_criteria_ruleGroupId_fkey"
            columns: ["ruleGroupId"]
            isOneToOne: false
            referencedRelation: "cw_rules"
            referencedColumns: ["ruleGroupId"]
          },
        ]
      }
      cw_rule_triggered: {
        Row: {
          created_at: string
          dev_eui: string
          id: number
          rule_group_id: string
        }
        Insert: {
          created_at?: string
          dev_eui: string
          id?: number
          rule_group_id: string
        }
        Update: {
          created_at?: string
          dev_eui?: string
          id?: number
          rule_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cw_rule_triggered_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "cw_rule_triggered_rule_group_id_fkey"
            columns: ["rule_group_id"]
            isOneToOne: false
            referencedRelation: "cw_rules"
            referencedColumns: ["ruleGroupId"]
          },
        ]
      }
      cw_rules: {
        Row: {
          action_recipient: string
          created_at: string
          dev_eui: string | null
          id: number
          is_triggered: boolean
          last_triggered: string | null
          name: string
          notifier_type: number
          profile_id: string
          ruleGroupId: string
          send_using: string | null
          trigger_count: number
        }
        Insert: {
          action_recipient: string
          created_at?: string
          dev_eui?: string | null
          id?: number
          is_triggered?: boolean
          last_triggered?: string | null
          name: string
          notifier_type: number
          profile_id?: string
          ruleGroupId: string
          send_using?: string | null
          trigger_count?: number
        }
        Update: {
          action_recipient?: string
          created_at?: string
          dev_eui?: string | null
          id?: number
          is_triggered?: boolean
          last_triggered?: string | null
          name?: string
          notifier_type?: number
          profile_id?: string
          ruleGroupId?: string
          send_using?: string | null
          trigger_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_rules_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "cw_rules_notifier_type_fkey"
            columns: ["notifier_type"]
            isOneToOne: false
            referencedRelation: "cw_notifier_types"
            referencedColumns: ["notifier_id"]
          },
          {
            foreignKeyName: "public_cw_rules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_soil_data: {
        Row: {
          created_at: string
          dev_eui: string
          ec: number | null
          moisture: number | null
          ph: number | null
          temperature_c: number | null
        }
        Insert: {
          created_at?: string
          dev_eui: string
          ec?: number | null
          moisture?: number | null
          ph?: number | null
          temperature_c?: number | null
        }
        Update: {
          created_at?: string
          dev_eui?: string
          ec?: number | null
          moisture?: number | null
          ph?: number | null
          temperature_c?: number | null
        }
        Relationships: []
      }
      cw_soil_data_duplicate: {
        Row: {
          created_at: string
          dev_eui: string
          ec: number | null
          moisture: number | null
          ph: number | null
          temperature_c: number | null
        }
        Insert: {
          created_at?: string
          dev_eui: string
          ec?: number | null
          moisture?: number | null
          ph?: number | null
          temperature_c?: number | null
        }
        Update: {
          created_at?: string
          dev_eui?: string
          ec?: number | null
          moisture?: number | null
          ph?: number | null
          temperature_c?: number | null
        }
        Relationships: []
      }
      cw_traffic2: {
        Row: {
          bicycle_count: number
          bus_count: number
          car_count: number
          created_at: string
          dev_eui: string
          id: number
          line_number: number | null
          motorcycle_count: number
          people_count: number
          traffic_hour: string | null
          train_count: number
          truck_count: number
        }
        Insert: {
          bicycle_count?: number
          bus_count?: number
          car_count?: number
          created_at?: string
          dev_eui: string
          id?: number
          line_number?: number | null
          motorcycle_count?: number
          people_count?: number
          traffic_hour?: string | null
          train_count?: number
          truck_count?: number
        }
        Update: {
          bicycle_count?: number
          bus_count?: number
          car_count?: number
          created_at?: string
          dev_eui?: string
          id?: number
          line_number?: number | null
          motorcycle_count?: number
          people_count?: number
          traffic_hour?: string | null
          train_count?: number
          truck_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_traffic2_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      cw_water_data: {
        Row: {
          created_at: string
          deapth_cm: number | null
          dev_eui: string
          id: number
          pressure: number | null
          spo2: number | null
          temperature_c: number | null
        }
        Insert: {
          created_at?: string
          deapth_cm?: number | null
          dev_eui: string
          id?: number
          pressure?: number | null
          spo2?: number | null
          temperature_c?: number | null
        }
        Update: {
          created_at?: string
          deapth_cm?: number | null
          dev_eui?: string
          id?: number
          pressure?: number | null
          spo2?: number | null
          temperature_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_water_data_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      cw_watermeter_uplinks: {
        Row: {
          battery_level: number | null
          count: number
          created_at: string
          dev_eui: string
          id: number
          internal_temp: number | null
        }
        Insert: {
          battery_level?: number | null
          count: number
          created_at?: string
          dev_eui: string
          id?: number
          internal_temp?: number | null
        }
        Update: {
          battery_level?: number | null
          count?: number
          created_at?: string
          dev_eui?: string
          id?: number
          internal_temp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_watermeter_uplinks_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      devices: {
        Row: {
          active: boolean
          created_at: string | null
          dev_eui: string
          device_name: string | null
          id: number
          lat: number | null
          linked_device_eui: string | null
          lng: number | null
          profile_id: string | null
          type: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          dev_eui: string
          device_name?: string | null
          id?: number
          lat?: number | null
          linked_device_eui?: string | null
          lng?: number | null
          profile_id?: string | null
          type?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          dev_eui?: string
          device_name?: string | null
          id?: number
          lat?: number | null
          linked_device_eui?: string | null
          lng?: number | null
          profile_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      ip_log: {
        Row: {
          created_at: string
          dev_eui: string | null
          device_id: string
          id: number
          ip: string | null
          timestamp: string | null
        }
        Insert: {
          created_at?: string
          dev_eui?: string | null
          device_id: string
          id?: number
          ip?: string | null
          timestamp?: string | null
        }
        Update: {
          created_at?: string
          dev_eui?: string | null
          device_id?: string
          id?: number
          ip?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_log_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          description: string | null
          dev_eui: string | null
          id: number
          lat: number | null
          lng: number | null
          name: string
          profile_id: string | null
          sensor_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dev_eui?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          name: string
          profile_id?: string | null
          sensor_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dev_eui?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          name?: string
          profile_id?: string | null
          sensor_type?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          allowed_by_profile_id: string | null
          allowed_profile_id: string | null
          created_at: string | null
          description: string | null
          id: number
          resource: string
          role_id: number
        }
        Insert: {
          allowed_by_profile_id?: string | null
          allowed_profile_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          resource: string
          role_id: number
        }
        Update: {
          allowed_by_profile_id?: string | null
          allowed_profile_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          resource?: string
          role_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "permissions_allowed_by_profile_id_fkey"
            columns: ["allowed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_allowed_profile_id_fkey"
            columns: ["allowed_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_agreements: boolean
          avatar_url: string | null
          created_at: string
          discord: string | null
          email: string | null
          employer: string | null
          full_name: string | null
          id: string
          last_login: string | null
          line_id: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          accepted_agreements?: boolean
          avatar_url?: string | null
          created_at?: string
          discord?: string | null
          email?: string | null
          employer?: string | null
          full_name?: string | null
          id: string
          last_login?: string | null
          line_id?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          accepted_agreements?: boolean
          avatar_url?: string | null
          created_at?: string
          discord?: string | null
          email?: string | null
          employer?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          line_id?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      report_alert_points: {
        Row: {
          created_at: string
          data_point_key: string
          hex_color: string | null
          id: number
          max: number | null
          min: number | null
          name: string
          operator: string | null
          report_id: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          data_point_key: string
          hex_color?: string | null
          id?: number
          max?: number | null
          min?: number | null
          name: string
          operator?: string | null
          report_id: string
          user_id?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          data_point_key?: string
          hex_color?: string | null
          id?: number
          max?: number | null
          min?: number | null
          name?: string
          operator?: string | null
          report_id?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_alert_points_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["report_id"]
          },
        ]
      }
      report_recipients: {
        Row: {
          communication_method: number
          created_at: string
          email: string | null
          id: number
          name: string | null
          report_id: string
          user_id: string | null
        }
        Insert: {
          communication_method: number
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
          report_id: string
          user_id?: string | null
        }
        Update: {
          communication_method?: number
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
          report_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_recipients_communication_method_fkey"
            columns: ["communication_method"]
            isOneToOne: false
            referencedRelation: "communication_methods"
            referencedColumns: ["communication_method_id"]
          },
          {
            foreignKeyName: "report_recipients_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["report_id"]
          },
        ]
      }
      report_user_schedule: {
        Row: {
          created_at: string
          dev_eui: string
          end_of_month: boolean
          end_of_week: boolean
          id: number
          is_active: boolean
          report_id: string | null
          report_user_schedule_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          dev_eui: string
          end_of_month?: boolean
          end_of_week?: boolean
          id?: number
          is_active?: boolean
          report_id?: string | null
          report_user_schedule_id?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          dev_eui?: string
          end_of_month?: boolean
          end_of_week?: boolean
          id?: number
          is_active?: boolean
          report_id?: string | null
          report_user_schedule_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_user_schedule_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "report_user_schedule_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "report_user_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          dev_eui: string
          id: number
          name: string
          report_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dev_eui: string
          id?: number
          name: string
          report_id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dev_eui?: string
          id?: number
          name?: string
          report_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports_templates: {
        Row: {
          created_at: string
          dev_eui: string | null
          id: number
          name: string
          owner_id: string
          recipients: string | null
          template: Json
        }
        Insert: {
          created_at?: string
          dev_eui?: string | null
          id?: number
          name: string
          owner_id?: string
          recipients?: string | null
          template: Json
        }
        Update: {
          created_at?: string
          dev_eui?: string | null
          id?: number
          name?: string
          owner_id?: string
          recipients?: string | null
          template?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reports_templates_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "reports_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          attrs: Json | null
          created: string | null
          description: string | null
          email: string | null
          id: string | null
          name: string | null
        }
        Insert: {
          attrs?: Json | null
          created?: string | null
          description?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
        }
        Update: {
          attrs?: Json | null
          created?: string | null
          description?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      stripe_products: {
        Row: {
          active: boolean | null
          attrs: Json | null
          created: string | null
          default_price: string | null
          description: string | null
          id: string | null
          name: string | null
          updated: string | null
        }
        Insert: {
          active?: boolean | null
          attrs?: Json | null
          created?: string | null
          default_price?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          updated?: string | null
        }
        Update: {
          active?: boolean | null
          attrs?: Json | null
          created?: string | null
          default_price?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          updated?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          attrs: Json | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer: string | null
          id: string | null
        }
        Insert: {
          attrs?: Json | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer?: string | null
          id?: string | null
        }
        Update: {
          attrs?: Json | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer?: string | null
          id?: string | null
        }
        Relationships: []
      }
      user_discord_connections: {
        Row: {
          access_token: string
          avatar: string | null
          created_at: string | null
          discord_user_id: string
          discord_username: string
          id: string
          token_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          avatar?: string | null
          created_at?: string | null
          discord_user_id: string
          discord_username: string
          id?: string
          token_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          avatar?: string | null
          created_at?: string | null
          discord_user_id?: string
          discord_username?: string
          id?: string
          token_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cw_traffic_daily_totals: {
        Args: { dev_eui: string; end_ts: string; start_ts: string; tz?: string }
        Returns: {
          total_bicycles: number
          total_buses: number
          total_cars: number
          total_people: number
          total_trucks: number
          traffic_day: string
        }[]
      }
      delete_avatar: {
        Args: { avatar_url: string }
        Returns: Record<string, unknown>
      }
      delete_storage_object: {
        Args: { bucket: string; object: string }
        Returns: Record<string, unknown>
      }
      get_filtered_device_report_data_multi_v2: {
        Args: {
          p_columns: string[]
          p_dev_id: string
          p_end_time: string
          p_interval_minutes: number
          p_maxs: number[]
          p_mins: number[]
          p_ops: string[]
          p_start_time: string
          p_timezone?: string
        }
        Returns: Json[]
      }
      get_hloc_data:
        | {
            Args: {
              p_bucket_interval: string
              p_dev_eui: string
              p_metric: string
              p_time_range: string
            }
            Returns: {
              bucket: string
              close_val: number
              dev_eui: string
              high_val: number
              low_val: number
              open_val: number
            }[]
          }
        | {
            Args: {
              p_bucket_interval: string
              p_dev_eui: string
              p_metric: string
              p_table: string
              p_time_range: string
            }
            Returns: {
              bucket: string
              close_val: number
              dev_eui: string
              high_val: number
              low_val: number
              open_val: number
            }[]
          }
        | {
            Args: {
              device_eui: string
              end_time: string
              start_time: string
              table_name: string
              time_interval: string
            }
            Returns: {
              close: number
              high: number
              interval_time: string
              low: number
              open: number
            }[]
          }
      get_location_for_user: { Args: { user_id: string }; Returns: number[] }
      get_road_events: {
        Args: { time_grouping: string }
        Returns: {
          event_count: number
          group_period: string
        }[]
      }
      get_road_events_summary1: {
        Args: {
          classes: string[]
          end_date: string
          line_id: string
          start_date: string
          time_span: string
        }
        Returns: {
          count: number
          period_start: string
        }[]
      }
      get_table_columns: {
        Args: { p_table: unknown }
        Returns: {
          column_name: string
        }[]
      }
      is_device_admin_for:
        | {
            Args: { p_dev_eui: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.is_device_admin_for(p_dev_eui => text), public.is_device_admin_for(p_dev_eui => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_dev_eui: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.is_device_admin_for(p_dev_eui => text), public.is_device_admin_for(p_dev_eui => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      is_device_member_for: { Args: { p_dev_eui: string }; Returns: boolean }
      is_device_owner_for: { Args: { dev: string }; Returns: boolean }
      is_location_member_for: { Args: { loc_id: number }; Returns: boolean }
      is_location_owner_for: { Args: { loc_id: number }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
