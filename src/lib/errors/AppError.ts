/**
 * Base application error class that extends the native Error class
 * Provides additional context for application errors
 */
export class AppError extends Error {
  /**
   * HTTP status code for the error
   */
  public statusCode: number;

  /**
   * Error code for client-side error handling
   */
  public errorCode: string;

  /**
   * Whether the error is operational (expected) or programming (unexpected)
   */
  public isOperational: boolean;

  /**
   * Original error if this error wraps another
   */
  public originalError?: Error;

  /**
   * Constructor for AppError
   * @param message Human-readable error message
   * @param statusCode HTTP status code (defaults to 500)
   * @param errorCode Error code for client-side error handling
   * @param isOperational Whether the error is operational (expected) or programming (unexpected)
   * @param originalError Original error if this error wraps another
   */
  constructor(
    message: string, 
    statusCode = 500, 
    errorCode = 'INTERNAL_ERROR',
    isOperational = true,
    originalError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.originalError = originalError;
    
    // Captures the stack trace, excluding the constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}