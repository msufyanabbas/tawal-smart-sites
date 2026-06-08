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

  private joinUnitField(units: Array<{ serialNumber?: string; tagNumber?: string }>, field: 'serialNumber' | 'tagNumber') {
    return units
      .map((unit) => unit[field]?.toString().trim())
      .filter(Boolean)
      .join('\n');
  }

  // Build an Excel workbook with one row per site (units summarized as counts;
  // detailed unit serial/tag data is exported in dedicated columns).
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
      { header: 'RMS Serials', key: 'rmsSerials', width: 30 },
      { header: 'RMS Tags', key: 'rmsTags', width: 30 },
      { header: '# Expanders', key: 'numberOfExpanders', width: 11 },
      { header: 'Expander Serials', key: 'expanderSerials', width: 30 },
      { header: 'Expander Tags', key: 'expanderTags', width: 30 },
      { header: '# SIMs', key: 'numberOfSims', width: 8 },
      { header: 'SIM Serials', key: 'simCardSerials', width: 30 },
      { header: 'SIM Tags', key: 'simCardTags', width: 30 },
      { header: 'Smart Lock', key: 'hasSmartLock', width: 11 },
      { header: '# Fence Locks', key: 'numberOfFenceLocks', width: 13 },
      { header: 'Fence Lock Serials', key: 'fenceLockSerials', width: 30 },
      { header: 'Fence Lock Tags', key: 'fenceLockTags', width: 30 },
      { header: '# ODUs', key: 'numberOfOdus', width: 9 },
      { header: 'ODU Serials', key: 'oduSerials', width: 30 },
      { header: 'ODU Tags', key: 'oduTags', width: 30 },
      { header: 'Smart Meter', key: 'hasSmartMeter', width: 12 },
      { header: '# Tenants', key: 'numberOfTenants', width: 10 },
      { header: '# Smart Meters', key: 'numberOfSmartMeters', width: 13 },
      { header: 'Smart Meter Serials', key: 'smartMeterSerials', width: 30 },
      { header: 'Smart Meter Tags', key: 'smartMeterTags', width: 30 },
      { header: '# CT Splits', key: 'numberOfCtSplits', width: 11 },
      { header: 'CT Split Serials', key: 'ctSplitSerials', width: 30 },
      { header: 'CT Split Tags', key: 'ctSplitTags', width: 30 },
      { header: '# Silbo GW', key: 'numberOfSilboGateways', width: 11 },
      { header: 'Silbo GW Serials', key: 'silboGatewaySerials', width: 30 },
      { header: 'Silbo GW Tags', key: 'silboGatewayTags', width: 30 },
      { header: 'Created', key: '_created', width: 10 },
      { header: 'Assigned', key: '_assigned', width: 10 },
      { header: 'Processing', key: '_processing', width: 11 },
      { header: 'Completed', key: '_completed', width: 11 },
      { header: 'Reviewed', key: '_reviewed', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => {
      if (typeof col.width === 'number') {
        col.alignment = { wrapText: true, vertical: 'top' };
      }
    });

    for (const s of sites) {
      sheet.addRow({
        ...s,
        hasSmartLock: s.hasSmartLock ? 'Yes' : 'No',
        hasSmartMeter: s.hasSmartMeter ? 'Yes' : 'No',
        rmsSerials: this.joinUnitField(s.rmsUnits || [], 'serialNumber'),
        rmsTags: this.joinUnitField(s.rmsUnits || [], 'tagNumber'),
        expanderSerials: this.joinUnitField(s.expanderUnits || [], 'serialNumber'),
        expanderTags: this.joinUnitField(s.expanderUnits || [], 'tagNumber'),
        simCardSerials: this.joinUnitField(s.simCards || [], 'serialNumber'),
        simCardTags: this.joinUnitField(s.simCards || [], 'tagNumber'),
        fenceLockSerials: this.joinUnitField(s.fenceLockUnits || [], 'serialNumber'),
        fenceLockTags: this.joinUnitField(s.fenceLockUnits || [], 'tagNumber'),
        oduSerials: this.joinUnitField(s.oduUnits || [], 'serialNumber'),
        oduTags: this.joinUnitField(s.oduUnits || [], 'tagNumber'),
        smartMeterSerials: this.joinUnitField(s.smartMeterUnits || [], 'serialNumber'),
        smartMeterTags: this.joinUnitField(s.smartMeterUnits || [], 'tagNumber'),
        ctSplitSerials: this.joinUnitField(s.ctSplitUnits || [], 'serialNumber'),
        ctSplitTags: this.joinUnitField(s.ctSplitUnits || [], 'tagNumber'),
        silboGatewaySerials: this.joinUnitField(s.silboGatewayUnits || [], 'serialNumber'),
        silboGatewayTags: this.joinUnitField(s.silboGatewayUnits || [], 'tagNumber'),
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
