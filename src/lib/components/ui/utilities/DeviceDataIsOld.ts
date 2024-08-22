function isDeviceDataOld(deviceEui) {
    if (!devicesLatestData[deviceEui] || !devicesLatestData[deviceEui].created_at) {
        return true; // Consider it old if data is not available
    }
    return moment().diff(moment(devicesLatestData[deviceEui].created_at), 'minutes') > 120;
}