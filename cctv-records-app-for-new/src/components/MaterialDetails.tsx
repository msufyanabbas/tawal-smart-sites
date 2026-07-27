import React from "react";
import { Card, Field } from "./ui";
import AppText from "./AppText";
import { SiteMaterialsPayload, SiteUnitsPayload } from "../types";

interface MaterialDetailsProps {
  label: string;
  value: SiteUnitsPayload;
  setUnitValues: React.Dispatch<React.SetStateAction<SiteUnitsPayload>>;
  styles: any;
  colors: any;
  readOnly?: boolean;
}

export function MaterialDetails({
  label,
  value,
  setUnitValues,
  styles,
  colors,
  readOnly = false,
}: MaterialDetailsProps) {
  const materials = value.materials ?? {};
  const rmsVal =
    materials.numberOfRms !== undefined ? String(materials.numberOfRms) : "";
  const expandersVal =
    materials.numberOfExpanders !== undefined
      ? String(materials.numberOfExpanders)
      : "";
  const simsVal =
    materials.numberOfSims !== undefined ? String(materials.numberOfSims) : "";
  const fenceLocksVal =
    materials.numberOfFenceLocks !== undefined
      ? String(materials.numberOfFenceLocks)
      : "";
  const shelterLocksVal =
    materials.numberOfShelterLocks !== undefined
      ? String(materials.numberOfShelterLocks)
      : "";
  const odusVal =
    materials.numberOfOdus !== undefined ? String(materials.numberOfOdus) : "";
  const smartMetersVal =
    materials.numberOfSmartMeters !== undefined
      ? String(materials.numberOfSmartMeters)
      : "";
  const ctSplitsVal =
    materials.numberOfCtSplits !== undefined
      ? String(materials.numberOfCtSplits)
      : "";

  const handleTextChange = (key: keyof SiteMaterialsPayload, text: string) => {
    const numericValue = text === "" ? 0 : parseInt(text, 10);
    const val = isNaN(numericValue) ? 0 : numericValue;
    setUnitValues((prev) => ({
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
    <Card>
      <AppText style={styles.cardTitle}>{label}</AppText>
      <AppText>Number Of RMS</AppText>
      <Field
        value={rmsVal}
        onChangeText={(t) => handleTextChange("numberOfRms", t)}
        placeholder="Number Of RMS"
        keyboardType="numeric"
        placeholderTextColor={colors.textFaint}
      />
      <AppText>Number Of Expanders</AppText>
      <Field
        value={expandersVal}
        onChangeText={(t) => handleTextChange("numberOfExpanders", t)}
        placeholder="Number Of Expanders"
        keyboardType="numeric"
        placeholderTextColor={colors.textFaint}
      />
      <AppText>Number Of Sims</AppText>
      <Field
        value={simsVal}
        onChangeText={(t) => handleTextChange("numberOfSims", t)}
        placeholder="Number Of Sims"
        keyboardType="numeric"
        placeholderTextColor={colors.textFaint}
      />
      <AppText>Number Of Fence Locks</AppText>
      <Field
        value={fenceLocksVal}
        onChangeText={(t) => handleTextChange("numberOfFenceLocks", t)}
        placeholder="Number Of Fence Locks"
        keyboardType="numeric"
        placeholderTextColor={colors.textFaint}
      />
      <AppText>Number Of Shelter Locks</AppText>
      <Field
        value={shelterLocksVal}
        onChangeText={(t) => handleTextChange("numberOfShelterLocks", t)}
        placeholder="Number Of Shelter Locks"
        keyboardType="numeric"
        placeholderTextColor={colors.textFaint}
      />
      <AppText>Number Of Odus</AppText>
      <Field
        value={odusVal}
        onChangeText={(t) => handleTextChange("numberOfOdus", t)}
        placeholder="Number Of Odus"
        keyboardType="numeric"
        placeholderTextColor={colors.textFaint}
      />
      <AppText>Number Of Smart Meters</AppText>
      <Field
        value={smartMetersVal}
        onChangeText={(t) => handleTextChange("numberOfSmartMeters", t)}
        placeholder="Number Of Smart Meters"
        keyboardType="numeric"
        placeholderTextColor={colors.textFaint}
      />
      <AppText>Number Of Ct Splits</AppText>
      <Field
        value={ctSplitsVal}
        onChangeText={(t) => handleTextChange("numberOfCtSplits", t)}
        placeholder="Number Of Ct Splits"
        keyboardType="numeric"
        placeholderTextColor={colors.textFaint}
      />
    </Card>
  );
}
