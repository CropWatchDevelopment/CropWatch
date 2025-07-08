export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instanciate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '12.2.3 (519615d)';
	};
	public: {
		Tables: {
			api_keys: {
				Row: {
					api_key: string | null;
					created_at: string;
					Description: string | null;
					expires_at: string | null;
					id: number;
					owner_id: string;
				};
				Insert: {
					api_key?: string | null;
					created_at?: string;
					Description?: string | null;
					expires_at?: string | null;
					id?: number;
					owner_id?: string;
				};
				Update: {
					api_key?: string | null;
					created_at?: string;
					Description?: string | null;
					expires_at?: string | null;
					id?: number;
					owner_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'api_keys_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			communication_methods: {
				Row: {
					communication_method_id: number;
					created_at: string;
					id: number;
					is_active: boolean;
					name: string;
				};
				Insert: {
					communication_method_id?: number;
					created_at?: string;
					id?: number;
					is_active?: boolean;
					name: string;
				};
				Update: {
					communication_method_id?: number;
					created_at?: string;
					id?: number;
					is_active?: boolean;
					name?: string;
				};
				Relationships: [];
			};
			customers: {
				Row: {
					created_at: string | null;
					email: string | null;
					id: string;
					name: string | null;
					stripe_customer_id: string;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					email?: string | null;
					id: string;
					name?: string | null;
					stripe_customer_id: string;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					email?: string | null;
					id?: string;
					name?: string | null;
					stripe_customer_id?: string;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'customers_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_air_data: {
				Row: {
					co: number | null;
					co2: number | null;
					created_at: string;
					dev_eui: string;
					humidity: number | null;
					is_simulated: boolean;
					lux: number | null;
					pressure: number | null;
					rainfall: number | null;
					temperature_c: number | null;
					uv_index: number | null;
					wind_direction: number | null;
					wind_speed: number | null;
				};
				Insert: {
					co?: number | null;
					co2?: number | null;
					created_at?: string;
					dev_eui: string;
					humidity?: number | null;
					is_simulated?: boolean;
					lux?: number | null;
					pressure?: number | null;
					rainfall?: number | null;
					temperature_c?: number | null;
					uv_index?: number | null;
					wind_direction?: number | null;
					wind_speed?: number | null;
				};
				Update: {
					co?: number | null;
					co2?: number | null;
					created_at?: string;
					dev_eui?: string;
					humidity?: number | null;
					is_simulated?: boolean;
					lux?: number | null;
					pressure?: number | null;
					rainfall?: number | null;
					temperature_c?: number | null;
					uv_index?: number | null;
					wind_direction?: number | null;
					wind_speed?: number | null;
				};
				Relationships: [];
			};
			cw_air_thvd: {
				Row: {
					created_at: string;
					dev_eui: string;
					dewPointC: number | null;
					humidity: number;
					id: number;
					profile_id: string | null;
					temperatureC: number;
					vpd: number | null;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					dewPointC?: number | null;
					humidity: number;
					id?: number;
					profile_id?: string | null;
					temperatureC: number;
					vpd?: number | null;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					dewPointC?: number | null;
					humidity?: number;
					id?: number;
					profile_id?: string | null;
					temperatureC?: number;
					vpd?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_air_thvd_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'public_cw_air_thvd_profile_id_fkey';
						columns: ['profile_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_co2_alerts: {
				Row: {
					action: string;
					cleared: boolean;
					created_at: string;
					dev_eui: string;
					id: number;
					OneSignalID: string | null;
					operator: string;
					profile_id: string;
					receiver: string;
					subject: string;
					value: number;
				};
				Insert: {
					action: string;
					cleared: boolean;
					created_at?: string;
					dev_eui: string;
					id?: number;
					OneSignalID?: string | null;
					operator: string;
					profile_id: string;
					receiver: string;
					subject: string;
					value: number;
				};
				Update: {
					action?: string;
					cleared?: boolean;
					created_at?: string;
					dev_eui?: string;
					id?: number;
					OneSignalID?: string | null;
					operator?: string;
					profile_id?: string;
					receiver?: string;
					subject?: string;
					value?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_co2_alerts_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'cw_co2_alerts_profile_id_fkey';
						columns: ['profile_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_co2_uplinks: {
				Row: {
					battery: number | null;
					co2_level: number | null;
					created_at: string;
					dev_eui: string | null;
					humidity: number;
					id: number;
					pressure: number | null;
					profile_id: string | null;
					temperature: number;
				};
				Insert: {
					battery?: number | null;
					co2_level?: number | null;
					created_at?: string;
					dev_eui?: string | null;
					humidity: number;
					id?: number;
					pressure?: number | null;
					profile_id?: string | null;
					temperature: number;
				};
				Update: {
					battery?: number | null;
					co2_level?: number | null;
					created_at?: string;
					dev_eui?: string | null;
					humidity?: number;
					id?: number;
					pressure?: number | null;
					profile_id?: string | null;
					temperature?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_co2_uplinks_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			cw_data_metadata: {
				Row: {
					adder: number;
					created_at: string;
					formatting: string | null;
					icon: string | null;
					id: number;
					multiplier: number;
					name: string;
					notation: string;
					public_name: string | null;
				};
				Insert: {
					adder?: number;
					created_at?: string;
					formatting?: string | null;
					icon?: string | null;
					id?: number;
					multiplier?: number;
					name: string;
					notation?: string;
					public_name?: string | null;
				};
				Update: {
					adder?: number;
					created_at?: string;
					formatting?: string | null;
					icon?: string | null;
					id?: number;
					multiplier?: number;
					name?: string;
					notation?: string;
					public_name?: string | null;
				};
				Relationships: [];
			};
			cw_device_owners: {
				Row: {
					dev_eui: string;
					id: number;
					owner_id: number;
					permission_level: number;
					user_id: string;
				};
				Insert: {
					dev_eui: string;
					id?: number;
					owner_id?: number;
					permission_level?: number;
					user_id: string;
				};
				Update: {
					dev_eui?: string;
					id?: number;
					owner_id?: number;
					permission_level?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_device_owners_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'cw_device_owners_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_device_type: {
				Row: {
					created_at: string;
					data_table: string | null;
					data_table_v2: string;
					decoder: string | null;
					default_upload_interval: number | null;
					device_app: string | null;
					id: number;
					isActive: boolean;
					manufacturer: string | null;
					model: string | null;
					name: string;
					primary_data: string | null;
					primary_data_notation: string;
					primary_data_v2: string;
					primary_divider: number;
					primary_multiplier: number | null;
					secondary_data: string;
					secondary_data_notation: string;
					secondary_data_v2: string;
					secondary_divider: number;
					secondary_multiplier: number;
					TTI_application_id: string | null;
				};
				Insert: {
					created_at?: string;
					data_table?: string | null;
					data_table_v2: string;
					decoder?: string | null;
					default_upload_interval?: number | null;
					device_app?: string | null;
					id?: number;
					isActive?: boolean;
					manufacturer?: string | null;
					model?: string | null;
					name: string;
					primary_data?: string | null;
					primary_data_notation?: string;
					primary_data_v2: string;
					primary_divider?: number;
					primary_multiplier?: number | null;
					secondary_data?: string;
					secondary_data_notation?: string;
					secondary_data_v2: string;
					secondary_divider?: number;
					secondary_multiplier?: number;
					TTI_application_id?: string | null;
				};
				Update: {
					created_at?: string;
					data_table?: string | null;
					data_table_v2?: string;
					decoder?: string | null;
					default_upload_interval?: number | null;
					device_app?: string | null;
					id?: number;
					isActive?: boolean;
					manufacturer?: string | null;
					model?: string | null;
					name?: string;
					primary_data?: string | null;
					primary_data_notation?: string;
					primary_data_v2?: string;
					primary_divider?: number;
					primary_multiplier?: number | null;
					secondary_data?: string;
					secondary_data_notation?: string;
					secondary_data_v2?: string;
					secondary_divider?: number;
					secondary_multiplier?: number;
					TTI_application_id?: string | null;
				};
				Relationships: [];
			};
			cw_device_x_cw_data_metadata: {
				Row: {
					created_at: string;
					cw_data_metadata: number;
					device_type_id: number;
					id: number;
					relation_id: number;
				};
				Insert: {
					created_at?: string;
					cw_data_metadata: number;
					device_type_id: number;
					id?: number;
					relation_id?: number;
				};
				Update: {
					created_at?: string;
					cw_data_metadata?: number;
					device_type_id?: number;
					id?: number;
					relation_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_device_x_cw_data_metadata_cw_data_metadata_fkey';
						columns: ['cw_data_metadata'];
						isOneToOne: false;
						referencedRelation: 'cw_data_metadata';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cw_device_x_cw_data_metadata_device_type_id_fkey';
						columns: ['device_type_id'];
						isOneToOne: false;
						referencedRelation: 'cw_device_type';
						referencedColumns: ['id'];
					}
				];
			};
			cw_devices: {
				Row: {
					ai_provider: string | null;
					battery_changed_at: string | null;
					dev_eui: string;
					installed_at: string | null;
					lat: number | null;
					location_id: number | null;
					long: number | null;
					name: string;
					report_endpoint: string | null;
					serial_number: string | null;
					tti_name: string | null;
					type: number | null;
					upload_interval: number | null;
					user_id: string | null;
					warranty_start_date: string | null;
				};
				Insert: {
					ai_provider?: string | null;
					battery_changed_at?: string | null;
					dev_eui: string;
					installed_at?: string | null;
					lat?: number | null;
					location_id?: number | null;
					long?: number | null;
					name?: string;
					report_endpoint?: string | null;
					serial_number?: string | null;
					tti_name?: string | null;
					type?: number | null;
					upload_interval?: number | null;
					user_id?: string | null;
					warranty_start_date?: string | null;
				};
				Update: {
					ai_provider?: string | null;
					battery_changed_at?: string | null;
					dev_eui?: string;
					installed_at?: string | null;
					lat?: number | null;
					location_id?: number | null;
					long?: number | null;
					name?: string;
					report_endpoint?: string | null;
					serial_number?: string | null;
					tti_name?: string | null;
					type?: number | null;
					upload_interval?: number | null;
					user_id?: string | null;
					warranty_start_date?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_devices_location_id_fkey';
						columns: ['location_id'];
						isOneToOne: false;
						referencedRelation: 'cw_locations';
						referencedColumns: ['location_id'];
					},
					{
						foreignKeyName: 'cw_devices_type_fkey';
						columns: ['type'];
						isOneToOne: false;
						referencedRelation: 'cw_device_type';
						referencedColumns: ['id'];
					}
				];
			};
			cw_gateways: {
				Row: {
					created_at: string;
					gateway_id: string;
					gateway_name: string;
					id: number;
					is_online: boolean;
					is_public: boolean;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string;
					gateway_id: string;
					gateway_name: string;
					id?: number;
					is_online: boolean;
					is_public?: boolean;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string;
					gateway_id?: string;
					gateway_name?: string;
					id?: number;
					is_online?: boolean;
					is_public?: boolean;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			cw_gateways_owners: {
				Row: {
					created_at: string;
					gateway_id: number;
					id: number;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					gateway_id: number;
					id?: number;
					user_id: string;
				};
				Update: {
					created_at?: string;
					gateway_id?: number;
					id?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_gateways_owners_gateway_id_fkey';
						columns: ['gateway_id'];
						isOneToOne: false;
						referencedRelation: 'cw_gateways';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cw_gateways_owners_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_location_owners: {
				Row: {
					description: string | null;
					id: number;
					is_active: boolean | null;
					location_id: number;
					owner_id: number;
					permission_level: number | null;
					user_id: string;
				};
				Insert: {
					description?: string | null;
					id?: number;
					is_active?: boolean | null;
					location_id: number;
					owner_id?: number;
					permission_level?: number | null;
					user_id: string;
				};
				Update: {
					description?: string | null;
					id?: number;
					is_active?: boolean | null;
					location_id?: number;
					owner_id?: number;
					permission_level?: number | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_location_owners_location_id_fkey';
						columns: ['location_id'];
						isOneToOne: false;
						referencedRelation: 'cw_locations';
						referencedColumns: ['location_id'];
					},
					{
						foreignKeyName: 'cw_location_owners_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_locations: {
				Row: {
					created_at: string;
					description: string | null;
					lat: number | null;
					location_id: number;
					long: number | null;
					map_zoom: number | null;
					name: string;
					owner_id: string | null;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					lat?: number | null;
					location_id?: number;
					long?: number | null;
					map_zoom?: number | null;
					name: string;
					owner_id?: string | null;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					lat?: number | null;
					location_id?: number;
					long?: number | null;
					map_zoom?: number | null;
					name?: string;
					owner_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_locations_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_notifier_types: {
				Row: {
					created_at: string;
					id: number;
					name: string;
					notifier_id: number;
				};
				Insert: {
					created_at?: string;
					id?: number;
					name: string;
					notifier_id?: number;
				};
				Update: {
					created_at?: string;
					id?: number;
					name?: string;
					notifier_id?: number;
				};
				Relationships: [];
			};
			cw_permission_level_types: {
				Row: {
					created_at: string;
					id: number;
					name: string;
					permission_level_id: number;
				};
				Insert: {
					created_at?: string;
					id?: number;
					name: string;
					permission_level_id?: number;
				};
				Update: {
					created_at?: string;
					id?: number;
					name?: string;
					permission_level_id?: number;
				};
				Relationships: [];
			};
			cw_relay_data: {
				Row: {
					created_at: string;
					dev_eui: string;
					id: number;
					relay_1: boolean;
					relay_2: boolean | null;
					relay_3: boolean | null;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					id?: number;
					relay_1?: boolean;
					relay_2?: boolean | null;
					relay_3?: boolean | null;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					id?: number;
					relay_1?: boolean;
					relay_2?: boolean | null;
					relay_3?: boolean | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_relay_data_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			cw_rule_criteria: {
				Row: {
					created_at: string;
					criteria_id: number | null;
					id: number;
					operator: string;
					parent_id: string | null;
					reset_value: number | null;
					ruleGroupId: string;
					subject: string;
					trigger_value: number;
				};
				Insert: {
					created_at?: string;
					criteria_id?: number | null;
					id?: number;
					operator: string;
					parent_id?: string | null;
					reset_value?: number | null;
					ruleGroupId: string;
					subject: string;
					trigger_value: number;
				};
				Update: {
					created_at?: string;
					criteria_id?: number | null;
					id?: number;
					operator?: string;
					parent_id?: string | null;
					reset_value?: number | null;
					ruleGroupId?: string;
					subject?: string;
					trigger_value?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'public_cw_rule_criteria_ruleGroupId_fkey';
						columns: ['ruleGroupId'];
						isOneToOne: false;
						referencedRelation: 'cw_rules';
						referencedColumns: ['ruleGroupId'];
					}
				];
			};
			cw_rules: {
				Row: {
					action_recipient: string;
					created_at: string;
					dev_eui: string | null;
					id: number;
					is_triggered: boolean;
					last_triggered: string | null;
					name: string;
					notifier_type: number;
					profile_id: string;
					ruleGroupId: string;
					trigger_count: number;
				};
				Insert: {
					action_recipient: string;
					created_at?: string;
					dev_eui?: string | null;
					id?: number;
					is_triggered?: boolean;
					last_triggered?: string | null;
					name: string;
					notifier_type: number;
					profile_id?: string;
					ruleGroupId: string;
					trigger_count?: number;
				};
				Update: {
					action_recipient?: string;
					created_at?: string;
					dev_eui?: string | null;
					id?: number;
					is_triggered?: boolean;
					last_triggered?: string | null;
					name?: string;
					notifier_type?: number;
					profile_id?: string;
					ruleGroupId?: string;
					trigger_count?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_rules_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'cw_rules_notifier_type_fkey';
						columns: ['notifier_type'];
						isOneToOne: false;
						referencedRelation: 'cw_notifier_types';
						referencedColumns: ['notifier_id'];
					},
					{
						foreignKeyName: 'public_cw_rules_profile_id_fkey';
						columns: ['profile_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_soil_data: {
				Row: {
					created_at: string;
					dev_eui: string;
					ec: number | null;
					moisture: number | null;
					ph: number | null;
					temperature_c: number | null;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					ec?: number | null;
					moisture?: number | null;
					ph?: number | null;
					temperature_c?: number | null;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					ec?: number | null;
					moisture?: number | null;
					ph?: number | null;
					temperature_c?: number | null;
				};
				Relationships: [];
			};
			cw_soil_uplinks: {
				Row: {
					battery: number | null;
					created_at: string;
					dev_eui: string | null;
					ec: number | null;
					id: number;
					internal_temp: number | null;
					k: number | null;
					moisture: number;
					n: number | null;
					p: number | null;
					ph: number | null;
					read_attempts: number | null;
					real_duration: number | null;
					temperature: number;
				};
				Insert: {
					battery?: number | null;
					created_at?: string;
					dev_eui?: string | null;
					ec?: number | null;
					id?: number;
					internal_temp?: number | null;
					k?: number | null;
					moisture: number;
					n?: number | null;
					p?: number | null;
					ph?: number | null;
					read_attempts?: number | null;
					real_duration?: number | null;
					temperature: number;
				};
				Update: {
					battery?: number | null;
					created_at?: string;
					dev_eui?: string | null;
					ec?: number | null;
					id?: number;
					internal_temp?: number | null;
					k?: number | null;
					moisture?: number;
					n?: number | null;
					p?: number | null;
					ph?: number | null;
					read_attempts?: number | null;
					real_duration?: number | null;
					temperature?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_soil_uplinks_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			cw_traffic: {
				Row: {
					created_at: string;
					dev_eui: string;
					id: number;
					object_type: string;
					period_in: number;
					period_out: number;
					period_total: number;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					id?: number;
					object_type: string;
					period_in?: number;
					period_out?: number;
					period_total?: number;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					id?: number;
					object_type?: string;
					period_in?: number;
					period_out?: number;
					period_total?: number;
				};
				Relationships: [];
			};
			cw_traffic2: {
				Row: {
					bicycle_count: number;
					bus_count: number;
					car_count: number;
					created_at: string;
					dev_eui: string;
					id: number;
					people_count: number;
					traffic_hour: string | null;
					truck_count: number;
				};
				Insert: {
					bicycle_count?: number;
					bus_count?: number;
					car_count?: number;
					created_at?: string;
					dev_eui: string;
					id?: number;
					people_count?: number;
					traffic_hour?: string | null;
					truck_count?: number;
				};
				Update: {
					bicycle_count?: number;
					bus_count?: number;
					car_count?: number;
					created_at?: string;
					dev_eui?: string;
					id?: number;
					people_count?: number;
					traffic_hour?: string | null;
					truck_count?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_traffic2_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			cw_water_data: {
				Row: {
					created_at: string;
					deapth_cm: number | null;
					dev_eui: string;
					id: number;
					pressure: number | null;
					spo2: number | null;
					temperature_c: number | null;
				};
				Insert: {
					created_at?: string;
					deapth_cm?: number | null;
					dev_eui: string;
					id?: number;
					pressure?: number | null;
					spo2?: number | null;
					temperature_c?: number | null;
				};
				Update: {
					created_at?: string;
					deapth_cm?: number | null;
					dev_eui?: string;
					id?: number;
					pressure?: number | null;
					spo2?: number | null;
					temperature_c?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_water_data_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			cw_watermeter_uplinks: {
				Row: {
					battery_level: number | null;
					count: number;
					created_at: string;
					dev_eui: string;
					id: number;
					internal_temp: number | null;
				};
				Insert: {
					battery_level?: number | null;
					count: number;
					created_at?: string;
					dev_eui: string;
					id?: number;
					internal_temp?: number | null;
				};
				Update: {
					battery_level?: number | null;
					count?: number;
					created_at?: string;
					dev_eui?: string;
					id?: number;
					internal_temp?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_watermeter_uplinks_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			device_data_sample: {
				Row: {
					co2_level: number | null;
					created_at: string;
					dev_eui: string;
					humidity: number | null;
					id: number;
					pressure: number | null;
					temperature_c: number | null;
				};
				Insert: {
					co2_level?: number | null;
					created_at: string;
					dev_eui: string;
					humidity?: number | null;
					id?: number;
					pressure?: number | null;
					temperature_c?: number | null;
				};
				Update: {
					co2_level?: number | null;
					created_at?: string;
					dev_eui?: string;
					humidity?: number | null;
					id?: number;
					pressure?: number | null;
					temperature_c?: number | null;
				};
				Relationships: [];
			};
			ip_log: {
				Row: {
					created_at: string;
					dev_eui: string | null;
					device_id: string;
					id: number;
					ip: string | null;
					timestamp: string | null;
				};
				Insert: {
					created_at?: string;
					dev_eui?: string | null;
					device_id: string;
					id?: number;
					ip?: string | null;
					timestamp?: string | null;
				};
				Update: {
					created_at?: string;
					dev_eui?: string | null;
					device_id?: string;
					id?: number;
					ip?: string | null;
					timestamp?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'ip_log_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			locations: {
				Row: {
					created_at: string | null;
					description: string | null;
					dev_eui: string | null;
					id: number;
					lat: number | null;
					lng: number | null;
					name: string;
					profile_id: string | null;
					sensor_type: string | null;
				};
				Insert: {
					created_at?: string | null;
					description?: string | null;
					dev_eui?: string | null;
					id?: number;
					lat?: number | null;
					lng?: number | null;
					name: string;
					profile_id?: string | null;
					sensor_type?: string | null;
				};
				Update: {
					created_at?: string | null;
					description?: string | null;
					dev_eui?: string | null;
					id?: number;
					lat?: number | null;
					lng?: number | null;
					name?: string;
					profile_id?: string | null;
					sensor_type?: string | null;
				};
				Relationships: [];
			};
			netvox_ra02a: {
				Row: {
					battery: number;
					created_at: string;
					dev_eui: string;
					fireAlarm: number;
					gateway_count: number | null;
					highTempAlarm: number;
					id: number;
					profile_id: string | null;
					rssi: number | null;
					snr: number | null;
					temperatureC: number;
				};
				Insert: {
					battery: number;
					created_at?: string;
					dev_eui: string;
					fireAlarm: number;
					gateway_count?: number | null;
					highTempAlarm: number;
					id?: number;
					profile_id?: string | null;
					rssi?: number | null;
					snr?: number | null;
					temperatureC: number;
				};
				Update: {
					battery?: number;
					created_at?: string;
					dev_eui?: string;
					fireAlarm?: number;
					gateway_count?: number | null;
					highTempAlarm?: number;
					id?: number;
					profile_id?: string | null;
					rssi?: number | null;
					snr?: number | null;
					temperatureC?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'netvox_ra02a_profile_id_fkey';
						columns: ['profile_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			payments: {
				Row: {
					amount: number;
					created_at: string | null;
					currency: string;
					id: string;
					status: string;
					stripe_invoice_id: string | null;
					stripe_payment_intent_id: string;
					subscription_id: string | null;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					amount: number;
					created_at?: string | null;
					currency?: string;
					id: string;
					status: string;
					stripe_invoice_id?: string | null;
					stripe_payment_intent_id: string;
					subscription_id?: string | null;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					amount?: number;
					created_at?: string | null;
					currency?: string;
					id?: string;
					status?: string;
					stripe_invoice_id?: string | null;
					stripe_payment_intent_id?: string;
					subscription_id?: string | null;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'payments_subscription_id_fkey';
						columns: ['subscription_id'];
						isOneToOne: false;
						referencedRelation: 'subscriptions';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'payments_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			permissions: {
				Row: {
					allowed_by_profile_id: string | null;
					allowed_profile_id: string | null;
					created_at: string | null;
					description: string | null;
					id: number;
					resource: string;
					role_id: number;
				};
				Insert: {
					allowed_by_profile_id?: string | null;
					allowed_profile_id?: string | null;
					created_at?: string | null;
					description?: string | null;
					id?: number;
					resource: string;
					role_id: number;
				};
				Update: {
					allowed_by_profile_id?: string | null;
					allowed_profile_id?: string | null;
					created_at?: string | null;
					description?: string | null;
					id?: number;
					resource?: string;
					role_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'permissions_allowed_by_profile_id_fkey';
						columns: ['allowed_by_profile_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'permissions_allowed_profile_id_fkey';
						columns: ['allowed_profile_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			profiles: {
				Row: {
					accepted_agreements: boolean;
					avatar_url: string | null;
					discord: string | null;
					email: string | null;
					employer: string | null;
					full_name: string | null;
					id: string;
					last_login: string | null;
					updated_at: string | null;
					username: string | null;
					website: string | null;
				};
				Insert: {
					accepted_agreements?: boolean;
					avatar_url?: string | null;
					discord?: string | null;
					email?: string | null;
					employer?: string | null;
					full_name?: string | null;
					id: string;
					last_login?: string | null;
					updated_at?: string | null;
					username?: string | null;
					website?: string | null;
				};
				Update: {
					accepted_agreements?: boolean;
					avatar_url?: string | null;
					discord?: string | null;
					email?: string | null;
					employer?: string | null;
					full_name?: string | null;
					id?: string;
					last_login?: string | null;
					updated_at?: string | null;
					username?: string | null;
					website?: string | null;
				};
				Relationships: [];
			};
			report_alert_points: {
				Row: {
					created_at: string;
					data_point_key: string | null;
					hex_color: string | null;
					id: number;
					max: number | null;
					min: number | null;
					name: string;
					operator: string | null;
					report_id: string;
					user_id: string | null;
					value: number | null;
				};
				Insert: {
					created_at?: string;
					data_point_key?: string | null;
					hex_color?: string | null;
					id?: number;
					max?: number | null;
					min?: number | null;
					name: string;
					operator?: string | null;
					report_id: string;
					user_id?: string | null;
					value?: number | null;
				};
				Update: {
					created_at?: string;
					data_point_key?: string | null;
					hex_color?: string | null;
					id?: number;
					max?: number | null;
					min?: number | null;
					name?: string;
					operator?: string | null;
					report_id?: string;
					user_id?: string | null;
					value?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'report_alert_points_report_id_fkey';
						columns: ['report_id'];
						isOneToOne: false;
						referencedRelation: 'reports';
						referencedColumns: ['report_id'];
					}
				];
			};
			report_recipients: {
				Row: {
					communication_method: number;
					created_at: string;
					email: string | null;
					id: number;
					name: string | null;
					report_id: string;
					user_id: string | null;
				};
				Insert: {
					communication_method: number;
					created_at?: string;
					email?: string | null;
					id?: number;
					name?: string | null;
					report_id: string;
					user_id?: string | null;
				};
				Update: {
					communication_method?: number;
					created_at?: string;
					email?: string | null;
					id?: number;
					name?: string | null;
					report_id?: string;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'report_recipients_communication_method_fkey';
						columns: ['communication_method'];
						isOneToOne: false;
						referencedRelation: 'communication_methods';
						referencedColumns: ['communication_method_id'];
					},
					{
						foreignKeyName: 'report_recipients_report_id_fkey';
						columns: ['report_id'];
						isOneToOne: false;
						referencedRelation: 'reports';
						referencedColumns: ['report_id'];
					}
				];
			};
			report_user_schedule: {
				Row: {
					created_at: string;
					dev_eui: string;
					end_of_month: boolean;
					end_of_week: boolean;
					id: number;
					is_active: boolean;
					report_id: string;
					report_user_schedule_id: number;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					end_of_month?: boolean;
					end_of_week?: boolean;
					id?: number;
					is_active?: boolean;
					report_id: string;
					report_user_schedule_id?: number;
					user_id?: string;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					end_of_month?: boolean;
					end_of_week?: boolean;
					id?: number;
					is_active?: boolean;
					report_id?: string;
					report_user_schedule_id?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'report_user_schedule_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'report_user_schedule_report_id_fkey';
						columns: ['report_id'];
						isOneToOne: false;
						referencedRelation: 'reports';
						referencedColumns: ['report_id'];
					},
					{
						foreignKeyName: 'report_user_schedule_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			reports: {
				Row: {
					created_at: string;
					dev_eui: string;
					id: number;
					name: string;
					report_id: string;
					user_id: string | null;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					id?: number;
					name: string;
					report_id?: string;
					user_id?: string | null;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					id?: number;
					name?: string;
					report_id?: string;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'reports_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'reports_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			reports_templates: {
				Row: {
					created_at: string;
					dev_eui: string | null;
					id: number;
					name: string;
					owner_id: string;
					recipients: string | null;
					template: Json;
				};
				Insert: {
					created_at?: string;
					dev_eui?: string | null;
					id?: number;
					name: string;
					owner_id?: string;
					recipients?: string | null;
					template: Json;
				};
				Update: {
					created_at?: string;
					dev_eui?: string | null;
					id?: number;
					name?: string;
					owner_id?: string;
					recipients?: string | null;
					template?: Json;
				};
				Relationships: [
					{
						foreignKeyName: 'reports_templates_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'reports_templates_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			stripe_customers: {
				Row: {
					attrs: Json | null;
					created: string | null;
					description: string | null;
					email: string | null;
					id: string | null;
					name: string | null;
				};
				Insert: {
					attrs?: Json | null;
					created?: string | null;
					description?: string | null;
					email?: string | null;
					id?: string | null;
					name?: string | null;
				};
				Update: {
					attrs?: Json | null;
					created?: string | null;
					description?: string | null;
					email?: string | null;
					id?: string | null;
					name?: string | null;
				};
				Relationships: [];
			};
			stripe_products: {
				Row: {
					active: boolean | null;
					attrs: Json | null;
					created: string | null;
					default_price: string | null;
					description: string | null;
					id: string | null;
					name: string | null;
					updated: string | null;
				};
				Insert: {
					active?: boolean | null;
					attrs?: Json | null;
					created?: string | null;
					default_price?: string | null;
					description?: string | null;
					id?: string | null;
					name?: string | null;
					updated?: string | null;
				};
				Update: {
					active?: boolean | null;
					attrs?: Json | null;
					created?: string | null;
					default_price?: string | null;
					description?: string | null;
					id?: string | null;
					name?: string | null;
					updated?: string | null;
				};
				Relationships: [];
			};
			stripe_subscriptions: {
				Row: {
					attrs: Json | null;
					currency: string | null;
					current_period_end: string | null;
					current_period_start: string | null;
					customer: string | null;
					id: string | null;
				};
				Insert: {
					attrs?: Json | null;
					currency?: string | null;
					current_period_end?: string | null;
					current_period_start?: string | null;
					customer?: string | null;
					id?: string | null;
				};
				Update: {
					attrs?: Json | null;
					currency?: string | null;
					current_period_end?: string | null;
					current_period_start?: string | null;
					customer?: string | null;
					id?: string | null;
				};
				Relationships: [];
			};
			subscription_items: {
				Row: {
					created_at: string | null;
					id: string;
					quantity: number | null;
					stripe_price_id: string;
					stripe_subscription_item_id: string;
					subscription_id: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					id: string;
					quantity?: number | null;
					stripe_price_id: string;
					stripe_subscription_item_id: string;
					subscription_id: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					quantity?: number | null;
					stripe_price_id?: string;
					stripe_subscription_item_id?: string;
					subscription_id?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'subscription_items_subscription_id_fkey';
						columns: ['subscription_id'];
						isOneToOne: false;
						referencedRelation: 'subscriptions';
						referencedColumns: ['id'];
					}
				];
			};
			subscriptions: {
				Row: {
					cancel_at_period_end: boolean | null;
					canceled_at: string | null;
					created_at: string | null;
					current_period_end: string | null;
					current_period_start: string | null;
					customer_id: string;
					id: string;
					status: string;
					stripe_price_id: string;
					stripe_subscription_id: string;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					cancel_at_period_end?: boolean | null;
					canceled_at?: string | null;
					created_at?: string | null;
					current_period_end?: string | null;
					current_period_start?: string | null;
					customer_id: string;
					id: string;
					status: string;
					stripe_price_id: string;
					stripe_subscription_id: string;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					cancel_at_period_end?: boolean | null;
					canceled_at?: string | null;
					created_at?: string | null;
					current_period_end?: string | null;
					current_period_start?: string | null;
					customer_id?: string;
					id?: string;
					status?: string;
					stripe_price_id?: string;
					stripe_subscription_id?: string;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'subscriptions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			user_discord_connections: {
				Row: {
					access_token: string;
					avatar: string | null;
					created_at: string | null;
					discord_user_id: string;
					discord_username: string;
					id: string;
					token_type: string;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					access_token: string;
					avatar?: string | null;
					created_at?: string | null;
					discord_user_id: string;
					discord_username: string;
					id?: string;
					token_type: string;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					access_token?: string;
					avatar?: string | null;
					created_at?: string | null;
					discord_user_id?: string;
					discord_username?: string;
					id?: string;
					token_type?: string;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			delete_avatar: {
				Args: { avatar_url: string };
				Returns: Record<string, unknown>;
			};
			delete_storage_object: {
				Args: { bucket: string; object: string };
				Returns: Record<string, unknown>;
			};
			get_filtered_device_report_data: {
				Args: {
					dev_id: string;
					start_time: string;
					end_time: string;
					interval_minutes: number;
					target_column: string;
					compare_operator: string;
					compare_value_min: number;
					compare_value_max?: number;
				};
				Returns: Json[];
			};
			get_filtered_device_report_data_multi: {
				Args: {
					p_dev_id: string;
					p_start_time: string;
					p_end_time: string;
					p_interval_minutes: number;
					p_columns: string[];
					p_ops: string[];
					p_mins: number[];
					p_maxs: number[];
				};
				Returns: Json[];
			};
			get_hloc_data: {
				Args:
					| {
							p_dev_eui: string;
							p_bucket_interval: string;
							p_time_range: string;
							p_metric: string;
					  }
					| {
							p_dev_eui: string;
							p_bucket_interval: string;
							p_time_range: string;
							p_metric: string;
							p_table: string;
					  }
					| {
							start_time: string;
							end_time: string;
							time_interval: string;
							table_name: string;
							device_eui: string;
					  };
				Returns: {
					bucket: string;
					dev_eui: string;
					open_val: number;
					close_val: number;
					low_val: number;
					high_val: number;
				}[];
			};
			get_location_for_user: {
				Args: { user_id: string };
				Returns: number[];
			};
			get_multi_condition_device_report_data: {
				Args: {
					p_dev_id: string;
					p_report_id: string;
					p_start_time: string;
					p_end_time: string;
					p_interval_minutes: number;
				};
				Returns: Json[];
			};
			get_report_data_for_device: {
				Args:
					| { input_dev_eui: string; input_start: string; input_end: string }
					| {
							input_dev_eui: string;
							input_start: string;
							input_end: string;
							input_timezone?: string;
					  }
					| {
							input_dev_eui: string;
							input_start: string;
							input_end: string;
							input_timezone?: string;
							input_interval_minutes?: number;
					  };
				Returns: Json;
			};
			get_road_events: {
				Args: { time_grouping: string };
				Returns: {
					group_period: string;
					event_count: number;
				}[];
			};
			get_road_events_summary1: {
				Args: {
					classes: string[];
					end_date: string;
					line_id: string;
					start_date: string;
					time_span: string;
				};
				Returns: {
					period_start: string;
					count: number;
				}[];
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {}
	}
} as const;
