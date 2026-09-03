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
import { downloadSiteRfpReport } from "../utils/rfpReport";
import { colors, scopeColor, spacing } from "../theme";
import { styles } from "../utils/Styles";

import AssignSheet from "../components/AssignSheet";
import RfpReportSheet, { RfpNarrative } from "../components/RfpReportSheet";
import CountsCard from "../components/CountsCard";
import InfoCell from "../components/InfoCell";
import StatusTimeline from "../components/StatusTimeLine";
import FieldEntryForm from "../components/FieldEntryForm";
import SubmittedDataView from "../components/SubmittedDataView";

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
  } else if (site.rmsScope === RmsScope.CCTV) {
    out.push({
      key: "cctvCameraUnits",
      label: "CCTV Cameras",
      count: site.numberOfCameras,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "hardDiskUnits",
      label: "Hard Disks",
      count: site.numberOfHardDisks,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "nvrUnits",
      label: "NVRs",
      count: site.numberOfNvr,
      needs: { serial: true, tag: true },
    });
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
  const [rfpBusy, setRfpBusy] = useState(false);
  const [rfpOpen, setRfpOpen] = useState(false);
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
        seeded.numberOfCameras = res.data.numberOfCameras ?? 0;
        seeded.numberOfHardDisks = res.data.numberOfHardDisks ?? 0;
        seeded.numberOfNvr = res.data.numberOfNvr ?? 0;
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

  const uploadImageDraft = async (payload: SiteUnitsPayload) => {
    if (!site) return;
    try {
      await saveSiteDraft(site._id, payload);
    } catch (e) {
      console.warn("Background image upload error:", e);
    }
  };

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

  // Generates the site's RFP deck on the server, saves it to the app cache
  // and hands it to the OS share sheet. A site with many photos takes a few
  // seconds to build, so the button shows a spinner meanwhile.
  const handleGenerateRfp = async (narrative: RfpNarrative) => {
    if (!site || rfpBusy) return;
    setRfpBusy(true);
    try {
      const res = await downloadSiteRfpReport(
        site._id,
        site.siteName,
        narrative,
      );
      if (!res.success) {
        Alert.alert("Report failed", formatErrorMessage(res.message));
      } else {
        setRfpOpen(false);
        if (res.message) Alert.alert("Report ready", res.message);
      }
    } finally {
      setRfpBusy(false);
    }
  };

  const handleSaveDraft = async (silent = false): Promise<boolean> => {
    if (!site) return false;
    setActionBusy(true);
    try {
      const res = await saveSiteDraft(site._id, unitValues);
      setActionBusy(false);
      if (res.success) {
        if (!silent) Alert.alert("Saved", "Draft saved.");
        return true;
      } else {
        Alert.alert("Error", formatErrorMessage(res.message));
        return false;
      }
    } catch (e: any) {
      setActionBusy(false);
      Alert.alert(
        "Error",
        formatErrorMessage(e?.message || "Failed to save draft"),
      );
      return false;
    }
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
  // RFP report generation matches the backend guard on /reports/*:
  // admins and managers only.
  const canGenerateRfp = isAdmin || isManager;
  const showEntry =
    isTech && site.status?.processing?.done && !site.status?.completed?.done;
  const showSubmitted =
    !!site.status?.completed?.done || !!site.status?.reviewed?.done;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom:
            showEntry && site.rmsScope !== RmsScope.SIM_SWAP ? 120 : 40,
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
        {(canAssign || canEdit || canGenerateRfp) && (
          <Card>
            <AppText style={styles.cardTitle}>Actions</AppText>
            {canGenerateRfp && (
              <Button
                title="Generate RFP report"
                variant="secondary"
                onPress={() => setRfpOpen(true)}
              />
            )}
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
            setUnitValues={setUnitValues}
            onUploadImage={uploadImageDraft}
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
      {/* Sticky bottom action bar for non-SIM swap technician entry */}
      {showEntry && site.rmsScope !== RmsScope.SIM_SWAP && (
        <View style={styles.stickyBar}>
          <Button
            title="Save draft"
            variant="secondary"
            onPress={() => handleSaveDraft(false)}
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
      <RfpReportSheet
        open={rfpOpen}
        busy={rfpBusy}
        onClose={() => setRfpOpen(false)}
        onGenerate={handleGenerateRfp}
      />
      <ImageViewer uri={viewerUri} onClose={() => setViewerUri(undefined)} />
    </View>
  );
};

export default SiteDetailScreen;
