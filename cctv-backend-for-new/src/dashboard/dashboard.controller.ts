import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Returns every aggregate the web dashboard needs: stat counts, sites by
  // region, sites by scope, recent activity, and role-specific drill-downs.
  @Get()
  getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getDashboard(user);
  }
}
