import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { PageServerLoad } from './$types';
import type { IDeviceService } from '$lib/interfaces/IDeviceService';

// export const load: PageServerLoad = async () => {
//   // Get the device service from the IoC container
//   const deviceService = container.get<IDeviceService>(TYPES.DeviceService);

//   // Use the service to fetch devices
//   const devices = await deviceService.getAllDevices();

//   return {
//     devices
//   };
// };
