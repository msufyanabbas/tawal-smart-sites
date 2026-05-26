import { IsMongoId, IsNotEmpty } from 'class-validator';

export class AssignSiteDto {
  @IsNotEmpty()
  @IsMongoId()
  technicianId: string;
}
