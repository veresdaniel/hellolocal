import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SlugModule } from "../slug/slug.module";
import { SiteController } from "./site.controller";
import { DomainResolveController } from "./domain-resolve.controller";
import { CaddyAskController } from "./caddy-ask.controller";
import { ResolveController } from "./resolve.controller";
import { SiteResolverService } from "./site-resolver.service";
import { ResolveService } from "./resolve.service";
import { SiteKeyResolverService } from "./site-key-resolver.service";

@Module({
  // Places and events stay out of this module. Importing them here registers
  // /api/:lang/places before /api/admin/places, so "admin" is read as a language.
  imports: [PrismaModule, SlugModule],
  controllers: [SiteController, ResolveController, DomainResolveController, CaddyAskController],
  providers: [SiteResolverService, ResolveService, SiteKeyResolverService],
  exports: [SiteResolverService, ResolveService, SiteKeyResolverService],
})
export class SiteModule {}
