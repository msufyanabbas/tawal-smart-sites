// Mirrors the NestJS backend (src/site/site.schema.ts, src/user/role.enum.ts).

export enum Role {
  ADMIN = "admin",
  MANAGER = "manager",
  TECHNICIAN = "technician",
}

export enum RmsScope {
  RMS = "RMS",
  SMART_LOCK = "SMART_LOCK",
  SMART_METER = "SMART_METER",
  RMS_SERVICE = "RMS_SERVICE",
  SIM_SWAP = "SIM_SWAP",
}

export enum SiteStatusFilter {
  CREATED = "created",
  ASSIGNED = "assigned",
  PROCESSING = "processing",
  COMPLETED = "completed",
  REVIEWED = "reviewed",
}

export interface ImagedSerialTag {
  serialNumber?: string;
  serialImage?: string;
  tagNumber?: string;
  tagImage?: string;
}

export interface SimSwapPair {
  newSerialNumber?: string;
  newSerialImage?: string;
  oldSerialNumber?: string;
  oldSerialImage?: string;
}

export type SimSwapSiteType = "green_field" | "roof_top";

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
  simSwapComments: string;
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

  // SIM swap fields
  simSwapPairs?: SimSwapPair[];
  simSwapSiteType?: SimSwapSiteType;
  simSwapLatitude?: number | null;
  simSwapLongitude?: number | null;

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

export interface SiteUnitsPayload {
  rmsUnits?: ImagedSerialTag[];
  expanderUnits?: ImagedSerialTag[];
  simCards?: ImagedSerialTag[];
  fenceLockUnits?: ImagedSerialTag[];
  oduUnits?: ImagedSerialTag[];
  smartMeterUnits?: ImagedSerialTag[];
  ctSplitUnits?: ImagedSerialTag[];
  silboGatewayUnits?: ImagedSerialTag[];

  // SIM swap fields
  simSwapPairs?: SimSwapPair[];
  simSwapSiteType?: SimSwapSiteType;
  simSwapLatitude?: number | null;
  simSwapLongitude?: number | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
