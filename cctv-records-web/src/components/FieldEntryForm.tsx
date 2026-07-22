import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useSaveSiteDraftMutation,
  useSubmitSiteMutation,
} from "@/hooks/useSites";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { ImageUploadField } from "@/components/ImageUploadField";
import {
  type ImagedSerialTag,
  RmsScope,
  type SimSwapSiteType,
  type SiteUnitsPayload,
  type Site,
} from "@/types";
import { apiErrorMessage } from "@/utils/helpers";
import {
  useRmsSerialsQuery,
  useSimSerialsQuery,
  useSmartLockSerialsQuery,
} from "@/hooks/useSerials";
import Select from "react-select";

const emptyUnits = (count: number): ImagedSerialTag[] =>
  Array.from({ length: Math.max(count, 0) }, () => ({}));

type UnitGroupKey =
  | "rmsUnits"
  | "expanderUnits"
  | "simCards"
  | "fenceLockUnits"
  | "oduUnits"
  | "smartMeterUnits"
  | "ctSplitUnits"
  | "silboGatewayUnits";

interface UnitGroup {
  key: UnitGroupKey;
  label: string;
  count: number;
  needs: { serial: boolean; tag: boolean };
}
const relevantUnitGroups = (site: Site): UnitGroup[] => {
  const out: UnitGroup[] = [];
  if (site.rmsScope === RmsScope.RMS) {
    out.push({
      key: "rmsUnits",
      label: "RMS Units",
      count: site.numberOfRms,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "expanderUnits",
      label: "Expanders",
      count: site.numberOfExpanders,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
    if (site.hasSmartLock) {
      out.push({
        key: "fenceLockUnits",
        label: "Fence Locks",
        count: site.numberOfFenceLocks,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "oduUnits",
        label: "ODUs",
        count: site.numberOfOdus,
        needs: { serial: true, tag: false },
      });
    }
    if (site.hasSmartMeter) {
      out.push({
        key: "smartMeterUnits",
        label: "Smart Meters",
        count: site.numberOfSmartMeters,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "ctSplitUnits",
        label: "CT Splits",
        count: site.numberOfCtSplits,
        needs: { serial: true, tag: true },
      });
    }
  } else if (site.rmsScope === RmsScope.SMART_LOCK) {
    out.push({
      key: "fenceLockUnits",
      label: "Fence Locks",
      count: site.numberOfFenceLocks,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "oduUnits",
      label: "ODUs",
      count: site.numberOfOdus,
      needs: { serial: true, tag: false },
    });
  } else if (site.rmsScope === RmsScope.SMART_METER) {
    out.push({
      key: "smartMeterUnits",
      label: "Smart Meters",
      count: site.numberOfSmartMeters,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "ctSplitUnits",
      label: "CT Splits",
      count: site.numberOfCtSplits,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "silboGatewayUnits",
      label: "Silbo Gateways",
      count: site.numberOfSilboGateways,
      needs: { serial: true, tag: true },
    });
    // Smart-meter sites always ship with one SIM card for the Silbo gateway.
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
  } else if (site.rmsScope === RmsScope.SIM_SWAP) {
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
    if (site.hasSmartLock) {
      out.push({
        key: "fenceLockUnits",
        label: "Fence Locks",
        count: site.numberOfFenceLocks,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "oduUnits",
        label: "ODUs",
        count: site.numberOfOdus,
        needs: { serial: true, tag: false },
      });
    }
    if (site.hasSmartMeter) {
      out.push({
        key: "smartMeterUnits",
        label: "Smart Meters",
        count: site.numberOfSmartMeters,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "ctSplitUnits",
        label: "CT Splits",
        count: site.numberOfCtSplits,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "silboGatewayUnits",
        label: "Silbo Gateways",
        count: site.numberOfSilboGateways,
        needs: { serial: true, tag: true },
      });
    }
  }
  return out;
};
export const FieldEntryForm: React.FC<{ site: Site }> = ({ site }) => {
  const saveDraft = useSaveSiteDraftMutation();
  const submit = useSubmitSiteMutation();
  const readOnly = site.status?.completed?.done;
  const simQuery = useSimSerialsQuery();
  const availableSims = simQuery.data ?? [];
  const Smartlock = useSmartLockSerialsQuery();
  const availableSmartLock = Smartlock.data ?? [];
  const Rms = useRmsSerialsQuery();
  const availableRms = Rms.data ?? [];

  const groups = useMemo(() => {
    let all = relevantUnitGroups(site);
    // Exclude simCards for SIM_SWAP scope since they use the dedicated SIM swap pairs form instead
    if (site.rmsScope === RmsScope.SIM_SWAP) {
      all = all.filter((g) => g.key !== "simCards");
    }
    return all;
  }, [site]);

  const initial = useMemo<SiteUnitsPayload>(() => {
    const out: SiteUnitsPayload = {};
    for (const g of groups) {
      const existing = (site as any)[g.key] as ImagedSerialTag[] | undefined;
      const blanks = emptyUnits(g.count);
      const seeded = blanks.map((blank, i) => existing?.[i] ?? blank);
      (out as Record<UnitGroupKey, ImagedSerialTag[]>)[g.key] = seeded;
    }
    // carry over any existing SIM swap specific details
    (out as any).simSwapComments = (site as any).simSwapComments ?? "";
    (out as any).simSwapPairs = (site as any).simSwapPairs ?? [];
    (out as any).simSwapSiteType = (site as any).simSwapSiteType ?? "";
    (out as any).simSwapLatitude = (site as any).simSwapLatitude ?? null;
    (out as any).simSwapLongitude = (site as any).simSwapLongitude ?? null;
    return out;
  }, [site, groups]);

  const [values, setValues] = useState<SiteUnitsPayload>(initial);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  useEffect(() => {
    setValues(initial);
  }, [initial]);

  const updateUnit = (
    groupKey: UnitGroupKey,
    idx: number,
    patch: Partial<ImagedSerialTag>,
  ) => {
    setValues((prev) => {
      const arr = [
        ...((prev[groupKey] as ImagedSerialTag[] | undefined) ?? []),
      ];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [groupKey]: arr };
    });
  };

  const onSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({
        id: site._id,
        payload: values as SiteUnitsPayload,
      });
      toast.success("Draft saved");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save draft"));
    }
  };

  const onGetLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    setLocationBusy(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValues((prev) => ({
          ...(prev ?? {}),
          simSwapLatitude: position.coords.latitude,
          simSwapLongitude: position.coords.longitude,
        }));
        setLocationBusy(false);
      },
      (error) => {
        setLocationBusy(false);
        setLocationError(
          error.message || "Unable to fetch your current location.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const onSubmit = async () => {
    // Validate required SIM swap fields
    if (site.rmsScope === RmsScope.SIM_SWAP) {
      if (!(values as any).simSwapSiteType) {
        toast.error("Site type is required");
        return;
      }
    }
    if (
      !window.confirm(
        "Submit field data? You will not be able to edit afterward.",
      )
    )
      return;
    try {
      await submit.mutateAsync({
        id: site._id,
        payload: values as SiteUnitsPayload,
      });
      toast.success("Site submitted for review");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to submit"));
    }
  };

  if (groups.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-sm text-slate-500">
          No field unit data is required for this scope.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="card">
        <div className="card-body">
          <label className="label" htmlFor="sim-swap-comments">
            Comments (optional)
          </label>
          <textarea
            id="sim-swap-comments"
            className="input min-h-[88px] resize-y"
            placeholder="Add any notes, comments or SIM swap details..."
            value={(values as any).simSwapComments ?? ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...(prev ?? {}),
                simSwapComments: e.target.value,
              }))
            }
            maxLength={2000}
            disabled={readOnly}
          />
        </div>
      </div>
      {site.rmsScope === RmsScope.SIM_SWAP && (
        <div className="card">
          <div className="card-body space-y-4">
            <h3 className="card-title">SIM swap details</h3>

            {/* SIM Pairs - repeat for each SIM */}
            {Array.from({ length: site.numberOfSims }, (_, i) => {
              const pairs = (values as any).simSwapPairs ?? [];
              const pair = pairs[i] ?? {};

              const updatePair = (idx: number, patch: Partial<typeof pair>) => {
                setValues((prev) => {
                  const newPairs = [...((prev as any).simSwapPairs ?? [])];
                  newPairs[idx] = { ...newPairs[idx], ...patch };
                  return { ...(prev ?? {}), simSwapPairs: newPairs };
                });
              };

              return (
                <div key={i} className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    SIM #{i + 1}
                  </p>

                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex w-full flex-col">
                        <label className="label mb-1 block">
                          New SIM serial number
                        </label>
                        <Select
                          options={availableSims.map((s) => ({
                            value: s.serialNumber,
                            label: s.serialNumber,
                          }))}
                          value={
                            pair.newSerialNumber
                              ? {
                                  value: pair.newSerialNumber,
                                  label: pair.newSerialNumber,
                                }
                              : null
                          }
                          isDisabled={readOnly}
                          onChange={(selected) =>
                            updatePair(i, {
                              newSerialNumber: selected?.value ?? "",
                            })
                          }
                          isClearable
                          isSearchable
                          placeholder="Search SIM..."
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderRadius: "0.5rem",
                              borderColor: "#e2e8f0",
                              boxShadow: "none",
                              "&:hover": { borderColor: "#cbd5e1" },
                            }),
                            input: (base) => ({
                              ...base,
                              "input:focus": { boxShadow: "none" },
                            }),
                          }}
                        />
                      </div>
                      {!readOnly ? (
                        <ImageUploadField
                          label="New SIM image"
                          value={pair.newSerialImage}
                          onChange={(v) => updatePair(i, { newSerialImage: v })}
                        />
                      ) : pair.newSerialImage ? (
                        <div>
                          <p className="label">New SIM image</p>
                          <img
                            src={pair.newSerialImage}
                            alt="New SIM"
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="Old SIM serial number"
                        value={pair.oldSerialNumber ?? ""}
                        disabled={readOnly}
                        onChange={(e) =>
                          updatePair(i, { oldSerialNumber: e.target.value })
                        }
                      />
                      {!readOnly ? (
                        <ImageUploadField
                          label="Old SIM image"
                          value={pair.oldSerialImage}
                          onChange={(v) => updatePair(i, { oldSerialImage: v })}
                        />
                      ) : pair.oldSerialImage ? (
                        <div>
                          <p className="label">Old SIM image</p>
                          <img
                            src={pair.oldSerialImage}
                            alt="Old SIM"
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Site Type and Location - shown once */}
            <SelectField
              label="Site type *"
              placeholder="Select site type"
              value={(values as any).simSwapSiteType ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                setValues((prev) => ({
                  ...(prev ?? {}),
                  simSwapSiteType: e.target.value as SimSwapSiteType,
                }))
              }
              options={[
                { label: "Green field", value: "green_field" },
                { label: "Roof top", value: "roof_top" },
              ]}
            />
            <div className="space-y-2">
              {!readOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onGetLocation}
                  loading={locationBusy}
                >
                  Get current location
                </Button>
              )}
              {locationError && (
                <p className="text-sm text-red-600">{locationError}</p>
              )}
              {typeof (values as any).simSwapLatitude === "number" &&
                typeof (values as any).simSwapLongitude === "number" && (
                  <p className="text-sm text-slate-700 px-2 py-1 rounded-lg bg-slate-200">
                    Latitude: {(values as any).simSwapLatitude} | Longitude:{" "}
                    {(values as any).simSwapLongitude}
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
      {groups.map((g) => {
        const arr = (values[g.key] as ImagedSerialTag[] | undefined) ?? [];
        const singular = g.label.endsWith("s") ? g.label.slice(0, -1) : g.label;
        console.log(g);
        return (
          <div key={g.key} className="card">
            <div className="card-body space-y-3">
              <h3 className="card-title">
                {g.label} ({g.count})
              </h3>
              <div className="space-y-4">
                {arr.map((u, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      {singular} #{idx + 1}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {g.needs.serial && (
                        <>
                          {(() => {
                            // Pick the right serial list based on the group key
                            const serialOptions =
                              g.key === "rmsUnits"
                                ? (availableRms ?? []).map((s) => ({
                                    value: s.serialNumber,
                                    label: s.serialNumber,
                                  }))
                                : g.key === "simCards"
                                  ? availableSims.map((s) => ({
                                      value: s.serialNumber,
                                      label: s.serialNumber,
                                    }))
                                  : g.key === "fenceLockUnits" ||
                                      g.key === "oduUnits"
                                    ? (availableSmartLock ?? []).map((s) => ({
                                        value: s.serialNumber,
                                        label: s.serialNumber,
                                      }))
                                    : null;

                            return serialOptions ? (
                              <div className="flex w-full flex-col">
                                <label className="label mb-1 block">
                                  Serial number
                                </label>
                                <Select
                                  options={serialOptions}
                                  value={
                                    u.serialNumber
                                      ? {
                                          value: u.serialNumber,
                                          label: u.serialNumber,
                                        }
                                      : null
                                  }
                                  isDisabled={readOnly}
                                  onChange={(selected) =>
                                    updateUnit(g.key, idx, {
                                      serialNumber: selected?.value ?? "",
                                    })
                                  }
                                  isClearable
                                  isSearchable
                                  placeholder="Search serial..."
                                  styles={{
                                    control: (base) => ({
                                      ...base,
                                      borderRadius: "0.5rem",
                                      borderColor: "#e2e8f0",
                                      boxShadow: "none",
                                      "&:hover": { borderColor: "#cbd5e1" },
                                    }),
                                    input: (base) => ({
                                      ...base,
                                      "input:focus": { boxShadow: "none" },
                                    }),
                                  }}
                                />
                              </div>
                            ) : (
                              <TextField
                                label="Serial number"
                                value={u.serialNumber ?? ""}
                                disabled={readOnly}
                                onChange={(e) =>
                                  updateUnit(g.key, idx, {
                                    serialNumber: e.target.value,
                                  })
                                }
                              />
                            );
                          })()}
                          {!readOnly ? (
                            <ImageUploadField
                              label="Serial image"
                              value={u.serialImage}
                              onChange={(v) =>
                                updateUnit(g.key, idx, { serialImage: v })
                              }
                            />
                          ) : u.serialImage ? (
                            <div>
                              <p className="label">Serial image</p>
                              <img
                                src={u.serialImage}
                                alt=""
                                className="h-24 w-24 rounded-lg object-cover"
                              />
                            </div>
                          ) : null}
                        </>
                      )}
                      {g.needs.tag && (
                        <>
                          <TextField
                            label="Tag number"
                            value={u.tagNumber ?? ""}
                            disabled={readOnly}
                            onChange={(e) =>
                              updateUnit(g.key, idx, {
                                tagNumber: e.target.value,
                              })
                            }
                          />
                          {!readOnly ? (
                            <ImageUploadField
                              label="Tag image"
                              value={u.tagImage}
                              onChange={(v) =>
                                updateUnit(g.key, idx, { tagImage: v })
                              }
                            />
                          ) : u.tagImage ? (
                            <div>
                              <p className="label">Tag image</p>
                              <img
                                src={u.tagImage}
                                alt=""
                                className="h-24 w-24 rounded-lg object-cover"
                              />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {arr.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No units configured for this group.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveDraft}
            loading={saveDraft.isPending}
          >
            Save draft
          </Button>
          <Button type="button" onClick={onSubmit} loading={submit.isPending}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
};
