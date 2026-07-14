import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SerialService } from './serial.service';
import {
  BulkCreateSerialsDto,
  BulkDeleteSerialsDto,
  CreateSerialDto,
} from './dto/create-serial.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '../user/role.enum';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';

@Controller('serials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SerialController {
  constructor(private readonly serialService: SerialService) {}

  // ── SIM serials ───────────────────────────────────────────────────────────

  @Get('sim')
  listSim() {
    return this.serialService.listSim();
  }

  @Post('sim')
  @Roles(Role.ADMIN)
  createSim(
    @Body() dto: CreateSerialDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.serialService.createSim(dto, user);
  }

  @Post('sim/bulk')
  @Roles(Role.ADMIN)
  bulkCreateSim(
    @Body() dto: BulkCreateSerialsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.serialService.bulkCreateSim(dto, user);
  }

  @Delete('sim/bulk')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  bulkDeleteSim(@Body() dto: BulkDeleteSerialsDto) {
    return this.serialService.bulkDeleteSim(dto);
  }

  @Delete('sim/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSim(@Param('id') id: string) {
    await this.serialService.deleteSim(id);
  }

  // ── RMS serials ───────────────────────────────────────────────────────────

  @Get('rms')
  listRms() {
    return this.serialService.listRms();
  }

  @Post('rms')
  @Roles(Role.ADMIN)
  createRms(
    @Body() dto: CreateSerialDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.serialService.createRms(dto, user);
  }

  @Post('rms/bulk')
  @Roles(Role.ADMIN)
  bulkCreateRms(
    @Body() dto: BulkCreateSerialsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.serialService.bulkCreateRms(dto, user);
  }

  @Delete('rms/bulk')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  bulkDeleteRms(@Body() dto: BulkDeleteSerialsDto) {
    return this.serialService.bulkDeleteRms(dto);
  }

  @Delete('rms/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRms(@Param('id') id: string) {
    await this.serialService.deleteRms(id);
  }
}
