import { TextField } from "@/components/TextField";
import { SiteMaterialsPayload, SiteUnitsPayload } from "@/types";

interface MaterialDetailsProps {
  label: string;
  value: SiteUnitsPayload;
  setValues: React.Dispatch<React.SetStateAction<SiteUnitsPayload>>;
  readOnly?: boolean;
}

export function MaterialDetails({
  label,
  value,
  setValues,
  readOnly = false,
}: MaterialDetailsProps) {
  const materials = value.materials ?? {};

  const handleTextChange = (key: keyof SiteMaterialsPayload, text: string) => {
    const numericValue = text === "" ? 0 : parseInt(text, 10);
    const val = isNaN(numericValue) ? 0 : numericValue;
    setValues((prev) => ({
      ...prev,
      // Only update the nested materials sub-object,
      // NOT the top-level admin-set counts
      materials: {
        ...(prev.materials ?? {}),
        [key]: val,
      },
    }));
  };

  return (
    <div className="card">
      <div className="card-body space-y-3">
        <h3 className="card-title">{label}</h3>
        <TextField
          label="Number Of RMS"
          value={
            materials.numberOfRms !== undefined
              ? String(materials.numberOfRms)
              : ""
          }
          onChange={(e) => handleTextChange("numberOfRms", e.target.value)}
          placeholder="Number Of RMS"
          type="number"
          disabled={readOnly}
        />
        <TextField
          label="Number Of Expanders"
          value={
            materials.numberOfExpanders !== undefined
              ? String(materials.numberOfExpanders)
              : ""
          }
          onChange={(e) =>
            handleTextChange("numberOfExpanders", e.target.value)
          }
          placeholder="Number Of Expanders"
          type="number"
          disabled={readOnly}
        />
        <TextField
          label="Number Of Sims"
          value={
            materials.numberOfSims !== undefined
              ? String(materials.numberOfSims)
              : ""
          }
          onChange={(e) => handleTextChange("numberOfSims", e.target.value)}
          placeholder="Number Of Sims"
          type="number"
          disabled={readOnly}
        />
        <TextField
          label="Number Of Fence Locks"
          value={
            materials.numberOfFenceLocks !== undefined
              ? String(materials.numberOfFenceLocks)
              : ""
          }
          onChange={(e) =>
            handleTextChange("numberOfFenceLocks", e.target.value)
          }
          placeholder="Number Of Fence Locks"
          type="number"
          disabled={readOnly}
        />
        <TextField
          label="Number Of Shelter Locks"
          value={
            materials.numberOfShelterLocks !== undefined
              ? String(materials.numberOfShelterLocks)
              : ""
          }
          onChange={(e) =>
            handleTextChange("numberOfShelterLocks", e.target.value)
          }
          placeholder="Number Of Shelter Locks"
          type="number"
          disabled={readOnly}
        />
        <TextField
          label="Number Of Odus"
          value={
            materials.numberOfOdus !== undefined
              ? String(materials.numberOfOdus)
              : ""
          }
          onChange={(e) => handleTextChange("numberOfOdus", e.target.value)}
          placeholder="Number Of Odus"
          type="number"
          disabled={readOnly}
        />
        <TextField
          label="Number Of Smart Meters"
          value={
            materials.numberOfSmartMeters !== undefined
              ? String(materials.numberOfSmartMeters)
              : ""
          }
          onChange={(e) =>
            handleTextChange("numberOfSmartMeters", e.target.value)
          }
          placeholder="Number Of Smart Meters"
          type="number"
          disabled={readOnly}
        />
        <TextField
          label="Number Of Ct Splits"
          value={
            materials.numberOfCtSplits !== undefined
              ? String(materials.numberOfCtSplits)
              : ""
          }
          onChange={(e) => handleTextChange("numberOfCtSplits", e.target.value)}
          placeholder="Number Of Ct Splits"
          type="number"
          disabled={readOnly}
        />
      </div>
    </div>
  );
}
