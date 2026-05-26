import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RmsScope } from '../../site/site.schema';
import { SiteStatusFilter } from '../../site/dto/list-sites-query.dto';

export class ReportQueryDto {
  // Free-text region filter — matched exactly against the persisted value.
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsEnum(RmsScope) rmsScope?: RmsScope;
  @IsOptional() @IsEnum(SiteStatusFilter) status?: SiteStatusFilter;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
