import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Decorator to extract current user from request.
 * 
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

