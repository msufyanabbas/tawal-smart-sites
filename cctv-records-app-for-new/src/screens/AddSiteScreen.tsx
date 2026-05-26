import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../components/AppText';
import {
  Button,
  Card,
  Field,
  SelectablePill,
} from '../components/ui';
import { createSite } from '../api/siteService';
import { SitesStackParamList } from '../navigation';
import { RmsScope, SiteCreatePayload } from '../types';
import {
  deriveCounts,
  formatErrorMessage,
  isNumericString,
  rmsScopeLabel,
} from '../utils/helpers';
import { colors, fontSize, radius, spacing } from '../theme';

type Nav = NativeStackNavigationProp<SitesStackParamList, 'AddSite'>;

interface FormState {
  siteName: string;
  tawalId: string;
  region: string;
  siteCity: string;
  tcnNumber: string;
  rmsScope: RmsScope | '';
  numberOfRms: string;
  numberOfExpanders: string;
  numberOfSims: string;
  hasSmartLock: boolean;
  numberOfFenceLocks: string;
  numberOfOdus: string;
  hasSmartMeter: boolean;
  numberOfTenants: string;
}

const emptyForm: FormState = {
  siteName: '',
  tawalId: '',
  region: '',
  siteCity: '',
  tcnNumber: '',
  rmsScope: '',
  numberOfRms: '0',
  numberOfExpanders: '0',
  numberOfSims: '0',
  hasSmartLock: false,
  numberOfFenceLocks: '0',
  numberOfOdus: '0',
  hasSmartMeter: false,
  numberOfTenants: '0',
};

const ReadStat: React.FC<{ label: string; value: number; tint?: string }> = ({
  label,
  value,
  tint,
}) => (
  <View style={styles.statBox}>
    <AppText style={styles.statLabel}>{label}</AppText>
    <AppText style={[styles.statValue, !!tint && { color: tint }]}>{value}</AppText>
  </View>
);

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

const StepDots: React.FC<{ step: number; total: number }> = ({ step, total }) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: total }, (_, i) => (
      <View
        key={i}
        style={[styles.dot, i <= step - 1 ? styles.dotActive : null]}
      />
    ))}
  </View>
);

const numericToInt = (v: string): number => {
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

const AddSiteScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const tenants = numericToInt(form.numberOfTenants);
  const derived = useMemo(() => deriveCounts(form.rmsScope, tenants), [form.rmsScope, tenants]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validateStep1 = (): boolean => {
    const next: typeof errors = {};
    if (!form.siteName.trim()) next.siteName = 'Required';
    if (!form.tawalId.trim()) next.tawalId = 'Required';
    else if (!isNumericString(form.tawalId)) next.tawalId = 'Digits only';
    if (!form.region) next.region = 'Required';
    if (!form.siteCity.trim()) next.siteCity = 'Required';
    if (!form.tcnNumber.trim()) next.tcnNumber = 'Required';
    if (!form.rmsScope) next.rmsScope = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    const payload: SiteCreatePayload = {
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
    } else if (form.rmsScope === RmsScope.SMART_METER) {
      payload.numberOfTenants = numericToInt(form.numberOfTenants);
    } else if (form.rmsScope === RmsScope.RMS_SERVICE) {
      payload.numberOfTenants = numericToInt(form.numberOfTenants);
    }

    setSubmitting(true);
    const res = await createSite(payload);
    setSubmitting(false);
    if (res.success && res.data) {
      Alert.alert('Site created', 'The site is ready for assignment.', [
        {
          text: 'View',
          onPress: () =>
            navigation.replace('SiteDetail', { siteId: res.data!._id }),
        },
        { text: 'Back to list', onPress: () => navigation.popToTop() },
      ]);
    } else {
      Alert.alert('Could not create site', formatErrorMessage(res.message ?? res));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <AppText style={styles.stepLabel}>Step {step} of 2</AppText>
          <AppText style={styles.title}>
            {step === 1 ? 'Site information' : `${rmsScopeLabel(form.rmsScope as RmsScope)} details`}
          </AppText>
          <StepDots step={step} total={2} />
        </View>

        {step === 1 ? (
          <Card>
            <Field
              label="Site name *"
              value={form.siteName}
              onChangeText={(t) => setField('siteName', t)}
              error={errors.siteName}
              placeholder="e.g. Riyadh Tower 42"
            />
            <Field
              label="Tawal ID *"
              value={form.tawalId}
              onChangeText={(t) => setField('tawalId', t.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              error={errors.tawalId}
              placeholder="Digits only"
            />

            <Field
              label="Region *"
              value={form.region}
              onChangeText={(t) => setField('region', t)}
              placeholder="e.g. North, Central, Riyadh Cluster"
              error={errors.region}
            />

            <Field
              label="City *"
              value={form.siteCity}
              onChangeText={(t) => setField('siteCity', t)}
              placeholder="e.g. Riyadh"
              error={errors.siteCity}
            />
            <Field
              label="TCN number *"
              value={form.tcnNumber}
              onChangeText={(t) => setField('tcnNumber', t)}
              error={errors.tcnNumber}
            />

            <AppText style={styles.label}>RMS scope *</AppText>
            <View style={styles.pillWrap}>
              {Object.values(RmsScope).map((s) => (
                <SelectablePill
                  key={s}
                  label={rmsScopeLabel(s)}
                  active={form.rmsScope === s}
                  onPress={() => setField('rmsScope', s)}
                />
              ))}
            </View>
            {!!errors.rmsScope && <AppText style={styles.error}>{errors.rmsScope}</AppText>}
          </Card>
        ) : (
          <Card>
            {form.rmsScope === RmsScope.RMS && (
              <>
                <Field
                  label="Number of RMS units"
                  keyboardType="numeric"
                  value={form.numberOfRms}
                  onChangeText={(t) => setField('numberOfRms', t.replace(/[^0-9]/g, ''))}
                />
                <Field
                  label="Number of expanders"
                  keyboardType="numeric"
                  value={form.numberOfExpanders}
                  onChangeText={(t) => setField('numberOfExpanders', t.replace(/[^0-9]/g, ''))}
                />
                <Field
                  label="Number of SIMs"
                  keyboardType="numeric"
                  value={form.numberOfSims}
                  onChangeText={(t) => setField('numberOfSims', t.replace(/[^0-9]/g, ''))}
                />

                <SwitchRow
                  label="Includes smart lock"
                  value={form.hasSmartLock}
                  onChange={(v) => setField('hasSmartLock', v)}
                />
                {form.hasSmartLock && (
                  <View style={styles.indented}>
                    <Field
                      label="Number of fence locks"
                      keyboardType="numeric"
                      value={form.numberOfFenceLocks}
                      onChangeText={(t) => setField('numberOfFenceLocks', t.replace(/[^0-9]/g, ''))}
                    />
                    <Field
                      label="Number of ODUs"
                      keyboardType="numeric"
                      value={form.numberOfOdus}
                      onChangeText={(t) => setField('numberOfOdus', t.replace(/[^0-9]/g, ''))}
                    />
                  </View>
                )}

                <SwitchRow
                  label="Includes smart meter"
                  value={form.hasSmartMeter}
                  onChange={(v) => setField('hasSmartMeter', v)}
                />
                {form.hasSmartMeter && (
                  <View style={styles.indented}>
                    <Field
                      label="Number of tenants"
                      keyboardType="numeric"
                      value={form.numberOfTenants}
                      onChangeText={(t) => setField('numberOfTenants', t.replace(/[^0-9]/g, ''))}
                    />
                    <View style={styles.statRow}>
                      <ReadStat label="Smart Meters" value={derived.smartMeters} tint={colors.success} />
                      <ReadStat label="CT Splits" value={derived.ctSplits} tint={colors.cyan} />
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
                  onChangeText={(t) => setField('numberOfFenceLocks', t.replace(/[^0-9]/g, ''))}
                />
                <Field
                  label="Number of ODUs"
                  keyboardType="numeric"
                  value={form.numberOfOdus}
                  onChangeText={(t) => setField('numberOfOdus', t.replace(/[^0-9]/g, ''))}
                />
              </>
            )}

            {form.rmsScope === RmsScope.SMART_METER && (
              <>
                <Field
                  label="Number of tenants"
                  keyboardType="numeric"
                  value={form.numberOfTenants}
                  onChangeText={(t) => setField('numberOfTenants', t.replace(/[^0-9]/g, ''))}
                />
                <View style={styles.statRow}>
                  <ReadStat label="Smart Meters" value={derived.smartMeters} tint={colors.success} />
                  <ReadStat label="CT Splits" value={derived.ctSplits} tint={colors.cyan} />
                </View>
                <View style={[styles.statRow, { marginTop: spacing.sm }]}>
                  <ReadStat label="Silbo Gateways" value={1} tint={colors.violet} />
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
                onChangeText={(t) => setField('numberOfTenants', t.replace(/[^0-9]/g, ''))}
              />
            )}
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 1 ? (
          <>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => navigation.goBack()}
              fullWidth={false}
            />
            <Button
              title="Next"
              icon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
              onPress={handleNext}
            />
          </>
        ) : (
          <>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => setStep(1)}
              fullWidth={false}
              icon={<Ionicons name="arrow-back" size={18} color={colors.brand} />}
            />
            <Button
              title="Create site"
              onPress={handleSubmit}
              loading={submitting}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddSiteScreen;

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  stepLabel: {
    fontSize: fontSize.xs,
    color: colors.brand,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { fontSize: fontSize.h2, fontWeight: '700', color: colors.text, marginTop: 4 },

  dotsRow: { flexDirection: 'row', marginTop: spacing.sm },
  dot: { width: 22, height: 4, borderRadius: 2, backgroundColor: colors.border, marginRight: 4 },
  dotActive: { backgroundColor: colors.brand },

  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 6, fontWeight: '600' },
  error: { color: colors.danger, fontSize: fontSize.xs, marginTop: 4 },
  helper: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 8 },

  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },

  indented: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.brandSubtle,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  switchLabel: { fontSize: fontSize.body, color: colors.text, fontWeight: '600' },

  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  statValue: { fontSize: fontSize.h1, fontWeight: '700', color: colors.text, marginTop: 4 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
