import { AppError } from './AppError';
import { DatabaseError, NotFoundError } from './SpecificErrors';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Service for handling errors in a centralized way
 */
export class ErrorHandlingService {
	/**
	 * Handle Supabase database errors
	 * Transforms Supabase errors into domain-specific errors
	 * @param error The Supabase error to handle
	 * @param customMessage Optional custom error message
	 */
	handleDatabaseError(error: PostgrestError | null, customMessage?: string): never {
		if (!error) {
			throw new DatabaseError('Unknown database error occurred');
		}

		// Handle specific PostgreSQL error codes
		switch (error.code) {
			case '23505': // unique_violation
				throw new DatabaseError(customMessage || 'Duplicate entry found', error);
			case '23503': // foreign_key_violation
				throw new DatabaseError(customMessage || 'Referenced record not found', error);
			case '42P01': // undefined_table
				throw new DatabaseError(customMessage || 'Table not found', error);
			case '42703': // undefined_column
				throw new DatabaseError(customMessage || 'Column not found', error);
			default:
				throw new DatabaseError(
					customMessage || `Database error: ${error.message || 'Unknown error'}`,
					error
				);
		}
	}

	/**
	 * Handle case when no record is found
	 * @param entityName Name of the entity that wasn't found (e.g., 'Device')
	 * @param identifier Identifier that was used to look up the entity
	 */
	handleNotFound(entityName: string, identifier: string | number): never {
		throw new NotFoundError(`${entityName} not found with identifier: ${identifier}`);
	}

	/**
	 * Log errors to the appropriate logging service
	 * Can be expanded to send errors to external monitoring services
	 * @param error The error to log
	 */
	logError(error: Error | AppError): void {
		const isAppError = error instanceof AppError;

		// Log different levels based on error type
		if (isAppError && error.statusCode >= 500) {
			console.error('[SERVER ERROR]', {
				message: error.message,
				errorCode: (error as AppError).errorCode,
				stack: error.stack,
				isOperational: (error as AppError).isOperational
			});
		} else if (isAppError && error.statusCode >= 400) {
			console.warn('[CLIENT ERROR]', {
				message: error.message,
				errorCode: (error as AppError).errorCode,
				isOperational: (error as AppError).isOperational
			});
		} else {
			console.error('[UNEXPECTED ERROR]', {
				message: error.message,
				stack: error.stack
			});
		}

		// Here you could add additional logging to external services
		// like Sentry, LogRocket, etc.
	}
}
