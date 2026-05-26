import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Public route marker
export const Public = () => SetMetadata('isPublic', true);