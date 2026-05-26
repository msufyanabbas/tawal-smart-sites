import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import { TextField } from '@/components/TextField';
import { SelectField } from '@/components/SelectField';
import { Button } from '@/components/Button';
import { FullPageSpinner } from '@/components/Spinner';
import { useSiteQuery, useUpdateSiteMutation } from '@/hooks/useSites';
import {
  deriveCounts,
  siteCreateSchema,
  type SiteCreateValues,
} from '@/utils/siteSchema';
import { RmsScope, type SiteUpdatePayload } from '@/types';
import { apiErrorMessage, rmsScopeLabel } from '@/utils/helpers';

const ToggleField: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
    />
    {label}
  </label>
);

const ReadOnlyStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-0.5 text-lg font-semibold text-slate-800">{value}</p>
  </div>
);

export const EditSitePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: site, isLoading, error } = useSiteQuery(id);
  const update = useUpdateSiteMutation();

  const form = useForm<SiteCreateValues>({
    resolver: zodResolver(siteCreateSchema),
  });

  const { register, control, handleSubmit, formState, reset } = form;

  // Seed the form once the site is loaded.
  useEffect(() => {
    if (!site) return;
    reset({
      siteName: site.siteName,
      tawalId: site.tawalId,
      region: site.region,
      siteCity: site.siteCity,
      tcnNumber: site.tcnNumber,
      rmsScope: site.rmsScope,
      numberOfRms: site.numberOfRms,
      numberOfExpanders: site.numberOfExpanders,
      numberOfSims: site.numberOfSims,
      hasSmartLock: site.hasSmartLock,
      numberOfFenceLocks: site.numberOfFenceLocks,
      numberOfOdus: site.numberOfOdus,
      hasSmartMeter: site.hasSmartMeter,
      numberOfTenants: site.numberOfTenants,
    });
  }, [site, reset]);

  const scope = useWatch({ control, name: 'rmsScope' });
  const hasSmartLock = useWatch({ control, name: 'hasSmartLock' });
  const hasSmartMeter = useWatch({ control, name: 'hasSmartMeter' });
  const tenants = useWatch({ control, name: 'numberOfTenants' });
  const derived = deriveCounts(scope, tenants);

  if (isLoading) return <FullPageSpinner />;
  if (error || !site) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="card-body text-sm text-red-700">
          {apiErrorMessage(error, 'Site not found')}
        </div>
      </div>
    );
  }

  const onSubmit = async (values: SiteCreateValues) => {
    const payload: SiteUpdatePayload = {
      siteName: values.siteName,
      tawalId: values.tawalId,
      region: values.region,
      siteCity: values.siteCity,
      tcnNumber: values.tcnNumber,
      rmsScope: values.rmsScope,
    };
    if (values.rmsScope === RmsScope.RMS) {
      payload.numberOfRms = values.numberOfRms ?? 0;
      payload.numberOfExpanders = values.numberOfExpanders ?? 0;
      payload.numberOfSims = values.numberOfSims ?? 0;
      payload.hasSmartLock = !!values.hasSmartLock;
      if (values.hasSmartLock) {
        payload.numberOfFenceLocks = values.numberOfFenceLocks ?? 0;
        payload.numberOfOdus = values.numberOfOdus ?? 0;
      }
      payload.hasSmartMeter = !!values.hasSmartMeter;
      if (values.hasSmartMeter) {
        payload.numberOfTenants = values.numberOfTenants ?? 0;
      }
    } else if (values.rmsScope === RmsScope.SMART_LOCK) {
      payload.numberOfFenceLocks = values.numberOfFenceLocks ?? 0;
      payload.numberOfOdus = values.numberOfOdus ?? 0;
    } else if (values.rmsScope === RmsScope.SMART_METER) {
      payload.numberOfTenants = values.numberOfTenants ?? 0;
    } else if (values.rmsScope === RmsScope.RMS_SERVICE) {
      payload.numberOfTenants = values.numberOfTenants ?? 0;
    }

    try {
      await update.mutateAsync({ id: site._id, payload });
      toast.success('Site updated');
      navigate(`/sites/${site._id}`, { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update site'));
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Edit site</h1>
        <p className="text-sm text-slate-500">
          Editing <span className="font-medium">{site.siteName}</span>. Counts that are
          derived from other values update automatically when you save.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="card">
          <div className="card-body space-y-4">
            <h2 className="card-title">Site information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Site name *"
                {...register('siteName')}
                error={formState.errors.siteName?.message}
              />
              <TextField
                label="Tawal ID *"
                inputMode="numeric"
                pattern="\d*"
                placeholder="Digits only"
                {...register('tawalId')}
                error={formState.errors.tawalId?.message}
              />
              <TextField
                label="Region *"
                placeholder="e.g. North, Central, Riyadh Cluster"
                {...register('region')}
                error={formState.errors.region?.message}
              />
              <TextField
                label="City *"
                placeholder="e.g. Riyadh"
                {...register('siteCity')}
                error={formState.errors.siteCity?.message}
              />
              <TextField
                label="TCN number *"
                {...register('tcnNumber')}
                error={formState.errors.tcnNumber?.message}
              />
              <SelectField
                label="RMS scope *"
                placeholder="Select scope"
                {...register('rmsScope')}
                error={formState.errors.rmsScope?.message}
                options={Object.values(RmsScope).map((s) => ({
                  value: s,
                  label: rmsScopeLabel(s),
                }))}
              />
            </div>
          </div>
        </div>

        {scope && (
          <div className="card">
            <div className="card-body space-y-4">
              <h2 className="card-title">{rmsScopeLabel(scope)} details</h2>

              {scope === RmsScope.RMS && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField
                      type="number"
                      min={0}
                      label="Number of RMS units"
                      {...register('numberOfRms', { valueAsNumber: true })}
                    />
                    <TextField
                      type="number"
                      min={0}
                      label="Number of expanders"
                      {...register('numberOfExpanders', { valueAsNumber: true })}
                    />
                    <TextField
                      type="number"
                      min={0}
                      label="Number of SIMs"
                      {...register('numberOfSims', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <Controller
                      control={control}
                      name="hasSmartLock"
                      render={({ field }) => (
                        <ToggleField
                          label="Includes smart lock"
                          value={!!field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    {hasSmartLock && (
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <TextField
                          type="number"
                          min={0}
                          label="Number of fence locks"
                          {...register('numberOfFenceLocks', { valueAsNumber: true })}
                        />
                        <TextField
                          type="number"
                          min={0}
                          label="Number of ODUs"
                          {...register('numberOfOdus', { valueAsNumber: true })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <Controller
                      control={control}
                      name="hasSmartMeter"
                      render={({ field }) => (
                        <ToggleField
                          label="Includes smart meter"
                          value={!!field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    {hasSmartMeter && (
                      <>
                        <div className="mt-3 grid gap-4 md:grid-cols-3">
                          <TextField
                            type="number"
                            min={0}
                            label="Number of tenants"
                            {...register('numberOfTenants', { valueAsNumber: true })}
                          />
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <ReadOnlyStat label="Smart meters (computed)" value={derived.smartMeters} />
                          <ReadOnlyStat label="CT splits (computed)" value={derived.ctSplits} />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {scope === RmsScope.SMART_LOCK && (
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    type="number"
                    min={0}
                    label="Number of fence locks"
                    {...register('numberOfFenceLocks', { valueAsNumber: true })}
                  />
                  <TextField
                    type="number"
                    min={0}
                    label="Number of ODUs"
                    {...register('numberOfOdus', { valueAsNumber: true })}
                  />
                </div>
              )}

              {scope === RmsScope.SMART_METER && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <TextField
                      type="number"
                      min={0}
                      label="Number of tenants"
                      {...register('numberOfTenants', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <ReadOnlyStat label="Smart meters (computed)" value={derived.smartMeters} />
                    <ReadOnlyStat label="CT splits (computed)" value={derived.ctSplits} />
                    <ReadOnlyStat label="Silbo gateways (fixed)" value={derived.silboGateways} />
                    <ReadOnlyStat label="SIM cards (fixed)" value={derived.sims} />
                  </div>
                </>
              )}

              {scope === RmsScope.RMS_SERVICE && (
                <div className="grid gap-4 md:grid-cols-3">
                  <TextField
                    type="number"
                    min={0}
                    label="Number of tenants"
                    {...register('numberOfTenants', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/sites/${site._id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
};
