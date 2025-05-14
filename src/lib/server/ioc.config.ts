import 'reflect-metadata';
import { Container } from 'inversify';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import type { Database } from '../../database.types';
import { TYPES } from './ioc.types';

// Interfaces
import type { IDeviceService } from '../interfaces/IDeviceService';
import type { IAirDataService } from '../interfaces/IAirDataService';
import type { ISoilDataService } from '../interfaces/ISoilDataService';
import type { ILocationService } from '../interfaces/ILocationService';
import type { IRuleService } from '../interfaces/IRuleService';
import type { IAuthService } from '../interfaces/IAuthService';
import type { IDeviceDataService } from '../interfaces/IDeviceDataService';
import type { ISessionService } from '../interfaces/ISessionService';

// Services
import { DeviceService } from '../services/DeviceService';
import { AirDataService } from '../services/AirDataService';
import { SoilDataService } from '../services/SoilDataService';
import { LocationService } from '../services/LocationService';
import { RuleService } from '../services/RuleService';
import { AuthService } from '../services/AuthService';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import { DeviceDataService } from '../services/DeviceDataService';
import { SessionService } from '../services/SessionService';

// Repositories
import { BaseRepository } from '../repositories/BaseRepository';
import { DeviceRepository } from '../repositories/DeviceRepository';
import { AirDataRepository } from '../repositories/AirDataRepository';
import { SoilDataRepository } from '../repositories/SoilDataRepository';
import { LocationRepository } from '../repositories/LocationRepository';
import { RuleRepository } from '../repositories/RuleRepository';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

// Create and configure the IoC container
const container = new Container({ defaultScope: 'Singleton' });

// Create a Supabase client for backend operations
container.bind<SupabaseClient>(TYPES.SupabaseClient).toDynamicValue(() => {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
  }
  return createClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}).inSingletonScope();

// Bind error handling service
container.bind<ErrorHandlingService>(ErrorHandlingService).toSelf().inSingletonScope();
container.bind<ErrorHandlingService>(TYPES.ErrorHandlingService).to(ErrorHandlingService).inSingletonScope();

// Bind repositories
container.bind<LocationRepository>(LocationRepository).toSelf().inSingletonScope();
container.bind<LocationRepository>(TYPES.LocationRepository).to(LocationRepository).inSingletonScope();
container.bind<DeviceRepository>(DeviceRepository).toSelf().inSingletonScope();
container.bind<DeviceRepository>(TYPES.DeviceRepository).to(DeviceRepository).inSingletonScope();

// Bind services
container.bind<LocationService>(LocationService).toSelf().inSingletonScope();
container.bind<ILocationService>(TYPES.LocationService).to(LocationService).inSingletonScope();

// Other services and repositories can be added back as needed

export { container };