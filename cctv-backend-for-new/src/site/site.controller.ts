import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SiteService } from './site.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { BulkCreateSitesDto } from './dto/bulk-create-sites.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { AssignSiteDto } from './dto/assign-site.dto';
import { SaveDraftDto, SubmitSiteDto } from './dto/submit-site.dto';
import { ReviewSiteDto } from './dto/review-site.dto';
import { ListSitesQueryDto } from './dto/list-sites-query.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '../user/role.enum';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';

@Controller('sites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  // List visible sites (admin/manager: all; technician: only assigned).
  @Get()
  list(
    @Query() query: ListSitesQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.list(query, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateSiteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.create(dto, user);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  bulkCreate(
    @Body() dto: BulkCreateSitesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.bulkCreate(dto.sites, user);
  }

  // Edit site info / counts. Admin only — managers can assign/review but not
  // change identity or counts; technicians use the dedicated status-transition
  // endpoints below.
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.remove(id, user);
  }

  // ── Status transitions ─────────────────────────────────────────────────

  @Patch(':id/assign')
  @Roles(Role.MANAGER, Role.ADMIN)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignSiteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.assign(id, dto.technicianId, user);
  }

  @Patch(':id/accept')
  @Roles(Role.TECHNICIAN)
  accept(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.accept(id, user);
  }

  @Patch(':id/draft')
  @Roles(Role.TECHNICIAN)
  saveDraft(
    @Param('id') id: string,
    @Body() dto: SaveDraftDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.saveDraft(id, dto, user);
  }

  @Patch(':id/submit')
  @Roles(Role.TECHNICIAN)
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitSiteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.submit(id, dto, user);
  }

  @Patch(':id/review')
  @Roles(Role.MANAGER, Role.ADMIN)
  review(
    @Param('id') id: string,
    @Body() dto: ReviewSiteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.siteService.review(id, user, dto.remarks);
  }
}
