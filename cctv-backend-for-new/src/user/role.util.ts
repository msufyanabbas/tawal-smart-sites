import { Role } from './role.enum';

// Existing DB documents may have role='superadmin' (legacy). Normalize any
// raw DB value into the public Role enum used everywhere else.
export const normalizeRole = (raw: string | undefined | null): Role => {
  if (!raw) return Role.TECHNICIAN;
  const v = String(raw).toLowerCase();
  if (v === 'superadmin' || v === 'admin') return Role.ADMIN;
  if (v === 'manager') return Role.MANAGER;
  return Role.TECHNICIAN;
};

// All values we'll accept and write to the DB. We always write the new clean
// values; legacy 'superadmin' rows continue to read fine via normalizeRole.
export const dbRoleValues: string[] = ['admin', 'manager', 'technician', 'superadmin'];
