import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { RmsScope } from '../site.schema';

export class CreateSiteDto {
  @IsNotEmpty()
  @IsString()
  siteName: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, { message: 'tawalId must contain digits only' })
  tawalId: string;

  // Free-text region — admin/manager types whatever name fits.
  @IsNotEmpty()
  @IsString()
  region: string;

  @IsNotEmpty()
  @IsString()
  siteCity: string;

  @IsNotEmpty()
  @IsString()
  tcnNumber: string;

  @IsEnum(RmsScope)
  rmsScope: RmsScope;

  // ── Counts (optional at the DTO level; service validates per scope) ────
  @IsOptional() @IsInt() @Min(0) numberOfRms?: number;
  @IsOptional() @IsInt() @Min(0) numberOfExpanders?: number;
  @IsOptional() @IsInt() @Min(0) numberOfSims?: number;

  @IsOptional() @IsBoolean() hasSmartLock?: boolean;
  @IsOptional() @IsInt() @Min(0) numberOfFenceLocks?: number;
  @IsOptional() @IsInt() @Min(0) numberOfOdus?: number;

  @IsOptional() @IsBoolean() hasSmartMeter?: boolean;
  @IsOptional() @IsInt() @Min(0) numberOfTenants?: number;

  // ── SIM swap fields ───────────────────────────────────────────────────
  @IsOptional() @IsString() simSwapNewSerialNumber?: string;
  @IsOptional() @IsString() simSwapNewSerialImage?: string;
  @IsOptional() @IsString() simSwapOldSerialNumber?: string;
  @IsOptional() @IsString() simSwapOldSerialImage?: string;
  @IsOptional() @IsString() simSwapSiteType?: string;
  @IsOptional() @IsNumber() simSwapLatitude?: number | null;
  @IsOptional() @IsNumber() simSwapLongitude?: number | null;
}
