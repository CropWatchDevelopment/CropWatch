export interface DeviceRegistrationData {
    deviceId: string;
    name: string;
    description: string;
    frequencyPlanId: string;
    lorawanVersion: string;
    lorawanPhyVersion: string;
    applicationId: string;
    devEui: string;
    joinEui: string;
    networkKey: string;
    applicationKey: string;
}