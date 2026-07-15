import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import AppText from "../components/AppText";
import {
  Button,
  Card,
  Field,
  LoadingState,
  SelectablePill,
  ErrorState,
} from "../components/ui";
import { getSiteById, updateSite } from "../api/siteService";
import { SitesStackParamList } from "../navigation";
import { RmsScope, SiteUpdatePayload } from "../types";
import {
  deriveCounts,
  formatErrorMessage,
  isNumericString,
  rmsScopeLabel,
} from "../utils/helpers";
import { colors, fontSize, radius, spacing } from "../theme";

type Nav = NativeStackNavigationProp<SitesStackParamList, "EditSite">;
type Rt = RouteProp<SitesStackParamList, "EditSite">;

const numericToInt = (v: string): number => {
  const n = parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

interface FormState {
  siteName: string;
  tawalId: string;
  region: string;
  siteCity: string;
  tcnNumber: string;
  rmsScope: RmsScope | "";
  numberOfRms: string;
  numberOfExpanders: string;
  numberOfSims: string;
  hasSmartLock: boolean;
  numberOfFenceLocks: string;
  numberOfOdus: string;
  hasSmartMeter: boolean;
  numberOfTenants: string;
}

const SwitchRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <View style={styles.switchRow}>
    <AppText style={styles.switchLabel}>{label}</AppText>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: colors.brand, false: colors.border }}
      thumbColor="#fff"
    />
  </View>
);

const ReadStat: React.FC<{ label: string; value: number; tint?: string }> = ({
  label,
  value,
  tint,
}) => (
  <View style={styles.statBox}>
    <AppText style={styles.statLabel}>{label}</AppText>
    <AppText style={[styles.statValue, !!tint && { color: tint }]}>
      {value}
    </AppText>
  </View>
);

const EditSiteScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { siteId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getSiteById(siteId);
    if (res.success && res.data) {
      const s = res.data;
      setForm({
        siteName: s.siteName,
        tawalId: s.tawalId,
        region: s.region,
        siteCity: s.siteCity,
        tcnNumber: s.tcnNumber,
        rmsScope: s.rmsScope,
        numberOfRms: String(s.numberOfRms ?? 0),
        numberOfExpanders: String(s.numberOfExpanders ?? 0),
        numberOfSims: String(s.numberOfSims ?? 0),
        hasSmartLock: !!s.hasSmartLock,
        numberOfFenceLocks: String(s.numberOfFenceLocks ?? 0),
        numberOfOdus: String(s.numberOfOdus ?? 0),
        hasSmartMeter: !!s.hasSmartMeter,
        numberOfTenants: String(s.numberOfTenants ?? 0),
      });
    } else {
      setError(res.message ?? "Failed to load site");
    }
    setLoading(false);
  }, [siteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const tenants = form ? numericToInt(form.numberOfTenants) : 0;
  const derived = useMemo(
    () => deriveCounts(form?.rmsScope, tenants),
    [form?.rmsScope, tenants],
  );

  if (loading) return <LoadingState />;
  if (error || !form) {
    return <ErrorState message={error ?? "Site not found"} onRetry={load} />;
  }

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.siteName.trim()) next.siteName = "Required";
    if (!form.tawalId.trim()) next.tawalId = "Required";
    else if (!isNumericString(form.tawalId)) next.tawalId = "Digits only";
    if (!form.region) next.region = "Required";
    if (!form.siteCity.trim()) next.siteCity = "Required";
    if (!form.tcnNumber.trim()) next.tcnNumber = "Required";
    if (!form.rmsScope) next.rmsScope = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: SiteUpdatePayload = {
      siteName: form.siteName.trim(),
      tawalId: form.tawalId.trim(),
      region: form.region.trim(),
      siteCity: form.siteCity.trim(),
      tcnNumber: form.tcnNumber.trim(),
      rmsScope: form.rmsScope as RmsScope,
    };
    if (form.rmsScope === RmsScope.RMS) {
      payload.numberOfRms = numericToInt(form.numberOfRms);
      payload.numberOfExpanders = numericToInt(form.numberOfExpanders);
      payload.numberOfSims = numericToInt(form.numberOfSims);
      payload.hasSmartLock = form.hasSmartLock;
      if (form.hasSmartLock) {
        payload.numberOfFenceLocks = numericToInt(form.numberOfFenceLocks);
        payload.numberOfOdus = numericToInt(form.numberOfOdus);
      }
      payload.hasSmartMeter = form.hasSmartMeter;
      if (form.hasSmartMeter) {
        payload.numberOfTenants = numericToInt(form.numberOfTenants);
      }
    } else if (form.rmsScope === RmsScope.SMART_LOCK) {
      payload.numberOfFenceLocks = numericToInt(form.numberOfFenceLocks);
      payload.numberOfOdus = numericToInt(form.numberOfOdus);
    } else if (
      form.rmsScope === RmsScope.SMART_METER ||
      form.rmsScope === RmsScope.RMS_SERVICE
    ) {
      payload.numberOfTenants = numericToInt(form.numberOfTenants);
    }

    setSaving(true);
    const res = await updateSite(siteId, payload);
    setSaving(false);
    if (res.success) {
      Alert.alert("Saved", "Site updated successfully");
      navigation.goBack();
    } else {
      Alert.alert("Failed", formatErrorMessage(res.message ?? res));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <AppText style={styles.section}>Site information</AppText>

          <Field
            label="Site name *"
            value={form.siteName}
            onChangeText={(t) => setField("siteName", t)}
            error={errors.siteName}
          />
          <Field
            label="Tawal ID *"
            value={form.tawalId}
            keyboardType="numeric"
            onChangeText={(t) => setField("tawalId", t.replace(/[^0-9]/g, ""))}
            error={errors.tawalId}
          />

          <Field
            label="Region *"
            value={form.region}
            onChangeText={(t) => setField("region", t)}
            placeholder="e.g. North, Central, Riyadh Cluster"
            error={errors.region}
          />

          <Field
            label="City *"
            value={form.siteCity}
            onChangeText={(t) => setField("siteCity", t)}
            placeholder="e.g. Riyadh"
            error={errors.siteCity}
          />
          <Field
            label="TCN number *"
            value={form.tcnNumber}
            onChangeText={(t) => setField("tcnNumber", t)}
            error={errors.tcnNumber}
          />

          <AppText style={styles.label}>RMS scope *</AppText>
          <View style={styles.pillWrap}>
            {Object.values(RmsScope).map((s) => (
              <SelectablePill
                key={s}
                label={rmsScopeLabel(s)}
                active={form.rmsScope === s}
                onPress={() => setField("rmsScope", s)}
              />
            ))}
          </View>
          {!!errors.rmsScope && (
            <AppText style={styles.error}>{errors.rmsScope}</AppText>
          )}
        </Card>

        <Card>
          <AppText style={styles.section}>
            {rmsScopeLabel(form.rmsScope as RmsScope)} details
          </AppText>

          {form.rmsScope === RmsScope.RMS && (
            <>
              <Field
                label="Number of RMS units"
                keyboardType="numeric"
                value={form.numberOfRms}
                onChangeText={(t) =>
                  setField("numberOfRms", t.replace(/[^0-9]/g, ""))
                }
              />
              <Field
                label="Number of expanders"
                keyboardType="numeric"
                value={form.numberOfExpanders}
                onChangeText={(t) =>
                  setField("numberOfExpanders", t.replace(/[^0-9]/g, ""))
                }
              />
              <Field
                label="Number of SIMs"
                keyboardType="numeric"
                value={form.numberOfSims}
                onChangeText={(t) =>
                  setField("numberOfSims", t.replace(/[^0-9]/g, ""))
                }
              />
              <SwitchRow
                label="Includes smart lock"
                value={form.hasSmartLock}
                onChange={(v) => setField("hasSmartLock", v)}
              />
              {form.hasSmartLock && (
                <View style={styles.indented}>
                  <Field
                    label="Number of fence locks"
                    keyboardType="numeric"
                    value={form.numberOfFenceLocks}
                    onChangeText={(t) =>
                      setField("numberOfFenceLocks", t.replace(/[^0-9]/g, ""))
                    }
                  />
                  <Field
                    label="Number of ODUs"
                    keyboardType="numeric"
                    value={form.numberOfOdus}
                    onChangeText={(t) =>
                      setField("numberOfOdus", t.replace(/[^0-9]/g, ""))
                    }
                  />
                </View>
              )}
              <SwitchRow
                label="Includes smart meter"
                value={form.hasSmartMeter}
                onChange={(v) => setField("hasSmartMeter", v)}
              />
              {form.hasSmartMeter && (
                <View style={styles.indented}>
                  <Field
                    label="Number of tenants"
                    keyboardType="numeric"
                    value={form.numberOfTenants}
                    onChangeText={(t) =>
                      setField("numberOfTenants", t.replace(/[^0-9]/g, ""))
                    }
                  />
                  <View style={styles.statRow}>
                    <ReadStat
                      label="Smart Meters"
                      value={derived.smartMeters}
                      tint={colors.success}
                    />
                    <ReadStat
                      label="CT Splits"
                      value={derived.ctSplits}
                      tint={colors.cyan}
                    />
                  </View>
                </View>
              )}
            </>
          )}

          {form.rmsScope === RmsScope.SMART_LOCK && (
            <>
              <Field
                label="Number of fence locks"
                keyboardType="numeric"
                value={form.numberOfFenceLocks}
                onChangeText={(t) =>
                  setField("numberOfFenceLocks", t.replace(/[^0-9]/g, ""))
                }
              />
              <Field
                label="Number of ODUs"
                keyboardType="numeric"
                value={form.numberOfOdus}
                onChangeText={(t) =>
                  setField("numberOfOdus", t.replace(/[^0-9]/g, ""))
                }
              />
            </>
          )}

          {form.rmsScope === RmsScope.SMART_METER && (
            <>
              <Field
                label="Number of tenants"
                keyboardType="numeric"
                value={form.numberOfTenants}
                onChangeText={(t) =>
                  setField("numberOfTenants", t.replace(/[^0-9]/g, ""))
                }
              />
              <View style={styles.statRow}>
                <ReadStat
                  label="Smart Meters"
                  value={derived.smartMeters}
                  tint={colors.success}
                />
                <ReadStat
                  label="CT Splits"
                  value={derived.ctSplits}
                  tint={colors.cyan}
                />
              </View>
              <View style={[styles.statRow, { marginTop: spacing.sm }]}>
                <ReadStat
                  label="Silbo Gateways"
                  value={1}
                  tint={colors.violet}
                />
                <ReadStat label="SIM Cards" value={1} tint={colors.brand} />
              </View>
              <AppText style={styles.helper}>
                Silbo gateway and SIM card are fixed at 1 per Smart Meter site.
              </AppText>
            </>
          )}

          {form.rmsScope === RmsScope.RMS_SERVICE && (
            <Field
              label="Number of tenants"
              keyboardType="numeric"
              value={form.numberOfTenants}
              onChangeText={(t) =>
                setField("numberOfTenants", t.replace(/[^0-9]/g, ""))
              }
            />
          )}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => navigation.goBack()}
          fullWidth={false}
        />
        <Button title="Save changes" onPress={handleSave} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
};

export default EditSiteScreen;

const styles = StyleSheet.create({
  section: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 6,
    fontWeight: "600",
  },
  error: { color: colors.danger, fontSize: fontSize.xs, marginTop: 4 },
  helper: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  indented: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.brandSubtle,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  switchLabel: {
    fontSize: fontSize.body,
    color: colors.text,
    fontWeight: "600",
  },
  statRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  statValue: {
    fontSize: fontSize.h1,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
