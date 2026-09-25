export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '14.5';
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
			billing_customers: {
				Row: {
					base_discount_id: string | null;
					base_status: string | null;
					base_subscription_id: string | null;
					billing_mode: string;
					created_at: string;
					device_seats: number;
					device_subscription_id: string | null;
					org_id: string | null;
					reporting_manual: boolean;
					reporting_status: string | null;
					reporting_subscription_id: string | null;
					stripe_customer_id: string | null;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					base_discount_id?: string | null;
					base_status?: string | null;
					base_subscription_id?: string | null;
					billing_mode?: string;
					created_at?: string;
					device_seats?: number;
					device_subscription_id?: string | null;
					org_id?: string | null;
					reporting_manual?: boolean;
					reporting_status?: string | null;
					reporting_subscription_id?: string | null;
					stripe_customer_id?: string | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					base_discount_id?: string | null;
					base_status?: string | null;
					base_subscription_id?: string | null;
					billing_mode?: string;
					created_at?: string;
					device_seats?: number;
					device_subscription_id?: string | null;
					org_id?: string | null;
					reporting_manual?: boolean;
					reporting_status?: string | null;
					reporting_subscription_id?: string | null;
					stripe_customer_id?: string | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'billing_customers_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'billing_customers_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
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
			cw_air_alerts: {
				Row: {
					air_created_at: string | null;
					created_at: string;
					dev_eui: string;
					id: number;
					rule_group_id: string | null;
					triggering_rule_group: string;
				};
				Insert: {
					air_created_at?: string | null;
					created_at?: string;
					dev_eui: string;
					id?: number;
					rule_group_id?: string | null;
					triggering_rule_group: string;
				};
				Update: {
					air_created_at?: string | null;
					created_at?: string;
					dev_eui?: string;
					id?: number;
					rule_group_id?: string | null;
					triggering_rule_group?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_air_alerts_air_row_fkey';
						columns: ['dev_eui', 'air_created_at'];
						isOneToOne: false;
						referencedRelation: 'cw_air_data';
						referencedColumns: ['dev_eui', 'created_at'];
					}
				];
			};
			cw_air_annotations: {
				Row: {
					created_at: string;
					created_by: string;
					dev_eui: string;
					id: number;
					include_in_report: boolean;
					note: string | null;
					title: string;
				};
				Insert: {
					created_at: string;
					created_by: string;
					dev_eui: string;
					id?: number;
					include_in_report?: boolean;
					note?: string | null;
					title: string;
				};
				Update: {
					created_at?: string;
					created_by?: string;
					dev_eui?: string;
					id?: number;
					include_in_report?: boolean;
					note?: string | null;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_air_annotations_air_fk';
						columns: ['dev_eui', 'created_at'];
						isOneToOne: false;
						referencedRelation: 'cw_air_data';
						referencedColumns: ['dev_eui', 'created_at'];
					}
				];
			};
			cw_air_data: {
				Row: {
					battery_level: number | null;
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
					battery_level?: number | null;
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
					battery_level?: number | null;
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
			cw_device_gateway: {
				Row: {
					created_at: string;
					dev_eui: string;
					gateway_id: string;
					id: number;
					last_update: string;
					rssi: number | null;
					snr: number | null;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					gateway_id: string;
					id?: number;
					last_update?: string;
					rssi?: number | null;
					snr?: number | null;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					gateway_id?: string;
					id?: number;
					last_update?: string;
					rssi?: number | null;
					snr?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_device_gateway_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'cw_device_gateway_gateway_id_fkey';
						columns: ['gateway_id'];
						isOneToOne: false;
						referencedRelation: 'cw_gateways';
						referencedColumns: ['gateway_id'];
					}
				];
			};
			cw_device_owners: {
				Row: {
					dev_eui: string;
					id: number;
					is_legacy: boolean;
					owner_id: number;
					permission_level: number;
					user_id: string;
				};
				Insert: {
					dev_eui: string;
					id?: number;
					is_legacy?: boolean;
					owner_id?: number;
					permission_level?: number;
					user_id: string;
				};
				Update: {
					dev_eui?: string;
					id?: number;
					is_legacy?: boolean;
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
			cw_device_report_assignments: {
				Row: {
					created_at: string;
					dev_eui: string;
					id: number;
					is_active: boolean;
					template_id: number;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					id?: number;
					is_active?: boolean;
					template_id: number;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					id?: number;
					is_active?: boolean;
					template_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_device_report_assignments_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'cw_device_report_assignments_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_report_templates';
						referencedColumns: ['id'];
					}
				];
			};
			cw_device_rule_assignments: {
				Row: {
					created_at: string | null;
					dev_eui: string;
					id: number;
					is_active: boolean | null;
					template_id: number;
				};
				Insert: {
					created_at?: string | null;
					dev_eui: string;
					id?: number;
					is_active?: boolean | null;
					template_id: number;
				};
				Update: {
					created_at?: string | null;
					dev_eui?: string;
					id?: number;
					is_active?: boolean | null;
					template_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_device_rule_assignments_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'cw_device_rule_assignments_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_rule_templates';
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
					battery_changed_at: string | null;
					battery_level: number | null;
					dev_eui: string;
					error_status: string | null;
					group: string | null;
					installed_at: string | null;
					last_data_updated_at: string | null;
					lat: number | null;
					location_id: number | null;
					long: number | null;
					name: string;
					org_id: string | null;
					primary_data: number | null;
					report_endpoint: string | null;
					secondary_data: number | null;
					sensor_serial: string | null;
					sensor1_serial: string | null;
					sensor2_serial: string | null;
					tti_name: string | null;
					type: number | null;
					upload_interval: number | null;
					user_id: string | null;
					warranty_start_date: string | null;
				};
				Insert: {
					battery_changed_at?: string | null;
					battery_level?: number | null;
					dev_eui: string;
					error_status?: string | null;
					group?: string | null;
					installed_at?: string | null;
					last_data_updated_at?: string | null;
					lat?: number | null;
					location_id?: number | null;
					long?: number | null;
					name?: string;
					org_id?: string | null;
					primary_data?: number | null;
					report_endpoint?: string | null;
					secondary_data?: number | null;
					sensor_serial?: string | null;
					sensor1_serial?: string | null;
					sensor2_serial?: string | null;
					tti_name?: string | null;
					type?: number | null;
					upload_interval?: number | null;
					user_id?: string | null;
					warranty_start_date?: string | null;
				};
				Update: {
					battery_changed_at?: string | null;
					battery_level?: number | null;
					dev_eui?: string;
					error_status?: string | null;
					group?: string | null;
					installed_at?: string | null;
					last_data_updated_at?: string | null;
					lat?: number | null;
					location_id?: number | null;
					long?: number | null;
					name?: string;
					org_id?: string | null;
					primary_data?: number | null;
					report_endpoint?: string | null;
					secondary_data?: number | null;
					sensor_serial?: string | null;
					sensor1_serial?: string | null;
					sensor2_serial?: string | null;
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
						foreignKeyName: 'cw_devices_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
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
					gateway_eui: string | null;
					gateway_id: number;
					id: number;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					gateway_eui?: string | null;
					gateway_id: number;
					id?: number;
					user_id: string;
				};
				Update: {
					created_at?: string;
					gateway_eui?: string | null;
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
			cw_line_link_nonces: {
				Row: {
					created_at: string;
					expires_at: string;
					nonce: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					expires_at: string;
					nonce: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					expires_at?: string;
					nonce?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_line_link_nonces_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_location_owners: {
				Row: {
					admin_user_id: string;
					description: string | null;
					id: number;
					is_active: boolean | null;
					is_legacy: boolean;
					location_id: number;
					owner_id: number;
					permission_level: number | null;
					user_id: string;
				};
				Insert: {
					admin_user_id: string;
					description?: string | null;
					id?: number;
					is_active?: boolean | null;
					is_legacy?: boolean;
					location_id: number;
					owner_id?: number;
					permission_level?: number | null;
					user_id: string;
				};
				Update: {
					admin_user_id?: string;
					description?: string | null;
					id?: number;
					is_active?: boolean | null;
					is_legacy?: boolean;
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
					group: string | null;
					lat: number | null;
					location_id: number;
					long: number | null;
					map_zoom: number | null;
					name: string;
					org_id: string | null;
					owner_id: string | null;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					group?: string | null;
					lat?: number | null;
					location_id?: number;
					long?: number | null;
					map_zoom?: number | null;
					name: string;
					org_id?: string | null;
					owner_id?: string | null;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					group?: string | null;
					lat?: number | null;
					location_id?: number;
					long?: number | null;
					map_zoom?: number | null;
					name?: string;
					org_id?: string | null;
					owner_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_locations_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					},
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
					notifier_value: number;
				};
				Insert: {
					created_at?: string;
					id?: number;
					name: string;
					notifier_id: number;
					notifier_value: number;
				};
				Update: {
					created_at?: string;
					id?: number;
					name?: string;
					notifier_id?: number;
					notifier_value?: number;
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
			cw_power_data: {
				Row: {
					created_at: string;
					current: number | null;
					dev_eui: string;
					id: number;
					voltage: number | null;
					watts: number | null;
				};
				Insert: {
					created_at?: string;
					current?: number | null;
					dev_eui: string;
					id?: number;
					voltage?: number | null;
					watts?: number | null;
				};
				Update: {
					created_at?: string;
					current?: number | null;
					dev_eui?: string;
					id?: number;
					voltage?: number | null;
					watts?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_power_data_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			cw_push_tokens: {
				Row: {
					created_at: string;
					device_label: string | null;
					last_seen_at: string;
					token: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					device_label?: string | null;
					last_seen_at?: string;
					token: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					device_label?: string | null;
					last_seen_at?: string;
					token?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_push_tokens_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			cw_relay_data: {
				Row: {
					created_at: string;
					dev_eui: string;
					id: number;
					last_update: string;
					relay_1: boolean | null;
					relay_2: boolean | null;
				};
				Insert: {
					created_at?: string;
					dev_eui: string;
					id?: number;
					last_update: string;
					relay_1?: boolean | null;
					relay_2?: boolean | null;
				};
				Update: {
					created_at?: string;
					dev_eui?: string;
					id?: number;
					last_update?: string;
					relay_1?: boolean | null;
					relay_2?: boolean | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_relay_data_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: true;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			cw_report_regeneration_queue: {
				Row: {
					attempts: number;
					claimed_at: string | null;
					completed_at: string | null;
					created_at: string;
					dev_eui: string;
					edit_count: number;
					id: number;
					last_error: string | null;
					output_object_name: string | null;
					period_end: string;
					period_start: string;
					requested_at: string;
					requested_by: string;
					source_object_name: string;
					status: string;
					template_id: number;
					timezone: string;
				};
				Insert: {
					attempts?: number;
					claimed_at?: string | null;
					completed_at?: string | null;
					created_at?: string;
					dev_eui: string;
					edit_count?: number;
					id?: never;
					last_error?: string | null;
					output_object_name?: string | null;
					period_end: string;
					period_start: string;
					requested_at?: string;
					requested_by: string;
					source_object_name: string;
					status?: string;
					template_id: number;
					timezone?: string;
				};
				Update: {
					attempts?: number;
					claimed_at?: string | null;
					completed_at?: string | null;
					created_at?: string;
					dev_eui?: string;
					edit_count?: number;
					id?: never;
					last_error?: string | null;
					output_object_name?: string | null;
					period_end?: string;
					period_start?: string;
					requested_at?: string;
					requested_by?: string;
					source_object_name?: string;
					status?: string;
					template_id?: number;
					timezone?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_report_regeneration_queue_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'cw_report_regeneration_queue_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_report_templates';
						referencedColumns: ['id'];
					}
				];
			};
			cw_report_template_alert_points: {
				Row: {
					created_at: string;
					data_point_key: string;
					hex_color: string | null;
					id: number;
					max: number | null;
					min: number | null;
					name: string;
					operator: string | null;
					template_id: number;
					value: number | null;
				};
				Insert: {
					created_at?: string;
					data_point_key: string;
					hex_color?: string | null;
					id?: number;
					max?: number | null;
					min?: number | null;
					name: string;
					operator?: string | null;
					template_id: number;
					value?: number | null;
				};
				Update: {
					created_at?: string;
					data_point_key?: string;
					hex_color?: string | null;
					id?: number;
					max?: number | null;
					min?: number | null;
					name?: string;
					operator?: string | null;
					template_id?: number;
					value?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_report_template_alert_points_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_report_templates';
						referencedColumns: ['id'];
					}
				];
			};
			cw_report_template_data_processing_schedules: {
				Row: {
					created_at: string;
					crosses_midnight: boolean;
					day_of_week: number;
					end_time: string;
					id: string;
					is_enabled: boolean;
					rule_type: string;
					start_time: string;
					template_id: number;
					timezone: string;
					updated_at: string;
					valid_from: string | null;
					valid_to: string | null;
				};
				Insert: {
					created_at?: string;
					crosses_midnight?: boolean;
					day_of_week: number;
					end_time: string;
					id?: string;
					is_enabled?: boolean;
					rule_type?: string;
					start_time: string;
					template_id: number;
					timezone?: string;
					updated_at?: string;
					valid_from?: string | null;
					valid_to?: string | null;
				};
				Update: {
					created_at?: string;
					crosses_midnight?: boolean;
					day_of_week?: number;
					end_time?: string;
					id?: string;
					is_enabled?: boolean;
					rule_type?: string;
					start_time?: string;
					template_id?: number;
					timezone?: string;
					updated_at?: string;
					valid_from?: string | null;
					valid_to?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_report_template_data_processing_schedules_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_report_templates';
						referencedColumns: ['id'];
					}
				];
			};
			cw_report_template_recipients: {
				Row: {
					communication_method: number;
					created_at: string;
					email: string | null;
					id: number;
					name: string | null;
					template_id: number;
				};
				Insert: {
					communication_method: number;
					created_at?: string;
					email?: string | null;
					id?: number;
					name?: string | null;
					template_id: number;
				};
				Update: {
					communication_method?: number;
					created_at?: string;
					email?: string | null;
					id?: number;
					name?: string | null;
					template_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_report_template_recipients_communication_method_fkey';
						columns: ['communication_method'];
						isOneToOne: false;
						referencedRelation: 'communication_methods';
						referencedColumns: ['communication_method_id'];
					},
					{
						foreignKeyName: 'cw_report_template_recipients_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_report_templates';
						referencedColumns: ['id'];
					}
				];
			};
			cw_report_template_schedule: {
				Row: {
					created_at: string;
					end_of_day: boolean;
					end_of_month: boolean;
					end_of_week: boolean;
					id: number;
					is_active: boolean;
					template_id: number;
					utc_offset: number;
				};
				Insert: {
					created_at?: string;
					end_of_day?: boolean;
					end_of_month?: boolean;
					end_of_week?: boolean;
					id?: number;
					is_active?: boolean;
					template_id: number;
					utc_offset?: number;
				};
				Update: {
					created_at?: string;
					end_of_day?: boolean;
					end_of_month?: boolean;
					end_of_week?: boolean;
					id?: number;
					is_active?: boolean;
					template_id?: number;
					utc_offset?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_report_template_schedule_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_report_templates';
						referencedColumns: ['id'];
					}
				];
			};
			cw_report_templates: {
				Row: {
					created_at: string;
					created_by: string | null;
					data_pull_interval: number;
					description: string | null;
					device_type_id: number | null;
					id: number;
					is_active: boolean;
					legacy_report_id: string | null;
					name: string;
					org_id: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					data_pull_interval?: number;
					description?: string | null;
					device_type_id?: number | null;
					id?: number;
					is_active?: boolean;
					legacy_report_id?: string | null;
					name: string;
					org_id?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					data_pull_interval?: number;
					description?: string | null;
					device_type_id?: number | null;
					id?: number;
					is_active?: boolean;
					legacy_report_id?: string | null;
					name?: string;
					org_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_report_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cw_report_templates_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					}
				];
			};
			cw_rule_action_types: {
				Row: {
					created_at: string;
					id: number;
					name: string;
				};
				Insert: {
					created_at?: string;
					id?: number;
					name: string;
				};
				Update: {
					created_at?: string;
					id?: number;
					name?: string;
				};
				Relationships: [];
			};
			cw_rule_monthly_usage: {
				Row: {
					dev_eui: string;
					id: number;
					month: number;
					template_id: number;
					trigger_count: number | null;
					year: number;
				};
				Insert: {
					dev_eui: string;
					id?: number;
					month: number;
					template_id: number;
					trigger_count?: number | null;
					year: number;
				};
				Update: {
					dev_eui?: string;
					id?: number;
					month?: number;
					template_id?: number;
					trigger_count?: number | null;
					year?: number;
				};
				Relationships: [];
			};
			cw_rule_state: {
				Row: {
					dev_eui: string;
					id: number;
					is_triggered: boolean;
					last_reset_at: string | null;
					last_triggered_at: string | null;
					template_id: number;
				};
				Insert: {
					dev_eui: string;
					id?: number;
					is_triggered?: boolean;
					last_reset_at?: string | null;
					last_triggered_at?: string | null;
					template_id: number;
				};
				Update: {
					dev_eui?: string;
					id?: number;
					is_triggered?: boolean;
					last_reset_at?: string | null;
					last_triggered_at?: string | null;
					template_id?: number;
				};
				Relationships: [];
			};
			cw_rule_template_actions: {
				Row: {
					action_type: number;
					config: Json;
					created_at: string | null;
					id: number;
					template_id: number;
				};
				Insert: {
					action_type: number;
					config: Json;
					created_at?: string | null;
					id?: number;
					template_id: number;
				};
				Update: {
					action_type?: number;
					config?: Json;
					created_at?: string | null;
					id?: number;
					template_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_rule_template_actions_action_type_fkey';
						columns: ['action_type'];
						isOneToOne: false;
						referencedRelation: 'cw_rule_action_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cw_rule_template_actions_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_rule_templates';
						referencedColumns: ['id'];
					}
				];
			};
			cw_rule_template_criteria: {
				Row: {
					created_at: string | null;
					id: number;
					operator: string;
					reset_value: number;
					subject: string;
					template_id: number;
					trigger_value: number;
				};
				Insert: {
					created_at?: string | null;
					id?: number;
					operator: string;
					reset_value: number;
					subject: string;
					template_id: number;
					trigger_value: number;
				};
				Update: {
					created_at?: string | null;
					id?: number;
					operator?: string;
					reset_value?: number;
					subject?: string;
					template_id?: number;
					trigger_value?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_rule_template_criteria_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'cw_rule_templates';
						referencedColumns: ['id'];
					}
				];
			};
			cw_rule_templates: {
				Row: {
					created_at: string | null;
					description: string | null;
					device_type_id: number | null;
					id: number;
					is_active: boolean | null;
					legacy_migration_key: string | null;
					name: string;
				};
				Insert: {
					created_at?: string | null;
					description?: string | null;
					device_type_id?: number | null;
					id?: number;
					is_active?: boolean | null;
					legacy_migration_key?: string | null;
					name: string;
				};
				Update: {
					created_at?: string | null;
					description?: string | null;
					device_type_id?: number | null;
					id?: number;
					is_active?: boolean | null;
					legacy_migration_key?: string | null;
					name?: string;
				};
				Relationships: [];
			};
			cw_rule_trigger_log: {
				Row: {
					created_at: string | null;
					dev_eui: string;
					id: number;
					reset_at: string | null;
					reset_value: number | null;
					template_id: number;
					triggered_at: string | null;
					triggered_value: number | null;
				};
				Insert: {
					created_at?: string | null;
					dev_eui: string;
					id?: number;
					reset_at?: string | null;
					reset_value?: number | null;
					template_id: number;
					triggered_at?: string | null;
					triggered_value?: number | null;
				};
				Update: {
					created_at?: string | null;
					dev_eui?: string;
					id?: number;
					reset_at?: string | null;
					reset_value?: number | null;
					template_id?: number;
					triggered_at?: string | null;
					triggered_value?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cw_rule_trigger_log_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					}
				];
			};
			cw_soil_data: {
				Row: {
					air_humidity: number | null;
					air_temperature_c: number | null;
					created_at: string;
					dev_eui: string;
					ec: number | null;
					moisture: number | null;
					ph: number | null;
					ppfd: number | null;
					temperature_c: number | null;
				};
				Insert: {
					air_humidity?: number | null;
					air_temperature_c?: number | null;
					created_at?: string;
					dev_eui: string;
					ec?: number | null;
					moisture?: number | null;
					ph?: number | null;
					ppfd?: number | null;
					temperature_c?: number | null;
				};
				Update: {
					air_humidity?: number | null;
					air_temperature_c?: number | null;
					created_at?: string;
					dev_eui?: string;
					ec?: number | null;
					moisture?: number | null;
					ph?: number | null;
					ppfd?: number | null;
					temperature_c?: number | null;
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
					line_number: number | null;
					motorcycle_count: number;
					people_count: number;
					traffic_hour: string | null;
					train_count: number;
					truck_count: number;
				};
				Insert: {
					bicycle_count?: number;
					bus_count?: number;
					car_count?: number;
					created_at?: string;
					dev_eui: string;
					id?: number;
					line_number?: number | null;
					motorcycle_count?: number;
					people_count?: number;
					traffic_hour?: string | null;
					train_count?: number;
					truck_count?: number;
				};
				Update: {
					bicycle_count?: number;
					bus_count?: number;
					car_count?: number;
					created_at?: string;
					dev_eui?: string;
					id?: number;
					line_number?: number | null;
					motorcycle_count?: number;
					people_count?: number;
					traffic_hour?: string | null;
					train_count?: number;
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
			device_licenses: {
				Row: {
					created_at: string;
					dev_eui: string | null;
					id: number;
					org_id: string | null;
					seat_index: number;
					status: string;
					stripe_subscription_id: string | null;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					dev_eui?: string | null;
					id?: never;
					org_id?: string | null;
					seat_index: number;
					status?: string;
					stripe_subscription_id?: string | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					dev_eui?: string | null;
					id?: never;
					org_id?: string | null;
					seat_index?: number;
					status?: string;
					stripe_subscription_id?: string | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'device_licenses_dev_eui_fkey';
						columns: ['dev_eui'];
						isOneToOne: false;
						referencedRelation: 'cw_devices';
						referencedColumns: ['dev_eui'];
					},
					{
						foreignKeyName: 'device_licenses_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'device_licenses_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
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
			legal_document_versions: {
				Row: {
					created_at: string;
					effective_at: string;
					kind: string;
					url: string;
					version: number;
				};
				Insert: {
					created_at?: string;
					effective_at?: string;
					kind: string;
					url: string;
					version: number;
				};
				Update: {
					created_at?: string;
					effective_at?: string;
					kind?: string;
					url?: string;
					version?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'legal_document_versions_kind_fkey';
						columns: ['kind'];
						isOneToOne: false;
						referencedRelation: 'legal_documents';
						referencedColumns: ['kind'];
					}
				];
			};
			legal_documents: {
				Row: {
					current_version: number;
					effective_at: string;
					kind: string;
					updated_at: string;
					url: string;
				};
				Insert: {
					current_version?: number;
					effective_at?: string;
					kind: string;
					updated_at?: string;
					url: string;
				};
				Update: {
					current_version?: number;
					effective_at?: string;
					kind?: string;
					updated_at?: string;
					url?: string;
				};
				Relationships: [];
			};
			organization_invites: {
				Row: {
					accepted_at: string | null;
					accepted_by: string | null;
					created_at: string;
					email: string;
					expires_at: string;
					id: string;
					invited_by: string | null;
					location_grants: Json | null;
					member_expires_at: string | null;
					org_id: string;
					role: string;
					status: string;
					token_hash: string;
				};
				Insert: {
					accepted_at?: string | null;
					accepted_by?: string | null;
					created_at?: string;
					email: string;
					expires_at: string;
					id?: string;
					invited_by?: string | null;
					location_grants?: Json | null;
					member_expires_at?: string | null;
					org_id: string;
					role: string;
					status?: string;
					token_hash: string;
				};
				Update: {
					accepted_at?: string | null;
					accepted_by?: string | null;
					created_at?: string;
					email?: string;
					expires_at?: string;
					id?: string;
					invited_by?: string | null;
					location_grants?: Json | null;
					member_expires_at?: string | null;
					org_id?: string;
					role?: string;
					status?: string;
					token_hash?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'organization_invites_accepted_by_fkey';
						columns: ['accepted_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organization_invites_invited_by_fkey';
						columns: ['invited_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organization_invites_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					}
				];
			};
			organization_link_requests: {
				Row: {
					child_org_id: string;
					created_at: string;
					decided_at: string | null;
					decided_by: string | null;
					id: string;
					parent_org_id: string;
					requested_by: string | null;
					status: string;
				};
				Insert: {
					child_org_id: string;
					created_at?: string;
					decided_at?: string | null;
					decided_by?: string | null;
					id?: string;
					parent_org_id: string;
					requested_by?: string | null;
					status?: string;
				};
				Update: {
					child_org_id?: string;
					created_at?: string;
					decided_at?: string | null;
					decided_by?: string | null;
					id?: string;
					parent_org_id?: string;
					requested_by?: string | null;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'organization_link_requests_child_org_id_fkey';
						columns: ['child_org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organization_link_requests_decided_by_fkey';
						columns: ['decided_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organization_link_requests_parent_org_id_fkey';
						columns: ['parent_org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organization_link_requests_requested_by_fkey';
						columns: ['requested_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			organization_members: {
				Row: {
					created_at: string;
					expires_at: string | null;
					invited_by: string | null;
					org_id: string;
					role: string;
					status: string;
					suspended_at: string | null;
					suspended_by: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					expires_at?: string | null;
					invited_by?: string | null;
					org_id: string;
					role: string;
					status?: string;
					suspended_at?: string | null;
					suspended_by?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string;
					expires_at?: string | null;
					invited_by?: string | null;
					org_id?: string;
					role?: string;
					status?: string;
					suspended_at?: string | null;
					suspended_by?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'organization_members_invited_by_fkey';
						columns: ['invited_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organization_members_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organization_members_suspended_by_fkey';
						columns: ['suspended_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organization_members_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			organizations: {
				Row: {
					converted_at: string | null;
					converted_by: string | null;
					created_at: string;
					deactivated_at: string | null;
					home_of_user_id: string | null;
					id: string;
					name: string;
					parent_linked_at: string | null;
					parent_linked_by: string | null;
					parent_org_id: string | null;
					type: string;
					updated_at: string;
				};
				Insert: {
					converted_at?: string | null;
					converted_by?: string | null;
					created_at?: string;
					deactivated_at?: string | null;
					home_of_user_id?: string | null;
					id?: string;
					name: string;
					parent_linked_at?: string | null;
					parent_linked_by?: string | null;
					parent_org_id?: string | null;
					type: string;
					updated_at?: string;
				};
				Update: {
					converted_at?: string | null;
					converted_by?: string | null;
					created_at?: string;
					deactivated_at?: string | null;
					home_of_user_id?: string | null;
					id?: string;
					name?: string;
					parent_linked_at?: string | null;
					parent_linked_by?: string | null;
					parent_org_id?: string | null;
					type?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'organizations_converted_by_fkey';
						columns: ['converted_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organizations_home_of_user_id_fkey';
						columns: ['home_of_user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organizations_parent_linked_by_fkey';
						columns: ['parent_linked_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'organizations_parent_org_id_fkey';
						columns: ['parent_org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					}
				];
			};
			profile_legal_acceptances: {
				Row: {
					accepted_at: string;
					kind: string;
					user_id: string;
					version: number;
				};
				Insert: {
					accepted_at?: string;
					kind: string;
					user_id: string;
					version: number;
				};
				Update: {
					accepted_at?: string;
					kind?: string;
					user_id?: string;
					version?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'profile_legal_acceptances_kind_fkey';
						columns: ['kind'];
						isOneToOne: false;
						referencedRelation: 'legal_documents';
						referencedColumns: ['kind'];
					},
					{
						foreignKeyName: 'profile_legal_acceptances_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			profile_preferences: {
				Row: {
					area_unit: string | null;
					co2_unit: string | null;
					created_at: string;
					date_format: string | null;
					distance_unit: string | null;
					ec_unit: string | null;
					pressure_unit: string | null;
					rainfall_unit: string | null;
					soil_moisture_unit: string | null;
					temperature_unit: string | null;
					theme: string | null;
					time_format: string | null;
					timezone: string | null;
					updated_at: string;
					user_id: string;
					water_level_unit: string | null;
					weight_unit: string | null;
					wind_speed_unit: string | null;
				};
				Insert: {
					area_unit?: string | null;
					co2_unit?: string | null;
					created_at?: string;
					date_format?: string | null;
					distance_unit?: string | null;
					ec_unit?: string | null;
					pressure_unit?: string | null;
					rainfall_unit?: string | null;
					soil_moisture_unit?: string | null;
					temperature_unit?: string | null;
					theme?: string | null;
					time_format?: string | null;
					timezone?: string | null;
					updated_at?: string;
					user_id: string;
					water_level_unit?: string | null;
					weight_unit?: string | null;
					wind_speed_unit?: string | null;
				};
				Update: {
					area_unit?: string | null;
					co2_unit?: string | null;
					created_at?: string;
					date_format?: string | null;
					distance_unit?: string | null;
					ec_unit?: string | null;
					pressure_unit?: string | null;
					rainfall_unit?: string | null;
					soil_moisture_unit?: string | null;
					temperature_unit?: string | null;
					theme?: string | null;
					time_format?: string | null;
					timezone?: string | null;
					updated_at?: string;
					user_id?: string;
					water_level_unit?: string | null;
					weight_unit?: string | null;
					wind_speed_unit?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'profile_preferences_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			profile_whats_new_seen: {
				Row: {
					release: number;
					seen_at: string;
					user_id: string;
				};
				Insert: {
					release: number;
					seen_at?: string;
					user_id: string;
				};
				Update: {
					release?: number;
					seen_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'profile_whats_new_seen_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			profiles: {
				Row: {
					accepted_agreements: boolean;
					avatar_url: string | null;
					created_at: string;
					discord: string | null;
					email: string | null;
					employer: string | null;
					full_name: string | null;
					id: string;
					last_login: string | null;
					line_id: string | null;
					phone_number: string | null;
					updated_at: string | null;
					username: string | null;
					website: string | null;
				};
				Insert: {
					accepted_agreements?: boolean;
					avatar_url?: string | null;
					created_at?: string;
					discord?: string | null;
					email?: string | null;
					employer?: string | null;
					full_name?: string | null;
					id: string;
					last_login?: string | null;
					line_id?: string | null;
					phone_number?: string | null;
					updated_at?: string | null;
					username?: string | null;
					website?: string | null;
				};
				Update: {
					accepted_agreements?: boolean;
					avatar_url?: string | null;
					created_at?: string;
					discord?: string | null;
					email?: string | null;
					employer?: string | null;
					full_name?: string | null;
					id?: string;
					last_login?: string | null;
					line_id?: string | null;
					phone_number?: string | null;
					updated_at?: string | null;
					username?: string | null;
					website?: string | null;
				};
				Relationships: [];
			};
			whats_new: {
				Row: {
					current_release: number;
					key: string;
					published_at: string | null;
				};
				Insert: {
					current_release?: number;
					key: string;
					published_at?: string | null;
				};
				Update: {
					current_release?: number;
					key?: string;
					published_at?: string | null;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			accept_org_invite: {
				Args: { p_token_hash: string; p_user_id: string };
				Returns: Json;
			};
			accept_org_link: {
				Args: { p_decided_by: string; p_request_id: string };
				Returns: undefined;
			};
			convert_org_to_company: {
				Args: { p_converted_by: string; p_name: string; p_org_id: string };
				Returns: undefined;
			};
			cw_traffic_daily_totals: {
				Args: { dev_eui: string; end_ts: string; start_ts: string; tz?: string };
				Returns: {
					total_bicycles: number;
					total_buses: number;
					total_cars: number;
					total_people: number;
					total_trucks: number;
					traffic_day: string;
				}[];
			};
			cw_traffic2_increment: {
				Args: {
					p_bicycle: number;
					p_bus: number;
					p_car: number;
					p_dev_eui: string;
					p_line_number: number;
					p_motorcycle: number;
					p_people: number;
					p_traffic_hour: string;
					p_train: number;
					p_truck: number;
				};
				Returns: undefined;
			};
			delete_avatar: {
				Args: { avatar_url: string };
				Returns: Record<string, unknown>;
			};
			delete_storage_object: {
				Args: { bucket: string; object: string };
				Returns: Record<string, unknown>;
			};
			get_filtered_device_report_data_multi_v2: {
				Args: {
					p_columns: string[];
					p_dev_id: string;
					p_end_time: string;
					p_interval_minutes: number;
					p_maxs: number[];
					p_mins: number[];
					p_ops: string[];
					p_start_time: string;
					p_timezone?: string;
				};
				Returns: Json[];
			};
			get_hloc_data:
				| {
						Args: {
							p_bucket_interval: string;
							p_dev_eui: string;
							p_metric: string;
							p_time_range: string;
						};
						Returns: {
							bucket: string;
							close_val: number;
							dev_eui: string;
							high_val: number;
							low_val: number;
							open_val: number;
						}[];
				  }
				| {
						Args: {
							p_bucket_interval: string;
							p_dev_eui: string;
							p_metric: string;
							p_table: string;
							p_time_range: string;
						};
						Returns: {
							bucket: string;
							close_val: number;
							dev_eui: string;
							high_val: number;
							low_val: number;
							open_val: number;
						}[];
				  }
				| {
						Args: {
							device_eui: string;
							end_time: string;
							start_time: string;
							table_name: string;
							time_interval: string;
						};
						Returns: {
							close: number;
							high: number;
							interval_time: string;
							low: number;
							open: number;
						}[];
				  };
			get_location_for_user: { Args: { user_id: string }; Returns: number[] };
			get_road_events: {
				Args: { time_grouping: string };
				Returns: {
					event_count: number;
					group_period: string;
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
					count: number;
					period_start: string;
				}[];
			};
			get_table_columns: {
				Args: { p_table: unknown };
				Returns: {
					column_name: string;
				}[];
			};
			is_device_admin_for:
				| {
						Args: { p_dev_eui: string };
						Returns: {
							error: true;
						} & 'Could not choose the best candidate function between: public.is_device_admin_for(p_dev_eui => text), public.is_device_admin_for(p_dev_eui => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved';
				  }
				| {
						Args: { p_dev_eui: string };
						Returns: {
							error: true;
						} & 'Could not choose the best candidate function between: public.is_device_admin_for(p_dev_eui => text), public.is_device_admin_for(p_dev_eui => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved';
				  };
			is_device_member_for: { Args: { p_dev_eui: string }; Returns: boolean };
			is_device_owner_for: { Args: { dev: string }; Returns: boolean };
			is_location_member_for: { Args: { loc_id: number }; Returns: boolean };
			is_location_owner_for: { Args: { loc_id: number }; Returns: boolean };
			org_home_of: { Args: { p_user: string }; Returns: string };
			remove_org_member: {
				Args: { p_org_id: string; p_user_id: string };
				Returns: Json;
			};
			transfer_org_ownership: {
				Args: { p_new_owner: string; p_org_id: string };
				Returns: undefined;
			};
			unlink_org: { Args: { p_child_org_id: string }; Returns: undefined };
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
