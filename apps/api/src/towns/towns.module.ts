import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { TownsPublicController } from "./towns-public.controller";
import { TownsPublicService } from "./towns-public.service";

@Module({
  imports: [PrismaModule, forwardRef(() => SiteModule)],
  controllers: [TownsPublicController],
  providers: [TownsPublicService],
  exports: [TownsPublicService],
})
export class TownsModule {}
