import { AppError } from './AppError';

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', originalError?: Error) {
    super(message, 404, 'NOT_FOUND', true, originalError);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
  /**
   * Map of validation errors with field names as keys
   */
  public validationErrors: Record<string, string[]>;
  
  constructor(message = 'Validation error', validationErrors: Record<string, string[]> = {}, originalError?: Error) {
    super(message, 400, 'VALIDATION_ERROR', true, originalError);
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when a database operation fails
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database error occurred', originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', true, originalError);
  }
}

/**
 * Error thrown when a user is not authenticated
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', originalError?: Error) {
    super(message, 401, 'UNAUTHORIZED', true, originalError);
  }
}

/**
 * Error thrown when a user is forbidden from accessing a resource
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', originalError?: Error) {
    super(message, 403, 'FORBIDDEN', true, originalError);
  }
}

/**
 * Error thrown when a service is unavailable or times out
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', originalError?: Error) {
    super(message, 503, 'SERVICE_UNAVAILABLE', true, originalError);
  }
}

/**
 * Error thrown when there are conflicts like duplicate entries
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', originalError?: Error) {
    super(message, 409, 'CONFLICT', true, originalError);
  }
}