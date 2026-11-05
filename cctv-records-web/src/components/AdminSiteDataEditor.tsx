import { useState } from "react";
import toast from "react-hot-toast";
import CreatableSelect from "react-select/creatable";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { SelectField } from "@/components/SelectField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { MaterialDetails } from "@/components/MaterialDetails";
import {
  type ImagedSerialTag,
  type Site,
  type SiteUnitsPayload,
  type SimSwapPair,
  type SimSwapTenant,
  type SimSwapSiteType,
  RmsScope,
} from "@/types";
import { apiErrorMessage } from "@/utils/helpers";
import { useUpdateSiteDataMutation } from "@/hooks/useSites";
import {
  useRmsSerialsQuery,
  useSimSerialsQuery,
  useSmartLockSerialsQuery,
} from "@/hooks/useSerials";

interface AdminSiteDataEditorProps {
  site: Site;
  onCancel: () => void;
  onSuccess?: () => void;
}

type UnitGroupKey =
  | "rmsUnits"
  | "expanderUnits"
  | "simCards"
  | "fenceLockUnits"
  | "oduUnits"
  | "smartMeterUnits"
  | "ctSplitUnits"
  | "silboGatewayUnits"
  | "cctvCameraUnits"
  | "hardDiskUnits"
  | "nvrUnits";

interface UnitGroupConfig {
  key: UnitGroupKey;
  label: string;
  singular: string;
  needs: { serial: boolean; tag: boolean };
}

const ALL_UNIT_GROUPS: UnitGroupConfig[] = [
  {
    key: "rmsUnits",
    label: "RMS Units",
    singular: "RMS Unit",
    needs: { serial: true, tag: true },
  },
  {
    key: "expanderUnits",
    label: "Expanders",
    singular: "Expander",
    needs: { serial: true, tag: true },
  },
  {
    key: "simCards",
    label: "SIM Cards",
    singular: "SIM Card",
    needs: { serial: true, tag: false },
  },
  {
    key: "fenceLockUnits",
    label: "Fence Locks",
    singular: "Fence Lock",
    needs: { serial: true, tag: true },
  },
  {
    key: "oduUnits",
    label: "ODUs",
    singular: "ODU",
    needs: { serial: true, tag: false },
  },
  {
    key: "smartMeterUnits",
    label: "Smart Meters",
    singular: "Smart Meter",
    needs: { serial: true, tag: true },
  },
  {
    key: "ctSplitUnits",
    label: "CT Splits",
    singular: "CT Split",
    needs: { serial: true, tag: true },
  },
  {
    key: "silboGatewayUnits",
    label: "Silbo Gateways",
    singular: "Silbo Gateway",
    needs: { serial: true, tag: true },
  },
  {
    key: "cctvCameraUnits",
    label: "CCTV Cameras",
    singular: "CCTV Camera",
    needs: { serial: true, tag: true },
  },
  {
    key: "hardDiskUnits",
    label: "Hard Disks",
    singular: "Hard Disk",
    needs: { serial: true, tag: true },
  },
  {
    key: "nvrUnits",
    label: "NVRs",
    singular: "NVR",
    needs: { serial: true, tag: true },
  },
];

const getScopeDefaultGroups = (site: Site): Set<UnitGroupKey> => {
  const set = new Set<UnitGroupKey>();
  if (site.rmsScope === RmsScope.RMS) {
    set.add("rmsUnits");
    set.add("expanderUnits");
    set.add("simCards");
    if (site.hasSmartLock) {
      set.add("fenceLockUnits");
      set.add("oduUnits");
    }
    if (site.hasSmartMeter) {
      set.add("smartMeterUnits");
      set.add("ctSplitUnits");
    }
  } else if (site.rmsScope === RmsScope.SMART_LOCK) {
    set.add("fenceLockUnits");
    set.add("oduUnits");
  } else if (site.rmsScope === RmsScope.SMART_METER) {
    set.add("smartMeterUnits");
    set.add("ctSplitUnits");
    set.add("silboGatewayUnits");
    set.add("simCards");
  } else if (site.rmsScope === RmsScope.SIM_SWAP) {
    if (site.hasSmartLock) {
      set.add("fenceLockUnits");
      set.add("oduUnits");
    }
    if (site.hasSmartMeter) {
      set.add("smartMeterUnits");
      set.add("ctSplitUnits");
      set.add("silboGatewayUnits");
    }
  } else if (site.rmsScope === RmsScope.CCTV) {
    set.add("cctvCameraUnits");
    set.add("hardDiskUnits");
    set.add("nvrUnits");
  } else if (site.rmsScope === RmsScope.LEGACY_POO_METER) {
    set.add("smartMeterUnits");
    set.add("ctSplitUnits");
  } else if (site.rmsScope === RmsScope.COLLOCATION_METER) {
    set.add("smartMeterUnits");
    set.add("ctSplitUnits");
    set.add("fenceLockUnits");
    set.add("oduUnits");
  }
  // Also include any group that has existing data in site
  for (const g of ALL_UNIT_GROUPS) {
    const existing = site[g.key];
    if (Array.isArray(existing) && existing.length > 0) {
      set.add(g.key);
    }
  }
  return set;
};

const cloneSiteUnits = (site: Site): SiteUnitsPayload => {
  const cctvCamPhotos =
    site.cctvCameraPhotos && site.cctvCameraPhotos.length > 0
      ? [...site.cctvCameraPhotos]
      : site.cctvCameraPhoto
        ? [site.cctvCameraPhoto]
        : [];

  const cctvHdPhotos =
    site.cctvHardDiskPhotos && site.cctvHardDiskPhotos.length > 0
      ? [...site.cctvHardDiskPhotos]
      : site.cctvHardDiskPhoto
        ? [site.cctvHardDiskPhoto]
        : [];

  return {
    rmsUnits: site.rmsUnits?.map((u) => ({ ...u })) ?? [],
    expanderUnits: site.expanderUnits?.map((u) => ({ ...u })) ?? [],
    simCards: site.simCards?.map((u) => ({ ...u })) ?? [],
    fenceLockUnits: site.fenceLockUnits?.map((u) => ({ ...u })) ?? [],
    oduUnits: site.oduUnits?.map((u) => ({ ...u })) ?? [],
    smartMeterUnits: site.smartMeterUnits?.map((u) => ({ ...u })) ?? [],
    ctSplitUnits: site.ctSplitUnits?.map((u) => ({ ...u })) ?? [],
    silboGatewayUnits: site.silboGatewayUnits?.map((u) => ({ ...u })) ?? [],
    cctvCameraUnits: site.cctvCameraUnits?.map((u) => ({ ...u })) ?? [],
    hardDiskUnits: site.hardDiskUnits?.map((u) => ({ ...u })) ?? [],
    nvrUnits: site.nvrUnits?.map((u) => ({ ...u })) ?? [],

    simSwapComments: site.simSwapComments ?? "",
    simSwapPairs: site.simSwapPairs?.map((p) => ({ ...p })) ?? [],
    simSwapSiteType: site.simSwapSiteType ?? ("" as SimSwapSiteType),
    simSwapLatitude: site.simSwapLatitude ?? null,
    simSwapLongitude: site.simSwapLongitude ?? null,
    simSwapTenants:
      site.simSwapTenants?.map((t) => ({
        tenantName: t.tenantName ?? "",
        tenantCtCapacities: t.tenantCtCapacities
          ? [...t.tenantCtCapacities]
          : ["", "", ""],
        meterPhoto: t.meterPhoto ?? "",
        ctPhasePhotos: t.ctPhasePhotos
          ? [...t.ctPhasePhotos]
          : ["", "", ""],
      })) ?? [],
    simSwapCtMainPhoto: site.simSwapCtMainPhoto ?? "",
    simSwapMeterPhoto: site.simSwapMeterPhoto ?? "",

    cctvNvrPhoto: site.cctvNvrPhoto ?? "",
    cctvNvrMainBoxPhoto: site.cctvNvrMainBoxPhoto ?? "",
    cctvCameraPhoto: cctvCamPhotos[0] ?? "",
    cctvHardDiskPhoto: cctvHdPhotos[0] ?? "",
    cctvCameraPhotos: cctvCamPhotos,
    cctvHardDiskPhotos: cctvHdPhotos,
    cctvFullSitePhoto: site.cctvFullSitePhoto ?? "",
    otherSitePhotos: site.otherSitePhotos ? [...site.otherSitePhotos] : [],

    materials: {
      numberOfRms: site.materials?.numberOfRms ?? 0,
      numberOfExpanders: site.materials?.numberOfExpanders ?? 0,
      numberOfSims: site.materials?.numberOfSims ?? 0,
      numberOfFenceLocks: site.materials?.numberOfFenceLocks ?? 0,
      numberOfShelterLocks: site.materials?.numberOfShelterLocks ?? 0,
      numberOfOdus: site.materials?.numberOfOdus ?? 0,
      numberOfSmartMeters: site.materials?.numberOfSmartMeters ?? 0,
      numberOfCtSplits: site.materials?.numberOfCtSplits ?? 0,
      numberOfSilboGateways: site.materials?.numberOfSilboGateways ?? 0,
    },
  };
};

export const AdminSiteDataEditor: React.FC<AdminSiteDataEditorProps> = ({
  site,
  onCancel,
  onSuccess,
}) => {
  const updateMutation = useUpdateSiteDataMutation();
  const [data, setData] = useState<SiteUnitsPayload>(() => cloneSiteUnits(site));
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);

  const rmsQuery = useRmsSerialsQuery();
  const simQuery = useSimSerialsQuery();
  const smartLockQuery = useSmartLockSerialsQuery();

  const availableRms = rmsQuery.data ?? [];
  const availableSims = simQuery.data ?? [];
  const availableSmartLocks = smartLockQuery.data ?? [];

  const defaultGroups = getScopeDefaultGroups(site);

  const visibleGroups = ALL_UNIT_GROUPS.filter(
    (g) => showAllGroups || defaultGroups.has(g.key)
  );

  const getSerialOptions = (key: UnitGroupKey) => {
    if (key === "rmsUnits") {
      return availableRms.map((s) => ({
        value: s.serialNumber,
        label: s.serialNumber,
      }));
    }
    if (key === "simCards") {
      return availableSims.map((s) => ({
        value: s.serialNumber,
        label: s.serialNumber,
      }));
    }
    if (key === "fenceLockUnits" || key === "oduUnits") {
      return availableSmartLocks.map((s) => ({
        value: s.serialNumber,
        label: s.serialNumber,
      }));
    }
    return null;
  };

  // ── Handlers for Unit Groups ──────────────────────────────────────────────
  const handleUpdateUnit = (
    groupKey: UnitGroupKey,
    index: number,
    patch: Partial<ImagedSerialTag>
  ) => {
    setData((prev) => {
      const arr = [...((prev[groupKey] as ImagedSerialTag[]) ?? [])];
      arr[index] = { ...arr[index], ...patch };
      return { ...prev, [groupKey]: arr };
    });
  };

  const handleRemoveUnit = (groupKey: UnitGroupKey, index: number) => {
    setData((prev) => {
      const arr = [...((prev[groupKey] as ImagedSerialTag[]) ?? [])];
      arr.splice(index, 1);
      return { ...prev, [groupKey]: arr };
    });
  };

  const handleAddUnit = (groupKey: UnitGroupKey) => {
    setData((prev) => {
      const arr = [...((prev[groupKey] as ImagedSerialTag[]) ?? [])];
      arr.push({});
      return { ...prev, [groupKey]: arr };
    });
  };

  // ── Handlers for SIM Swap Pairs ───────────────────────────────────────────
  const handleUpdateSimPair = (
    index: number,
    patch: Partial<SimSwapPair>
  ) => {
    setData((prev) => {
      const pairs = [...(prev.simSwapPairs ?? [])];
      pairs[index] = { ...pairs[index], ...patch };
      return { ...prev, simSwapPairs: pairs };
    });
  };

  const handleRemoveSimPair = (index: number) => {
    setData((prev) => {
      const pairs = [...(prev.simSwapPairs ?? [])];
      pairs.splice(index, 1);
      return { ...prev, simSwapPairs: pairs };
    });
  };

  const handleAddSimPair = () => {
    setData((prev) => ({
      ...prev,
      simSwapPairs: [
        ...(prev.simSwapPairs ?? []),
        {
          newSerialNumber: "",
          newSerialImage: "",
          oldSerialNumber: "",
          oldSerialImage: "",
        },
      ],
    }));
  };

  // ── Handlers for SIM Swap Tenants ─────────────────────────────────────────
  const handleUpdateTenant = (
    index: number,
    patch: Partial<SimSwapTenant>
  ) => {
    setData((prev) => {
      const tenants = [...(prev.simSwapTenants ?? [])];
      tenants[index] = { ...tenants[index], ...patch };
      return { ...prev, simSwapTenants: tenants };
    });
  };

  const handleRemoveTenant = (index: number) => {
    setData((prev) => {
      const tenants = [...(prev.simSwapTenants ?? [])];
      tenants.splice(index, 1);
      return { ...prev, simSwapTenants: tenants };
    });
  };

  const handleAddTenant = () => {
    setData((prev) => ({
      ...prev,
      simSwapTenants: [
        ...(prev.simSwapTenants ?? []),
        {
          tenantName: "",
          tenantCtCapacities: ["", "", ""],
          meterPhoto: "",
          ctPhasePhotos: ["", "", ""],
        },
      ],
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setData((prev) => ({
          ...prev,
          simSwapLatitude: pos.coords.latitude,
          simSwapLongitude: pos.coords.longitude,
        }));
        setLocationBusy(false);
        toast.success("Current location captured");
      },
      (err) => {
        setLocationBusy(false);
        toast.error(err.message || "Failed to capture location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Handlers for CCTV Photos ──────────────────────────────────────────────
  const handleUpdateCctvCameraPhoto = (index: number, val?: string) => {
    setData((prev) => {
      const arr = [...(prev.cctvCameraPhotos ?? [])];
      arr[index] = val ?? "";
      return {
        ...prev,
        cctvCameraPhotos: arr,
        cctvCameraPhoto: arr[0] ?? "",
      };
    });
  };

  const handleRemoveCctvCameraPhoto = (index: number) => {
    setData((prev) => {
      const arr = [...(prev.cctvCameraPhotos ?? [])];
      arr.splice(index, 1);
      return {
        ...prev,
        cctvCameraPhotos: arr,
        cctvCameraPhoto: arr[0] ?? "",
      };
    });
  };

  const handleAddCctvCameraPhoto = () => {
    setData((prev) => ({
      ...prev,
      cctvCameraPhotos: [...(prev.cctvCameraPhotos ?? []), ""],
    }));
  };

  const handleUpdateCctvHardDiskPhoto = (index: number, val?: string) => {
    setData((prev) => {
      const arr = [...(prev.cctvHardDiskPhotos ?? [])];
      arr[index] = val ?? "";
      return {
        ...prev,
        cctvHardDiskPhotos: arr,
        cctvHardDiskPhoto: arr[0] ?? "",
      };
    });
  };

  const handleRemoveCctvHardDiskPhoto = (index: number) => {
    setData((prev) => {
      const arr = [...(prev.cctvHardDiskPhotos ?? [])];
      arr.splice(index, 1);
      return {
        ...prev,
        cctvHardDiskPhotos: arr,
        cctvHardDiskPhoto: arr[0] ?? "",
      };
    });
  };

  const handleAddCctvHardDiskPhoto = () => {
    setData((prev) => ({
      ...prev,
      cctvHardDiskPhotos: [...(prev.cctvHardDiskPhotos ?? []), ""],
    }));
  };

  // ── Handlers for Other Site Photos ────────────────────────────────────────
  const handleRemoveOtherPhoto = (index: number) => {
    setData((prev) => {
      const arr = [...(prev.otherSitePhotos ?? [])];
      arr.splice(index, 1);
      return { ...prev, otherSitePhotos: arr };
    });
  };

  const handleAddOtherPhoto = (val?: string) => {
    if (!val) return;
    setData((prev) => ({
      ...prev,
      otherSitePhotos: [...(prev.otherSitePhotos ?? []), val],
    }));
  };

  // ── Save action ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: site._id,
        payload: data,
      });
      toast.success("Site data updated successfully");
      onSuccess?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save site data"));
    }
  };

  const isSimSwapScope =
    site.rmsScope === RmsScope.SIM_SWAP ||
    !!site.simSwapSiteType ||
    !!site.simSwapComments ||
    (site.simSwapPairs?.length ?? 0) > 0 ||
    !!site.simSwapCtMainPhoto ||
    !!site.simSwapMeterPhoto;

  const isCctvScope =
    site.rmsScope === RmsScope.CCTV ||
    !!site.cctvNvrPhoto ||
    !!site.cctvNvrMainBoxPhoto ||
    !!site.cctvCameraPhoto ||
    !!site.cctvHardDiskPhoto ||
    (site.cctvCameraPhotos?.length ?? 0) > 0 ||
    (site.cctvHardDiskPhotos?.length ?? 0) > 0 ||
    !!site.cctvFullSitePhoto;

  return (
    <div className="space-y-6">
      {/* Sticky Top Header / Notice */}
      <div className="sticky top-2 z-20 rounded-xl border border-amber-300 bg-amber-50/95 p-4 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                ✎
              </span>
              <h2 className="text-base font-bold text-amber-900">
                Admin Edit Mode: Site Data
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-amber-700">
              Modify values, clear or replace photos, or remove any unit that is not required.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              loading={updateMutation.isPending}
            >
              Save site data
            </Button>
          </div>
        </div>
      </div>

      {/* Equipment Categories Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <span className="text-slate-600">
          Showing {visibleGroups.length} equipment categories
        </span>
        <button
          type="button"
          onClick={() => setShowAllGroups((prev) => !prev)}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 underline"
        >
          {showAllGroups
            ? "Show scope-relevant categories only"
            : "Show all equipment categories"}
        </button>
      </div>

      {/* ── Equipment Groups ──────────────────────────────────────────────── */}
      {visibleGroups.map((group) => {
        const units = (data[group.key] as ImagedSerialTag[]) ?? [];
        const serialOptions = getSerialOptions(group.key);

        return (
          <div key={group.key} className="card shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="card-title text-slate-800">
                    {group.label}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {units.length}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleAddUnit(group.key)}
                  className="!py-1 !px-2.5 !text-xs"
                >
                  + Add {group.singular}
                </Button>
              </div>

              {units.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
                  No {group.label.toLowerCase()} added.
                </div>
              ) : (
                <div className="space-y-4">
                  {units.map((unit, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          {group.singular} #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(group.key, idx)}
                          className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Remove this unit
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Serial Number & Image */}
                        <div>
                          <label className="label mb-1 block">
                            Serial number
                          </label>
                          {serialOptions ? (
                            <CreatableSelect
                              isClearable
                              isSearchable
                              placeholder="Select or enter serial..."
                              options={serialOptions}
                              value={
                                unit.serialNumber
                                  ? {
                                      value: unit.serialNumber,
                                      label: unit.serialNumber,
                                    }
                                  : null
                              }
                              onChange={(sel) =>
                                handleUpdateUnit(group.key, idx, {
                                  serialNumber: sel?.value ?? "",
                                })
                              }
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  borderRadius: "0.5rem",
                                  borderColor: "#e2e8f0",
                                  boxShadow: "none",
                                  "&:hover": { borderColor: "#cbd5e1" },
                                }),
                              }}
                            />
                          ) : (
                            <TextField
                              value={unit.serialNumber ?? ""}
                              onChange={(e) =>
                                handleUpdateUnit(group.key, idx, {
                                  serialNumber: e.target.value,
                                })
                              }
                              placeholder="Serial number"
                            />
                          )}
                        </div>

                        <ImageUploadField
                          label="Serial image"
                          value={unit.serialImage}
                          onChange={(v) =>
                            handleUpdateUnit(group.key, idx, {
                              serialImage: v || "",
                            })
                          }
                        />

                        {/* Tag Number & Image if required */}
                        {group.needs.tag && (
                          <>
                            <TextField
                              label="Tag number"
                              value={unit.tagNumber ?? ""}
                              onChange={(e) =>
                                handleUpdateUnit(group.key, idx, {
                                  tagNumber: e.target.value,
                                })
                              }
                              placeholder="Tag number"
                            />
                            <ImageUploadField
                              label="Tag image"
                              value={unit.tagImage}
                              onChange={(v) =>
                                handleUpdateUnit(group.key, idx, {
                                  tagImage: v || "",
                                })
                              }
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── SIM Swap Details ──────────────────────────────────────────────── */}
      {(isSimSwapScope || showAllGroups) && (
        <div className="card shadow-sm">
          <div className="card-body space-y-4">
            <h3 className="card-title text-slate-800">SIM Swap Details</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <ImageUploadField
                label="CT Main Photo"
                value={data.simSwapCtMainPhoto}
                onChange={(v) =>
                  setData((prev) => ({
                    ...prev,
                    simSwapCtMainPhoto: v || "",
                  }))
                }
              />
              <ImageUploadField
                label="Meter Photo"
                value={data.simSwapMeterPhoto}
                onChange={(v) =>
                  setData((prev) => ({
                    ...prev,
                    simSwapMeterPhoto: v || "",
                  }))
                }
              />
            </div>

            <div>
              <label className="label mb-1 block">Comments</label>
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="SIM swap notes or comments..."
                value={data.simSwapComments ?? ""}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    simSwapComments: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Site type"
                placeholder="Select site type"
                value={data.simSwapSiteType ?? ""}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    simSwapSiteType: e.target.value as SimSwapSiteType,
                  }))
                }
                options={[
                  { label: "Green field", value: "green_field" },
                  { label: "Roof top", value: "roof_top" },
                ]}
              />

              <div className="space-y-2">
                <label className="label block">Location Coordinates</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    className="input"
                    placeholder="Latitude"
                    value={data.simSwapLatitude ?? ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        simSwapLatitude: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      }))
                    }
                  />
                  <input
                    type="number"
                    step="any"
                    className="input"
                    placeholder="Longitude"
                    value={data.simSwapLongitude ?? ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        simSwapLongitude: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGetLocation}
                    loading={locationBusy}
                    className="shrink-0"
                  >
                    Get GPS
                  </Button>
                </div>
              </div>
            </div>

            {/* SIM Swap Pairs */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">
                  SIM Swap Pairs ({(data.simSwapPairs ?? []).length})
                </h4>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddSimPair}
                  className="!py-1 !px-2.5 !text-xs"
                >
                  + Add SIM Pair
                </Button>
              </div>

              {(data.simSwapPairs ?? []).map((pair, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      SIM Pair #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSimPair(idx)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      Remove pair
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-600">New SIM</p>
                      <div>
                        <label className="label mb-1 block">New SIM Serial</label>
                        <CreatableSelect
                          isClearable
                          isSearchable
                          placeholder="Select or enter SIM..."
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
                          onChange={(sel) =>
                            handleUpdateSimPair(idx, {
                              newSerialNumber: sel?.value ?? "",
                            })
                          }
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderRadius: "0.5rem",
                              borderColor: "#e2e8f0",
                              boxShadow: "none",
                              "&:hover": { borderColor: "#cbd5e1" },
                            }),
                          }}
                        />
                      </div>
                      <ImageUploadField
                        label="New SIM Image"
                        value={pair.newSerialImage}
                        onChange={(v) =>
                          handleUpdateSimPair(idx, {
                            newSerialImage: v || "",
                          })
                        }
                      />
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-600">Old SIM</p>
                      <TextField
                        label="Old SIM Serial"
                        value={pair.oldSerialNumber ?? ""}
                        onChange={(e) =>
                          handleUpdateSimPair(idx, {
                            oldSerialNumber: e.target.value,
                          })
                        }
                        placeholder="Old SIM serial"
                      />
                      <ImageUploadField
                        label="Old SIM Image"
                        value={pair.oldSerialImage}
                        onChange={(v) =>
                          handleUpdateSimPair(idx, {
                            oldSerialImage: v || "",
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SIM Swap Tenants */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">
                  Tenants ({(data.simSwapTenants ?? []).length})
                </h4>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTenant}
                  className="!py-1 !px-2.5 !text-xs"
                >
                  + Add Tenant
                </Button>
              </div>

              {(data.simSwapTenants ?? []).map((t, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Tenant #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTenant(idx)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      Remove tenant
                    </button>
                  </div>

                  <TextField
                    label="Tenant name"
                    value={t.tenantName ?? ""}
                    onChange={(e) =>
                      handleUpdateTenant(idx, { tenantName: e.target.value })
                    }
                    placeholder="Tenant name"
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((phaseNum) => {
                      const caps = t.tenantCtCapacities ?? ["", "", ""];
                      return (
                        <TextField
                          key={phaseNum}
                          label={`CT Phase #${phaseNum}`}
                          value={caps[phaseNum - 1] ?? ""}
                          onChange={(e) => {
                            const newCaps = [...caps];
                            newCaps[phaseNum - 1] = e.target.value;
                            handleUpdateTenant(idx, {
                              tenantCtCapacities: newCaps,
                            });
                          }}
                          placeholder={`Phase #${phaseNum} capacity`}
                        />
                      );
                    })}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <ImageUploadField
                      label="Meter Photo"
                      value={t.meterPhoto}
                      onChange={(v) =>
                        handleUpdateTenant(idx, { meterPhoto: v || "" })
                      }
                    />
                    {[1, 2, 3].map((phaseNum) => {
                      const photos = t.ctPhasePhotos ?? ["", "", ""];
                      return (
                        <ImageUploadField
                          key={phaseNum}
                          label={`Phase #${phaseNum} Photo`}
                          value={photos[phaseNum - 1]}
                          onChange={(v) => {
                            const newPhotos = [...photos];
                            newPhotos[phaseNum - 1] = v || "";
                            handleUpdateTenant(idx, {
                              ctPhasePhotos: newPhotos,
                            });
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CCTV Installation Photos ──────────────────────────────────────── */}
      {(isCctvScope || showAllGroups) && (
        <div className="card shadow-sm">
          <div className="card-body space-y-4">
            <h3 className="card-title text-slate-800">
              CCTV Site Installation Images
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <ImageUploadField
                label="NVR Photo"
                value={data.cctvNvrPhoto}
                onChange={(v) =>
                  setData((prev) => ({ ...prev, cctvNvrPhoto: v || "" }))
                }
              />
              <ImageUploadField
                label="NVR Main Box Photo"
                value={data.cctvNvrMainBoxPhoto}
                onChange={(v) =>
                  setData((prev) => ({
                    ...prev,
                    cctvNvrMainBoxPhoto: v || "",
                  }))
                }
              />
              <ImageUploadField
                label="Full Site Photo"
                value={data.cctvFullSitePhoto}
                onChange={(v) =>
                  setData((prev) => ({
                    ...prev,
                    cctvFullSitePhoto: v || "",
                  }))
                }
              />
            </div>

            {/* Camera Photos */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">
                  Camera Photos ({(data.cctvCameraPhotos ?? []).length})
                </h4>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddCctvCameraPhoto}
                  className="!py-1 !px-2.5 !text-xs"
                >
                  + Add Camera Photo
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {(data.cctvCameraPhotos ?? []).map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        Camera #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCctvCameraPhoto(idx)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <ImageUploadField
                      label={`Camera #${idx + 1}`}
                      value={photoUrl}
                      onChange={(v) => handleUpdateCctvCameraPhoto(idx, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Hard Disk Photos */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">
                  Hard Disk Photos ({(data.cctvHardDiskPhotos ?? []).length})
                </h4>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddCctvHardDiskPhoto}
                  className="!py-1 !px-2.5 !text-xs"
                >
                  + Add Hard Disk Photo
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {(data.cctvHardDiskPhotos ?? []).map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        Hard Disk #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCctvHardDiskPhoto(idx)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <ImageUploadField
                      label={`Hard Disk #${idx + 1}`}
                      value={photoUrl}
                      onChange={(v) => handleUpdateCctvHardDiskPhoto(idx, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Other Site Photos ─────────────────────────────────────────────── */}
      <div className="card shadow-sm">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="card-title text-slate-800">
              Other Site Photos ({(data.otherSitePhotos ?? []).length})
            </h3>
          </div>

          <div className="space-y-4">
            <ImageUploadField
              label="Upload new site photo"
              value=""
              onChange={(v) => handleAddOtherPhoto(v)}
            />

            {(data.otherSitePhotos ?? []).length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {(data.otherSitePhotos ?? []).map((url, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="h-32 w-full overflow-hidden rounded bg-slate-100">
                      <img
                        src={url}
                        alt={`Other photo #${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">
                        Photo #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOtherPhoto(idx)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Material Counts ───────────────────────────────────────────────── */}
      <MaterialDetails
        label="Technician Material Details"
        value={data}
        setValues={setData}
      />

      {/* Bottom Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          loading={updateMutation.isPending}
        >
          Save site data
        </Button>
      </div>
    </div>
  );
};

