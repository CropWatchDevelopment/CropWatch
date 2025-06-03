/**
 * Dashboard utility functions
 * 
 * These functions are used across the dashboard components to handle
 * common operations like checking device status, formatting data, etc.
 */

// Type imports are handled by the component files to avoid circular dependencies

/**
 * Checks if a device is currently active based on its last update time and upload interval
 * @param device - The device to check
 * @param deviceActiveStatus - Record of device active statuses by device ID
 * @returns boolean indicating if the device is active
 */
export function isDeviceActive(
  device: DeviceWithSensorData,
  deviceActiveStatus: Record<string, boolean>
): boolean {
  if (!device) return false;

  // Get the device ID
  const devEui = device.dev_eui as string;

  // Special handling for devices with negative upload intervals (always active)
  const uploadInterval =
    device.upload_interval || device.deviceType?.default_upload_interval || 10;
  if (uploadInterval <= 0) {
    return true;
  }

  // Special handling for soil sensors
  if (isSoilSensor(device)) {
    if (device.deviceType?.isActive !== undefined) {
      return Boolean(device.deviceType.isActive);
    }

    // If the soil sensor has moisture data, consider it active
    if (device.latestData && 'moisture' in device.latestData) {
      return true;
    }
  }

  return getDeviceActiveStatus(devEui, deviceActiveStatus);
}

/**
 * Helper function to get a device's active status from the status map
 * @param deviceId - The device ID to check
 * @param deviceActiveStatus - Record of device active statuses by device ID
 * @returns boolean indicating if the device is active
 */
export function getDeviceActiveStatus(
  deviceId: string,
  deviceActiveStatus: Record<string, boolean>
): boolean {
  return Boolean(deviceActiveStatus[deviceId]);
}

/**
 * Determines if a device is a soil sensor based on its type, name, or data
 * @param device - The device to check
 * @returns boolean indicating if the device is a soil sensor
 */
export function isSoilSensor(device: DeviceWithSensorData): boolean {
  // Check device name for soil-related terms
  const deviceName = device.name?.toLowerCase() || '';
  const deviceTypeName = device.deviceType?.name?.toLowerCase() || '';

  // Check device type (type 17 is soil sensor in your system)
  if (device.type === 17) {
    return true;
  }

  // Check if the device name or type contains soil-related terms
  return (
    deviceName.includes('soil') ||
    deviceName.includes('moisture') ||
    deviceTypeName.includes('soil') ||
    deviceTypeName.includes('moisture') ||
    // Check if the device has soil-specific data points
    (device.latestData && 'moisture' in device.latestData)
  );
}

/**
 * Gets active status indicators for a location
 * @param location - The location to check
 * @param deviceActiveStatus - Record of device active statuses by device ID
 * @returns Object with active devices array and status flags
 */
export function getLocationActiveStatus(
  location: LocationWithCount,
  deviceActiveStatus: Record<string, boolean>
) {
  if (!location || !location.cw_devices || location.cw_devices.length === 0) {
    return { activeDevices: [], allActive: false, allInactive: false };
  }

  const locationDevices = location.cw_devices;
  // Use isDeviceActive instead of getDeviceActiveStatus for consistency
  const activeDevices = locationDevices.filter((device) => 
    isDeviceActive(device, deviceActiveStatus)
  );
  
  const allActive =
    locationDevices.length > 0 && 
    locationDevices.every((device) => isDeviceActive(device, deviceActiveStatus));
  
  const allInactive =
    locationDevices.length > 0 && 
    locationDevices.every((device) => !isDeviceActive(device, deviceActiveStatus));

  return { activeDevices, allActive, allInactive };
}

/**
 * Gets the CSS class for the container based on the view type
 * @param viewType - The view type (grid, mozaic, list)
 * @returns CSS class string
 */
export function getContainerClass(viewType: string): string {
  switch (viewType) {
    case 'grid':
      return 'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
    case 'mozaic':
      return 'columns-[20rem] gap-4 space-y-4';
    case 'list':
      return 'flex flex-col gap-4';
    default:
      return 'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
  }
}

/**
 * Handles keyboard navigation for location selection
 * @param e - Keyboard event
 * @param location - The location
 * @param handleLocationClick - Function to handle location selection
 */
export function handleKeyDown(
  e: KeyboardEvent, 
  location: Location, 
  handleLocationClick: (location: Location) => void
): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleLocationClick(location);
  }
}
