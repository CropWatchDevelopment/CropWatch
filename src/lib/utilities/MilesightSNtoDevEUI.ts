function extractDeviceInfo(url: string) {
    const urlObj = new URL(url);
    const serialNumber = urlObj.searchParams.get('SN');

    if (!serialNumber) {
        throw new Error('Serial number (SN) not found in the URL');
    }

    // Convert SN to dev_eui
    let devEui = `24E124${serialNumber.slice(2, -3)}`;

    return {
        SerialNumber: serialNumber,
        DevEUI: devEui,
        AppKey: '5572404c696e6b4c6f52613230313823', // Hardcoded secret key
        AppEUI: '24E124C0002A0001',
    };
}