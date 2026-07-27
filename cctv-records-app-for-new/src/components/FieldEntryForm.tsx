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
import { spacing } from "../theme";
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
  onSaveDraft: () => void;
  onSubmit: () => void;
  simOptions: { label: string; value: string }[];
  rmsOptions: { label: string; value: string }[];
  smartLockOptions: { label: string; value: string }[];
  relevantUnitGroups: any;
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
  relevantUnitGroups,
  simOptions,
  rmsOptions,
  smartLockOptions,
}) => {
  const groups = useMemo(() => relevantUnitGroups(site), [site]);
  const pairs = useMemo(() => values.simSwapPairs ?? [], [values.simSwapPairs]);
  const isSimSwap = site.rmsScope === RmsScope.SIM_SWAP;
  const ctMainPhoto = values.simSwapCtMainPhoto;

  // ── OCR state ────────────────────────────────────────────────────────────
  // Key format: `${groupKey}-${idx}` or `simswap-new-${idx}`
  const [ocrBusy, setOcrBusy] = useState<string | null>(null);

  /**
   * Called when a serial image is picked for a SIM card unit.
   * Saves the image immediately, then runs on-device OCR to try to
   * auto-fill the serial number dropdown.
   */
  const handleSimSerialImagePicked = async (
    groupKey: keyof SiteUnitsPayload,
    idx: number,
    uri: string,
  ) => {
    // Save the image straight away so UX is never blocked
    onChange(groupKey, idx, { serialImage: uri });

    const busyKey = `${String(groupKey)}-${idx}`;
    setOcrBusy(busyKey);
    try {
      const ocrText = await runOcr(uri);
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
    }
  };

  /**
   * Called when the New SIM serial image is picked inside a SIM Swap pair.
   */
  const handleSimSwapNewSerialImagePicked = async (
    pairIdx: number,
    uri: string,
  ) => {
    onUpdateSimSwapPair(pairIdx, { newSerialImage: uri });
    const busyKey = `simswap-new-${pairIdx}`;
    setOcrBusy(busyKey);
    try {
      const ocrText = await runOcr(uri);
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
    }
  };

  return (
    <>
      {isSimSwap && (
        <Card>
          <AppText style={styles.cardTitle}>SIM Swap details</AppText>

          {/* ── CT Main Photo (required gate) ── */}
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
              <Image source={{ uri: ctMainPhoto }} style={styles.thumbLg} />
              <AppText style={[styles.thumbCaption, { textAlign: "center" }]}>
                Long-press to replace
              </AppText>
            </TouchableOpacity>
          ) : (
            <>
              <CustomImagePicker
                imageUri={undefined}
                onImageSelected={(uri) => onUpdateCtMainPhoto?.(uri)}
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

          {/* All other SIM swap fields are locked until the CT main photo is uploaded */}
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

              {/* Meter Photo — shown once before tenant details */}
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
                  <Image
                    source={{ uri: values.simSwapMeterPhoto }}
                    style={styles.thumbLg}
                  />
                  <AppText
                    style={[styles.thumbCaption, { textAlign: "center" }]}
                  >
                    Long-press to replace
                  </AppText>
                </TouchableOpacity>
              ) : (
                <CustomImagePicker
                  imageUri={undefined}
                  onImageSelected={(uri) => onUpdateSimSwapMeterPhoto?.(uri)}
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
                                            const nextPhotos = [...phasePhotos];
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
                                  <Image
                                    source={{ uri: phasePhoto }}
                                    style={styles.thumbLg}
                                  />
                                  <AppText
                                    style={[
                                      styles.thumbCaption,
                                      { textAlign: "center" },
                                    ]}
                                  >
                                    Long-press to replace
                                  </AppText>
                                </TouchableOpacity>
                              ) : (
                                <CustomImagePicker
                                  imageUri={undefined}
                                  onImageSelected={(uri) => {
                                    const nextPhotos = [...phasePhotos];
                                    nextPhotos[phaseNum - 1] = uri;
                                    onUpdateSimSwapTenant?.(i, {
                                      ctPhasePhotos: nextPhotos,
                                    });
                                  }}
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
            </>
          )}
        </Card>
      )}

      {!isSimSwap && groups.length === 0 && (
        <Card>
          <AppText style={styles.muted}>
            No field unit data is required for this scope. You can submit
            directly.
          </AppText>
        </Card>
      )}

      {groups.map((g) => {
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
                    {u.serialImage ? (
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
                          {ocrBusy === `${String(g.key)}-${idx}` && (
                            <View style={styles.ocrOverlay}>
                              <ActivityIndicator size="small" color="#fff" />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <CustomImagePicker
                        imageUri={u.serialImage}
                        onImageSelected={(uri) =>
                          g.key === "simCards"
                            ? handleSimSerialImagePicked(g.key, idx, uri)
                            : onChange(g.key, idx, { serialImage: uri })
                        }
                        label="Tap to add"
                      />
                    )}
                  </>
                )}
                {g.needs.tag && (
                  <>
                    <Field
                      label="Tag number"
                      value={u.tagNumber ?? ""}
                      onChangeText={(t) =>
                        onChange(g.key, idx, { tagNumber: t })
                      }
                    />
                    <AppText style={styles.imgLabel}>Tag image</AppText>
                    {u.tagImage ? (
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
                        <Image
                          source={{ uri: u.tagImage }}
                          style={styles.thumbLg}
                        />
                      </TouchableOpacity>
                    ) : (
                      <CustomImagePicker
                        imageUri={u.tagImage}
                        onImageSelected={(uri) =>
                          onChange(g.key, idx, { tagImage: uri })
                        }
                        label="Tap to add"
                      />
                    )}
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
      })}
    </>
  );
};
export default FieldEntryForm;
