import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  RFP_BULK_MAX_SITES,
  RFP_NARRATIVE_MAX,
} from '../rfp/rfp-report.service';

/**
 * Body for a bulk RFP run: the sites selected in the sites list, plus the
 * optional narrative shared by every generated deck.
 *
 * The size cap is enforced here as well as in the service so an oversized
 * request is rejected before any deck is built.
 */
export class BulkRfpReportDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(RFP_BULK_MAX_SITES)
  @IsMongoId({ each: true })
  siteIds: string[];

  @IsOptional()
  @IsString()
  @MaxLength(RFP_NARRATIVE_MAX)
  currentStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(RFP_NARRATIVE_MAX)
  nextAction?: string;
}
