import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { Role } from './role.enum';
import { normalizeRole } from './role.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isApproved: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  toPublic(user: any): PublicUser {
    return {
      id: String(user._id),
      name: user.name ?? '',
      email: user.email,
      role: normalizeRole(user.role),
      isApproved: !!user.isApproved,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : undefined,
    };
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user id');
    }
    return this.userModel.findById(new Types.ObjectId(id));
  }

  async countByRole(role: Role) {
    // Counts include both new ('admin') and legacy ('superadmin') values for admin.
    if (role === Role.ADMIN) {
      return this.userModel.countDocuments({
        role: { $in: ['admin', 'superadmin'] },
      });
    }
    return this.userModel.countDocuments({ role });
  }

  async list(role?: Role) {
    const filter: any = {};
    if (role === Role.ADMIN) filter.role = { $in: ['admin', 'superadmin'] };
    else if (role) filter.role = role;
    const docs = await this.userModel.find(filter).sort({ createdAt: -1 });
    return docs.map((d) => this.toPublic(d));
  }

  async getById(id: string): Promise<PublicUser> {
    const doc = await this.findById(id);
    if (!doc) throw new NotFoundException('User not found');
    return this.toPublic(doc);
  }

  async createRaw(input: {
    name: string;
    email: string;
    password: string; // already hashed
    role: Role;
    isApproved?: boolean;
  }) {
    const doc = new this.userModel({
      name: input.name,
      email: input.email.toLowerCase().trim(),
      password: input.password,
      role: input.role,
      isApproved: input.isApproved ?? true,
    });
    return doc.save();
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    const doc = await this.createRaw({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: dto.role,
      isApproved: dto.isApproved ?? true,
    });
    return this.toPublic(doc);
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const doc = await this.findById(id);
    if (!doc) throw new NotFoundException('User not found');

    if (dto.email && dto.email.toLowerCase().trim() !== doc.email) {
      const clash = await this.findByEmail(dto.email);
      if (clash && String(clash._id) !== id) {
        throw new ConflictException('Email already in use');
      }
      doc.email = dto.email.toLowerCase().trim();
    }
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.role !== undefined) doc.role = dto.role;
    if (dto.isApproved !== undefined) doc.isApproved = dto.isApproved;
    if (dto.password) doc.password = await bcrypt.hash(dto.password, 10);

    await doc.save();
    return this.toPublic(doc);
  }

  async remove(id: string) {
    const doc = await this.findById(id);
    if (!doc) throw new NotFoundException('User not found');
    await doc.deleteOne();
    return { deleted: true };
  }
}
