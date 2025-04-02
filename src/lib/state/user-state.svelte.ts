import { goto } from '$app/navigation';
import type { IDevice } from '$lib/interfaces/IDevice.interface';
import type { ILocation } from '$lib/interfaces/ILocation.interface';
import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getContext, setContext } from 'svelte';
import { useLocalStorage } from '$lib/utilities/storage';
import type { Tables } from '$lib/types/database.types';

type profile = Tables<'profiles'> | null;

interface UserStateProps {
    session: Session | null;
    user: User | null;
    profile: profile;
    supabase: SupabaseClient | null;
}

export class UserState {
    session = $state<Session | null>(null);
    supabase = $state<SupabaseClient | null>(null);
    user = $state<User | null>(null);
    profile? = $state<profile>(null);
    allLocations = $state<ILocation[]>([]);
    allDevices = $state<IDevice[]>([]);
    storage = useLocalStorage();
    realtime: RealtimeChannel | undefined = $state<RealtimeChannel | undefined>();
    realtimeJoinedStatus = $state<REALTIME_SUBSCRIBE_STATES>(REALTIME_SUBSCRIBE_STATES.CLOSED);

    constructor(data: UserStateProps) {
        this.updateState(data);
    }

    async updateState(data: UserStateProps) {
        this.session = data.session;
        this.supabase = data.supabase;
        this.user = data.user;
        if (this.user && this.supabase) {
            this.fetchLocations();
            await this.supabase.realtime.setAuth()
            this.supabase?.from('profiles').select('*').eq('id', this.user.id).maybeSingle().then(({ data, error }) => {
                if (error) {
                    console.error('Error fetching profile:', error);
                    return;
                }
                if (data) {
                    this.profile = data;
                }
            });
            await this.supabase.realtime.setAuth() // Needed for Realtime Authorization

            this.realtime = this.supabase.channel('realtime:public')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'cw_soil_data' },
                    (payload) => {
                        this.handleDatabaseRealtimeEvent(payload);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'cw_air_data' },
                    (payload) => {
                        this.handleDatabaseRealtimeEvent(payload);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'cw_rules' },
                    (payload) => {
                        this.handleRuleUpdate(payload);
                    }
                )
                .subscribe((status) => {
                    console.log('Realtime status:', status);
                    this.realtimeJoinedStatus = status;
                    if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
                        this.realtime?.unsubscribe();
                        this.realtime = undefined;
                        this.realtimeJoinedStatus = REALTIME_SUBSCRIBE_STATES.CLOSED;
                    }
                    return status;
                });
        }
    }

    private handleDatabaseRealtimeEvent(event: any) {
        console.log('⚡ Change received!', event);
        const device: IDevice = event.new;
        if (!this.allLocations || this.allLocations.length === 0) return;
        for (let i = 0; i < this.allLocations.length; i++) {
            for (let j = 0; j < this.allLocations[i].cw_devices.length; j++) {
                let oldDevice = this.allLocations[i].cw_devices.find(d => d.dev_eui === device.dev_eui);
                if (oldDevice) {
                    oldDevice.latest_data = device;
                    break;
                }
            }
        }
    }

    private handleRuleUpdate(event: any) {
        console.log('⚡ Rule Change received!', event);
        const rule: Tables<'cw_rules'> = event.new;
        if (!this.allLocations || this.allLocations.length === 0) return;
        for (let i = 0; i < this.allLocations.length; i++) {
            for (let j = 0; j < this.allLocations[i].cw_devices.length; j++) {
                let oldDevice = this.allLocations[i].cw_devices.find(d => d.dev_eui === rule.dev_eui);
                if (oldDevice) {
                    debugger;
                    if (rule.is_triggered) {
                        oldDevice.cw_rules = [rule];
                    } else {
                        oldDevice.cw_rules = [];
                    }
                    break;
                }
            }
        }
    }

    async logout() {
        await this.realtime?.unsubscribe();
        await this.supabase?.auth.signOut();
        this.session = null;
        this.user = null;

        let theme = localStorage.getItem('theme');
        let hide_empty_locations = localStorage.getItem('hide_empty_locations');
        let dashboard_view_type = localStorage.getItem('dashboard_view_type');
        localStorage.clear();
        localStorage.setItem('theme', theme ?? 'light');
        localStorage.setItem('hide_empty_locations', hide_empty_locations ?? 'false');
        localStorage.setItem('dashboard_view_type', dashboard_view_type ?? 'grid');
        document.location.href = '/auth/login';
    }

    async fetchLocations() {
        if (!this.user || !this.supabase) {
            return;
        }

        try {
            const { data: LocationsAndDevices, error } = await this.supabase
                .from('cw_locations')
                .select(`*,
    cw_location_owners(*),
    cw_devices(
      *,
      cw_device_owners(*),
      cw_device_type(*),
      cw_rules(
      *,
      cw_rule_criteria(*)
      )
    )
  `)
                .eq('cw_location_owners.is_active', true)
                .eq('cw_location_owners.user_id', this.user.id)
                .eq('cw_devices.cw_device_owners.user_id', this.user.id)
                .eq('cw_devices.cw_rules.is_triggered', true)
                .order('name', { ascending: true, referencedTable: 'cw_devices' });


            if (error) {
                console.error('Error fetching devices:', error);
                return;
            }

            this.allDevices = [];
            this.allLocations = LocationsAndDevices || [];
            this.allLocations.forEach(async location => {
                location.cw_devices.forEach(device => {
                    this.allDevices.push(device);
                    this.fetchLatestDeviceData(device);
                });
            });
            return this.allLocations;
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    }

    async percistLocationSortInLocalStorage() {
        this.storage?.set('location_sort', this.allLocations.map(l => l.location_id));
    }

    getSortedLocationsFromLocalStorage() {
        return this.storage?.get('location_sort');
    }

    async fetchLatestDeviceData(device?: IDevice, startDateTime?: Date, endDateTime?: Date) {
        if (!this.user || !this.supabase || !device) {
            return;
        }
        const isHistorical = startDateTime?.getTime() !== endDateTime?.getTime();

        if (!device.cw_device_type.data_table_v2) {
            console.error('Device type does not have a data table:', device);
            return;
        }

        const query = this.supabase
            .from(device.cw_device_type.data_table_v2)
            .select('*')
            .eq('dev_eui', device.dev_eui)
            .order('created_at', { ascending: false });

        if (!isHistorical) {
            query.limit(1);
            query.maybeSingle();
            const { data, error } = await query;
            if (error) {
                console.error('Error fetching device latest data:', error);
                return;
            }
            if (data) {
                device.latest_data = data;
            } else {
                return null;
            }
        } else {
            // Historical data query without caching
            query.gte('created_at', startDateTime?.toISOString()).lte('created_at', endDateTime?.toISOString());
            const { data, error } = await query;
            if (error) {
                console.error('Error fetching device historical data:', error);
                return;
            }
            if (data) {
                device.all_data = data;
            }
        }
        return device;
    }

}

const USER_STATE_KEY = Symbol("USER_STATE");

export function setUserState(data: UserStateProps) {
    return setContext(USER_STATE_KEY, new UserState(data));
}

export function getUserState() {
    return getContext<ReturnType<typeof setUserState>>(USER_STATE_KEY);
}
