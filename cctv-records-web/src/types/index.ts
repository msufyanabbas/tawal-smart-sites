// Mirrors the NestJS backend (src/site/site.schema.ts, src/user/role.enum.ts).

export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
}

export enum RmsScope {
  RMS = 'RMS',
  SMART_LOCK = 'SMART_LOCK',
  SMART_METER = 'SMART_METER',
  RMS_SERVICE = 'RMS_SERVICE',
}

export enum SiteStatusFilter {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
}

export interface ImagedSerialTag {
  serialNumber?: string;
  serialImage?: string;
  tagNumber?: string;
  tagImage?: string;
}

export interface StatusFlag {
  done: boolean;
  at?: string;
}

export interface AssignedStatus extends StatusFlag {
  assignedTo?: string;
  assignedBy?: string;
}

export interface ReviewedStatus extends StatusFlag {
  reviewedBy?: string;
  // Optional reviewer notes captured at approval time.
  remarks?: string;
}

export interface SiteStatus {
  created: StatusFlag;
  assigned: AssignedStatus;
  processing: StatusFlag;
  completed: StatusFlag;
  reviewed: ReviewedStatus;
}

export interface Site {
  _id: string;

  siteName: string;
  tawalId: string;
  region: string;
  siteCity: string;
  tcnNumber: string;
  rmsScope: RmsScope;

  numberOfRms: number;
  numberOfExpanders: number;
  numberOfSims: number;

  hasSmartLock: boolean;
  numberOfFenceLocks: number;
  numberOfOdus: number;

  hasSmartMeter: boolean;
  numberOfTenants: number;
  numberOfSmartMeters: number;
  numberOfCtSplits: number;
  numberOfSilboGateways: number;

  status: SiteStatus;

  rmsUnits: ImagedSerialTag[];
  expanderUnits: ImagedSerialTag[];
  simCards: ImagedSerialTag[];
  fenceLockUnits: ImagedSerialTag[];
  oduUnits: ImagedSerialTag[];
  smartMeterUnits: ImagedSerialTag[];
  ctSplitUnits: ImagedSerialTag[];
  silboGatewayUnits: ImagedSerialTag[];

  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Shape sent to POST/PATCH /sites — counts only, no unit arrays.
export interface SiteCreatePayload {
  siteName: string;
  tawalId: string;
  region: string;
  siteCity: string;
  tcnNumber: string;
  rmsScope: RmsScope;
  numberOfRms?: number;
  numberOfExpanders?: number;
  numberOfSims?: number;
  hasSmartLock?: boolean;
  numberOfFenceLocks?: number;
  numberOfOdus?: number;
  hasSmartMeter?: boolean;
  numberOfTenants?: number;
}

export type SiteUpdatePayload = Partial<SiteCreatePayload>;

// Shape sent to PATCH /sites/:id/draft and /sites/:id/submit.
export interface SiteUnitsPayload {
  rmsUnits?: ImagedSerialTag[];
  expanderUnits?: ImagedSerialTag[];
  simCards?: ImagedSerialTag[];
  fenceLockUnits?: ImagedSerialTag[];
  oduUnits?: ImagedSerialTag[];
  smartMeterUnits?: ImagedSerialTag[];
  ctSplitUnits?: ImagedSerialTag[];
  silboGatewayUnits?: ImagedSerialTag[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}

export interface DeleteResponse {
  deleted: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isApproved: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  isApproved?: boolean;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

export interface ReportFilters {
  region?: string;
  rmsScope?: RmsScope;
  status?: SiteStatusFilter;
  from?: string;
  to?: string;
}
