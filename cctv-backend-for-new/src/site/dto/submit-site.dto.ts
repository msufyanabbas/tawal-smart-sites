import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
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

export class SubmitSiteDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImagedSerialTagDto)
  rmsUnits?: ImagedSerialTagDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImagedSerialTagDto)
  expanderUnits?: ImagedSerialTagDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImagedSerialTagDto)
  simCards?: ImagedSerialTagDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImagedSerialTagDto)
  fenceLockUnits?: ImagedSerialTagDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImagedSerialTagDto)
  oduUnits?: ImagedSerialTagDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImagedSerialTagDto)
  smartMeterUnits?: ImagedSerialTagDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImagedSerialTagDto)
  ctSplitUnits?: ImagedSerialTagDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImagedSerialTagDto)
  silboGatewayUnits?: ImagedSerialTagDto[];

  @IsOptional() @IsString()
  simSwapComments?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SimSwapPairDto)
  simSwapPairs?: SimSwapPairDto[];

  @IsOptional() @IsString()
  simSwapSiteType?: string;

  @IsOptional() @IsNumber()
  simSwapLatitude?: number | null;

  @IsOptional() @IsNumber()
  simSwapLongitude?: number | null;
}

// A draft save is identical in shape to a final submit; we just don't flip the
// completed milestone. Re-export to keep controller/service naming clear.
export class SaveDraftDto extends SubmitSiteDto {}
