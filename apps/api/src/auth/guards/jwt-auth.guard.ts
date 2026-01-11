import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user (token expired, invalid, etc.), always return 401
    if (err || !user) {
      throw new UnauthorizedException("Session expired or invalid token");
    }
    return user;
  }
}

