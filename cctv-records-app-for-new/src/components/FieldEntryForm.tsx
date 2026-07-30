import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  View,
} from "react-native";

import AppText from "../components/AppText";
import { Button, Card, Field, PickerField } from "../components/ui";
import CustomImagePicker from "../components/ImagePicker";
import { MaterialDetails } from "../components/MaterialDetails";
import { CommentBox } from "../components/CommentBox";

import { Dropdown } from "react-native-element-dropdown";

import {
  ImagedSerialTag,
  RmsScope,
  Site,
  SiteUnitsPayload,
  SimSwapPair,
  SimSwapTenant,
} from "../types";

import { runOcr, scanSimSerialFromOcr } from "../utils/ocrUtils";
import { colors, spacing } from "../theme";
import { styles } from "../utils/Styles";

const FieldEntryForm: React.FC<{
  site: Site;
  values: SiteUnitsPayload;
  onChange: (
    k: keyof SiteUnitsPayload,
    idx: number,
    patch: Partial<ImagedSerialTag>,
  ) => void;
  onUpdateSimSwapPair: (idx: number, patch: Partial<SimSwapPair>) => void;
  onUpdateSimSwapField: (
    field: "simSwapSiteType" | "simSwapLatitude" | "simSwapLongitude",
    value: any,
  ) => void;
  onUpdateSimSwapTenant?: (idx: number, patch: Partial<SimSwapTenant>) => void;
  onUpdateSimSwapMeterPhoto?: (uri: string) => void;
  onUpdateCtMainPhoto?: (uri: string) => void;
  onGetLocation: () => void;
  locationBusy: boolean;
  onOpenImage: (uri: string) => void;
  saving: boolean;
  onSaveDraft: (silent?: boolean) => Promise<boolean> | void;
  onSubmit: () => void;
  simOptions: { label: string; value: string }[];
  rmsOptions: { label: string; value: string }[];
  smartLockOptions: { label: string; value: string }[];
  relevantUnitGroups: any;
  setUnitValues?: React.Dispatch<React.SetStateAction<SiteUnitsPayload>>;
  /** Called after each image is selected so the photo is persisted to the API immediately */
  onUploadImage?: (payload: SiteUnitsPayload) => Promise<void>;
}> = ({
  site,
  values,
  onChange,
  onUpdateSimSwapPair,
  onUpdateSimSwapField,
  onUpdateSimSwapTenant,
  onUpdateSimSwapMeterPhoto,
  onUpdateCtMainPhoto,
  onGetLocation,
  locationBusy,
  onOpenImage,
  saving,
  onSaveDraft,
  onSubmit,
  relevantUnitGroups,
  simOptions,
  rmsOptions,
  smartLockOptions,
  setUnitValues,
  onUploadImage,
}) => {
  const groups = useMemo(() => relevantUnitGroups(site), [site]);
  const pairs = useMemo(() => values.simSwapPairs ?? [], [values.simSwapPairs]);
  const isSimSwap = site.rmsScope === RmsScope.SIM_SWAP;
  const ctMainPhoto = values.simSwapCtMainPhoto;

  // ── 3-Step Wizard state for SIM Swap ─────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [stepSaving, setStepSaving] = useState(false);

  // ── Image upload busy state ──────────────────────────────────────────────
  /** Keys currently being uploaded to the server, e.g. "ctMain", "meter", "simswap-new-0", "unit-rmsUnits-0-serial" */
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(
    new Set(),
  );

  const setUploading = (key: string, busy: boolean) => {
    setUploadingImages((prev) => {
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  /**
   * Wraps an image-selection handler with an upload loader.
   * @param imageKey  Unique key for this image slot (used to track loading state)
   * @param handler   The function that updates parent state and returns the new SiteUnitsPayload
   * @param uri       The selected image URI
   */
  const withImageUpload = async (
    imageKey: string,
    handler: () => SiteUnitsPayload,
    extraAsync?: () => Promise<void>,
  ) => {
    setUploading(imageKey, true);
    try {
      const newPayload = handler();
      // Fire API upload and any extra async work concurrently
      await Promise.all([
        onUploadImage ? onUploadImage(newPayload) : Promise.resolve(),
        extraAsync ? extraAsync() : Promise.resolve(),
      ]);
    } catch (e) {
      console.warn("[ImageUpload] Error for key", imageKey, e);
    } finally {
      setUploading(imageKey, false);
    }
  };

  const isUploading = (key: string) => uploadingImages.has(key);

  // ── OCR state ────────────────────────────────────────────────────────────
  const [ocrBusy, setOcrBusy] = useState<string | null>(null);

  /** Strip all base64 image data from the payload so only text/serial/tag data is saved.
   *  Images are already saved individually via withImageUpload on selection. */
  const stripImages = (payload: SiteUnitsPayload): SiteUnitsPayload => {
    const out = { ...payload };
    // Top-level photo fields
    delete (out as any).simSwapCtMainPhoto;
    delete (out as any).simSwapMeterPhoto;
    // SIM swap pairs – remove image fields
    if (out.simSwapPairs) {
      out.simSwapPairs = out.simSwapPairs.map((p) => ({
        ...p,
        newSerialImage: undefined,
        oldSerialImage: undefined,
      }));
    }
    // Tenants – remove image fields
    if (out.simSwapTenants) {
      out.simSwapTenants = out.simSwapTenants.map((t) => ({
        ...t,
        meterPhoto: undefined,
        ctPhasePhotos: undefined,
      }));
    }
    // Unit groups (rmsUnits, simCards, fenceLockUnits, etc.) – remove image fields
    for (const key of Object.keys(out) as Array<keyof SiteUnitsPayload>) {
      const arr = out[key];
      if (
        Array.isArray(arr) &&
        arr.length > 0 &&
        typeof arr[0] === "object" &&
        "serialImage" in (arr[0] as any)
      ) {
        (out as any)[key] = (arr as any[]).map((item: any) => ({
          ...item,
          serialImage: undefined,
          tagImage: undefined,
        }));
      }
    }
    return out;
  };

  const handleSaveAndNext = async (nextStep: 1 | 2 | 3) => {
    setStepSaving(true);
    try {
      // Save only text data – images are already saved individually on selection
      const stripped = stripImages(values);
      // We need to call onSaveDraft with the stripped payload.
      // Since onSaveDraft uses the parent's unitValues state, we temporarily
      // save the stripped version via the API directly.
      // The parent's handleSaveDraft calls saveSiteDraft(site._id, unitValues).
      // We'll call onUploadImage (which calls saveSiteDraft) with the stripped payload.
      if (onUploadImage) {
        await onUploadImage(stripped);
      }
      setCurrentStep(nextStep);
    } catch (e) {
      console.warn("[Step Save] Error:", e);
    } finally {
      setStepSaving(false);
    }
  };

  /**
   * Called when a serial image is picked for a SIM card unit.
   * Immediately uploads the image to the API then runs OCR.
   */
  const handleSimSerialImagePicked = async (
    groupKey: keyof SiteUnitsPayload,
    idx: number,
    uri: string,
  ) => {
    const imageKey = `unit-${String(groupKey)}-${idx}-serial`;
    const busyKey = `${String(groupKey)}-${idx}`;

    setUploading(imageKey, true);
    setOcrBusy(busyKey);
    try {
      // Update parent state + compute new payload for API upload
      const existing =
        (values[groupKey] as ImagedSerialTag[] | undefined) ?? [];
      const arr = [...existing];
      arr[idx] = { ...arr[idx], serialImage: uri };
      const newPayload = { ...values, [groupKey]: arr };
      onChange(groupKey, idx, { serialImage: uri });

      // Upload to API + OCR concurrently
      const [, ocrText] = await Promise.all([
        onUploadImage ? onUploadImage(newPayload) : Promise.resolve(),
        runOcr(uri),
      ]);
      const known = simOptions.map((o) => o.value);
      const { extracted, matched } = scanSimSerialFromOcr(ocrText, known);

      if (matched) {
        onChange(groupKey, idx, { serialNumber: matched });
        Alert.alert("✓ SIM serial detected", `Auto-filled: ${matched}`);
      } else if (extracted) {
        Alert.alert(
          "SIM not found",
          `Scanned serial: ${extracted}\n\nThis number is not in the SIM list. Please select manually.`,
        );
      } else {
        Alert.alert(
          "OCR",
          "Could not find an 18-digit serial number in this image. Please enter manually.",
        );
      }
    } catch (e) {
      console.warn("[OCR] failed:", e);
      Alert.alert(
        "OCR failed",
        "Could not scan this image. Please select the serial manually.",
      );
    } finally {
      setOcrBusy(null);
      setUploading(imageKey, false);
    }
  };

  /**
   * Called when the New SIM serial image is picked inside a SIM Swap pair.
   * Immediately uploads the image to the API then runs OCR.
   */
  const handleSimSwapNewSerialImagePicked = async (
    pairIdx: number,
    uri: string,
  ) => {
    const imageKey = `simswap-new-${pairIdx}`;
    setUploading(imageKey, true);
    setOcrBusy(imageKey);
    try {
      const pairs = [...(values.simSwapPairs ?? [])];
      pairs[pairIdx] = { ...pairs[pairIdx], newSerialImage: uri };
      const newPayload = { ...values, simSwapPairs: pairs };
      onUpdateSimSwapPair(pairIdx, { newSerialImage: uri });

      const [, ocrText] = await Promise.all([
        onUploadImage ? onUploadImage(newPayload) : Promise.resolve(),
        runOcr(uri),
      ]);
      const known = simOptions.map((o) => o.value);
      const { extracted, matched } = scanSimSerialFromOcr(ocrText, known);

      if (matched) {
        onUpdateSimSwapPair(pairIdx, { newSerialNumber: matched });
        Alert.alert("✓ SIM serial detected", `Auto-filled: ${matched}`);
      } else if (extracted) {
        Alert.alert(
          "SIM not found",
          `Scanned serial: ${extracted}\n\nThis number is not in the SIM list. Please select manually.`,
        );
      } else {
        Alert.alert(
          "OCR",
          "Could not find an 18-digit serial number in this image. Please enter manually.",
        );
      }
    } catch (e) {
      console.warn("[OCR] failed:", e);
      Alert.alert(
        "OCR failed",
        "Could not scan this image. Please select the serial manually.",
      );
    } finally {
      setOcrBusy(null);
      setUploading(imageKey, false);
    }
  };

  /** Handle CT Main Photo selection with upload and loader */
  const handleCtMainPhotoPicked = (uri: string) => {
    withImageUpload("ctMain", () => {
      onUpdateCtMainPhoto?.(uri);
      return { ...values, simSwapCtMainPhoto: uri };
    });
  };

  /** Handle Meter Photo selection with upload and loader */
  const handleMeterPhotoPicked = (uri: string) => {
    withImageUpload("meter", () => {
      onUpdateSimSwapMeterPhoto?.(uri);
      return { ...values, simSwapMeterPhoto: uri };
    });
  };

  /** Handle Tenant CT Phase photo selection with upload and loader */
  const handleTenantPhasePhotoPicked = (
    tenantIdx: number,
    phaseIdx: number,
    uri: string,
  ) => {
    const imageKey = `tenant-${tenantIdx}-phase-${phaseIdx}`;
    withImageUpload(imageKey, () => {
      const tenants = [...(values.simSwapTenants ?? [])];
      const tenant = { ...tenants[tenantIdx] };
      const phasePhotos = [...(tenant.ctPhasePhotos ?? ["", "", ""])];
      phasePhotos[phaseIdx] = uri;
      tenant.ctPhasePhotos = phasePhotos;
      tenants[tenantIdx] = tenant;
      onUpdateSimSwapTenant?.(tenantIdx, { ctPhasePhotos: phasePhotos });
      return { ...values, simSwapTenants: tenants };
    });
  };

  const renderStepIndicator = () => {
    if (!isSimSwap) return null;
    return (
      <View style={styles.stepHeader}>
        <View style={styles.stepBarContainer}>
          {/* Step 1 */}
          <TouchableOpacity
            onPress={() => setCurrentStep(1)}
            style={styles.stepTab}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep === 1 && styles.stepCircleActive,
                currentStep > 1 && styles.stepCircleDone,
              ]}
            >
              <AppText
                style={[
                  styles.stepCircleText,
                  currentStep === 1 && styles.stepCircleTextActive,
                  currentStep > 1 && styles.stepCircleTextDone,
                ]}
              >
                {currentStep > 1 ? "✓" : "1"}
              </AppText>
            </View>
            <AppText
              style={[
                styles.stepLabelText,
                currentStep === 1 && styles.stepLabelTextActive,
              ]}
            >
              SIM & Tenant Details
            </AppText>
          </TouchableOpacity>

          <View
            style={[
              styles.stepConnector,
              currentStep > 1 && styles.stepConnectorActive,
            ]}
          />

          {/* Step 2 */}
          <TouchableOpacity
            disabled={currentStep < 2}
            onPress={() => setCurrentStep(2)}
            style={styles.stepTab}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep === 2 && styles.stepCircleActive,
                currentStep > 2 && styles.stepCircleDone,
              ]}
            >
              <AppText
                style={[
                  styles.stepCircleText,
                  currentStep === 2 && styles.stepCircleTextActive,
                  currentStep > 2 && styles.stepCircleTextDone,
                ]}
              >
                {currentStep > 2 ? "✓" : "2"}
              </AppText>
            </View>
            <AppText
              style={[
                styles.stepLabelText,
                currentStep === 2 && styles.stepLabelTextActive,
              ]}
            >
              Smart Meter / CT Units
            </AppText>
          </TouchableOpacity>

          <View
            style={[
              styles.stepConnector,
              currentStep > 2 && styles.stepConnectorActive,
            ]}
          />

          {/* Step 3 */}
          <TouchableOpacity
            disabled={currentStep < 3}
            onPress={() => setCurrentStep(3)}
            style={styles.stepTab}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep === 3 && styles.stepCircleActive,
              ]}
            >
              <AppText
                style={[
                  styles.stepCircleText,
                  currentStep === 3 && styles.stepCircleTextActive,
                ]}
              >
                3
              </AppText>
            </View>
            <AppText
              style={[
                styles.stepLabelText,
                currentStep === 3 && styles.stepLabelTextActive,
              ]}
            >
              Material & Comments
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUnitGroups = (groupsList: any[]) => {
    return groupsList.map((g) => {
      const arr = (values[g.key] as ImagedSerialTag[]) ?? [];
      const singular = g.label.endsWith("s") ? g.label.slice(0, -1) : g.label;
      return (
        <Card key={g.key}>
          <AppText style={styles.cardTitle}>
            {g.label} ({g.count})
          </AppText>
          {arr.map((u, idx) => (
            <View key={idx} style={styles.entryUnit}>
              <AppText style={styles.unitHeading}>
                {singular} #{idx + 1}
              </AppText>
              {g.needs.serial && (
                <>
                  {(() => {
                    const options =
                      g.key === "rmsUnits"
                        ? rmsOptions
                        : g.key === "simCards"
                          ? simOptions
                          : g.key === "fenceLockUnits" || g.key === "oduUnits"
                            ? smartLockOptions
                            : null;

                    if (options) {
                      return (
                        <View style={{ marginBottom: spacing.md }}>
                          <AppText style={styles.dropdownLabel}>
                            Serial number
                          </AppText>
                          <Dropdown
                            style={styles.dropdown}
                            placeholderStyle={styles.dropdownPlaceholder}
                            selectedTextStyle={styles.dropdownSelectedText}
                            inputSearchStyle={styles.dropdownSearchInput}
                            data={options}
                            search
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Search serial..."
                            searchPlaceholder="Search serial..."
                            value={u.serialNumber ?? ""}
                            onChange={(item) =>
                              onChange(g.key, idx, {
                                serialNumber: item.value,
                              })
                            }
                          />
                        </View>
                      );
                    }

                    return (
                      <Field
                        label="Serial number"
                        value={u.serialNumber ?? ""}
                        onChangeText={(t) =>
                          onChange(g.key, idx, { serialNumber: t })
                        }
                      />
                    );
                  })()}
                  <AppText style={styles.imgLabel}>Serial image</AppText>
                  {(() => {
                    const serialKey = `unit-${String(g.key)}-${idx}-serial`;
                    const uploading =
                      isUploading(serialKey) ||
                      ocrBusy === `${String(g.key)}-${idx}`;
                    if (u.serialImage) {
                      return (
                        <TouchableOpacity
                          onPress={() => onOpenImage(u.serialImage!)}
                          onLongPress={() =>
                            Alert.alert("Replace image?", "", [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Replace",
                                onPress: () =>
                                  onChange(g.key, idx, {
                                    serialImage: undefined,
                                  }),
                              },
                            ])
                          }
                        >
                          <View style={styles.thumbContainer}>
                            <Image
                              source={{ uri: u.serialImage }}
                              style={styles.thumbLg}
                            />
                            {uploading && (
                              <View style={styles.uploadOverlay}>
                                <ActivityIndicator size="small" color="#fff" />
                                <AppText
                                  style={{
                                    color: "#fff",
                                    fontSize: 10,
                                    marginTop: 4,
                                  }}
                                >
                                  Saving…
                                </AppText>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    if (uploading) {
                      return (
                        <View style={styles.uploadingPlaceholder}>
                          <ActivityIndicator
                            size="small"
                            color={colors.brand}
                          />
                          <AppText
                            style={{
                              color: colors.brand,
                              fontSize: 10,
                              marginTop: 6,
                            }}
                          >
                            Uploading…
                          </AppText>
                        </View>
                      );
                    }
                    return (
                      <CustomImagePicker
                        imageUri={u.serialImage}
                        onImageSelected={(uri) =>
                          g.key === "simCards"
                            ? handleSimSerialImagePicked(g.key, idx, uri)
                            : withImageUpload(serialKey, () => {
                                const existing =
                                  (values[g.key] as
                                    | ImagedSerialTag[]
                                    | undefined) ?? [];
                                const arr2 = [...existing];
                                arr2[idx] = { ...arr2[idx], serialImage: uri };
                                const next = { ...values, [g.key]: arr2 };
                                onChange(g.key, idx, { serialImage: uri });
                                return next;
                              })
                        }
                        label="Tap to add"
                      />
                    );
                  })()}
                </>
              )}
              {g.needs.tag && (
                <>
                  <Field
                    label="Tag number"
                    value={u.tagNumber ?? ""}
                    onChangeText={(t) => onChange(g.key, idx, { tagNumber: t })}
                  />
                  <AppText style={styles.imgLabel}>Tag image</AppText>
                  {(() => {
                    const tagKey = `unit-${String(g.key)}-${idx}-tag`;
                    const uploading = isUploading(tagKey);
                    if (u.tagImage) {
                      return (
                        <TouchableOpacity
                          onPress={() => onOpenImage(u.tagImage!)}
                          onLongPress={() =>
                            Alert.alert("Replace image?", "", [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Replace",
                                onPress: () =>
                                  onChange(g.key, idx, { tagImage: undefined }),
                              },
                            ])
                          }
                        >
                          <View style={styles.thumbContainer}>
                            <Image
                              source={{ uri: u.tagImage }}
                              style={styles.thumbLg}
                            />
                            {uploading && (
                              <View style={styles.uploadOverlay}>
                                <ActivityIndicator size="small" color="#fff" />
                                <AppText
                                  style={{
                                    color: "#fff",
                                    fontSize: 10,
                                    marginTop: 4,
                                  }}
                                >
                                  Saving…
                                </AppText>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    if (uploading) {
                      return (
                        <View style={styles.uploadingPlaceholder}>
                          <ActivityIndicator
                            size="small"
                            color={colors.brand}
                          />
                          <AppText
                            style={{
                              color: colors.brand,
                              fontSize: 10,
                              marginTop: 6,
                            }}
                          >
                            Uploading…
                          </AppText>
                        </View>
                      );
                    }
                    return (
                      <CustomImagePicker
                        imageUri={u.tagImage}
                        onImageSelected={(uri) =>
                          withImageUpload(tagKey, () => {
                            const existing =
                              (values[g.key] as
                                | ImagedSerialTag[]
                                | undefined) ?? [];
                            const arr2 = [...existing];
                            arr2[idx] = { ...arr2[idx], tagImage: uri };
                            const next = { ...values, [g.key]: arr2 };
                            onChange(g.key, idx, { tagImage: uri });
                            return next;
                          })
                        }
                        label="Tap to add"
                      />
                    );
                  })()}
                </>
              )}
            </View>
          ))}
          {arr.length === 0 && (
            <AppText style={styles.muted}>
              No units configured for this group.
            </AppText>
          )}
        </Card>
      );
    });
  };

  // ── SIM Swap 3-step Wizard rendering ──
  if (isSimSwap) {
    return (
      <>
        {renderStepIndicator()}

        {/* ── STEP 1: SIM Swap & Tenant Details ── */}
        {currentStep === 1 && (
          <Card>
            <AppText style={styles.cardTitle}>
              Step 1: SIM & Tenant Details
            </AppText>

            {/* CT Main Photo */}
            <AppText style={styles.imgLabel}>CT Main Photo *</AppText>
            {ctMainPhoto ? (
              <TouchableOpacity
                onPress={() => onOpenImage(ctMainPhoto)}
                onLongPress={() =>
                  Alert.alert("Replace CT main photo?", "", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Replace",
                      onPress: () => onUpdateCtMainPhoto?.(""),
                    },
                  ])
                }
              >
                <View style={styles.thumbContainer}>
                  <Image source={{ uri: ctMainPhoto }} style={styles.thumbLg} />
                  {isUploading("ctMain") && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                      <AppText
                        style={{
                          color: "#fff",
                          fontSize: 10,
                          marginTop: 4,
                        }}
                      >
                        Saving…
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText style={[styles.thumbCaption, { textAlign: "center" }]}>
                  Long-press to replace
                </AppText>
              </TouchableOpacity>
            ) : isUploading("ctMain") ? (
              <View style={styles.uploadingPlaceholder}>
                <ActivityIndicator size="small" color={colors.brand} />
                <AppText
                  style={{
                    color: colors.brand,
                    fontSize: 10,
                    marginTop: 6,
                  }}
                >
                  Uploading CT Main Photo…
                </AppText>
              </View>
            ) : (
              <>
                <CustomImagePicker
                  imageUri={undefined}
                  onImageSelected={handleCtMainPhotoPicked}
                  label="Upload CT Main Photo to unlock form"
                />
                <AppText
                  style={[
                    styles.muted,
                    { textAlign: "center", marginTop: spacing.xs },
                  ]}
                >
                  ⚠️ Upload a CT main photo to fill in SIM swap details.
                </AppText>
              </>
            )}

            {!!ctMainPhoto && (
              <>
                {/* SIM Pairs */}
                {Array.from({ length: site.numberOfSims }, (_, i) => {
                  const pair = pairs[i] ?? {};
                  return (
                    <View key={i} style={styles.entryUnit}>
                      <AppText style={styles.unitHeading}>SIM #{i + 1}</AppText>

                      {/* New SIM */}
                      <View style={{ marginBottom: spacing.md }}>
                        <AppText style={styles.dropdownLabel}>
                          New SIM serial numbers
                        </AppText>
                        <Dropdown
                          style={styles.dropdown}
                          placeholderStyle={styles.dropdownPlaceholder}
                          selectedTextStyle={styles.dropdownSelectedText}
                          inputSearchStyle={styles.dropdownSearchInput}
                          data={simOptions}
                          search
                          maxHeight={300}
                          labelField="label"
                          valueField="value"
                          placeholder="Search SIM..."
                          searchPlaceholder="Search SIM..."
                          value={pair.newSerialNumber ?? ""}
                          onChange={(item) =>
                            onUpdateSimSwapPair(i, {
                              newSerialNumber: item.value,
                            })
                          }
                        />
                      </View>
                      <AppText style={styles.imgLabel}>New SIM image</AppText>
                      {pair.newSerialImage ? (
                        <TouchableOpacity
                          onPress={() => onOpenImage(pair.newSerialImage!)}
                          onLongPress={() =>
                            Alert.alert("Replace image?", "", [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Replace",
                                onPress: () =>
                                  onUpdateSimSwapPair(i, {
                                    newSerialImage: undefined,
                                  }),
                              },
                            ])
                          }
                        >
                          <View style={styles.thumbContainer}>
                            <Image
                              source={{ uri: pair.newSerialImage }}
                              style={styles.thumbLg}
                            />
                            {ocrBusy === `simswap-new-${i}` && (
                              <View style={styles.ocrOverlay}>
                                <ActivityIndicator size="small" color="#fff" />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <CustomImagePicker
                          imageUri={pair.newSerialImage}
                          onImageSelected={(uri) =>
                            handleSimSwapNewSerialImagePicked(i, uri)
                          }
                          label="Tap to add"
                        />
                      )}

                      {/* Old SIM */}
                      <Field
                        label="Old SIM serial number"
                        value={pair.oldSerialNumber ?? ""}
                        onChangeText={(t) =>
                          onUpdateSimSwapPair(i, { oldSerialNumber: t })
                        }
                      />
                      <AppText style={styles.imgLabel}>Old SIM image</AppText>
                      {pair.oldSerialImage ? (
                        <TouchableOpacity
                          onPress={() => onOpenImage(pair.oldSerialImage!)}
                          onLongPress={() =>
                            Alert.alert("Replace image?", "", [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Replace",
                                onPress: () =>
                                  onUpdateSimSwapPair(i, {
                                    oldSerialImage: undefined,
                                  }),
                              },
                            ])
                          }
                        >
                          <Image
                            source={{ uri: pair.oldSerialImage }}
                            style={styles.thumbLg}
                          />
                        </TouchableOpacity>
                      ) : (
                        <CustomImagePicker
                          imageUri={pair.oldSerialImage}
                          onImageSelected={(uri) =>
                            onUpdateSimSwapPair(i, { oldSerialImage: uri })
                          }
                          label="Tap to add"
                        />
                      )}
                    </View>
                  );
                })}

                {/* Site Type */}
                <View style={{ marginTop: spacing.md }}>
                  <PickerField
                    label="Site type *"
                    value={
                      values.simSwapSiteType === "green_field"
                        ? "Green field"
                        : values.simSwapSiteType === "roof_top"
                          ? "Roof top"
                          : undefined
                    }
                    options={["Green field", "Roof top"]}
                    onChange={(val) => {
                      onUpdateSimSwapField(
                        "simSwapSiteType",
                        val === "Green field" ? "green_field" : "roof_top",
                      );
                    }}
                  />
                </View>

                {/* Location Button */}
                <View style={{ marginTop: spacing.md }}>
                  <Button
                    title="Get current location"
                    variant="secondary"
                    onPress={onGetLocation}
                    loading={locationBusy}
                  />
                  {typeof values.simSwapLatitude === "number" &&
                    typeof values.simSwapLongitude === "number" && (
                      <AppText style={styles.locationText}>
                        Lat: {values.simSwapLatitude.toFixed(6)} | Lng:{" "}
                        {values.simSwapLongitude.toFixed(6)}
                      </AppText>
                    )}
                </View>

                {/* Meter Photo */}
                <AppText style={[styles.imgLabel, { marginTop: spacing.md }]}>
                  Meter Photo
                </AppText>
                {values.simSwapMeterPhoto ? (
                  <TouchableOpacity
                    onPress={() => onOpenImage(values.simSwapMeterPhoto!)}
                    onLongPress={() => {
                      Alert.alert("Replace meter photo?", "", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Replace",
                          onPress: () => onUpdateSimSwapMeterPhoto?.(""),
                        },
                      ]);
                    }}
                  >
                    <View style={styles.thumbContainer}>
                      <Image
                        source={{ uri: values.simSwapMeterPhoto }}
                        style={styles.thumbLg}
                      />
                      {isUploading("meter") && (
                        <View style={styles.uploadOverlay}>
                          <ActivityIndicator size="small" color="#fff" />
                          <AppText
                            style={{
                              color: "#fff",
                              fontSize: 10,
                              marginTop: 4,
                            }}
                          >
                            Saving…
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText
                      style={[styles.thumbCaption, { textAlign: "center" }]}
                    >
                      Long-press to replace
                    </AppText>
                  </TouchableOpacity>
                ) : isUploading("meter") ? (
                  <View style={styles.uploadingPlaceholder}>
                    <ActivityIndicator size="small" color={colors.brand} />
                    <AppText
                      style={{
                        color: colors.brand,
                        fontSize: 10,
                        marginTop: 6,
                      }}
                    >
                      Uploading Meter Photo…
                    </AppText>
                  </View>
                ) : (
                  <CustomImagePicker
                    imageUri={undefined}
                    onImageSelected={handleMeterPhotoPicked}
                    label="Tap to add meter photo"
                  />
                )}

                {/* Tenant Details */}
                {site.numberOfTenants > 0 && (
                  <View
                    style={{
                      marginTop: spacing.md,
                      paddingTop: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: "#e2e8f0",
                    }}
                  >
                    <AppText
                      style={[styles.unitHeading, { marginBottom: spacing.sm }]}
                    >
                      Tenant Details
                    </AppText>
                    {Array.from({ length: site.numberOfTenants }, (_, i) => {
                      const tenantsList = values.simSwapTenants ?? [];
                      const tenant = tenantsList[i] ?? {};
                      const phasePhotos = tenant.ctPhasePhotos ?? ["", "", ""];

                      return (
                        <View
                          key={i}
                          style={[
                            styles.entryUnit,
                            {
                              backgroundColor: "#f8fafc",
                              padding: spacing.md,
                              borderRadius: 8,
                              marginBottom: spacing.md,
                            },
                          ]}
                        >
                          <AppText
                            style={[
                              styles.unitHeading,
                              { fontSize: 13, marginBottom: spacing.sm },
                            ]}
                          >
                            Tenant #{i + 1}
                          </AppText>

                          {/* Tenant name */}
                          <Field
                            label="Tenant name"
                            value={tenant.tenantName ?? ""}
                            placeholder="Enter tenant name"
                            onChangeText={(t) =>
                              onUpdateSimSwapTenant?.(i, { tenantName: t })
                            }
                          />

                          {/* CT capacity + phase photo per phase */}
                          {[1, 2, 3].map((phaseNum) => {
                            const capacities = tenant.tenantCtCapacities ?? [
                              "",
                              "",
                              "",
                            ];
                            const capValue = capacities[phaseNum - 1] ?? "";
                            const phasePhoto = phasePhotos[phaseNum - 1] ?? "";
                            const imageKey = `tenant-${i}-phase-${phaseNum - 1}`;
                            return (
                              <View
                                key={phaseNum}
                                style={{ marginTop: spacing.md }}
                              >
                                <PickerField
                                  label={`Tenant CT capacity phase #${phaseNum}`}
                                  value={capValue || undefined}
                                  options={["200x5", "150x5"]}
                                  onChange={(val) => {
                                    const nextCaps = [...capacities];
                                    nextCaps[phaseNum - 1] = val;
                                    onUpdateSimSwapTenant?.(i, {
                                      tenantCtCapacities: nextCaps,
                                    });
                                  }}
                                />
                                {/* Phase photo */}
                                <AppText
                                  style={[
                                    styles.imgLabel,
                                    { marginTop: spacing.sm },
                                  ]}
                                >
                                  CT Phase #{phaseNum} photo
                                </AppText>
                                {phasePhoto ? (
                                  <TouchableOpacity
                                    onPress={() => onOpenImage(phasePhoto)}
                                    onLongPress={() =>
                                      Alert.alert(
                                        `Replace Phase #${phaseNum} photo?`,
                                        "",
                                        [
                                          { text: "Cancel", style: "cancel" },
                                          {
                                            text: "Replace",
                                            onPress: () => {
                                              const nextPhotos = [
                                                ...phasePhotos,
                                              ];
                                              nextPhotos[phaseNum - 1] = "";
                                              onUpdateSimSwapTenant?.(i, {
                                                ctPhasePhotos: nextPhotos,
                                              });
                                            },
                                          },
                                        ],
                                      )
                                    }
                                  >
                                    <View style={styles.thumbContainer}>
                                      <Image
                                        source={{ uri: phasePhoto }}
                                        style={styles.thumbLg}
                                      />
                                      {isUploading(imageKey) && (
                                        <View style={styles.uploadOverlay}>
                                          <ActivityIndicator
                                            size="small"
                                            color="#fff"
                                          />
                                          <AppText
                                            style={{
                                              color: "#fff",
                                              fontSize: 10,
                                              marginTop: 4,
                                            }}
                                          >
                                            Saving…
                                          </AppText>
                                        </View>
                                      )}
                                    </View>
                                    <AppText
                                      style={[
                                        styles.thumbCaption,
                                        { textAlign: "center" },
                                      ]}
                                    >
                                      Long-press to replace
                                    </AppText>
                                  </TouchableOpacity>
                                ) : isUploading(imageKey) ? (
                                  <View style={styles.uploadingPlaceholder}>
                                    <ActivityIndicator
                                      size="small"
                                      color={colors.brand}
                                    />
                                    <AppText
                                      style={{
                                        color: colors.brand,
                                        fontSize: 10,
                                        marginTop: 6,
                                      }}
                                    >
                                      Uploading Phase #{phaseNum} photo…
                                    </AppText>
                                  </View>
                                ) : (
                                  <CustomImagePicker
                                    imageUri={undefined}
                                    onImageSelected={(uri) =>
                                      handleTenantPhasePhotoPicked(
                                        i,
                                        phaseNum - 1,
                                        uri,
                                      )
                                    }
                                    label={`Tap to add Phase #${phaseNum} photo`}
                                  />
                                )}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.stepNavRow}>
                  <Button
                    title="Save & Next: Smart Meter / CT Units →"
                    onPress={() => handleSaveAndNext(2)}
                    loading={stepSaving}
                    disabled={uploadingImages.size > 0}
                  />
                </View>
              </>
            )}
          </Card>
        )}

        {/* ── STEP 2: Smart Meter / CT Units ── */}
        {currentStep === 2 && (
          <>
            {/* Smart Meter / CT unit groups */}
            {renderUnitGroups(groups)}

            <View style={styles.stepNavRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title="← Back"
                  variant="secondary"
                  onPress={() => setCurrentStep(1)}
                  disabled={stepSaving}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Button
                  title="Save & Next: Materials →"
                  onPress={() => handleSaveAndNext(3)}
                  loading={stepSaving}
                  disabled={uploadingImages.size > 0}
                />
              </View>
            </View>
          </>
        )}

        {/* ── STEP 3: Material Details & Comments ── */}
        {currentStep === 3 && (
          <>
            {setUnitValues && (
              <MaterialDetails
                label="Material Details"
                value={values}
                setUnitValues={setUnitValues}
                styles={styles}
                colors={colors}
              />
            )}
            <CommentBox
              label="Comments"
              value={(values as any).simSwapComments ?? ""}
              onChange={(t) => {
                if (setUnitValues) {
                  setUnitValues((prev) => ({ ...prev, simSwapComments: t }));
                }
              }}
              styles={styles}
              colors={colors}
            />

            <View style={styles.stepNavRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title="← Back"
                  variant="secondary"
                  onPress={() => setCurrentStep(2)}
                  disabled={stepSaving || saving}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Save draft"
                  variant="secondary"
                  onPress={() => onSaveDraft(false)}
                  loading={saving || stepSaving}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Button
                  title="Submit work"
                  onPress={onSubmit}
                  loading={saving || stepSaving}
                />
              </View>
            </View>
          </>
        )}
      </>
    );
  }

  // ── Standard (Non-SIM Swap) Form rendering ──
  return (
    <>
      {groups.length === 0 && (
        <Card>
          <AppText style={styles.muted}>
            No field unit data is required for this scope. You can submit
            directly.
          </AppText>
        </Card>
      )}

      {renderUnitGroups(groups)}
    </>
  );
};

export default FieldEntryForm;
