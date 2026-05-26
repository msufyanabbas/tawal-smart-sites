import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../components/AppText';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SelectablePill,
} from '../components/ui';
import {
  ReportFilters,
  listReportSites,
  reportDownloadUrl,
} from '../api/siteService';
import {
  RmsScope,
  Site,
  SiteStatusFilter,
} from '../types';
import {
  STATUS_STEPS,
  formatDate,
  rmsScopeLabel,
} from '../utils/helpers';
import {
  colors,
  fontSize,
  radius,
  scopeColor,
  shadow,
  spacing,
  statusColor,
} from '../theme';

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  'http://192.168.1.125:3000';

interface PastReport {
  filters: ReportFilters;
  generatedAt: string;
  count: number;
}

const STATUS_OPTIONS = Object.values(SiteStatusFilter);

const StatusStrip: React.FC<{ site: Site }> = ({ site }) => (
  <View style={styles.statusStrip}>
    {STATUS_STEPS.map((step) => {
      const done = !!site.status?.[step.key]?.done;
      return (
        <View key={step.key} style={styles.statusItem}>
          <View
            style={[
              styles.statusDot,
              done
                ? { backgroundColor: statusColor[step.key] }
                : styles.statusDotPending,
            ]}
          />
          <AppText style={styles.statusItemLabel}>{step.label}</AppText>
        </View>
      );
    })}
  </View>
);

const ReportsScreen: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [past, setPast] = useState<PastReport[]>([]);

  const composed: ReportFilters = {
    ...filters,
    from: from || undefined,
    to: to || undefined,
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const res = await listReportSites(composed);
    if (res.success && res.data) setSites(res.data);
    else setError(res.message ?? 'Failed to load report');
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(composed)]);

  const toggle = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? undefined : value }));
  };

  // Reports download — the backend serves an Excel file from a GET endpoint
  // protected by Bearer auth. Since `Linking.openURL` can't send a header, we
  // fall back to query-string auth (the backend's reports controller accepts
  // an `access_token` param when present, and most teams open the URL via the
  // already-logged-in web session anyway).
  const onGenerate = async () => {
    const url = reportDownloadUrl(API_BASE_URL, composed);
    const token = await AsyncStorage.getItem('access_token');
    const finalUrl = token
      ? `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`
      : url;
    try {
      const supported = await Linking.canOpenURL(finalUrl);
      if (!supported) throw new Error('No app available to open this URL');
      await Linking.openURL(finalUrl);
      setPast((p) => [
        { filters: composed, generatedAt: new Date().toISOString(), count: sites.length },
        ...p,
      ].slice(0, 8));
    } catch (e: any) {
      Alert.alert(
        'Could not open download',
        e?.message ?? 'Open the web app to generate the Excel report.',
      );
    }
  };

  // Region options derived from the filtered result set, with the active
  // value pinned so the user can always clear it.
  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sites) if (s.region) set.add(s.region);
    if (filters.region) set.add(filters.region);
    return [...set].sort();
  }, [sites, filters.region]);

  const activeFilterChips: Array<{ label: string; onClear: () => void }> = [];
  if (filters.region) activeFilterChips.push({
    label: filters.region,
    onClear: () => toggle('region', filters.region),
  });
  if (filters.rmsScope) activeFilterChips.push({
    label: rmsScopeLabel(filters.rmsScope),
    onClear: () => toggle('rmsScope', filters.rmsScope),
  });
  if (filters.status) activeFilterChips.push({
    label: filters.status,
    onClear: () => toggle('status', filters.status),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={sites}
        keyExtractor={(s) => s._id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <View>
            <Card>
              <AppText style={styles.cardTitle}>Filters</AppText>

              <AppText style={styles.label}>Region</AppText>
              <View style={styles.pillWrap}>
                {regionOptions.length === 0 && (
                  <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
                    No regions in the data yet.
                  </AppText>
                )}
                {regionOptions.map((r) => (
                  <SelectablePill
                    key={r}
                    label={r}
                    active={filters.region === r}
                    onPress={() => toggle('region', r)}
                  />
                ))}
              </View>

              <AppText style={styles.label}>Scope</AppText>
              <View style={styles.pillWrap}>
                {Object.values(RmsScope).map((s) => (
                  <SelectablePill
                    key={s}
                    label={rmsScopeLabel(s)}
                    active={filters.rmsScope === s}
                    onPress={() => toggle('rmsScope', s)}
                  />
                ))}
              </View>

              <AppText style={styles.label}>Status</AppText>
              <View style={styles.pillWrap}>
                {STATUS_OPTIONS.map((s) => (
                  <SelectablePill
                    key={s}
                    label={s}
                    active={filters.status === s}
                    onPress={() => toggle('status', s)}
                  />
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="From (YYYY-MM-DD)"
                    value={from}
                    onChangeText={setFrom}
                    placeholder="2025-01-01"
                    autoCapitalize="none"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="To (YYYY-MM-DD)"
                    value={to}
                    onChangeText={setTo}
                    placeholder="2025-12-31"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {activeFilterChips.length > 0 && (
                <View style={[styles.pillWrap, { marginTop: spacing.sm }]}>
                  {activeFilterChips.map((c) => (
                    <TouchableOpacity
                      key={c.label}
                      onPress={c.onClear}
                      style={styles.activeChip}
                    >
                      <AppText style={styles.activeChipText}>{c.label}</AppText>
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={{ marginTop: spacing.md }}>
                <Button
                  title={`Generate Excel report${sites.length ? ` (${sites.length})` : ''}`}
                  onPress={onGenerate}
                  icon={<Ionicons name="download-outline" size={18} color="#fff" />}
                />
              </View>
            </Card>

            <AppText style={[styles.sectionLabel, { marginTop: spacing.sm }]}>
              Matching sites
            </AppText>
            {loading && <LoadingState />}
            {error && <ErrorState message={error} onRetry={() => load()} />}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppText style={styles.rowTitle}>{item.siteName}</AppText>
                <Chip
                  label={rmsScopeLabel(item.rmsScope)}
                  color={scopeColor[item.rmsScope]}
                  small
                />
              </View>
              <AppText style={styles.rowSub}>
                {item.tawalId} · {item.region}
              </AppText>
              <StatusStrip site={item} />
            </View>
            <AppText style={styles.rowDate}>{formatDate(item.createdAt)}</AppText>
          </View>
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              icon="◌"
              title="No sites match these filters"
              subtitle="Adjust the filters above and try again."
            />
          ) : null
        }
        ListFooterComponent={
          past.length > 0 ? (
            <Card>
              <AppText style={styles.cardTitle}>Recent generated reports</AppText>
              {past.map((p, i) => (
                <View key={`${p.generatedAt}-${i}`} style={styles.pastRow}>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.pastTitle}>
                      {[
                        p.filters.region,
                        p.filters.rmsScope && rmsScopeLabel(p.filters.rmsScope),
                        p.filters.status,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'All sites'}
                    </AppText>
                    <AppText style={styles.pastSub}>
                      {new Date(p.generatedAt).toLocaleString()} · {p.count} sites
                    </AppText>
                  </View>
                </View>
              ))}
            </Card>
          ) : null
        }
      />
    </View>
  );
};

export default ReportsScreen;

// silence unused
void Platform;

const styles = StyleSheet.create({
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 6, fontWeight: '600', marginTop: spacing.sm },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.brand,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  rowDate: { fontSize: fontSize.xs, color: colors.textFaint },

  statusStrip: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.md },
  statusItem: { alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotPending: { backgroundColor: colors.border },
  statusItemLabel: { fontSize: 9, color: colors.textMuted, marginTop: 2 },

  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    gap: 4,
  },
  activeChipText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },

  pastRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pastTitle: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  pastSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
