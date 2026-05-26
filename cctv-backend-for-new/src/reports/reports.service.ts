import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import * as ExcelJS from 'exceljs';
import { Site, SiteDocument } from '../site/site.schema';
import { SiteStatusFilter } from '../site/dto/list-sites-query.dto';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
  ) {}

  private buildFilter(q: ReportQueryDto): FilterQuery<SiteDocument> {
    const filter: FilterQuery<SiteDocument> = {};
    if (q.region) filter.region = q.region;
    if (q.rmsScope) filter.rmsScope = q.rmsScope;
    if (q.status) {
      switch (q.status) {
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
    if (q.from || q.to) {
      filter.createdAt = {} as any;
      if (q.from) (filter.createdAt as any).$gte = new Date(q.from);
      if (q.to) (filter.createdAt as any).$lte = new Date(q.to);
    }
    return filter;
  }

  async listSites(q: ReportQueryDto) {
    const filter = this.buildFilter(q);
    const docs = await this.siteModel.find(filter).sort({ createdAt: -1 });
    return docs.map((d) => {
      const o: any = d.toObject({ versionKey: false });
      o._id = String(o._id);
      return o;
    });
  }

  // Build an Excel workbook with one row per site (units summarized as counts;
  // detailed unit data would make the sheet unwieldy).
  async buildExcel(q: ReportQueryDto): Promise<Buffer> {
    const sites = await this.listSites(q);

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Sites');

    sheet.columns = [
      { header: 'Site Name', key: 'siteName', width: 24 },
      { header: 'Tawal ID', key: 'tawalId', width: 16 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'City', key: 'siteCity', width: 16 },
      { header: 'TCN', key: 'tcnNumber', width: 14 },
      { header: 'Scope', key: 'rmsScope', width: 14 },
      { header: '# RMS', key: 'numberOfRms', width: 8 },
      { header: '# Expanders', key: 'numberOfExpanders', width: 11 },
      { header: '# SIMs', key: 'numberOfSims', width: 8 },
      { header: 'Smart Lock', key: 'hasSmartLock', width: 11 },
      { header: '# Fence Locks', key: 'numberOfFenceLocks', width: 13 },
      { header: '# ODUs', key: 'numberOfOdus', width: 9 },
      { header: 'Smart Meter', key: 'hasSmartMeter', width: 12 },
      { header: '# Tenants', key: 'numberOfTenants', width: 10 },
      { header: '# Smart Meters', key: 'numberOfSmartMeters', width: 13 },
      { header: '# CT Splits', key: 'numberOfCtSplits', width: 11 },
      { header: '# Silbo GW', key: 'numberOfSilboGateways', width: 11 },
      { header: 'Created', key: '_created', width: 10 },
      { header: 'Assigned', key: '_assigned', width: 10 },
      { header: 'Processing', key: '_processing', width: 11 },
      { header: 'Completed', key: '_completed', width: 11 },
      { header: 'Reviewed', key: '_reviewed', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const s of sites) {
      sheet.addRow({
        ...s,
        hasSmartLock: s.hasSmartLock ? 'Yes' : 'No',
        hasSmartMeter: s.hasSmartMeter ? 'Yes' : 'No',
        _created: s.status?.created?.done ? '✓' : '',
        _assigned: s.status?.assigned?.done ? '✓' : '',
        _processing: s.status?.processing?.done ? '✓' : '',
        _completed: s.status?.completed?.done ? '✓' : '',
        _reviewed: s.status?.reviewed?.done ? '✓' : '',
        createdAt: s.createdAt
          ? new Date(s.createdAt).toISOString().slice(0, 19).replace('T', ' ')
          : '',
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
