import { SetMetadata } from "@nestjs/common";
import { PlaceRole as PlaceRoleEnum } from "@prisma/client";
import { PLACE_ROLE_KEY } from "../guards/place-role.guard";

/**
 * Decorator to specify required place role for an endpoint.
 * 
 * @example
 * @PlaceRole(PlaceRoleEnum.owner)
 * @UseGuards(JwtAuthGuard, PlaceRoleGuard)
 * @Get('places/:placeId/memberships')
 * getMemberships(@Param('placeId') placeId: string) { ... }
 */
export const PlaceRole = (...roles: PlaceRoleEnum[]) => {
  return SetMetadata(PLACE_ROLE_KEY, roles);
};
