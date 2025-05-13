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

// Remove the singleton SupabaseClient binding for user/session operations
// Only bind a singleton Supabase client for backend/server-only operations (never for user/session)
container.bind<SupabaseClient>(TYPES.BackendSupabaseClient).toDynamicValue(() => {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
  }
  return createClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false, // Never persist session on server
        autoRefreshToken: false // No need to auto-refresh for backend ops
      }
    }
  );
}).inSingletonScope();

// Do NOT bind a user/session-aware Supabase client here. Use per-request client in hooks.server.ts for user/session context.

// Bind error handling service
container.bind<ErrorHandlingService>(ErrorHandlingService).toSelf().inSingletonScope();
container.bind<ErrorHandlingService>(TYPES.ErrorHandlingService).to(ErrorHandlingService).inSingletonScope();

// Removed SessionService binding - now instantiate manually with per-request Supabase client
// container.bind<SessionService>(SessionService).toSelf().inSingletonScope();
// container.bind<ISessionService>(TYPES.SessionService).to(SessionService).inSingletonScope();

// All repository bindings are removed - repositories are now instantiated directly with per-request Supabase clients
// container.bind<BaseRepository>(BaseRepository).toSelf().inSingletonScope();
// container.bind<DeviceRepository>(DeviceRepository).toSelf().inSingletonScope();
// container.bind<DeviceRepository>(TYPES.DeviceRepository).to(DeviceRepository).inSingletonScope();
// container.bind<AirDataRepository>(AirDataRepository).toSelf().inSingletonScope();
// container.bind<AirDataRepository>(TYPES.AirDataRepository).to(AirDataRepository).inSingletonScope();
// container.bind<SoilDataRepository>(SoilDataRepository).toSelf().inSingletonScope();
// container.bind<SoilDataRepository>(TYPES.SoilDataRepository).to(SoilDataRepository).inSingletonScope();
// container.bind<LocationRepository>(LocationRepository).toSelf().inSingletonScope();
// container.bind<LocationRepository>(TYPES.LocationRepository).to(LocationRepository).inSingletonScope();
// container.bind<RuleRepository>(RuleRepository).toSelf().inSingletonScope();
// container.bind<RuleRepository>(TYPES.RuleRepository).to(RuleRepository).inSingletonScope();

// Bind services to their interfaces
// Services that depend on repositories have been commented out since they need to be instantiated directly
// container.bind<IDeviceService>(TYPES.DeviceService).to(DeviceService).inSingletonScope();
// container.bind<IAirDataService>(TYPES.AirDataService).to(AirDataService).inSingletonScope();
// container.bind<ISoilDataService>(TYPES.SoilDataService).to(SoilDataService).inSingletonScope();
// container.bind<ILocationService>(TYPES.LocationService).to(LocationService).inSingletonScope();
// container.bind<IRuleService>(TYPES.RuleService).to(RuleService).inSingletonScope();
// Removed AuthService binding - now instantiate manually with per-request Supabase client
// container.bind<IAuthService>(TYPES.AuthService).to(AuthService).inSingletonScope();
// container.bind<IDeviceDataService>(TYPES.DeviceDataService).to(DeviceDataService).inSingletonScope();

export { container };