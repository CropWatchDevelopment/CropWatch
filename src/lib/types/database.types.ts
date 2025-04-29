export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      cw_air_data_hpy: {
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
      cw_air_thvd: {
        Row: {
          created_at: string
          dev_eui: string
          dewPointC: number | null
          humidity: number
          id: number
          profile_id: string | null
          temperatureC: number
          vpd: number | null
        }
        Insert: {
          created_at?: string
          dev_eui: string
          dewPointC?: number | null
          humidity: number
          id?: number
          profile_id?: string | null
          temperatureC: number
          vpd?: number | null
        }
        Update: {
          created_at?: string
          dev_eui?: string
          dewPointC?: number | null
          humidity?: number
          id?: number
          profile_id?: string | null
          temperatureC?: number
          vpd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_air_thvd_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "public_cw_air_thvd_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_co2_alerts: {
        Row: {
          action: string
          cleared: boolean
          created_at: string
          dev_eui: string
          id: number
          OneSignalID: string | null
          operator: string
          profile_id: string
          receiver: string
          subject: string
          value: number
        }
        Insert: {
          action: string
          cleared: boolean
          created_at?: string
          dev_eui: string
          id?: number
          OneSignalID?: string | null
          operator: string
          profile_id: string
          receiver: string
          subject: string
          value: number
        }
        Update: {
          action?: string
          cleared?: boolean
          created_at?: string
          dev_eui?: string
          id?: number
          OneSignalID?: string | null
          operator?: string
          profile_id?: string
          receiver?: string
          subject?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_co2_alerts_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "cw_co2_alerts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_co2_uplinks: {
        Row: {
          battery: number | null
          co2_level: number | null
          created_at: string
          dev_eui: string | null
          humidity: number
          id: number
          pressure: number | null
          profile_id: string | null
          temperature: number
        }
        Insert: {
          battery?: number | null
          co2_level?: number | null
          created_at?: string
          dev_eui?: string | null
          humidity: number
          id?: number
          pressure?: number | null
          profile_id?: string | null
          temperature: number
        }
        Update: {
          battery?: number | null
          co2_level?: number | null
          created_at?: string
          dev_eui?: string | null
          humidity?: number
          id?: number
          pressure?: number | null
          profile_id?: string | null
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_co2_uplinks_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
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
          device_app: string | null
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
          device_app?: string | null
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
          device_app?: string | null
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
          ai_provider: string | null
          battery_changed_at: string | null
          dev_eui: string
          installed_at: string | null
          lat: number | null
          location_id: number | null
          long: number | null
          name: string
          report_endpoint: string | null
          serial_number: string | null
          type: number | null
          upload_interval: number | null
          user_id: string | null
          warranty_start_date: string | null
        }
        Insert: {
          ai_provider?: string | null
          battery_changed_at?: string | null
          dev_eui: string
          installed_at?: string | null
          lat?: number | null
          location_id?: number | null
          long?: number | null
          name?: string
          report_endpoint?: string | null
          serial_number?: string | null
          type?: number | null
          upload_interval?: number | null
          user_id?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          ai_provider?: string | null
          battery_changed_at?: string | null
          dev_eui?: string
          installed_at?: string | null
          lat?: number | null
          location_id?: number | null
          long?: number | null
          name?: string
          report_endpoint?: string | null
          serial_number?: string | null
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
          description: string | null
          id: number
          is_active: boolean | null
          location_id: number
          owner_id: number
          permission_level: number | null
          user_id: string
        }
        Insert: {
          description?: string | null
          id?: number
          is_active?: boolean | null
          location_id: number
          owner_id?: number
          permission_level?: number | null
          user_id: string
        }
        Update: {
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
      cw_pulse_meters: {
        Row: {
          count: number
          created_at: string
          dev_eui: string
          id: number
          litersPerPulse: number
          periodCount: number
        }
        Insert: {
          count?: number
          created_at?: string
          dev_eui: string
          id?: number
          litersPerPulse?: number
          periodCount?: number
        }
        Update: {
          count?: number
          created_at?: string
          dev_eui?: string
          id?: number
          litersPerPulse?: number
          periodCount?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_cw_pulse_meters_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
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
      cw_soil_data_hpy: {
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
      cw_soil_uplinks: {
        Row: {
          battery: number | null
          created_at: string
          dev_eui: string | null
          ec: number | null
          id: number
          internal_temp: number | null
          k: number | null
          moisture: number
          n: number | null
          p: number | null
          ph: number | null
          read_attempts: number | null
          real_duration: number | null
          temperature: number
        }
        Insert: {
          battery?: number | null
          created_at?: string
          dev_eui?: string | null
          ec?: number | null
          id?: number
          internal_temp?: number | null
          k?: number | null
          moisture: number
          n?: number | null
          p?: number | null
          ph?: number | null
          read_attempts?: number | null
          real_duration?: number | null
          temperature: number
        }
        Update: {
          battery?: number | null
          created_at?: string
          dev_eui?: string | null
          ec?: number | null
          id?: number
          internal_temp?: number | null
          k?: number | null
          moisture?: number
          n?: number | null
          p?: number | null
          ph?: number | null
          read_attempts?: number | null
          real_duration?: number | null
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_soil_uplinks_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      cw_ss_tme: {
        Row: {
          batteryVoltage: number | null
          created_at: string
          dev_eui: string
          id: number
          internalTemp: number | null
          modbusAttempts: number | null
          profile_id: string | null
          soil_EC: number | null
          soil_moisture: number
          soil_temperatureC: number
        }
        Insert: {
          batteryVoltage?: number | null
          created_at?: string
          dev_eui: string
          id?: number
          internalTemp?: number | null
          modbusAttempts?: number | null
          profile_id?: string | null
          soil_EC?: number | null
          soil_moisture: number
          soil_temperatureC: number
        }
        Update: {
          batteryVoltage?: number | null
          created_at?: string
          dev_eui?: string
          id?: number
          internalTemp?: number | null
          modbusAttempts?: number | null
          profile_id?: string | null
          soil_EC?: number | null
          soil_moisture?: number
          soil_temperatureC?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_ss_tme_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      cw_ss_tmepnpk: {
        Row: {
          batteryVoltage: number | null
          created_at: string
          dev_eui: string
          gateway_count: number | null
          id: number
          internalTemp: number | null
          modbusAttempts: number | null
          rssi: number | null
          snr: number | null
          soil_EC: number | null
          soil_K: number | null
          soil_moisture: number
          soil_N: number | null
          soil_P: number | null
          soil_PH: number | null
          soil_temperatureC: number
        }
        Insert: {
          batteryVoltage?: number | null
          created_at?: string
          dev_eui: string
          gateway_count?: number | null
          id?: number
          internalTemp?: number | null
          modbusAttempts?: number | null
          rssi?: number | null
          snr?: number | null
          soil_EC?: number | null
          soil_K?: number | null
          soil_moisture: number
          soil_N?: number | null
          soil_P?: number | null
          soil_PH?: number | null
          soil_temperatureC: number
        }
        Update: {
          batteryVoltage?: number | null
          created_at?: string
          dev_eui?: string
          gateway_count?: number | null
          id?: number
          internalTemp?: number | null
          modbusAttempts?: number | null
          rssi?: number | null
          snr?: number | null
          soil_EC?: number | null
          soil_K?: number | null
          soil_moisture?: number
          soil_N?: number | null
          soil_P?: number | null
          soil_PH?: number | null
          soil_temperatureC?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_ss_tmepnpk_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      cw_traffic: {
        Row: {
          created_at: string
          dev_eui: string
          id: number
          object_type: string
          period_in: number
          period_out: number
          period_total: number
        }
        Insert: {
          created_at?: string
          dev_eui: string
          id?: number
          object_type: string
          period_in?: number
          period_out?: number
          period_total?: number
        }
        Update: {
          created_at?: string
          dev_eui?: string
          id?: number
          object_type?: string
          period_in?: number
          period_out?: number
          period_total?: number
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
          people_count: number
          traffic_hour: string | null
          truck_count: number
        }
        Insert: {
          bicycle_count?: number
          bus_count?: number
          car_count?: number
          created_at?: string
          dev_eui: string
          id?: number
          people_count?: number
          traffic_hour?: string | null
          truck_count?: number
        }
        Update: {
          bicycle_count?: number
          bus_count?: number
          car_count?: number
          created_at?: string
          dev_eui?: string
          id?: number
          people_count?: number
          traffic_hour?: string | null
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
          device_id: string
          id: number
          ip: string | null
          timestamp: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: number
          ip?: string | null
          timestamp?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: number
          ip?: string | null
          timestamp?: string | null
        }
        Relationships: []
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
      netvox_ra02a: {
        Row: {
          battery: number
          created_at: string
          dev_eui: string
          fireAlarm: number
          gateway_count: number | null
          highTempAlarm: number
          id: number
          profile_id: string | null
          rssi: number | null
          snr: number | null
          temperatureC: number
        }
        Insert: {
          battery: number
          created_at?: string
          dev_eui: string
          fireAlarm: number
          gateway_count?: number | null
          highTempAlarm: number
          id?: number
          profile_id?: string | null
          rssi?: number | null
          snr?: number | null
          temperatureC: number
        }
        Update: {
          battery?: number
          created_at?: string
          dev_eui?: string
          fireAlarm?: number
          gateway_count?: number | null
          highTempAlarm?: number
          id?: number
          profile_id?: string | null
          rssi?: number | null
          snr?: number | null
          temperatureC?: number
        }
        Relationships: [
          {
            foreignKeyName: "netvox_ra02a_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_agreements: boolean
          avatar_url: string | null
          discord: string | null
          email: string | null
          employer: string | null
          full_name: string | null
          id: string
          last_login: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          accepted_agreements?: boolean
          avatar_url?: string | null
          discord?: string | null
          email?: string | null
          employer?: string | null
          full_name?: string | null
          id: string
          last_login?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          accepted_agreements?: boolean
          avatar_url?: string | null
          discord?: string | null
          email?: string | null
          employer?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      report_user_schedule: {
        Row: {
          created_at: string
          dev_eui: string
          end_of_month: boolean
          end_of_week: boolean
          id: number
          is_active: boolean
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
            foreignKeyName: "report_user_schedule_user_id_fkey"
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
      road_event_lines: {
        Row: {
          camera_id: string
          camera_name: string
          created_at: string | null
          id: number
          line_name: string
        }
        Insert: {
          camera_id?: string
          camera_name: string
          created_at?: string | null
          id?: number
          line_name: string
        }
        Update: {
          camera_id?: string
          camera_name?: string
          created_at?: string | null
          id?: number
          line_name?: string
        }
        Relationships: []
      }
      road_events: {
        Row: {
          camera_id: string | null
          class: string
          created_at: string | null
          direction: number
          id: number
          line_id: string | null
          server_event_datetime: string | null
          source_datetime: string | null
          track_id: number
        }
        Insert: {
          camera_id?: string | null
          class: string
          created_at?: string | null
          direction: number
          id?: number
          line_id?: string | null
          server_event_datetime?: string | null
          source_datetime?: string | null
          track_id: number
        }
        Update: {
          camera_id?: string | null
          class?: string
          created_at?: string | null
          direction?: number
          id?: number
          line_id?: string | null
          server_event_datetime?: string | null
          source_datetime?: string | null
          track_id?: number
        }
        Relationships: []
      }
      roles: {
        Row: {
          code: number | null
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          code?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          code?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      seeed_co2_lorawan_uplinks: {
        Row: {
          battery: number | null
          co2_level: number | null
          created_at: string | null
          dev_eui: string
          err: number | null
          humidity: number | null
          id: number
          interval: number | null
          payload: string | null
          pressure: number | null
          rssi: number | null
          snr: number | null
          temperature: number | null
          valid: boolean | null
        }
        Insert: {
          battery?: number | null
          co2_level?: number | null
          created_at?: string | null
          dev_eui: string
          err?: number | null
          humidity?: number | null
          id?: number
          interval?: number | null
          payload?: string | null
          pressure?: number | null
          rssi?: number | null
          snr?: number | null
          temperature?: number | null
          valid?: boolean | null
        }
        Update: {
          battery?: number | null
          co2_level?: number | null
          created_at?: string | null
          dev_eui?: string
          err?: number | null
          humidity?: number | null
          id?: number
          interval?: number | null
          payload?: string | null
          pressure?: number | null
          rssi?: number | null
          snr?: number | null
          temperature?: number | null
          valid?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "seeed_co2_lorawan_uplinks_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      seeed_sensecap_s2100_nimbol: {
        Row: {
          battery_level: number | null
          created_at: string
          dev_eui: string
          gateway_count: number
          id: number
          rssi: number
          snr: number
          soil_ec: number
          soil_humidity: number
          soil_k: number | null
          soil_n: number | null
          soil_p: number | null
          soil_ph: number
          soil_temperature: number
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          dev_eui?: string
          gateway_count: number
          id?: number
          rssi: number
          snr: number
          soil_ec: number
          soil_humidity: number
          soil_k?: number | null
          soil_n?: number | null
          soil_p?: number | null
          soil_ph: number
          soil_temperature: number
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          dev_eui?: string
          gateway_count?: number
          id?: number
          rssi?: number
          snr?: number
          soil_ec?: number
          soil_humidity?: number
          soil_k?: number | null
          soil_n?: number | null
          soil_p?: number | null
          soil_ph?: number
          soil_temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "seeed_sensecap_s2100_nimbol_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      seeed_sensecap_s2103_WaterLevel: {
        Row: {
          created_at: string
          dev_eui: string
          id: number
          profile_id: string | null
          water_level: number
        }
        Insert: {
          created_at?: string
          dev_eui: string
          id?: number
          profile_id?: string | null
          water_level: number
        }
        Update: {
          created_at?: string
          dev_eui?: string
          id?: number
          profile_id?: string | null
          water_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "seeed_sensecap_s2103_WaterLevel_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      seeed_sensecap_s2104: {
        Row: {
          battery_level: number | null
          created_at: string
          dev_eui: string
          id: number
          moisture: number | null
          temperature: number | null
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          dev_eui: string
          id?: number
          moisture?: number | null
          temperature?: number | null
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          dev_eui?: string
          id?: number
          moisture?: number | null
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seeed_sensecap_s210x_temp_moist_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      seeed_sensecap_s2120: {
        Row: {
          created_at: string
          dev_eui: string
          frame_id: number | null
          humidity: number | null
          id: number
          lux: number | null
          pressure: number | null
          profile_id: string | null
          rainfall: number | null
          temperatureC: number | null
          uv: number | null
          wind_direction: number | null
          wind_speed: number | null
        }
        Insert: {
          created_at?: string
          dev_eui: string
          frame_id?: number | null
          humidity?: number | null
          id?: number
          lux?: number | null
          pressure?: number | null
          profile_id?: string | null
          rainfall?: number | null
          temperatureC?: number | null
          uv?: number | null
          wind_direction?: number | null
          wind_speed?: number | null
        }
        Update: {
          created_at?: string
          dev_eui?: string
          frame_id?: number | null
          humidity?: number | null
          id?: number
          lux?: number | null
          pressure?: number | null
          profile_id?: string | null
          rainfall?: number | null
          temperatureC?: number | null
          uv?: number | null
          wind_direction?: number | null
          wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seeed_sensecap_s2120_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      seeed_t1000: {
        Row: {
          battery_level: number | null
          created_at: string
          dev_eui: string
          id: number
          lat: number
          long: number
          profile_id: string | null
          sos: number | null
          temperatureC: number | null
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          dev_eui: string
          id?: number
          lat: number
          long: number
          profile_id?: string | null
          sos?: number | null
          temperatureC?: number | null
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          dev_eui?: string
          id?: number
          lat?: number
          long?: number
          profile_id?: string | null
          sos?: number | null
          temperatureC?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "SEEED_T1000_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "seeed_t1000_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sensors: {
        Row: {
          address: number | null
          connected_device: string | null
          created_at: string
          id: number
          lat: number | null
          lng: number | null
          type: string | null
        }
        Insert: {
          address?: number | null
          connected_device?: string | null
          created_at?: string
          id?: number
          lat?: number | null
          lng?: number | null
          type?: string | null
        }
        Update: {
          address?: number | null
          connected_device?: string | null
          created_at?: string
          id?: number
          lat?: number | null
          lng?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensors_connected_device_fkey"
            columns: ["connected_device"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      temp_humid_co2_alert_settings: {
        Row: {
          action: number
          cleared: boolean
          created_at: string
          dev_eui: string
          id: number
          OneSignalID: string | null
          operator: string
          profile_id: string
          receiver: string
          subject: string
          value: number
        }
        Insert: {
          action: number
          cleared: boolean
          created_at?: string
          dev_eui: string
          id?: number
          OneSignalID?: string | null
          operator: string
          profile_id: string
          receiver: string
          subject: string
          value: number
        }
        Update: {
          action?: number
          cleared?: boolean
          created_at?: string
          dev_eui?: string
          id?: number
          OneSignalID?: string | null
          operator?: string
          profile_id?: string
          receiver?: string
          subject?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "temp_humid_co2_alert_settings_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "temp_humid_co2_alert_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      delete_avatar: {
        Args: { avatar_url: string }
        Returns: Record<string, unknown>
      }
      delete_storage_object: {
        Args: { bucket: string; object: string }
        Returns: Record<string, unknown>
      }
      get_hloc_data: {
        Args:
          | {
              p_dev_eui: string
              p_bucket_interval: string
              p_time_range: string
              p_metric: string
            }
          | {
              p_dev_eui: string
              p_bucket_interval: string
              p_time_range: string
              p_metric: string
              p_table: string
            }
          | {
              start_time: string
              end_time: string
              time_interval: string
              table_name: string
              device_eui: string
            }
        Returns: {
          interval_time: string
          low: number
          high: number
          open: number
          close: number
        }[]
      }
      get_location_for_user: {
        Args: { user_id: string }
        Returns: number[]
      }
      get_road_events: {
        Args: { time_grouping: string }
        Returns: {
          group_period: string
          event_count: number
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
          period_start: string
          count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
