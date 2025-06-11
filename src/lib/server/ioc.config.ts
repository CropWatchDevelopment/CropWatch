import 'reflect-metadata';
import { Container } from 'inversify';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';
import { TYPES } from './ioc.types';

// Interfaces
import type { ILocationService } from '../interfaces/ILocationService';

// Services
import { LocationService } from '../services/LocationService';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import { DeviceService } from '../services/DeviceService';
import { AuthService } from '../services/AuthService';
import { SessionService } from '../services/SessionService';
import { AirDataService } from '../services/AirDataService';
import { RuleService } from '../services/RuleService';
import { DeviceOwnersService } from '../services/DeviceOwnersService';
import { DeviceDataService } from '../services/DeviceDataService';

// Repositories
import { DeviceRepository } from '../repositories/DeviceRepository';
import { LocationRepository } from '../repositories/LocationRepository';
import { NotifierTypeRepository } from '../repositories/NotifierTypeRepository';
import { DeviceOwnersRepository } from '../repositories/DeviceOwnersRepository';
import { AirDataRepository } from '../repositories/AirDataRepository';
import { RuleRepository } from '../repositories/RuleRepository';
import { DeviceTypeRepository } from '../repositories/DeviceTypeRepository';
import { PermissionLevelRepository } from '../repositories/PermissionLevelRepository';
import { UserRepository } from '../repositories/UserRepository';
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
container.bind<NotifierTypeRepository>(NotifierTypeRepository).toSelf().inSingletonScope();
container.bind<NotifierTypeRepository>(TYPES.NotifierTypeRepository).to(NotifierTypeRepository).inSingletonScope();
container.bind<DeviceOwnersRepository>(DeviceOwnersRepository).toSelf().inSingletonScope();
container.bind<DeviceOwnersRepository>(TYPES.DeviceOwnersRepository).to(DeviceOwnersRepository).inSingletonScope();
container.bind<AirDataRepository>(AirDataRepository).toSelf().inSingletonScope();
container.bind<AirDataRepository>(TYPES.AirDataRepository).to(AirDataRepository).inSingletonScope();
container.bind<RuleRepository>(RuleRepository).toSelf().inSingletonScope();
container.bind<RuleRepository>(TYPES.RuleRepository).to(RuleRepository).inSingletonScope();
container.bind<DeviceTypeRepository>(DeviceTypeRepository).toSelf().inSingletonScope();
container.bind<DeviceTypeRepository>(TYPES.DeviceTypeRepository).to(DeviceTypeRepository).inSingletonScope();
container.bind<PermissionLevelRepository>(PermissionLevelRepository).toSelf().inSingletonScope();
container.bind<PermissionLevelRepository>(TYPES.PermissionLevelRepository).to(PermissionLevelRepository).inSingletonScope();
container.bind<UserRepository>(UserRepository).toSelf().inSingletonScope();
container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository).inSingletonScope();

// Bind services
container.bind<LocationService>(LocationService).toSelf().inSingletonScope();
container.bind<ILocationService>(TYPES.LocationService).to(LocationService).inSingletonScope();
container.bind<DeviceService>(DeviceService).toSelf().inSingletonScope();
container.bind<DeviceService>(TYPES.DeviceService).to(DeviceService).inSingletonScope();
container.bind<AuthService>(AuthService).toDynamicValue((ctx) => new AuthService(ctx.container.get(TYPES.SupabaseClient), ctx.container.get(TYPES.ErrorHandlingService))).inSingletonScope();
container.bind<SessionService>(SessionService).toDynamicValue((ctx) => new SessionService(ctx.container.get(TYPES.SupabaseClient))).inSingletonScope();
container.bind<AirDataService>(AirDataService).toSelf().inSingletonScope();
container.bind<RuleService>(RuleService).toSelf().inSingletonScope();
container.bind<DeviceOwnersService>(DeviceOwnersService).toSelf().inSingletonScope();
container.bind<DeviceDataService>(DeviceDataService).toDynamicValue((ctx) => new DeviceDataService(ctx.container.get(TYPES.SupabaseClient))).inSingletonScope();

// Other services and repositories can be added back as needed

export { container };
