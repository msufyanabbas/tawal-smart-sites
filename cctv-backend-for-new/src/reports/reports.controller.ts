import {
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '../user/role.enum';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Filterable JSON list (used by the report page preview table).
  @Get('sites')
  listSites(@Query() query: ReportQueryDto) {
    return this.reportsService.listSites(query);
  }

  // Streamable Excel download. Accepts the same filter query string.
  @Post('generate')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async generate(
    @Query() query: ReportQueryDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.reportsService.buildExcel(query);
    const ts = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tawal-sites-${ts}.xlsx"`,
    );
    res.send(buffer);
  }
}
