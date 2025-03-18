// +page.server.ts
import { superValidate } from 'sveltekit-superforms/server';
import type { Actions, PageServerLoad } from './$types';
import { zod } from 'sveltekit-superforms/adapters';
import { PRIVATE_TTI_API_KEY } from '$env/static/private';
import { deviceSchema } from './form/TTI-Device.schema';

export const load: PageServerLoad = async ({ fetch, locals: { supabase, safeGetSession } }) => {
    // Fetch PHY versions and frequency plans (if you wish to pre-populate dropdowns).
    const phyRes = await fetch('https://cropwatch.au1.cloud.thethings.industries/api/v3/configuration/phy-versions', {
        headers: { 'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}` }
    });
    const phyVersions = await phyRes.json();

    const freqRes = await fetch('https://cropwatch.au1.cloud.thethings.industries/api/v3/configuration/frequency-plans', {
        headers: { 'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}` }
    });
    const frequencyPlansRequestResult = await freqRes.json();

    const device_types = (await supabase.from('cw_device_type').select('*').eq('isActive', true).neq('TTI_application_id', null)).data;
    if (!device_types) {
        throw new Error('Failed to fetch device types');
    }

    const form = await superValidate(zod(deviceSchema));

    return {
        form,
        phyVersions,
        device_types,
        frequencyPlans: frequencyPlansRequestResult.frequency_plans
    };
};

export const actions: Actions = {
    default: async ({ request, fetch }) => {
        // Validate the form submission.
        const form = await superValidate(request, zod(deviceSchema));

        if (!form.valid) {
            return { form };
        }

        // Destructure fields and ensure deviceId is lowercased.
        let {
            device_id,
            devEui,
            joinEui,
            appKey,
            frequency_plan_id,
            lorawan_version,
            lorawan_phy_version
        } = form.data;
        device_id = device_id.toLowerCase();
        devEui = devEui.toLowerCase();
        joinEui = joinEui.toLowerCase();
        appKey = appKey.toLowerCase();

        if (devEui.length !== 16) {
            devEui = 'DevEUI must be 16 hexadecimal characters';
            return { form };
        }
        if (joinEui.length !== 16) {
            joinEui = 'JoinEUI/AppEUI must be 16 hexadecimal characters';
            return { form };
        }
        if (appKey.length !== 32) {
            appKey = 'AppKey must be 32 hexadecimal characters';
            return { form };
        }


        // === STEP 1: Get default MAC settings (for frequency plan AS_920_923_LBT and PHY_V1_0_3_REV_A) ===
        // OLD URL: 'https://cropwatch.au1.cloud.thethings.industries/api/v3/ns/default_mac_settings/AS_920_923_LBT/PHY_V1_0_3_REV_A',
        const macRes = await fetch(
            `https://cropwatch.au1.cloud.thethings.industries/api/v3/ns/default_mac_settings/${frequency_plan_id}/${lorawan_phy_version}`,
            {
                headers: { 'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}` }
            }
        );
        const macSettings = await macRes.json();

        // === STEP 2: Claim info (optional) ===
        const claimRes = await fetch('https://cropwatch.au1.cloud.thethings.industries/api/v3/edcs/claim/info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`
            },
            body: JSON.stringify({ join_eui: joinEui })
        });
        const claimInfo = await claimRes.json();

        // === STEP 3: Create the device (initial record) ===
        // Use the Identity Server’s endpoint from your captured traffic.
        const createRes = await fetch(
            'https://cropwatch.eu1.cloud.thethings.industries/api/v3/applications/cropwatch-development/devices',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`
                },
                body: JSON.stringify({
                    end_device: {
                        ids: {
                            join_eui: joinEui,
                            dev_eui: devEui,
                            device_id: device_id,
                            application_ids: {
                                application_id: 'cropwatch-development'
                            }
                        },
                        network_server_address: 'cropwatch.au1.cloud.thethings.industries',
                        application_server_address: 'cropwatch.au1.cloud.thethings.industries',
                        join_server_address: 'cropwatch.au1.cloud.thethings.industries'
                    },
                    field_mask: {
                        paths: ['network_server_address', 'application_server_address', 'join_server_address']
                    }
                })
            }
        );

        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Device creation failed: ${createRes.status} ${createRes.statusText}. Details: ${errText}`);
        }

        // === STEP 4: Update device settings across NS, AS, and JS ===

        // Update Network Server (NS)
        const nsRes = await fetch(
            `https://cropwatch.au1.cloud.thethings.industries/api/v3/ns/applications/cropwatch-development/devices/${device_id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`
                },
                body: JSON.stringify({
                    end_device: {
                        frequency_plan_id: frequency_plan_id,
                        lorawan_version: lorawan_version,
                        lorawan_phy_version: lorawan_phy_version,
                        supports_join: true,
                        multicast: false,
                        supports_class_b: false,
                        supports_class_c: false,
                        mac_settings: {
                            rx2_data_rate_index: macSettings.rx2_data_rate_index,
                            rx2_frequency: macSettings.rx2_frequency
                        },
                        ids: {
                            join_eui: joinEui,
                            dev_eui: devEui,
                            device_id: device_id,
                            application_ids: {
                                application_id: 'cropwatch-development'
                            }
                        }
                    },
                    field_mask: {
                        paths: [
                            'frequency_plan_id',
                            'lorawan_version',
                            'lorawan_phy_version',
                            'supports_join',
                            'multicast',
                            'supports_class_b',
                            'supports_class_c',
                            'mac_settings.rx2_data_rate_index',
                            'mac_settings.rx2_frequency',
                            'ids.join_eui',
                            'ids.dev_eui',
                            'ids.device_id',
                            'ids.application_ids.application_id'
                        ]
                    }
                })
            }
        );
        if (!nsRes.ok) {
            const errText = await nsRes.text();
            throw new Error(`NS update failed: ${nsRes.status} ${nsRes.statusText}. Details: ${errText}`);
        }

        // Update Application Server (AS)
        const asRes = await fetch(
            `https://cropwatch.au1.cloud.thethings.industries/api/v3/as/applications/cropwatch-development/devices/${device_id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`
                },
                body: JSON.stringify({
                    end_device: {
                        ids: {
                            join_eui: joinEui,
                            dev_eui: devEui,
                            device_id: device_id,
                            application_ids: {
                                application_id: 'cropwatch-development'
                            }
                        }
                    },
                    field_mask: {
                        paths: ['ids.join_eui', 'ids.dev_eui', 'ids.device_id', 'ids.application_ids.application_id']
                    }
                })
            }
        );
        if (!asRes.ok) {
            const errText = await asRes.text();
            throw new Error(`AS update failed: ${asRes.status} ${asRes.statusText}. Details: ${errText}`);
        }

        // Update Join Server (JS) (e.g., setting root keys)
        const jsRes = await fetch(
            `https://cropwatch.au1.cloud.thethings.industries/api/v3/js/applications/cropwatch-development/devices/${device_id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`
                },
                body: JSON.stringify({
                    end_device: {
                        ids: {
                            join_eui: joinEui,
                            dev_eui: devEui,
                            device_id: device_id,
                            application_ids: {
                                application_id: 'cropwatch-development'
                            }
                        },
                        network_server_address: 'cropwatch.au1.cloud.thethings.industries',
                        application_server_address: 'cropwatch.au1.cloud.thethings.industries',
                        root_keys: {
                            app_key: {
                                key: appKey,
                            }
                        }
                    },
                    field_mask: {
                        paths: [
                            'network_server_address',
                            'application_server_address',
                            'ids.join_eui',
                            'ids.dev_eui',
                            'ids.device_id',
                            'ids.application_ids.application_id',
                            'root_keys.app_key.key'
                        ]
                    }
                })
            }
        );
        if (!jsRes.ok) {
            const errText = await jsRes.text();
            throw new Error(`JS update failed: ${jsRes.status} ${jsRes.statusText}. Details: ${errText}`);
        }

        // === STEP 5: Retrieve the final device record ===
        const finalRes = await fetch(
            `https://cropwatch.au1.cloud.thethings.industries/api/v3/applications/cropwatch-development/devices/${device_id}?field_mask=name,description,version_ids,last_seen_at,network_server_address,application_server_address,join_server_address,locations,claim_authentication_code,attributes`,
            {
                headers: { 'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}` }
            }
        );
        const finalDevice = await finalRes.json();

        return { form, device: finalDevice };
    }
};
