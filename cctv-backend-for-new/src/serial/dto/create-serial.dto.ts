import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

// ── Single create ─────────────────────────────────────────────────────────────

export class CreateSerialDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  serialNumber: string;
}

// ── Bulk create ───────────────────────────────────────────────────────────────

export class BulkCreateSerialsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  serialNumbers: string[];
}

// ── Bulk delete ───────────────────────────────────────────────────────────────

export class BulkDeleteSerialsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];
}
