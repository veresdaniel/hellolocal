import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

/**
 * Global exception filter that catches all exceptions and returns a consistent error response format.
 * Logs errors for debugging while providing user-friendly error messages.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status: number;
    let message: string;
    let error: string;
    let details: any = null;

    if (exception instanceof HttpException) {
      // Handle NestJS HttpExceptions (BadRequestException, UnauthorizedException, etc.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        error = exception.constructor.name.replace("Exception", "");
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message || "An error occurred";
        error = responseObj.error || exception.constructor.name.replace("Exception", "");
        details = responseObj.details || null;
      } else {
        message = exception.message || "An error occurred";
        error = exception.constructor.name.replace("Exception", "");
      }
    } else if (exception instanceof Error) {
      // Handle generic JavaScript errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = process.env.NODE_ENV === "production" 
        ? "Internal server error" 
        : exception.message || "An unexpected error occurred";
      error = "Internal Server Error";
      
      // Log the full error in development
      if (process.env.NODE_ENV !== "production") {
        details = {
          name: exception.name,
          stack: exception.stack,
        };
      }
    } else {
      // Handle unknown errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "An unexpected error occurred";
      error = "Internal Server Error";
    }

    // Log the error
    const errorLog = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      ...(details && { details }),
    };

    if (status >= 500) {
      // Log server errors as errors
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      // Log client errors as warnings
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    }

    // Return consistent error response
    response.status(status).json({
      statusCode: status,
      message,
      error,
      ...(details && process.env.NODE_ENV !== "production" && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

