/**
 * Types for dependency injection container
 */
export const TYPES = {
  // Infrastructure
  SupabaseClient: Symbol.for('SupabaseClient'),
  ErrorHandlingService: Symbol.for('ErrorHandlingService'),
  SessionService: Symbol.for('SessionService'),
  
  // Repositories
  DeviceRepository: Symbol.for('DeviceRepository'),
  DeviceOwnersRepository: Symbol.for('DeviceOwnersRepository'),
  AirDataRepository: Symbol.for('AirDataRepository'),
  LocationRepository: Symbol.for('LocationRepository'),
  RuleRepository: Symbol.for('RuleRepository'),
  NotifierTypeRepository: Symbol.for('NotifierTypeRepository'),
  
  // Services
  DeviceService: Symbol.for('DeviceService'),
  AirDataService: Symbol.for('AirDataService'),
  SoilDataService: Symbol.for('SoilDataService'),
  LocationService: Symbol.for('LocationService'),
  RuleService: Symbol.for('RuleService'),
  AuthService: Symbol.for('AuthService'),
  DeviceDataService: Symbol.for('DeviceDataService')
};