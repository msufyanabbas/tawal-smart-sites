import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { RfpReportService } from './rfp/rfp-report.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '../user/role.enum';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly rfpReportService: RfpReportService,
  ) {}

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

  // Per-site "Smart Tower Site RFP report" PowerPoint deck. Streams a .pptx
  // built from the site's captured equipment photos, serials and tag numbers.
  //
  // GET rather than POST: it takes no body and changes no state, and the
  // mobile client downloads it with expo-file-system's downloadAsync, which
  // only issues GET requests.
  @Get('sites/:id/rfp')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  )
  async generateSiteRfp(
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, filename } = await this.rfpReportService.buildSiteRfp(id);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Exposed so the browser client can read the server-chosen filename off
    // the response rather than reconstructing it.
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  }
}
