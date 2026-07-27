import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { Button, Card, Chip, LoadingState, ErrorState } from "../components/ui";
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
import {
  getSimSerials,
  getRmsSerials,
  getSmartLockSerials,
} from "../api/serialService";
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
  SimSwapTenant,
} from "../types";
import { formatErrorMessage, rmsScopeLabel } from "../utils/helpers";
import { colors, scopeColor, spacing } from "../theme";
import { styles } from "../utils/Styles";
import { CommentBox } from "../components/CommentBox";
import { MaterialDetails } from "../components/MaterialDetails";
import AssignSheet from "../components/AssignSheet";
import CountsCard from "../components/CountsCard";
import InfoCell from "../components/InfoCell";
import StatusTimeline from "../components/StatusTimeLine";
import FieldEntryForm from "../components/FieldEntryForm";

type Nav = NativeStackNavigationProp<SitesStackParamList, "SiteDetail">;
type Rt = RouteProp<SitesStackParamList, "SiteDetail">;

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
  const hasTenants = isSimSwap && (site.simSwapTenants?.length ?? 0) > 0;
  const hasSimSwapFields =
    isSimSwap &&
    (site.simSwapSiteType ||
      site.simSwapComments ||
      hasSimSwapPairs ||
      hasTenants);

  // Check if there are material details to show
  const hasMaterialDetails =
    site?.materials?.numberOfRms > 0 ||
    site?.materials?.numberOfExpanders > 0 ||
    site?.materials?.numberOfSims > 0 ||
    site?.materials?.numberOfFenceLocks > 0 ||
    site?.materials?.numberOfShelterLocks > 0 ||
    site?.materials?.numberOfOdus > 0 ||
    site?.materials?.numberOfSmartMeters > 0 ||
    site?.materials?.numberOfCtSplits > 0 ||
    site?.materials?.numberOfSilboGateways > 0;

  const hasComments = !!site.simSwapComments;

  if (
    groups.length === 0 &&
    !hasSimSwapFields &&
    !hasMaterialDetails &&
    !hasComments
  ) {
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
      {/* Material Count */}
      {hasMaterialDetails && (
        <Card>
          <AppText style={styles.cardTitle}>Material Count</AppText>
          <View style={{ gap: spacing.sm }}>
            {site?.materials?.numberOfRms > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>RMS</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfRms)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfExpanders > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Expanders</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfExpanders)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfSims > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>SIMs</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfSims)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfFenceLocks > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Fence Locks</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfFenceLocks)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfShelterLocks > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Shelter Locks</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfShelterLocks)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfOdus > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>ODUs</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfOdus)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfSmartMeters > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Smart Meters</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfSmartMeters)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfCtSplits > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>CT Splits</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfCtSplits)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfSilboGateways > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Silbo Gateways</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfSilboGateways)}
                </AppText>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Comments */}
      {hasComments && (
        <Card>
          <AppText style={styles.cardTitle}>Comments</AppText>
          <AppText style={[styles.dataVal, { textAlign: "left" }]}>
            {site.simSwapComments}
          </AppText>
        </Card>
      )}

      {hasSimSwapFields && (
        <Card>
          <AppText style={styles.cardTitle}>SIM Swap Details</AppText>

          {/* CT Main Photo */}
          {!!site.simSwapCtMainPhoto && (
            <View style={{ marginBottom: spacing.sm }}>
              <AppText style={styles.dataKey}>CT Main Photo</AppText>
              <TouchableOpacity
                onPress={() => onOpenImage(site.simSwapCtMainPhoto!)}
                style={{ marginTop: spacing.xs }}
              >
                <Image
                  source={{ uri: site.simSwapCtMainPhoto }}
                  style={styles.thumbLg}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Meter Photo */}
          {!!site.simSwapMeterPhoto && (
            <View style={{ marginBottom: spacing.sm }}>
              <AppText style={styles.dataKey}>Meter Photo</AppText>
              <TouchableOpacity
                onPress={() => onOpenImage(site.simSwapMeterPhoto!)}
                style={{ marginTop: spacing.xs }}
              >
                <Image
                  source={{ uri: site.simSwapMeterPhoto }}
                  style={styles.thumbLg}
                />
              </TouchableOpacity>
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

          {site.simSwapTenants && site.simSwapTenants.length > 0 && (
            <View
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
              }}
            >
              <AppText style={styles.cardTitle}>Tenant Details</AppText>
              {site.simSwapTenants.map((t, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dataUnit,
                    {
                      backgroundColor: "#f8fafc",
                      padding: spacing.md,
                      borderRadius: 8,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <AppText
                    style={[
                      styles.unitHeading,
                      { fontSize: 13, marginBottom: spacing.xs },
                    ]}
                  >
                    Tenant #{idx + 1}
                  </AppText>
                  <View style={{ marginBottom: spacing.xs }}>
                    <AppText style={styles.dataKey}>Tenant Name</AppText>
                    <AppText style={[styles.dataVal, { textAlign: "left" }]}>
                      {t.tenantName || "Not specified"}
                    </AppText>
                  </View>
                  <View style={{ marginBottom: spacing.xs }}>
                    <AppText style={styles.dataKey}>Tenant CT Capacity</AppText>
                    {(() => {
                      const capacities = t.tenantCtCapacities ?? [];
                      const phasePhotos = t.ctPhasePhotos ?? [];
                      return [1, 2, 3].map((phaseNum) => (
                        <View
                          key={phaseNum}
                          style={{ marginBottom: spacing.sm }}
                        >
                          <AppText
                            style={[
                              styles.dataVal,
                              {
                                textAlign: "left",
                                fontSize: 13,
                                marginTop: spacing.xs / 2,
                              },
                            ]}
                          >
                            Phase #{phaseNum}:{" "}
                            {capacities[phaseNum - 1] || "Not specified"}
                          </AppText>
                          {!!phasePhotos[phaseNum - 1] && (
                            <TouchableOpacity
                              onPress={() =>
                                onOpenImage(phasePhotos[phaseNum - 1])
                              }
                              style={{ marginTop: spacing.xs }}
                            >
                              <Image
                                source={{ uri: phasePhotos[phaseNum - 1] }}
                                style={styles.thumbLg}
                              />
                              <AppText style={styles.thumbCaption}>
                                Phase #{phaseNum} photo
                              </AppText>
                            </TouchableOpacity>
                          )}
                        </View>
                      ));
                    })()}
                  </View>
                </View>
              ))}
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

  const [simOptions, setSimOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [rmsOptions, setRmsOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [smartLockOptions, setSmartLockOptions] = useState<
    { label: string; value: string }[]
  >([]);

  useEffect(() => {
    if (!isTech) return;
    getSimSerials().then((res) => {
      if (res.success && res.data) {
        setSimOptions(
          res.data.map((s) => ({
            label: s.serialNumber,
            value: s.serialNumber,
          })),
        );
      }
    });
    getRmsSerials().then((res) => {
      if (res.success && res.data) {
        setRmsOptions(
          res.data.map((s) => ({
            label: s.serialNumber,
            value: s.serialNumber,
          })),
        );
      }
    });
    getSmartLockSerials().then((res) => {
      if (res.success && res.data) {
        setSmartLockOptions(
          res.data.map((s) => ({
            label: s.serialNumber,
            value: s.serialNumber,
          })),
        );
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
        (seeded as any).simSwapCtMainPhoto = res.data.simSwapCtMainPhoto ?? "";
        (seeded as any).simSwapMeterPhoto = res.data.simSwapMeterPhoto ?? "";
        // Seed counts
        seeded.numberOfRms = res.data.numberOfRms ?? 0;
        seeded.numberOfExpanders = res.data.numberOfExpanders ?? 0;
        seeded.numberOfSims = res.data.numberOfSims ?? 0;
        seeded.numberOfFenceLocks = res.data.numberOfFenceLocks ?? 0;
        seeded.numberOfShelterLocks = res.data.numberOfShelterLocks ?? 0;
        seeded.numberOfOdus = res.data.numberOfOdus ?? 0;
        seeded.numberOfSmartMeters = res.data.numberOfSmartMeters ?? 0;
        seeded.numberOfCtSplits = res.data.numberOfCtSplits ?? 0;
        seeded.numberOfSilboGateways = res.data.numberOfSilboGateways ?? 0;
        // Seed materials sub-object from previously saved technician materials
        seeded.materials = {
          numberOfRms: res.data.materials?.numberOfRms ?? 0,
          numberOfExpanders: res.data.materials?.numberOfExpanders ?? 0,
          numberOfSims: res.data.materials?.numberOfSims ?? 0,
          numberOfFenceLocks: res.data.materials?.numberOfFenceLocks ?? 0,
          numberOfShelterLocks: res.data.materials?.numberOfShelterLocks ?? 0,
          numberOfOdus: res.data.materials?.numberOfOdus ?? 0,
          numberOfSmartMeters: res.data.materials?.numberOfSmartMeters ?? 0,
          numberOfCtSplits: res.data.materials?.numberOfCtSplits ?? 0,
          numberOfSilboGateways: res.data.materials?.numberOfSilboGateways ?? 0,
        };
        const existingTenants = res.data.simSwapTenants ?? [];
        const tenantBlanks = Array.from(
          { length: res.data.numberOfTenants ?? 0 },
          () => ({
            tenantName: "",
            tenantCtCapacities: ["", "", ""],
            meterPhoto: "",
            ctPhasePhotos: ["", "", ""],
          }),
        );
        (seeded as any).simSwapTenants = tenantBlanks.map((blank, i) => {
          const existing = existingTenants[i] ?? {};
          return {
            tenantName: existing.tenantName ?? blank.tenantName,
            tenantCtCapacities:
              existing.tenantCtCapacities ?? blank.tenantCtCapacities,
            meterPhoto: existing.meterPhoto ?? blank.meterPhoto,
            ctPhasePhotos: existing.ctPhasePhotos ?? blank.ctPhasePhotos,
          };
        });
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

  const updateSimSwapTenant = (idx: number, patch: Partial<SimSwapTenant>) => {
    setUnitValues((prev) => {
      const tenants = [...(prev.simSwapTenants ?? [])];
      tenants[idx] = { ...tenants[idx], ...patch };
      return { ...prev, simSwapTenants: tenants };
    });
  };

  const updateCtMainPhoto = (uri: string) => {
    setUnitValues((prev) => ({ ...prev, simSwapCtMainPhoto: uri }));
  };

  const updateSimSwapMeterPhoto = (uri: string) => {
    setUnitValues((prev) => ({ ...prev, simSwapMeterPhoto: uri }));
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
            <InfoCell styles={styles} label="Region" value={site.region} />
            <InfoCell styles={styles} label="City" value={site.siteCity} />
            <InfoCell styles={styles} label="TCN" value={site.tcnNumber} />
            <InfoCell
              styles={styles}
              label="Scope"
              value={rmsScopeLabel(site.rmsScope)}
            />
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
            relevantUnitGroups={relevantUnitGroups}
            onChange={updateUnit}
            onUpdateSimSwapPair={updateSimSwapPair}
            onUpdateSimSwapField={updateSimSwapField}
            onUpdateSimSwapTenant={updateSimSwapTenant}
            onUpdateSimSwapMeterPhoto={updateSimSwapMeterPhoto}
            onUpdateCtMainPhoto={updateCtMainPhoto}
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
        {/* //  if the site is simswap add a comment fiel to add comments  */}
        {site.rmsScope === RmsScope.SIM_SWAP && isTech && showEntry && (
          <>
            <MaterialDetails
              label="Material Details"
              value={unitValues}
              setUnitValues={setUnitValues}
              styles={styles}
              colors={colors}
            />
            <CommentBox
              label="Comments"
              value={(unitValues as any).simSwapComments ?? ""}
              onChange={(t) =>
                setUnitValues((prev) => ({ ...prev, simSwapComments: t }))
              }
              styles={styles}
              colors={colors}
            />
          </>
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
