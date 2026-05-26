import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../components/AppText';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Button,
} from '../components/ui';
import { getSites } from '../api/siteService';
import { useAuth } from '../contexts/AuthContext';
import { Role, RmsScope, Site } from '../types';
import { colors, fontSize, radius, scopeColor, spacing, statusColor } from '../theme';
import {
  currentStage,
  formatDate,
  rmsScopeLabel,
  roleLabel,
} from '../utils/helpers';

const StatTile: React.FC<{ label: string; value: number | string; tint?: string }> = ({
  label,
  value,
  tint = colors.brand,
}) => (
  <View style={styles.tile}>
    <View style={[styles.tileBar, { backgroundColor: tint }]} />
    <View style={{ flex: 1 }}>
      <AppText style={styles.tileLabel}>{label}</AppText>
      <AppText style={styles.tileValue}>{value}</AppText>
    </View>
  </View>
);

// Tappable region card grid — derived from whatever region strings exist in
// the data, sorted alphabetically. Tapping a card jumps to the SitesTab with
// the region pre-filter param so the list opens already filtered.
const SitesByRegion: React.FC<{
  sites: Site[];
  onOpenRegion: (region: string) => void;
}> = ({ sites, onOpenRegion }) => {
  const counts = React.useMemo(() => {
    const tally: Record<string, number> = {};
    for (const s of sites) {
      if (!s.region) continue;
      tally[s.region] = (tally[s.region] ?? 0) + 1;
    }
    return Object.entries(tally)
      .map(([region, n]) => ({ region, n }))
      .sort((a, b) => a.region.localeCompare(b.region));
  }, [sites]);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <AppText style={[styles.cardTitle, { marginLeft: 4 }]}>Sites by region</AppText>
      {counts.length === 0 ? (
        <Card>
          <AppText style={{ color: colors.textMuted }}>No sites created yet</AppText>
        </Card>
      ) : (
        <View style={styles.regionGrid}>
          {counts.map((c) => (
            <TouchableOpacity
              key={c.region}
              style={styles.regionCard}
              activeOpacity={0.85}
              onPress={() => onOpenRegion(c.region)}
            >
              <AppText style={styles.regionLabel}>{c.region}</AppText>
              <AppText style={styles.regionValue}>{c.n}</AppText>
              <AppText style={styles.regionCta}>View sites →</AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const ScopeBreakdown: React.FC<{ sites: Site[] }> = ({ sites }) => {
  const counts = Object.values(RmsScope).map((s) => ({
    scope: s,
    n: sites.filter((x) => x.rmsScope === s).length,
  }));
  return (
    <Card>
      <AppText style={styles.cardTitle}>Sites by scope</AppText>
      <View style={{ marginTop: spacing.sm }}>
        {counts.map((c) => (
          <View key={c.scope} style={styles.breakdownRow}>
            <Chip label={rmsScopeLabel(c.scope)} color={scopeColor[c.scope]} small />
            <AppText style={styles.breakdownValue}>{c.n}</AppText>
          </View>
        ))}
      </View>
    </Card>
  );
};

const RecentList: React.FC<{
  title: string;
  sites: Site[];
  onOpen: (id: string) => void;
}> = ({ title, sites, onOpen }) => (
  <Card>
    <AppText style={styles.cardTitle}>{title}</AppText>
    {sites.length === 0 ? (
      <AppText style={styles.muted}>No sites yet</AppText>
    ) : (
      sites.slice(0, 5).map((s) => {
        const stage = currentStage(s) as keyof typeof statusColor;
        return (
          <TouchableOpacity
            key={s._id}
            style={styles.recentRow}
            activeOpacity={0.7}
            onPress={() => onOpen(s._id)}
          >
            <View style={{ flex: 1 }}>
              <AppText style={styles.recentName}>{s.siteName}</AppText>
              <AppText style={styles.recentSub}>
                {s.tawalId} · {s.region} · {formatDate(s.createdAt)}
              </AppText>
            </View>
            <Chip label={stage} color={statusColor[stage] ?? colors.brand} small />
          </TouchableOpacity>
        );
      })
    )}
  </Card>
);

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, role } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const res = await getSites();
    if (res.success && res.data) setSites(res.data);
    else setError(res.message ?? 'Failed to load sites');
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stageCount = (key: string) =>
    sites.filter((s) => currentStage(s) === key).length;

  const openSite = (id: string) => navigation.navigate('SiteDetail', { siteId: id });

  // Switch tabs from inside a nested stack: `jumpTo` is only available on the
  // tab navigator, so dispatch to the parent. Optionally seeds the SitesList
  // route with a region pre-filter for the dashboard drill-down.
  const jumpToSites = (region?: string) =>
    navigation.getParent()?.dispatch(
      CommonActions.navigate({
        name: 'SitesTab',
        params: region
          ? { screen: 'SitesList', params: { region } }
          : undefined,
      }),
    );

  const openRegion = (region: string) => jumpToSites(region);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor={colors.brand}
        />
      }
    >
      <View style={{ marginBottom: spacing.md }}>
        <AppText style={styles.greeting}>
          Welcome, {user?.name || user?.email?.split('@')[0]}
        </AppText>
        <AppText style={styles.sub}>
          {role ? roleLabel(role) : ''} · {sites.length} sites visible
        </AppText>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <>
          {role === Role.ADMIN && (
            <>
              <View style={styles.statGrid}>
                <StatTile label="Total Sites" value={sites.length} tint={colors.brand} />
                <StatTile label="Assigned" value={stageCount('assigned')} tint={colors.cyan} />
                <StatTile label="In Progress" value={stageCount('processing')} tint={colors.warning} />
                <StatTile label="Completed" value={stageCount('completed')} tint={colors.success} />
                <StatTile label="Reviewed" value={stageCount('reviewed')} tint={colors.violet} />
              </View>
              <SitesByRegion sites={sites} onOpenRegion={openRegion} />
              <ScopeBreakdown sites={sites} />
              <RecentList title="Recent sites" sites={sites} onOpen={openSite} />
            </>
          )}

          {role === Role.MANAGER && (
            <>
              <View style={styles.statGrid}>
                <StatTile label="Sites to Assign" value={stageCount('created')} tint={colors.brand} />
                <StatTile label="In Progress" value={stageCount('processing')} tint={colors.warning} />
                <StatTile label="Pending Review" value={stageCount('completed')} tint={colors.cyan} />
              </View>
              <SitesByRegion sites={sites} onOpenRegion={openRegion} />
              <Card>
                <AppText style={styles.cardTitle}>Quick actions</AppText>
                <Button title="Assign Sites" onPress={() => jumpToSites()} />
              </Card>
              <RecentList
                title="Recent assigned sites"
                sites={sites.filter((s) => s.status?.assigned?.done)}
                onOpen={openSite}
              />
            </>
          )}

          {role === Role.TECHNICIAN && (
            <>
              <View style={styles.statGrid}>
                <StatTile label="Assigned to Me" value={sites.length} tint={colors.brand} />
                <StatTile label="In Progress" value={stageCount('processing')} tint={colors.warning} />
                <StatTile
                  label="Completed"
                  value={stageCount('completed') + stageCount('reviewed')}
                  tint={colors.success}
                />
              </View>
              <Card>
                <AppText style={styles.cardTitle}>Quick actions</AppText>
                <Button title="View My Sites" onPress={() => jumpToSites()} />
              </Card>
              <RecentList title="My active sites" sites={sites} onOpen={openSite} />
              {sites.length === 0 && (
                <EmptyState
                  icon="◌"
                  title="Nothing assigned yet"
                  subtitle="You'll see sites here once a manager assigns one to you."
                />
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
};

export default DashboardScreen;

// silence unused
void Ionicons;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  greeting: { fontSize: fontSize.h1, fontWeight: '700', color: colors.text },
  sub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    margin: spacing.xs,
    flexBasis: '47%',
    flexGrow: 1,
  },
  tileBar: { width: 4, height: '100%', borderRadius: 2, marginRight: spacing.md, minHeight: 36 },
  tileLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '600' },
  tileValue: { fontSize: fontSize.h1, fontWeight: '700', color: colors.text, marginTop: 2 },

  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },

  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  regionCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    margin: spacing.xs,
  },
  regionLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '600' },
  regionValue: { fontSize: fontSize.h1, fontWeight: '700', color: colors.text, marginTop: 4 },
  regionCta: { fontSize: fontSize.xs, color: colors.brand, fontWeight: '700', marginTop: 6 },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  recentName: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  recentSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
