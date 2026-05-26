import { IsEnum, IsOptional } from 'class-validator';
import { Role } from '../role.enum';

export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
