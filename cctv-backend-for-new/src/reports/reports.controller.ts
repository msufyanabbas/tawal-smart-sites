import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
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
import { RfpReportQueryDto } from './dto/rfp-report-query.dto';
import { BulkRfpReportDto } from './dto/bulk-rfp-report.dto';
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
    @Query() query: RfpReportQueryDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, filename } = await this.rfpReportService.buildSiteRfp(id, {
      currentStatus: query.currentStatus,
      nextAction: query.nextAction,
    });
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Exposed so the browser client can read the server-chosen filename off
    // the response rather than reconstructing it.
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  }

  // Bulk variant: builds a deck per selected site and streams them back as a
  // single .zip. POST because the site ids travel in the body — a selection of
  // 25 would otherwise overflow practical URL length limits.
  @Post('sites/rfp/bulk')
  @HttpCode(200)
  @Header('Content-Type', 'application/zip')
  async generateBulkSiteRfp(
    @Body() dto: BulkRfpReportDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, filename, generated, failed } =
      await this.rfpReportService.buildBulkSiteRfp(dto.siteIds, {
        currentStatus: dto.currentStatus,
        nextAction: dto.nextAction,
      });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Partial failures cannot be reported in the body (it is the archive), so
    // the counts ride along in headers the client surfaces as a warning.
    res.setHeader('X-Reports-Generated', String(generated));
    res.setHeader('X-Reports-Failed', String(failed.length));
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Disposition, X-Reports-Generated, X-Reports-Failed',
    );
    res.send(buffer);
  }
}
