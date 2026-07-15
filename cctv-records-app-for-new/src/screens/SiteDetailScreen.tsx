import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import AppText from "../components/AppText";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  LoadingState,
  ErrorState,
  PickerField,
} from "../components/ui";
import CustomImagePicker from "../components/ImagePicker";
import { useAuth } from "../contexts/AuthContext";
import {
  acceptSite,
  assignSite,
  deleteSite,
  getSiteById,
  reviewSite,
  saveSiteDraft,
  submitSite,
} from "../api/siteService";
import { getSimSerials, getRmsSerials, getSmartLockSerials } from "../api/serialService";
import { Dropdown } from "react-native-element-dropdown";
import { listUsers } from "../api/userService";
import { SitesStackParamList } from "../navigation";
import {
  AppUser,
  ImagedSerialTag,
  Role,
  RmsScope,
  Site,
  SiteUnitsPayload,
  SimSwapPair,
  SimSwapSiteType,
} from "../types";
import {
  STATUS_STEPS,
  formatDateTime,
  formatErrorMessage,
  rmsScopeLabel,
} from "../utils/helpers";
import {
  colors,
  fontSize,
  radius,
  scopeColor,
  shadow,
  spacing,
  statusColor,
} from "../theme";

type Nav = NativeStackNavigationProp<SitesStackParamList, "SiteDetail">;
type Rt = RouteProp<SitesStackParamList, "SiteDetail">;

// ── Unit groups (mirrors web SiteDetailPage.relevantUnitGroups) ────────────

interface UnitGroup {
  key: keyof SiteUnitsPayload;
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
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
  } else if (site.rmsScope === RmsScope.SIM_SWAP) {
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

// ── Status Timeline ────────────────────────────────────────────────────────

const StatusTimeline: React.FC<{ site: Site }> = ({ site }) => (
  <View style={styles.timelineRow}>
    {STATUS_STEPS.map((step, i) => {
      const flag = site.status?.[step.key];
      const done = !!flag?.done;
      return (
        <React.Fragment key={step.key}>
          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                done
                  ? { backgroundColor: statusColor[step.key] }
                  : styles.timelineDotPending,
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <AppText style={{ color: colors.textFaint, fontWeight: "700" }}>
                  {i + 1}
                </AppText>
              )}
            </View>
            <AppText
              style={[
                styles.timelineLabel,
                done && { color: colors.text, fontWeight: "700" },
              ]}
            >
              {step.label}
            </AppText>
            {flag?.at && (
              <AppText style={styles.timelineAt}>
                {formatDateTime(flag.at)}
              </AppText>
            )}
          </View>
          {i < STATUS_STEPS.length - 1 && (
            <View
              style={[
                styles.timelineConnector,
                done && { backgroundColor: statusColor[step.key] },
              ]}
            />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

// ── Fullscreen image preview ───────────────────────────────────────────────

const ImageViewer: React.FC<{
  uri?: string;
  onClose: () => void;
}> = ({ uri, onClose }) => (
  <Modal
    visible={!!uri}
    animationType="fade"
    transparent
    onRequestClose={onClose}
  >
    <Pressable style={styles.viewerBackdrop} onPress={onClose}>
      {uri && (
        <Image
          source={{ uri }}
          style={styles.viewerImage}
          resizeMode="contain"
        />
      )}
      <View style={styles.viewerClose} pointerEvents="none">
        <Ionicons name="close" size={28} color="#fff" />
      </View>
    </Pressable>
  </Modal>
);

// ── Submitted data (read-only) view ────────────────────────────────────────

const SubmittedDataView: React.FC<{
  site: Site;
  onOpenImage: (uri: string) => void;
}> = ({ site, onOpenImage }) => {
  const groups = relevantUnitGroups(site)
    .map((g) => ({
      ...g,
      units: ((site as any)[g.key] as ImagedSerialTag[] | undefined) ?? [],
    }))
    .filter((g) => g.units.length > 0);

  const isSimSwap = site.rmsScope === RmsScope.SIM_SWAP;
  const hasSimSwapPairs = isSimSwap && (site.simSwapPairs?.length ?? 0) > 0;
  const hasSimSwapFields =
    isSimSwap &&
    (site.simSwapSiteType || site.simSwapComments || hasSimSwapPairs);

  if (groups.length === 0 && !hasSimSwapFields) {
    return (
      <Card>
        <AppText style={styles.muted}>
          The technician has not submitted any field data.
        </AppText>
      </Card>
    );
  }

  return (
    <>
      {hasSimSwapFields && (
        <Card>
          <AppText style={styles.cardTitle}>SIM Swap Details</AppText>

          {!!site.simSwapComments && (
            <View style={{ marginBottom: spacing.sm }}>
              <AppText style={styles.dataKey}>Comments</AppText>
              <AppText style={[styles.dataVal, { textAlign: "left" }]}>
                {site.simSwapComments}
              </AppText>
            </View>
          )}

          {!!site.simSwapSiteType && (
            <View style={{ marginBottom: spacing.sm }}>
              <AppText style={styles.dataKey}>Site Type</AppText>
              <AppText style={[styles.dataVal, { textAlign: "left" }]}>
                {site.simSwapSiteType === "green_field"
                  ? "Green Field"
                  : "Roof Top"}
              </AppText>
            </View>
          )}

          {typeof site.simSwapLatitude === "number" &&
            typeof site.simSwapLongitude === "number" && (
              <View style={{ marginBottom: spacing.sm }}>
                <AppText style={styles.dataKey}>Location</AppText>
                <AppText style={[styles.dataVal, { textAlign: "left" }]}>
                  Lat: {site.simSwapLatitude.toFixed(6)} | Lng:{" "}
                  {site.simSwapLongitude.toFixed(6)}
                </AppText>
              </View>
            )}

          {hasSimSwapPairs &&
            site.simSwapPairs!.map((pair, idx) => {
              const hasNew = !!pair.newSerialNumber || !!pair.newSerialImage;
              const hasOld = !!pair.oldSerialNumber || !!pair.oldSerialImage;
              return (
                <View key={idx} style={styles.dataUnit}>
                  <AppText style={styles.unitHeading}>
                    SIM Pair #{idx + 1}
                  </AppText>

                  {/* New SIM */}
                  <View style={{ marginTop: spacing.sm }}>
                    <AppText style={{ fontWeight: "600", marginBottom: 4 }}>
                      New SIM
                    </AppText>
                    {!hasNew ? (
                      <AppText style={styles.muted}>No data.</AppText>
                    ) : (
                      <>
                        {!!pair.newSerialNumber && (
                          <View style={styles.dataRow}>
                            <AppText style={styles.dataKey}>
                              Serial number
                            </AppText>
                            <AppText style={styles.dataVal}>
                              {pair.newSerialNumber}
                            </AppText>
                          </View>
                        )}
                        {!!pair.newSerialImage && (
                          <TouchableOpacity
                            onPress={() => onOpenImage(pair.newSerialImage!)}
                            style={{ marginTop: spacing.xs }}
                          >
                            <Image
                              source={{ uri: pair.newSerialImage }}
                              style={styles.thumbLg}
                            />
                            <AppText style={styles.imgLabel}>Image</AppText>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>

                  {/* Old SIM */}
                  <View style={{ marginTop: spacing.sm }}>
                    <AppText style={{ fontWeight: "600", marginBottom: 4 }}>
                      Old SIM
                    </AppText>
                    {!hasOld ? (
                      <AppText style={styles.muted}>No data.</AppText>
                    ) : (
                      <>
                        {!!pair.oldSerialNumber && (
                          <View style={styles.dataRow}>
                            <AppText style={styles.dataKey}>
                              Serial number
                            </AppText>
                            <AppText style={styles.dataVal}>
                              {pair.oldSerialNumber}
                            </AppText>
                          </View>
                        )}
                        {!!pair.oldSerialImage && (
                          <TouchableOpacity
                            onPress={() => onOpenImage(pair.oldSerialImage!)}
                            style={{ marginTop: spacing.xs }}
                          >
                            <Image
                              source={{ uri: pair.oldSerialImage }}
                              style={styles.thumbLg}
                            />
                            <AppText style={styles.imgLabel}>Image</AppText>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
        </Card>
      )}
      {groups.map((g) => {
        const singular = g.label.endsWith("s") ? g.label.slice(0, -1) : g.label;
        return (
          <Card key={g.key}>
            <AppText style={styles.cardTitle}>
              {g.label} ({g.units.length})
            </AppText>
            {g.units.map((u, idx) => {
              const hasAny =
                !!u.serialNumber ||
                !!u.serialImage ||
                !!u.tagNumber ||
                !!u.tagImage;
              return (
                <View key={idx} style={styles.dataUnit}>
                  <AppText style={styles.unitHeading}>
                    {singular} #{idx + 1}
                  </AppText>
                  {!hasAny ? (
                    <AppText style={styles.muted}>No data submitted.</AppText>
                  ) : (
                    <>
                      {!!u.serialNumber && (
                        <View style={styles.dataRow}>
                          <AppText style={styles.dataKey}>
                            Serial number
                          </AppText>
                          <AppText style={styles.dataVal}>
                            {u.serialNumber}
                          </AppText>
                        </View>
                      )}
                      {!!u.tagNumber && (
                        <View style={styles.dataRow}>
                          <AppText style={styles.dataKey}>Tag number</AppText>
                          <AppText style={styles.dataVal}>
                            {u.tagNumber}
                          </AppText>
                        </View>
                      )}
                      <View style={styles.thumbRow}>
                        {!!u.serialImage && (
                          <TouchableOpacity
                            onPress={() => onOpenImage(u.serialImage!)}
                          >
                            <Image
                              source={{ uri: u.serialImage }}
                              style={styles.thumb}
                            />
                            <AppText style={styles.thumbCaption}>
                              Serial
                            </AppText>
                          </TouchableOpacity>
                        )}
                        {!!u.tagImage && (
                          <TouchableOpacity
                            onPress={() => onOpenImage(u.tagImage!)}
                          >
                            <Image
                              source={{ uri: u.tagImage }}
                              style={styles.thumb}
                            />
                            <AppText style={styles.thumbCaption}>Tag</AppText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </Card>
        );
      })}
    </>
  );
};

// ── Technician field entry form (FIX 6) ────────────────────────────────────

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
  onGetLocation: () => void;
  locationBusy: boolean;
  onOpenImage: (uri: string) => void;
  saving: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  simOptions: { label: string; value: string }[];
  rmsOptions: { label: string; value: string }[];
  smartLockOptions: { label: string; value: string }[];
}> = ({
  site,
  values,
  onChange,
  onUpdateSimSwapPair,
  onUpdateSimSwapField,
  onGetLocation,
  locationBusy,
  onOpenImage,
  saving,
  onSaveDraft,
  onSubmit,
  simOptions,
  rmsOptions,
  smartLockOptions,
}) => {
  const groups = useMemo(() => relevantUnitGroups(site), [site]);
  const pairs = useMemo(() => values.simSwapPairs ?? [], [values.simSwapPairs]);
  const isSimSwap = site.rmsScope === RmsScope.SIM_SWAP;

  return (
    <>
      {isSimSwap && (
        <Card>
          <AppText style={styles.cardTitle}>SIM Swap details</AppText>

          {/* SIM Pairs */}
          {Array.from({ length: site.numberOfSims }, (_, i) => {
            const pair = pairs[i] ?? {};
            return (
              <View key={i} style={styles.entryUnit}>
                <AppText style={styles.unitHeading}>SIM #{i + 1}</AppText>

                {/* New SIM */}
                <View style={{ marginBottom: spacing.md }}>
                   <AppText style={styles.dropdownLabel}>New SIM serial number</AppText>
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
                       onUpdateSimSwapPair(i, { newSerialNumber: item.value })
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
                    <Image
                      source={{ uri: pair.newSerialImage }}
                      style={styles.thumbLg}
                    />
                  </TouchableOpacity>
                ) : (
                  <CustomImagePicker
                    imageUri={pair.newSerialImage}
                    onImageSelected={(uri) =>
                      onUpdateSimSwapPair(i, { newSerialImage: uri })
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
                            <AppText style={styles.dropdownLabel}>Serial number</AppText>
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
                                onChange(g.key, idx, { serialNumber: item.value })
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
                        <Image
                          source={{ uri: u.serialImage }}
                          style={styles.thumbLg}
                        />
                      </TouchableOpacity>
                    ) : (
                      <CustomImagePicker
                        imageUri={u.serialImage}
                        onImageSelected={(uri) =>
                          onChange(g.key, idx, { serialImage: uri })
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

// ── Assign technician modal ────────────────────────────────────────────────

const AssignSheet: React.FC<{
  open: boolean;
  technicians: AppUser[];
  loading: boolean;
  currentId?: string;
  onClose: () => void;
  onPick: (id: string) => void;
}> = ({ open, technicians, loading, currentId, onClose, onPick }) => {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return technicians;
    return technicians.filter((t) =>
      `${t.name} ${t.email}`.toLowerCase().includes(needle),
    );
  }, [q, technicians]);

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <AppText style={styles.modalTitle}>Assign to technician</AppText>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or email"
            style={styles.searchInput}
            placeholderTextColor={colors.textFaint}
          />
          {loading ? (
            <LoadingState />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(t) => t.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <EmptyState
                  icon="◌"
                  title="No technicians found"
                  subtitle={
                    technicians.length === 0
                      ? "Ask the admin to create a technician."
                      : "Adjust your search."
                  }
                />
              }
              renderItem={({ item }) => {
                const isCurrent = currentId === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => onPick(item.id)}
                    style={styles.techRow}
                    activeOpacity={0.75}
                  >
                    <View style={styles.avatar}>
                      <AppText style={styles.avatarText}>
                        {(item.name || item.email).slice(0, 1).toUpperCase()}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.techName}>
                        {item.name || "—"}
                      </AppText>
                      <AppText style={styles.techEmail}>{item.email}</AppText>
                    </View>
                    {isCurrent && (
                      <Chip label="Current" color={colors.cyan} small />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ── Main screen ────────────────────────────────────────────────────────────

const SiteDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { siteId } = route.params;
  const { role, user } = useAuth();

  const isAdmin = role === Role.ADMIN;
  const isManager = role === Role.MANAGER;
  const isTech = role === Role.TECHNICIAN;

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [unitValues, setUnitValues] = useState<SiteUnitsPayload>({});

  const [techs, setTechs] = useState<AppUser[]>([]);
  const [techsLoading, setTechsLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | undefined>();
  // Reviewer notes drafted while the panel is open. Cleared after a
  // successful approval so the panel disappears with the right state.
  const [reviewRemarks, setReviewRemarks] = useState("");

  const [simOptions, setSimOptions] = useState<{ label: string; value: string }[]>([]);
  const [rmsOptions, setRmsOptions] = useState<{ label: string; value: string }[]>([]);
  const [smartLockOptions, setSmartLockOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (!isTech) return;
    getSimSerials().then((res) => {
      if (res.success && res.data) {
        setSimOptions(res.data.map((s) => ({ label: s.serialNumber, value: s.serialNumber })));
      }
    });
    getRmsSerials().then((res) => {
      if (res.success && res.data) {
        setRmsOptions(res.data.map((s) => ({ label: s.serialNumber, value: s.serialNumber })));
      }
    });
    getSmartLockSerials().then((res) => {
      if (res.success && res.data) {
        setSmartLockOptions(res.data.map((s) => ({ label: s.serialNumber, value: s.serialNumber })));
      }
    });
  }, [isTech]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      const res = await getSiteById(siteId);
      if (res.success && res.data) {
        setSite(res.data);
        const groups = relevantUnitGroups(res.data);
        const seeded: SiteUnitsPayload = {};
        for (const g of groups) {
          const existing = (res.data as any)[g.key] as
            | ImagedSerialTag[]
            | undefined;
          (seeded as any)[g.key] = Array.from(
            { length: g.count },
            (_, i) => existing?.[i] ?? {},
          );
        }
        (seeded as any).simSwapComments = res.data.simSwapComments ?? "";
        (seeded as any).simSwapPairs = res.data.simSwapPairs ?? [];
        (seeded as any).simSwapSiteType = res.data.simSwapSiteType ?? undefined;
        (seeded as any).simSwapLatitude = res.data.simSwapLatitude ?? undefined;
        (seeded as any).simSwapLongitude =
          res.data.simSwapLongitude ?? undefined;
        setUnitValues(seeded);
      } else {
        setError(res.message ?? "Failed to load site");
      }
      setLoading(false);
      setRefreshing(false);
    },
    [siteId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Pre-load technicians for managers so the assign sheet opens instantly.
  useEffect(() => {
    if (!(isManager || isAdmin)) return;
    setTechsLoading(true);
    listUsers(Role.TECHNICIAN).then((r) => {
      if (r.success && r.data) setTechs(r.data);
      setTechsLoading(false);
    });
  }, [isManager, isAdmin]);

  const updateUnit = (
    groupKey: keyof SiteUnitsPayload,
    idx: number,
    patch: Partial<ImagedSerialTag>,
  ) => {
    setUnitValues((prev) => {
      const existing = prev[groupKey] as ImagedSerialTag[] | undefined;
      const arr = [...(existing ?? [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [groupKey]: arr };
    });
  };

  const updateSimSwapPair = (idx: number, patch: Partial<SimSwapPair>) => {
    setUnitValues((prev) => {
      const pairs = [...(prev.simSwapPairs ?? [])];
      pairs[idx] = { ...pairs[idx], ...patch };
      return { ...prev, simSwapPairs: pairs };
    });
  };

  const updateSimSwapField = (
    field: "simSwapSiteType" | "simSwapLatitude" | "simSwapLongitude",
    value: any,
  ) => {
    setUnitValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleGetLocation = async () => {
    setLocationBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      updateSimSwapField("simSwapLatitude", loc.coords.latitude);
      updateSimSwapField("simSwapLongitude", loc.coords.longitude);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to get location");
    } finally {
      setLocationBusy(false);
    }
  };

  // Status actions
  const handleAccept = async () => {
    if (!site) return;
    setActionBusy(true);
    const res = await acceptSite(site._id);
    setActionBusy(false);
    if (res.success && res.data) {
      setSite(res.data);
      Alert.alert("Accepted", "You can now enter field data.");
    } else Alert.alert("Error", formatErrorMessage(res.message));
  };

  const handleAssign = async (techId: string) => {
    if (!site) return;
    setAssignOpen(false);
    setActionBusy(true);
    const res = await assignSite(site._id, techId);
    setActionBusy(false);
    if (res.success && res.data) {
      setSite(res.data);
      Alert.alert("Assigned", "Site assigned to technician.");
    } else Alert.alert("Error", formatErrorMessage(res.message));
  };

  const handleReview = () => {
    if (!site) return;
    Alert.alert("Approve work?", "This marks the site as reviewed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setActionBusy(true);
          const res = await reviewSite(site._id, reviewRemarks);
          setActionBusy(false);
          if (res.success && res.data) {
            setSite(res.data);
            setReviewRemarks("");
            Alert.alert("Approved", "Site marked as reviewed.");
          } else Alert.alert("Error", formatErrorMessage(res.message));
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!site) return;
    Alert.alert("Delete site?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await deleteSite(site._id);
          if (res.success) {
            Alert.alert("Deleted", "Site removed.");
            navigation.popToTop();
          } else Alert.alert("Error", formatErrorMessage(res.message));
        },
      },
    ]);
  };

  const handleSaveDraft = async () => {
    if (!site) return;
    setActionBusy(true);
    const res = await saveSiteDraft(site._id, unitValues);
    setActionBusy(false);
    if (res.success) Alert.alert("Saved", "Draft saved.");
    else Alert.alert("Error", formatErrorMessage(res.message));
  };

  const handleSubmitWork = () => {
    if (!site) return;
    Alert.alert("Submit work?", "You will not be able to edit afterward.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        style: "destructive",
        onPress: async () => {
          setActionBusy(true);
          const res = await submitSite(site._id, unitValues);
          setActionBusy(false);
          if (res.success && res.data) {
            setSite(res.data);
            Alert.alert("Submitted", "The site is now pending review.");
          } else Alert.alert("Error", formatErrorMessage(res.message));
        },
      },
    ]);
  };

  if (loading) return <LoadingState />;
  if (error || !site) {
    return (
      <ErrorState message={error ?? "Site not found"} onRetry={() => load()} />
    );
  }

  const canAccept =
    isTech && site.status?.assigned?.done && !site.status?.processing?.done;
  const canReview =
    (isManager || isAdmin) &&
    site.status?.completed?.done &&
    !site.status?.reviewed?.done;
  const canAssign = (isManager || isAdmin) && !site.status?.reviewed?.done;
  // Editing site identity/counts is admin-only; managers still assign + review.
  const canEdit = isAdmin;
  const showEntry =
    isTech && site.status?.processing?.done && !site.status?.completed?.done;
  const showSubmitted =
    !!site.status?.completed?.done || !!site.status?.reviewed?.done;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: showEntry ? 120 : 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={colors.brand}
          />
        }
      >
        {/* Header card */}
        <Card>
          <View style={styles.headerCardTop}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.siteTitle}>{site.siteName}</AppText>
              <AppText style={styles.siteSub}>
                {site.tawalId} · {site.siteCity}
              </AppText>
            </View>
            <Chip
              label={rmsScopeLabel(site.rmsScope)}
              color={scopeColor[site.rmsScope]}
              small
            />
          </View>
          <View style={styles.infoGrid}>
            <InfoCell label="Region" value={site.region} />
            <InfoCell label="City" value={site.siteCity} />
            <InfoCell label="TCN" value={site.tcnNumber} />
            <InfoCell label="Scope" value={rmsScopeLabel(site.rmsScope)} />
          </View>
        </Card>

        {/* Status timeline */}
        <Card>
          <AppText style={styles.cardTitle}>Status</AppText>
          <StatusTimeline site={site} />
        </Card>

        {/* Counts */}
        <CountsCard site={site} />

        {/* Role-specific actions */}
        {(canAssign || canEdit) && (
          <Card>
            <AppText style={styles.cardTitle}>Actions</AppText>
            {canAssign && (
              <Button
                title={
                  site.status?.assigned?.done
                    ? "Reassign technician"
                    : "Assign to technician"
                }
                onPress={() => setAssignOpen(true)}
              />
            )}
            {canEdit && (
              <Button
                title="Edit site"
                variant="secondary"
                onPress={() =>
                  navigation.navigate("EditSite", { siteId: site._id })
                }
              />
            )}
            {isAdmin && (
              <Button
                title="Delete site"
                variant="danger"
                onPress={handleDelete}
              />
            )}
          </Card>
        )}

        {/* Dedicated review panel so the reviewer can attach optional
            remarks before approving. */}
        {canReview && (
          <Card>
            <AppText style={styles.cardTitle}>Review submitted work</AppText>
            <AppText style={styles.imgLabel}>Remarks (optional)</AppText>
            <TextInput
              style={styles.remarksInput}
              value={reviewRemarks}
              onChangeText={setReviewRemarks}
              placeholder="Add any review notes or remarks..."
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={2000}
              editable={!actionBusy}
            />
            <View style={{ marginTop: spacing.md }}>
              <Button
                title="Approve Work"
                onPress={handleReview}
                loading={actionBusy}
              />
            </View>
          </Card>
        )}

        {/* Persisted remarks once the site has been approved. */}
        {site.status?.reviewed?.done && site.status.reviewed.remarks ? (
          <Card>
            <AppText style={styles.cardTitle}>Reviewer remarks</AppText>
            <AppText style={styles.remarksText}>
              {site.status.reviewed.remarks}
            </AppText>
          </Card>
        ) : null}

        {canAccept && (
          <Card>
            <AppText style={styles.cardTitle}>Ready to start?</AppText>
            <AppText style={styles.muted}>
              Accept the site to unlock field data entry.
            </AppText>
            <View style={{ marginTop: spacing.md }}>
              <Button
                title="Accept site"
                onPress={handleAccept}
                loading={actionBusy}
              />
            </View>
          </Card>
        )}

        {isTech && !site.status?.assigned?.done && (
          <Card>
            <AppText style={styles.muted}>
              This site has not been assigned to you yet.
            </AppText>
          </Card>
        )}

        {/* Technician field entry */}
        {showEntry && (
          <FieldEntryForm
            site={site}
            values={unitValues}
            onChange={updateUnit}
            onUpdateSimSwapPair={updateSimSwapPair}
            onUpdateSimSwapField={updateSimSwapField}
            onGetLocation={handleGetLocation}
            locationBusy={locationBusy}
            onOpenImage={(u) => setViewerUri(u)}
            saving={actionBusy}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmitWork}
            simOptions={simOptions}
            rmsOptions={rmsOptions}
            smartLockOptions={smartLockOptions}
          />
        )}

        {/* Read-only submitted data */}
        {showSubmitted && (
          <SubmittedDataView site={site} onOpenImage={(u) => setViewerUri(u)} />
        )}

        {user && (
          <AppText style={styles.signedAs}>Signed in as {user.email}</AppText>
        )}
      </ScrollView>

      {/* Sticky bottom action bar for technician entry */}
      {showEntry && (
        <View style={styles.stickyBar}>
          <Button
            title="Save draft"
            variant="secondary"
            onPress={handleSaveDraft}
            loading={actionBusy}
          />
          <Button
            title="Submit work"
            onPress={handleSubmitWork}
            loading={actionBusy}
          />
        </View>
      )}

      <AssignSheet
        open={assignOpen}
        technicians={techs}
        loading={techsLoading}
        currentId={site.status?.assigned?.assignedTo}
        onClose={() => setAssignOpen(false)}
        onPick={handleAssign}
      />

      <ImageViewer uri={viewerUri} onClose={() => setViewerUri(undefined)} />
    </View>
  );
};

export default SiteDetailScreen;

const InfoCell: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.infoCell}>
    <AppText style={styles.infoKey}>{label}</AppText>
    <AppText style={styles.infoVal}>{value}</AppText>
  </View>
);

const CountsCard: React.FC<{ site: Site }> = ({ site }) => {
  const items: Array<[string, number]> = [];
  const push = (k: string, v: number) => {
    if (v > 0) items.push([k, v]);
  };
  push("RMS units", site.numberOfRms);
  push("Expanders", site.numberOfExpanders);
  push("SIMs", site.numberOfSims);
  push("Fence Locks", site.numberOfFenceLocks);
  push("ODUs", site.numberOfOdus);
  push("Tenants", site.numberOfTenants);
  push("Smart Meters", site.numberOfSmartMeters);
  push("CT Splits", site.numberOfCtSplits);
  push("Silbo Gateways", site.numberOfSilboGateways);
  if (items.length === 0) return null;
  return (
    <Card>
      <AppText style={styles.cardTitle}>Equipment counts</AppText>
      <View style={styles.countsGrid}>
        {items.map(([k, v]) => (
          <View key={k} style={styles.countBox}>
            <AppText style={styles.countLabel}>{k}</AppText>
            <AppText style={styles.countValue}>{v}</AppText>
          </View>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },
  signedAs: {
    textAlign: "right",
    color: colors.textFaint,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },

  // Header card
  headerCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  siteTitle: { fontSize: fontSize.h1, fontWeight: "700", color: colors.text },
  siteSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  infoCell: {
    flexBasis: "50%",
    paddingHorizontal: 4,
    paddingVertical: spacing.xs,
  },
  infoKey: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  infoVal: {
    fontSize: fontSize.body,
    color: colors.text,
    marginTop: 2,
    fontWeight: "500",
  },

  // Timeline
  timelineRow: { flexDirection: "row", alignItems: "flex-start" },
  timelineItem: { alignItems: "center", width: 56 },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotPending: { backgroundColor: colors.border },
  timelineLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  timelineAt: {
    fontSize: 8,
    color: colors.textFaint,
    marginTop: 2,
    textAlign: "center",
  },
  timelineConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 15,
  },

  // Counts
  countsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  countBox: {
    flexBasis: "33%",
    padding: 4,
  },
  countLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  countValue: {
    fontSize: fontSize.h2,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },

  // Submitted data
  dataUnit: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  unitHeading: { fontWeight: "700", color: colors.text, marginBottom: 6 },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  dataKey: { color: colors.textMuted, fontSize: fontSize.sm },
  dataVal: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
  },
  thumbRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  thumbCaption: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },

  // Entry
  entryUnit: {
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  imgLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  dropdown: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginTop: 6,
  },
  dropdownPlaceholder: {
    fontSize: fontSize.body,
    color: colors.textFaint,
  },
  dropdownSelectedText: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  dropdownSearchInput: {
    height: 40,
    fontSize: fontSize.body,
    color: colors.text,
  },
  dropdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 6,
    fontWeight: "600",
  },
  remarksInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.bg,
    textAlignVertical: "top",
    marginTop: 6,
  },
  remarksText: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: 20,
  },
  thumbLg: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    marginTop: 6,
  },

  // Sticky bar
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.card,
  },

  // Assign modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,26,46,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.h2, fontWeight: "700", color: colors.text },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
    color: colors.text,
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand, fontWeight: "700" },
  techName: { fontSize: fontSize.body, fontWeight: "600", color: colors.text },
  techEmail: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  // Image viewer
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: { width: "100%", height: "85%" },
  viewerClose: {
    position: "absolute",
    top: 40,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
