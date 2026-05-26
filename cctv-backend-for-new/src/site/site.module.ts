import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteService } from './site.service';
import { SiteController } from './site.controller';
import { Site, SiteSchema } from './site.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Site.name, schema: SiteSchema }]),
    UserModule, // for technician existence/role checks during assign
  ],
  controllers: [SiteController],
  providers: [SiteService],
  exports: [SiteService, MongooseModule],
})
export class SiteModule {}
