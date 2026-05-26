import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { dbRoleValues } from './role.util';

export { Role } from './role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, default: '' })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  // We accept any of dbRoleValues so legacy 'superadmin' docs still load;
  // see role.util.ts#normalizeRole for the canonical read path.
  @Prop({ enum: dbRoleValues, default: 'technician' })
  role: string;

  @Prop({ default: true })
  isApproved: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
