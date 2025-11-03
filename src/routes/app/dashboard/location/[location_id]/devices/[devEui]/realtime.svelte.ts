import { browser } from '$app/environment';
import type {
	RealtimeChannel,
	RealtimePostgresInsertPayload,
	SupabaseClient
} from '@supabase/supabase-js';

let channel: RealtimeChannel | null = $state(null);

export function setupRealtimeSubscription(
	supabase: SupabaseClient,
	deviceDataTable: string,
	devEui: string,
	onDataUpdate: (newData: any) => void,
	retryCount = 0
) {
	if (!browser) return;

	const refreshAggregatedTraffic = async () => {
		try {
			const response = await fetch(`/api/devices/${devEui}/status`);
			if (!response.ok) {
				console.warn(
					`[DeviceRealtime] Failed to refresh aggregated traffic data for ${devEui}`,
					response.status
				);
				return;
			}
			const aggregated = await response.json();
			onDataUpdate(aggregated);
		} catch (error) {
			console.error('[DeviceRealtime] Error refreshing aggregated traffic data', error);
		}
	};

	console.log('🔄 Setting up real-time subscription...');
	channel = supabase
		.channel(`${devEui}-changes`)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: deviceDataTable,
				filter: `dev_eui=eq.${devEui}`
			},
			(payload) => {
				// Handle real-time updates for users
				if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
					console.log('📡 Real-time data received:', payload.new);
					if (deviceDataTable === 'cw_traffic2') {
						void refreshAggregatedTraffic();
					} else {
						onDataUpdate(payload.new);
					}
				}
			}
		)
		.subscribe();
	return channel;
}

export function removeRealtimeSubscription(supabase: SupabaseClient) {
	if (channel) {
		console.log('🔄 Removing real-time subscription...');
		supabase.removeChannel(channel);
		channel.unsubscribe();
		channel = null;
	} else {
		console.warn('No active real-time channel to remove.');
	}
}
