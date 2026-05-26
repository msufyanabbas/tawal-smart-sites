import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RmsScope } from '../site.schema';

export enum SiteStatusFilter {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
}

export class ListSitesQueryDto {
  // Free-text region filter — matched exactly against the persisted value.
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsEnum(RmsScope) rmsScope?: RmsScope;
  @IsOptional() @IsEnum(SiteStatusFilter) status?: SiteStatusFilter;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() from?: string; // ISO date
  @IsOptional() @IsString() to?: string;   // ISO date
}
