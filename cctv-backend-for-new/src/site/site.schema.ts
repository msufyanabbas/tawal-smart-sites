import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

// ────────────────────────────────────────────────────────────────────────────
// Enums
// ────────────────────────────────────────────────────────────────────────────

export enum RmsScope {
  RMS = 'RMS',
  SMART_LOCK = 'SMART_LOCK',
  SMART_METER = 'SMART_METER',
  RMS_SERVICE = 'RMS_SERVICE',
  SIM_SWAP = 'SIM_SWAP',
}

export const ALL_RMS_SCOPES: RmsScope[] = [
  RmsScope.RMS,
  RmsScope.SMART_LOCK,
  RmsScope.SMART_METER,
  RmsScope.RMS_SERVICE,
  RmsScope.SIM_SWAP,
];

// ────────────────────────────────────────────────────────────────────────────
// Reusable nested schema: per-unit serial + tag with imagery (base64 strings)
// ────────────────────────────────────────────────────────────────────────────

@Schema({ _id: false })
export class ImagedSerialTag {
  @Prop() serialNumber?: string;
  @Prop() serialImage?: string;
  @Prop() tagNumber?: string;
  @Prop() tagImage?: string;
}
export const ImagedSerialTagSchema = SchemaFactory.createForClass(ImagedSerialTag);

// ────────────────────────────────────────────────────────────────────────────
// Status sub-documents: 5 milestones with timestamps and (where relevant) actors
// ────────────────────────────────────────────────────────────────────────────

@Schema({ _id: false })
export class StatusCreated {
  @Prop({ default: true }) done: boolean;
  @Prop({ default: () => new Date() }) at: Date;
}
export const StatusCreatedSchema = SchemaFactory.createForClass(StatusCreated);

@Schema({ _id: false })
export class StatusAssigned {
  @Prop({ default: false }) done: boolean;
  @Prop({ type: Date }) at?: Date;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) assignedTo?: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) assignedBy?: Types.ObjectId;
}
export const StatusAssignedSchema = SchemaFactory.createForClass(StatusAssigned);

@Schema({ _id: false })
export class StatusProcessing {
  @Prop({ default: false }) done: boolean;
  @Prop({ type: Date }) at?: Date;
}
export const StatusProcessingSchema = SchemaFactory.createForClass(StatusProcessing);

@Schema({ _id: false })
export class StatusCompleted {
  @Prop({ default: false }) done: boolean;
  @Prop({ type: Date }) at?: Date;
}
export const StatusCompletedSchema = SchemaFactory.createForClass(StatusCompleted);

@Schema({ _id: false })
export class StatusReviewed {
  @Prop({ default: false }) done: boolean;
  @Prop({ type: Date }) at?: Date;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) reviewedBy?: Types.ObjectId;
  // Optional free-text notes captured when the manager/admin approved the
  // site. Persisted alongside the milestone so historic context survives.
  @Prop({ type: String, default: '' }) remarks?: string;
}
export const StatusReviewedSchema = SchemaFactory.createForClass(StatusReviewed);

@Schema({ _id: false })
export class SiteStatus {
  @Prop({ type: StatusCreatedSchema, default: () => ({ done: true, at: new Date() }) })
  created: StatusCreated;

  @Prop({ type: StatusAssignedSchema, default: () => ({ done: false }) })
  assigned: StatusAssigned;

  @Prop({ type: StatusProcessingSchema, default: () => ({ done: false }) })
  processing: StatusProcessing;

  @Prop({ type: StatusCompletedSchema, default: () => ({ done: false }) })
  completed: StatusCompleted;

  @Prop({ type: StatusReviewedSchema, default: () => ({ done: false }) })
  reviewed: StatusReviewed;
}
export const SiteStatusSchema = SchemaFactory.createForClass(SiteStatus);

// ────────────────────────────────────────────────────────────────────────────
// Site
// ────────────────────────────────────────────────────────────────────────────

export type SiteDocument = Site & Document;

@Schema({ timestamps: true })
export class Site {
  // ── Top-level identity (admin-supplied) ────────────────────────────────
  @Prop({ required: true, trim: true })
  siteName: string;

  @Prop({ required: true, unique: true, trim: true })
  tawalId: string;

  // Free-text region — admin/manager types whatever name fits.
  @Prop({ required: true, trim: true })
  region: string;

  @Prop({ required: true, trim: true })
  siteCity: string;

  @Prop({ required: true, trim: true })
  tcnNumber: string;

  @Prop({ required: true, enum: RmsScope })
  rmsScope: RmsScope;

  // ── Scope-specific counts (admin-supplied; see service for validation) ─
  @Prop({ type: Number, default: 0, min: 0 }) numberOfRms: number;
  @Prop({ type: Number, default: 0, min: 0 }) numberOfExpanders: number;
  @Prop({ type: Number, default: 0, min: 0 }) numberOfSims: number;

  @Prop({ type: Boolean, default: false }) hasSmartLock: boolean;
  @Prop({ type: Number, default: 0, min: 0 }) numberOfFenceLocks: number;
  @Prop({ type: Number, default: 0, min: 0 }) numberOfOdus: number;

  @Prop({ type: Boolean, default: false }) hasSmartMeter: boolean;
  @Prop({ type: Number, default: 0, min: 0 }) numberOfTenants: number;
  @Prop({ type: Number, default: 0, min: 0 }) numberOfSmartMeters: number; // computed
  @Prop({ type: Number, default: 0, min: 0 }) numberOfCtSplits: number;    // computed
  @Prop({ type: Number, default: 0, min: 0 }) numberOfSilboGateways: number; // computed

  // ── Status milestones ──────────────────────────────────────────────────
  @Prop({ type: SiteStatusSchema, default: () => ({}) })
  status: SiteStatus;

  // ── Technician unit arrays (filled after assignment) ───────────────────
  @Prop({ type: [ImagedSerialTagSchema], default: [] }) rmsUnits: ImagedSerialTag[];
  @Prop({ type: [ImagedSerialTagSchema], default: [] }) expanderUnits: ImagedSerialTag[];
  @Prop({ type: [ImagedSerialTagSchema], default: [] }) simCards: ImagedSerialTag[];
  @Prop({ type: [ImagedSerialTagSchema], default: [] }) fenceLockUnits: ImagedSerialTag[];
  @Prop({ type: [ImagedSerialTagSchema], default: [] }) oduUnits: ImagedSerialTag[];
  @Prop({ type: [ImagedSerialTagSchema], default: [] }) smartMeterUnits: ImagedSerialTag[];
  @Prop({ type: [ImagedSerialTagSchema], default: [] }) ctSplitUnits: ImagedSerialTag[];
  @Prop({ type: [ImagedSerialTagSchema], default: [] }) silboGatewayUnits: ImagedSerialTag[];

  // ── SIM_SWAP specific fields ───────────────────────────────────────────
  @Prop({ type: String, default: '' }) simSwapComments?: string;

  // ── Audit ──────────────────────────────────────────────────────────────
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const SiteSchema = SchemaFactory.createForClass(Site);
SiteSchema.index({ 'status.assigned.assignedTo': 1 });
SiteSchema.index({ region: 1, rmsScope: 1 });
