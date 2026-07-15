import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SimSerial,
  SimSerialDocument,
  RmsSerial,
  RmsSerialDocument,
  SmartLockSerial,
  SmartLockSerialDocument,
} from './serial.schema';
import {
  BulkCreateSerialsDto,
  BulkDeleteSerialsDto,
  CreateSerialDto,
} from './dto/create-serial.dto';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

export interface BulkSerialResult {
  created: number;
  skipped: number;
  failed: Array<{ serial: string; reason: string }>;
}

export interface BulkDeleteResult {
  deleted: number;
}

@Injectable()
export class SerialService {
  constructor(
    @InjectModel(SimSerial.name) private simModel: Model<SimSerialDocument>,
    @InjectModel(RmsSerial.name) private rmsModel: Model<RmsSerialDocument>,
    @InjectModel(SmartLockSerial.name) private smartLockModel: Model<SmartLockSerialDocument>,
  ) {}

  // ── SIM ──────────────────────────────────────────────────────────────────

  async listSim(): Promise<SimSerialDocument[]> {
    return this.simModel.find().sort({ createdAt: -1 }).lean().exec() as any;
  }

  async createSim(
    dto: CreateSerialDto,
    user: CurrentUserPayload,
  ): Promise<SimSerialDocument> {
    const existing = await this.simModel
      .findOne({ serialNumber: dto.serialNumber.trim() })
      .exec();
    if (existing) {
      throw new ConflictException(
        `SIM serial "${dto.serialNumber}" already exists`,
      );
    }
    return this.simModel.create({
      serialNumber: dto.serialNumber.trim(),
      createdBy: new Types.ObjectId(user.userId),
    });
  }

  async bulkCreateSim(
    dto: BulkCreateSerialsDto,
    user: CurrentUserPayload,
  ): Promise<BulkSerialResult> {
    const result: BulkSerialResult = { created: 0, skipped: 0, failed: [] };
    const createdById = new Types.ObjectId(user.userId);

    for (const raw of dto.serialNumbers) {
      const serialNumber = raw.trim();
      if (!serialNumber) continue;
      try {
        await this.simModel.create({ serialNumber, createdBy: createdById });
        result.created++;
      } catch (err: any) {
        if (err?.code === 11000) {
          result.skipped++;
        } else {
          result.failed.push({
            serial: serialNumber,
            reason: err?.message ?? 'Unknown error',
          });
        }
      }
    }
    return result;
  }

  async deleteSim(id: string): Promise<void> {
    const res = await this.simModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException(`SIM serial ${id} not found`);
  }

  async bulkDeleteSim(dto: BulkDeleteSerialsDto): Promise<BulkDeleteResult> {
    const objectIds = dto.ids.map((id) => new Types.ObjectId(id));
    const res = await this.simModel
      .deleteMany({ _id: { $in: objectIds } })
      .exec();
    return { deleted: res.deletedCount };
  }

  // ── RMS ──────────────────────────────────────────────────────────────────

  async listRms(): Promise<RmsSerialDocument[]> {
    return this.rmsModel.find().sort({ createdAt: -1 }).lean().exec() as any;
  }

  async createRms(
    dto: CreateSerialDto,
    user: CurrentUserPayload,
  ): Promise<RmsSerialDocument> {
    const existing = await this.rmsModel
      .findOne({ serialNumber: dto.serialNumber.trim() })
      .exec();
    if (existing) {
      throw new ConflictException(
        `RMS serial "${dto.serialNumber}" already exists`,
      );
    }
    return this.rmsModel.create({
      serialNumber: dto.serialNumber.trim(),
      createdBy: new Types.ObjectId(user.userId),
    });
  }

  async bulkCreateRms(
    dto: BulkCreateSerialsDto,
    user: CurrentUserPayload,
  ): Promise<BulkSerialResult> {
    const result: BulkSerialResult = { created: 0, skipped: 0, failed: [] };
    const createdById = new Types.ObjectId(user.userId);

    for (const raw of dto.serialNumbers) {
      const serialNumber = raw.trim();
      if (!serialNumber) continue;
      try {
        await this.rmsModel.create({ serialNumber, createdBy: createdById });
        result.created++;
      } catch (err: any) {
        if (err?.code === 11000) {
          result.skipped++;
        } else {
          result.failed.push({
            serial: serialNumber,
            reason: err?.message ?? 'Unknown error',
          });
        }
      }
    }
    return result;
  }

  async deleteRms(id: string): Promise<void> {
    const res = await this.rmsModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException(`RMS serial ${id} not found`);
  }

  async bulkDeleteRms(dto: BulkDeleteSerialsDto): Promise<BulkDeleteResult> {
    const objectIds = dto.ids.map((id) => new Types.ObjectId(id));
    const res = await this.rmsModel
      .deleteMany({ _id: { $in: objectIds } })
      .exec();
    return { deleted: res.deletedCount };
  }

  // ── Smart Lock ──────────────────────────────────────────────────────────

  async listSmartLock(): Promise<SmartLockSerialDocument[]> {
    return this.smartLockModel.find().sort({ createdAt: -1 }).lean().exec() as any;
  }

  async createSmartLock(
    dto: CreateSerialDto,
    user: CurrentUserPayload,
  ): Promise<SmartLockSerialDocument> {
    const existing = await this.smartLockModel
      .findOne({ serialNumber: dto.serialNumber.trim() })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Smart Lock serial "${dto.serialNumber}" already exists`,
      );
    }
    return this.smartLockModel.create({
      serialNumber: dto.serialNumber.trim(),
      createdBy: new Types.ObjectId(user.userId),
    });
  }

  async bulkCreateSmartLock(
    dto: BulkCreateSerialsDto,
    user: CurrentUserPayload,
  ): Promise<BulkSerialResult> {
    const result: BulkSerialResult = { created: 0, skipped: 0, failed: [] };
    const createdById = new Types.ObjectId(user.userId);

    for (const raw of dto.serialNumbers) {
      const serialNumber = raw.trim();
      if (!serialNumber) continue;
      try {
        await this.smartLockModel.create({ serialNumber, createdBy: createdById });
        result.created++;
      } catch (err: any) {
        if (err?.code === 11000) {
          result.skipped++;
        } else {
          result.failed.push({
            serial: serialNumber,
            reason: err?.message ?? 'Unknown error',
          });
        }
      }
    }
    return result;
  }

  async deleteSmartLock(id: string): Promise<void> {
    const res = await this.smartLockModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException(`Smart Lock serial ${id} not found`);
  }

  async bulkDeleteSmartLock(dto: BulkDeleteSerialsDto): Promise<BulkDeleteResult> {
    const objectIds = dto.ids.map((id) => new Types.ObjectId(id));
    const res = await this.smartLockModel
      .deleteMany({ _id: { $in: objectIds } })
      .exec();
    return { deleted: res.deletedCount };
  }
}
