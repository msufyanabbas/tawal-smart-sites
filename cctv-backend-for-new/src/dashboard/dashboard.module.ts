import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Site, SiteSchema } from '../site/site.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Site.name, schema: SiteSchema }]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
