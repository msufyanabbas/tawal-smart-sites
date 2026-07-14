import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Site, SiteDocument, RmsScope } from './site.schema';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SubmitSiteDto } from './dto/submit-site.dto';
import {
  ListSitesQueryDto,
  SiteStatusFilter,
} from './dto/list-sites-query.dto';
import { Role } from '../user/role.enum';
import { User, UserDocument } from '../user/user.schema';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class SiteService {
  constructor(
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // ──────────────────────────────────────────────────────────────────────
  // Scope-aware count derivation (smart meter math, scope cleanup)
  // ──────────────────────────────────────────────────────────────────────

  // One smart meter serves up to three tenants — round up so partial groups
  // still get a meter (e.g. 1 tenant still gets 1 meter, 4 tenants get 2).
  private static smartMetersFor(tenants: number): number {
    if (tenants <= 0) return 0;
    return Math.ceil(tenants / 3);
  }

  // Returns a payload with all counts normalized for the given scope.
  // Computed fields (numberOfSmartMeters / numberOfCtSplits /
  // numberOfSilboGateways) are always derived here so persisted data stays
  // consistent regardless of what the client sent.
  private deriveCounts(input: Partial<Site>): Partial<Site> {
    const out: Partial<Site> = { ...input };
    const scope = input.rmsScope as RmsScope | undefined;

    // Default everything to 0/false so flipping scopes resets stale fields.
    out.numberOfRms = 0;
    out.numberOfExpanders = 0;
    out.numberOfSims = 0;
    out.hasSmartLock = false;
    out.numberOfFenceLocks = 0;
    out.numberOfOdus = 0;
    out.hasSmartMeter = false;
    out.numberOfTenants = 0;
    out.numberOfSmartMeters = 0;
    out.numberOfCtSplits = 0;
    out.numberOfSilboGateways = 0;

    if (scope === RmsScope.RMS) {
      out.numberOfRms = input.numberOfRms ?? 0;
      out.numberOfExpanders = input.numberOfExpanders ?? 0;
      out.numberOfSims = input.numberOfSims ?? 0;
      out.hasSmartLock = !!input.hasSmartLock;
      if (out.hasSmartLock) {
        out.numberOfFenceLocks = input.numberOfFenceLocks ?? 0;
        out.numberOfOdus = input.numberOfOdus ?? 0;
      }
      out.hasSmartMeter = !!input.hasSmartMeter;
      if (out.hasSmartMeter) {
        const tenants = input.numberOfTenants ?? 0;
        out.numberOfTenants = tenants;
        out.numberOfSmartMeters = SiteService.smartMetersFor(tenants);
        out.numberOfCtSplits = tenants * 3;
        // RMS scope intentionally excludes silbo gateways.
      }
    } else if (scope === RmsScope.SMART_LOCK) {
      out.hasSmartLock = true;
      out.numberOfFenceLocks = input.numberOfFenceLocks ?? 0;
      out.numberOfOdus = input.numberOfOdus ?? 0;
    } else if (scope === RmsScope.SMART_METER) {
      out.hasSmartMeter = true;
      const tenants = input.numberOfTenants ?? 0;
      out.numberOfTenants = tenants;
      out.numberOfSmartMeters = SiteService.smartMetersFor(tenants);
      out.numberOfCtSplits = tenants * 3;
      // Silbo gateway count is a fixed appliance — always one per site.
      out.numberOfSilboGateways = 1;
      // One SIM card is always provisioned for the Silbo gateway uplink.
      out.numberOfSims = 1;
    } else if (scope === RmsScope.RMS_SERVICE) {
      out.numberOfTenants = input.numberOfTenants ?? 0;
    }
    else if (scope === RmsScope.SIM_SWAP) {
      out.numberOfSims = input.numberOfSims ?? 0;
      // add number of tenants if provided, otherwise default to 0
      // has smart meter  
     out.hasSmartMeter = !!input.hasSmartMeter;
      if (out.hasSmartMeter) {
        const tenants = input.numberOfTenants ?? 0;
        out.numberOfTenants = tenants;
        out.numberOfSmartMeters = SiteService.smartMetersFor(tenants);
        out.numberOfCtSplits = tenants * 3;
        // RMS scope intentionally excludes silbo gateways.
      }
    }

    return out;
  }

  // ──────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────

  async create(dto: CreateSiteDto, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can create sites');
    }
    const exists = await this.siteModel.findOne({ tawalId: dto.tawalId });
    if (exists) throw new BadRequestException('tawalId already exists');

    const counts = this.deriveCounts(dto);
    const doc = new this.siteModel({
      ...dto,
      ...counts,
      createdBy: new Types.ObjectId(actor.userId),
      status: { created: { done: true, at: new Date() } },
    });
    await doc.save();
    return this.serialize(doc);
  }

  // Best-effort batched create. Each row is attempted independently so a
  // single bad row doesn't poison the whole import — successes and failures
  // are returned together for the UI to summarize.
  async bulkCreate(
    dtos: CreateSiteDto[],
    actor: CurrentUserPayload,
  ): Promise<{ created: number; failed: Array<{ row: number; reason: string }> }> {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can import sites');
    }
    let created = 0;
    const failed: Array<{ row: number; reason: string }> = [];
    for (let i = 0; i < dtos.length; i++) {
      const dto = dtos[i];
      try {
        const exists = await this.siteModel.findOne({ tawalId: dto.tawalId });
        if (exists) throw new Error(`tawalId ${dto.tawalId} already exists`);
        const counts = this.deriveCounts(dto);
        const doc = new this.siteModel({
          ...dto,
          ...counts,
          createdBy: new Types.ObjectId(actor.userId),
          status: { created: { done: true, at: new Date() } },
        });
        await doc.save();
        created++;
      } catch (err: any) {
        failed.push({ row: i + 1, reason: err?.message ?? 'Unknown error' });
      }
    }
    return { created, failed };
  }

  async list(query: ListSitesQueryDto, actor: CurrentUserPayload) {
    const filter: FilterQuery<SiteDocument> = {};

    if (actor.role === Role.TECHNICIAN) {
      filter['status.assigned.assignedTo'] = new Types.ObjectId(actor.userId);
    }

    if (query.region) filter.region = query.region;
    if (query.rmsScope) filter.rmsScope = query.rmsScope;

    if (query.status) {
      // Filter by the latest milestone reached.
      switch (query.status) {
        case SiteStatusFilter.CREATED:
          filter['status.assigned.done'] = false;
          break;
        case SiteStatusFilter.ASSIGNED:
          filter['status.assigned.done'] = true;
          filter['status.processing.done'] = false;
          break;
        case SiteStatusFilter.PROCESSING:
          filter['status.processing.done'] = true;
          filter['status.completed.done'] = false;
          break;
        case SiteStatusFilter.COMPLETED:
          filter['status.completed.done'] = true;
          filter['status.reviewed.done'] = false;
          break;
        case SiteStatusFilter.REVIEWED:
          filter['status.reviewed.done'] = true;
          break;
      }
    }

    if (query.from || query.to) {
      filter.createdAt = {} as any;
      if (query.from) (filter.createdAt as any).$gte = new Date(query.from);
      if (query.to) (filter.createdAt as any).$lte = new Date(query.to);
    }

    if (query.search) {
      const rx = new RegExp(
        query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { siteName: rx },
        { tawalId: rx },
        { siteCity: rx },
        { tcnNumber: rx },
      ];
    }

    const docs = await this.siteModel.find(filter).sort({ createdAt: -1 });
    // Strip image data from bulk responses
    const sanitizeArray = (arr: any[]) =>
      arr.map((u) => {
        const copy = { ...u };
        delete copy.serialImage;
        delete copy.tagImage;
        return copy;
      });
    const imageKeys = [
      'rmsUnits',
      'expanderUnits',
      'simCards',
      'fenceLockUnits',
      'oduUnits',
      'smartMeterUnits',
      'ctSplitUnits',
      'silboGatewayUnits',
    ];
    const sanitized = docs.map((d) => {
      const s = this.serialize(d);
      imageKeys.forEach((k) => {
        if (Array.isArray(s[k])) s[k] = sanitizeArray(s[k]);
      });
      if (Array.isArray(s.simSwapPairs)) {
        s.simSwapPairs = s.simSwapPairs.map((p: any) => {
          const copy = { ...p };
          delete copy.newSerialImage;
          delete copy.oldSerialImage;
          return copy;
        });
      }
      return s;
    });
    return sanitized;
  }

  async findOne(id: string, actor: CurrentUserPayload) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid site id');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');

    if (actor.role === Role.TECHNICIAN) {
      const assignedTo = doc.status?.assigned?.assignedTo;
      if (!assignedTo || String(assignedTo) !== actor.userId) {
        throw new ForbiddenException('Not assigned to this site');
      }
    }
    return this.serialize(doc);
  }

  async update(id: string, dto: UpdateSiteDto, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can edit site info / counts');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');

    // If the scope is changing (or counts changing), re-derive consistent counts.
    const merged: any = { ...doc.toObject(), ...dto };
    const counts = this.deriveCounts(merged);

    Object.assign(doc, dto, counts);
    await doc.save();
    return this.serialize(doc);
  }

  async remove(id: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete sites');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');
    await doc.deleteOne();
    return { deleted: true };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Status transitions
  // ──────────────────────────────────────────────────────────────────────

  async assign(id: string, technicianId: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.MANAGER && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only managers/admins can assign');
    }
    if (!Types.ObjectId.isValid(technicianId)) {
      throw new BadRequestException('Invalid technicianId');
    }
    const technician = await this.userModel.findById(technicianId);
    if (!technician) throw new NotFoundException('Technician not found');
    if (technician.role !== 'technician') {
      throw new BadRequestException('Selected user is not a technician');
    }

    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');

    doc.status.assigned = {
      done: true,
      at: new Date(),
      assignedTo: new Types.ObjectId(technicianId),
      assignedBy: new Types.ObjectId(actor.userId),
    } as any;
    // Re-assigning a previously-completed site resets later milestones so the
    // newly-assigned technician starts from "processing".
    doc.status.processing = { done: false } as any;
    doc.status.completed = { done: false } as any;
    doc.status.reviewed = { done: false } as any;
    await doc.save();
    return this.serialize(doc);
  }

  async accept(id: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Only technicians can accept sites');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');
    const assignedTo = doc.status?.assigned?.assignedTo;
    if (!assignedTo || String(assignedTo) !== actor.userId) {
      throw new ForbiddenException('Site is not assigned to you');
    }
    doc.status.processing = { done: true, at: new Date() } as any;
    await doc.save();
    return this.serialize(doc);
  }

  // Save partial unit data without flipping the completed milestone.
  async saveDraft(id: string, dto: SubmitSiteDto, actor: CurrentUserPayload) {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Only technicians can save drafts');
    }
    const doc = await this.assertTechnicianCanWrite(id, actor);
    this.applyUnitArrays(doc, dto);
    await doc.save();
    return this.serialize(doc);
  }

  async submit(id: string, dto: SubmitSiteDto, actor: CurrentUserPayload) {
    if (actor.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Only technicians can submit sites');
    }
    const doc = await this.assertTechnicianCanWrite(id, actor);
    this.applyUnitArrays(doc, dto);
    doc.status.completed = { done: true, at: new Date() } as any;
    await doc.save();
    return this.serialize(doc);
  }

  async review(id: string, actor: CurrentUserPayload, remarks?: string) {
    if (actor.role !== Role.MANAGER && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only managers/admins can review');
    }
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');
    if (!doc.status.completed.done) {
      throw new BadRequestException('Site is not completed yet');
    }
    doc.status.reviewed = {
      done: true,
      at: new Date(),
      reviewedBy: new Types.ObjectId(actor.userId),
      remarks: (remarks ?? '').trim(),
    } as any;
    await doc.save();
    return this.serialize(doc);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────

  private async assertTechnicianCanWrite(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<SiteDocument> {
    const doc = await this.siteModel.findById(id);
    if (!doc) throw new NotFoundException('Site not found');
    const assignedTo = doc.status?.assigned?.assignedTo;
    if (!assignedTo || String(assignedTo) !== actor.userId) {
      throw new ForbiddenException('Site is not assigned to you');
    }
    if (!doc.status.processing.done) {
      throw new BadRequestException(
        'Accept the site before submitting field data',
      );
    }
    return doc;
  }

  private applyUnitArrays(doc: SiteDocument, dto: SubmitSiteDto) {
    const keys: Array<keyof SubmitSiteDto> = [
      'rmsUnits',
      'expanderUnits',
      'simCards',
      'fenceLockUnits',
      'oduUnits',
      'smartMeterUnits',
      'ctSplitUnits',
      'silboGatewayUnits',
      'simSwapComments',
      'simSwapPairs',
      'simSwapSiteType',
      'simSwapLatitude',
      'simSwapLongitude',
    ];
    for (const k of keys) {
      if (dto[k] !== undefined) (doc as any)[k] = dto[k];
    }
  }

  // Normalize ObjectIds and timestamps so the client gets stable shapes.
  serialize(doc: SiteDocument) {
    const obj: any = doc.toObject({ versionKey: false });
    obj._id = String(obj._id);
    if (obj.createdBy) obj.createdBy = String(obj.createdBy);
    if (obj.status?.assigned?.assignedTo) {
      obj.status.assigned.assignedTo = String(obj.status.assigned.assignedTo);
    }
    if (obj.status?.assigned?.assignedBy) {
      obj.status.assigned.assignedBy = String(obj.status.assigned.assignedBy);
    }
    if (obj.status?.reviewed?.reviewedBy) {
      obj.status.reviewed.reviewedBy = String(obj.status.reviewed.reviewedBy);
    }
    return obj;
  }
}
