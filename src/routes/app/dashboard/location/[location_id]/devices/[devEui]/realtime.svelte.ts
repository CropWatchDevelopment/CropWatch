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
	dataRef: any,
	retryCount = 0
) {
	if (!browser) return;

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
					// You can handle user updates here if needed
					console.log('old data', dataRef);
					debugger;
					dataRef = payload.new;
					console.log('new data', payload.new);
				}
			}
		)
		.subscribe();
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
