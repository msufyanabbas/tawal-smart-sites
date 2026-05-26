import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SiteModule } from '../site/site.module';

@Module({
  imports: [SiteModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
