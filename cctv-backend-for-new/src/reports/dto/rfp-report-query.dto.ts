import { IsOptional, IsString, MaxLength } from 'class-validator';
import { RFP_NARRATIVE_MAX } from '../rfp/rfp-report.service';

/**
 * Optional narrative the report generator types into the "Generate RFP report"
 * dialog. Both fields land on the conclusion slide; leaving one blank falls
 * back to text derived from the site's workflow status.
 */
export class RfpReportQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(RFP_NARRATIVE_MAX)
  currentStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(RFP_NARRATIVE_MAX)
  nextAction?: string;
}
