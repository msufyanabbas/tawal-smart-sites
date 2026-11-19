import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ImagedSerialTagDto {
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() serialImage?: string;
  @IsOptional() @IsString() tagNumber?: string;
  @IsOptional() @IsString() tagImage?: string;
}

export class SimSwapPairDto {
  @IsOptional() @IsString() newSerialNumber?: string;
  @IsOptional() @IsString() newSerialImage?: string;
  @IsOptional() @IsString() oldSerialNumber?: string;
  @IsOptional() @IsString() oldSerialImage?: string;
}

export class MeterLineDetailsDto {
  @IsOptional() @IsString() redLineVoltage?: string;
  @IsOptional() @IsString() redLineVoltageImage?: string;
  @IsOptional() @IsString() yellowLineVoltage?: string;
  @IsOptional() @IsString() yellowLineVoltageImage?: string;
  @IsOptional() @IsString() blueLineVoltage?: string;
  @IsOptional() @IsString() blueLineVoltageImage?: string;

  @IsOptional() @IsString() redLineCurrent?: string;
  @IsOptional() @IsString() redLineCurrentImage?: string;
  @IsOptional() @IsString() yellowLineCurrent?: string;
  @IsOptional() @IsString() yellowLineCurrentImage?: string;
  @IsOptional() @IsString() blueLineCurrent?: string;
  @IsOptional() @IsString() blueLineCurrentImage?: string;
}

export class SimSwapTenantDto {
  @IsOptional() @IsString() tenantName?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tenantCtCapacities?: string[];
  @IsOptional() @IsString() meterPhoto?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) ctPhasePhotos?: string[];
}

export class AssignedTenantOnSiteDetailsDto {
  @IsOptional() @IsString() tenantName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeterLineDetailsDto)
  smartMeterDetails?: MeterLineDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeterLineDetailsDto)
  multiMeterDetails?: MeterLineDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeterLineDetailsDto)
  itocDetails?: MeterLineDetailsDto;
}

export class MaterialCountsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  numberOfTenants?: number;

  @IsOptional()
  @IsNumber()
  numberOfRms?: number;

  @IsOptional()
  @IsNumber()
  numberOfExpanders?: number;

  @IsOptional()
  @IsNumber()
  numberOfSims?: number;

  @IsOptional()
  @IsNumber()
  numberOfFenceLocks?: number;

  @IsOptional()
  @IsNumber()
  numberOfShelterLocks?: number;

  @IsOptional()
  @IsNumber()
  numberOfOdus?: number;

  @IsOptional()
  @IsNumber()
  numberOfSmartMeters?: number;

  @IsOptional()
  @IsNumber()
  numberOfCtSplits?: number;

  @IsOptional()
  @IsNumber()
  numberOfSilboGateways?: number;
}

export class SubmitSiteDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  rmsUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  expanderUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  simCards?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  fenceLockUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  oduUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  smartMeterUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  ctSplitUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  silboGatewayUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  cctvCameraUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  hardDiskUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagedSerialTagDto)
  nvrUnits?: ImagedSerialTagDto[];

  @IsOptional()
  @IsString()
  simSwapComments?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimSwapPairDto)
  simSwapPairs?: SimSwapPairDto[];

  @IsOptional()
  @IsString()
  simSwapSiteType?: string;

  @IsOptional()
  @IsNumber()
  simSwapLatitude?: number | null;

  @IsOptional()
  @IsNumber()
  simSwapLongitude?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => SimSwapTenantDto)
  simSwapTenants?: SimSwapTenantDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => AssignedTenantOnSiteDetailsDto)
  assignedTenantsOnSIteDetails?: AssignedTenantOnSiteDetailsDto[];

  @IsOptional()
  @IsString()
  simSwapCtMainPhoto?: string;

  @IsOptional()
  @IsString()
  simSwapMeterPhoto?: string;

  @IsOptional()
  @IsString()
  cctvNvrPhoto?: string;

  @IsOptional()
  @IsString()
  cctvNvrMainBoxPhoto?: string;

  @IsOptional()
  @IsString()
  cctvCameraPhoto?: string;

  @IsOptional()
  @IsString()
  cctvHardDiskPhoto?: string;

  @IsOptional()
  @IsArray()
  cctvCameraPhotos?: string[];

  @IsOptional()
  @IsArray()
  cctvHardDiskPhotos?: string[];

  @IsOptional()
  @IsString()
  cctvFullSitePhoto?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherSitePhotos?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialCountsDto)
  materials?: MaterialCountsDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  numberOfTenants?: number;

  @IsOptional()
  @IsNumber()
  numberOfRms?: number;

  @IsOptional()
  @IsNumber()
  numberOfExpanders?: number;

  @IsOptional()
  @IsNumber()
  numberOfSims?: number;

  @IsOptional()
  @IsNumber()
  numberOfFenceLocks?: number;

  @IsOptional()
  @IsNumber()
  numberOfShelterLocks?: number;

  @IsOptional()
  @IsNumber()
  numberOfOdus?: number;

  @IsOptional()
  @IsNumber()
  numberOfSmartMeters?: number;

  @IsOptional()
  @IsNumber()
  numberOfCtSplits?: number;

  @IsOptional()
  @IsNumber()
  numberOfSilboGateways?: number;
}

// A draft save is identical in shape to a final submit; we just don't flip the
// completed milestone. Re-export to keep controller/service naming clear.
export class SaveDraftDto extends SubmitSiteDto {}
