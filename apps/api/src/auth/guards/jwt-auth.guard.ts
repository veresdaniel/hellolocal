import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ERROR_MESSAGES } from "../../common/constants/error-messages";
import { AuthGuard } from "@nestjs/passport";

/**
 * Passport JWT guard that always maps missing/invalid tokens to HTTP 401
 * (session expired), instead of a generic 403 from the default AuthGuard.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  /**
   * @returns Authenticated user payload
   * @throws UnauthorizedException when the token is missing, expired, or invalid
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user (token expired, invalid, etc.), always return 401
    if (err || !user) {
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED_SESSION_EXPIRED);
    }
    return user;
  }
}
