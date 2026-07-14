import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

// ── SIM Serial ────────────────────────────────────────────────────────────────

export type SimSerialDocument = SimSerial & Document;

@Schema({ timestamps: true })
export class SimSerial {
  @Prop({ required: true, unique: true, trim: true })
  serialNumber: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const SimSerialSchema = SchemaFactory.createForClass(SimSerial);
SimSerialSchema.index({ serialNumber: 1 });

// ── RMS Serial ────────────────────────────────────────────────────────────────

export type RmsSerialDocument = RmsSerial & Document;

@Schema({ timestamps: true })
export class RmsSerial {
  @Prop({ required: true, unique: true, trim: true })
  serialNumber: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const RmsSerialSchema = SchemaFactory.createForClass(RmsSerial);
RmsSerialSchema.index({ serialNumber: 1 });
