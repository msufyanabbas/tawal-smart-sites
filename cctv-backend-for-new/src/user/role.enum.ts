// Public-facing Role enum used across API, JWT payload, guards, and DTOs.
// The DB historically stored 'superadmin' for admins; see role.util.ts for the
// normalization layer that keeps old documents readable while the public surface
// uses the cleaner 'admin' value.
export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
}

export const ALL_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN];
