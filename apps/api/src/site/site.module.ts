import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantModule } from "../tenant/tenant.module";
import { SlugModule } from "../slug/slug.module";
import { PlacesModule } from "../places/places.module";
import { EventsModule } from "../events/events.module";
import { SiteController } from "./site.controller";
import { ResolveController } from "./resolve.controller";
import { SiteResolverService } from "./site-resolver.service";
import { ResolveService } from "./resolve.service";
import { SiteKeyResolverService } from "./site-key-resolver.service";

@Module({
  imports: [PrismaModule, TenantModule, SlugModule, PlacesModule, EventsModule],
  controllers: [SiteController, ResolveController],
  providers: [SiteResolverService, ResolveService, SiteKeyResolverService],
  exports: [SiteResolverService, ResolveService, SiteKeyResolverService],
})
export class SiteModule {}
