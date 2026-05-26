import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../user/role.enum';

export interface CurrentUserPayload {
  userId: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as CurrentUserPayload;
  },
);
