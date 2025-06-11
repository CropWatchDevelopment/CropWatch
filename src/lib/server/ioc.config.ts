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

// Repositories
import { DeviceRepository } from '../repositories/DeviceRepository';
import { LocationRepository } from '../repositories/LocationRepository';
import { NotifierTypeRepository } from '../repositories/NotifierTypeRepository';
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

// Bind services
container.bind<LocationService>(LocationService).toSelf().inSingletonScope();
container.bind<ILocationService>(TYPES.LocationService).to(LocationService).inSingletonScope();

// Other services and repositories can be added back as needed

export { container };