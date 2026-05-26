import { IsOptional, IsString, MaxLength } from 'class-validator';

// Body for PATCH /sites/:id/review. Remarks are optional and capped so a
// single field can't be used to dump huge payloads onto the document.
export class ReviewSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
