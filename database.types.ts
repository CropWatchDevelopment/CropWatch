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
          id: number
          name: string
          out_connection_id: number | null
        }
        Insert: {
          created_at?: string
          decoder?: string | null
          id?: number
          name?: string
          out_connection_id?: number | null
        }
        Update: {
          created_at?: string
          decoder?: string | null
          id?: number
          name?: string
          out_connection_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_babylon_decoders_out_connection_id_fkey"
            columns: ["out_connection_id"]
            isOneToOne: false
            referencedRelation: "babylon_out_connections"
            referencedColumns: ["connection_id"]
          },
        ]
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
            foreignKeyName: "public_babylon_input_output_in_id_fkey"
            columns: ["in_id"]
            isOneToOne: false
            referencedRelation: "babylon_in_connections"
            referencedColumns: ["connection_id"]
          },
          {
            foreignKeyName: "public_babylon_input_output_out_id_fkey"
            columns: ["out_id"]
            isOneToOne: false
            referencedRelation: "babylon_out_connections"
            referencedColumns: ["connection_id"]
          },
        ]
      }
      babylon_notifier_types: {
        Row: {
          created_at: string
          id: number
          name: string
          notifier_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          notifier_id?: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          notifier_id?: number
        }
        Relationships: []
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
      cropwatch_uplinks: {
        Row: {
          confirmed: boolean | null
          created_at: string | null
          decoded_payload: Json | null
          dev_eui: string | null
          f_cnt: number
          f_port: number | null
          frm_payload: string | null
          id: number
          metadata: Json | null
          received_at: string | null
          ui_metadata: Json | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string | null
          decoded_payload?: Json | null
          dev_eui?: string | null
          f_cnt?: number
          f_port?: number | null
          frm_payload?: string | null
          id?: number
          metadata?: Json | null
          received_at?: string | null
          ui_metadata?: Json | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string | null
          decoded_payload?: Json | null
          dev_eui?: string | null
          f_cnt?: number
          f_port?: number | null
          frm_payload?: string | null
          id?: number
          metadata?: Json | null
          received_at?: string | null
          ui_metadata?: Json | null
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
      cw_co2_uplinks: {
        Row: {
          battery: number | null
          co2_level: number | null
          created_at: string
          dev_eui: string | null
          humidity: number
          id: number
          pressure: number | null
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
      cw_device_locations: {
        Row: {
          dev_eui: string
          id: number
          location_id: number
        }
        Insert: {
          dev_eui: string
          id?: number
          location_id: number
        }
        Update: {
          dev_eui?: string
          id?: number
          location_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_device_locations_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: true
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
          {
            foreignKeyName: "cw_device_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "cw_locations"
            referencedColumns: ["location_id"]
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
          decoder: string | null
          device_app: string | null
          id: number
          manufacturer: string | null
          model: string | null
          name: string
          primary_data: string | null
          primary_data_notation: string | null
          secondary_data: string | null
          secondary_data_notation: string | null
        }
        Insert: {
          created_at?: string
          data_table?: string | null
          decoder?: string | null
          device_app?: string | null
          id?: number
          manufacturer?: string | null
          model?: string | null
          name: string
          primary_data?: string | null
          primary_data_notation?: string | null
          secondary_data?: string | null
          secondary_data_notation?: string | null
        }
        Update: {
          created_at?: string
          data_table?: string | null
          decoder?: string | null
          device_app?: string | null
          id?: number
          manufacturer?: string | null
          model?: string | null
          name?: string
          primary_data?: string | null
          primary_data_notation?: string | null
          secondary_data?: string | null
          secondary_data_notation?: string | null
        }
        Relationships: []
      }
      cw_devices: {
        Row: {
          battery_changed_at: string | null
          dev_eui: string
          installed_at: string | null
          lat: number | null
          long: number | null
          name: string
          type: number | null
          upload_interval: number | null
        }
        Insert: {
          battery_changed_at?: string | null
          dev_eui: string
          installed_at?: string | null
          lat?: number | null
          long?: number | null
          name?: string
          type?: number | null
          upload_interval?: number | null
        }
        Update: {
          battery_changed_at?: string | null
          dev_eui?: string
          installed_at?: string | null
          lat?: number | null
          long?: number | null
          name?: string
          type?: number | null
          upload_interval?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cw_devices_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "cw_device_type"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_gps_uplinks: {
        Row: {
          altitude: number | null
          battery: number | null
          collected_time: string | null
          created_at: string
          dev_eui: string
          geoPos: unknown | null
          hdop: number | null
          id: number
          isHistoric: boolean
          latitude: number
          longitude: number
        }
        Insert: {
          altitude?: number | null
          battery?: number | null
          collected_time?: string | null
          created_at?: string
          dev_eui: string
          geoPos?: unknown | null
          hdop?: number | null
          id?: number
          isHistoric?: boolean
          latitude: number
          longitude: number
        }
        Update: {
          altitude?: number | null
          battery?: number | null
          collected_time?: string | null
          created_at?: string
          dev_eui?: string
          geoPos?: unknown | null
          hdop?: number | null
          id?: number
          isHistoric?: boolean
          latitude?: number
          longitude?: number
        }
        Relationships: []
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
          latitude: number | null
          location_id: number
          longitude: number | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          latitude?: number | null
          location_id?: number
          longitude?: number | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          latitude?: number | null
          location_id?: number
          longitude?: number | null
          name?: string
        }
        Relationships: []
      }
      cw_netvox_r313_uplinks: {
        Row: {
          battery: number
          created_at: string
          dev_eui: string
          deviceType: number
          id: number
          is_simulation: boolean | null
          reportType: number
          status1: number
          status2: number
          version: number | null
        }
        Insert: {
          battery: number
          created_at?: string
          dev_eui: string
          deviceType: number
          id?: number
          is_simulation?: boolean | null
          reportType: number
          status1: number
          status2: number
          version?: number | null
        }
        Update: {
          battery?: number
          created_at?: string
          dev_eui?: string
          deviceType?: number
          id?: number
          is_simulation?: boolean | null
          reportType?: number
          status1?: number
          status2?: number
          version?: number | null
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
          babylon_notifier_type: number
          created_at: string
          dev_eui: string | null
          id: number
          is_triggered: boolean
          last_triggered: string | null
          name: string
          profile_id: string
          ruleGroupId: string
          trigger_count: number
        }
        Insert: {
          action_recipient: string
          babylon_notifier_type: number
          created_at?: string
          dev_eui?: string | null
          id?: number
          is_triggered?: boolean
          last_triggered?: string | null
          name: string
          profile_id?: string
          ruleGroupId: string
          trigger_count?: number
        }
        Update: {
          action_recipient?: string
          babylon_notifier_type?: number
          created_at?: string
          dev_eui?: string | null
          id?: number
          is_triggered?: boolean
          last_triggered?: string | null
          name?: string
          profile_id?: string
          ruleGroupId?: string
          trigger_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_cw_rules_babylon_notifier_type_fkey"
            columns: ["babylon_notifier_type"]
            isOneToOne: false
            referencedRelation: "babylon_notifier_types"
            referencedColumns: ["notifier_id"]
          },
          {
            foreignKeyName: "public_cw_rules_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
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
            foreignKeyName: "public_cw_ss_tme_dev_eui_fkey"
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
          id: number
          internalTemp: number | null
          modbusAttempts: number | null
          profile_id: string | null
          simulated: boolean | null
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
          id?: number
          internalTemp?: number | null
          modbusAttempts?: number | null
          profile_id?: string | null
          simulated?: boolean | null
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
          id?: number
          internalTemp?: number | null
          modbusAttempts?: number | null
          profile_id?: string | null
          simulated?: boolean | null
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
          {
            foreignKeyName: "public_cw_ss_tmepnpk_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cw_vs_350_uplinks: {
        Row: {
          battery: number | null
          created_at: string
          dev_eui: string
          historic_datetime: string | null
          id: number
          period_in: number
          period_out: number
          total_in: number
          total_out: number
        }
        Insert: {
          battery?: number | null
          created_at?: string
          dev_eui: string
          historic_datetime?: string | null
          id?: number
          period_in: number
          period_out: number
          total_in: number
          total_out: number
        }
        Update: {
          battery?: number | null
          created_at?: string
          dev_eui?: string
          historic_datetime?: string | null
          id?: number
          period_in?: number
          period_out?: number
          total_in?: number
          total_out?: number
        }
        Relationships: []
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
      cw_weather_station_uplinks: {
        Row: {
          battery: number | null
          co2_level: number | null
          created_at: string
          dev_eui: string | null
          humidity: number
          id: number
          pressure: number | null
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
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "cw_weather_station_uplinks_dev_eui_fkey"
            columns: ["dev_eui"]
            isOneToOne: false
            referencedRelation: "cw_devices"
            referencedColumns: ["dev_eui"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "public_seeed_co2_lorawan_uplinks_dev_eui_fkey"
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
          humidity: number
          id: number
          lux: number
          pressure: number
          profile_id: string | null
          rainfall: number
          temperatureC: number
          uv: number
          wind_direction: number
          wind_speed: number
        }
        Insert: {
          created_at?: string
          dev_eui: string
          humidity: number
          id?: number
          lux: number
          pressure: number
          profile_id?: string | null
          rainfall: number
          temperatureC: number
          uv: number
          wind_direction: number
          wind_speed: number
        }
        Update: {
          created_at?: string
          dev_eui?: string
          humidity?: number
          id?: number
          lux?: number
          pressure?: number
          profile_id?: string | null
          rainfall?: number
          temperatureC?: number
          uv?: number
          wind_direction?: number
          wind_speed?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
