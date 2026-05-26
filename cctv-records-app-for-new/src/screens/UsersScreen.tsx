import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../components/AppText';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SelectablePill,
} from '../components/ui';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '../api/userService';
import { useAuth } from '../contexts/AuthContext';
import { AppUser, Role } from '../types';
import {
  formatDate,
  formatErrorMessage,
  roleLabel,
} from '../utils/helpers';
import {
  colors,
  fontSize,
  radius,
  roleColor,
  shadow,
  spacing,
} from '../theme';

const ROLE_OPTIONS: Role[] = [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN];

const UsersScreen: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === Role.ADMIN;

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const res = await listUsers();
    if (res.success && res.data) setUsers(res.data);
    else setError(res.message ?? 'Failed to load users');
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (q && !(`${u.name} ${u.email}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  const onDelete = (u: AppUser) => {
    Alert.alert('Delete user', `Delete ${u.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteUser(u.id);
          if (res.success) load();
          else Alert.alert('Error', formatErrorMessage(res.message));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Field
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email"
          style={{ marginBottom: 0 }}
        />
        <View style={{ height: spacing.sm }} />
        <View style={styles.pillWrap}>
          <SelectablePill
            label="All roles"
            active={roleFilter === ''}
            onPress={() => setRoleFilter('')}
          />
          {ROLE_OPTIONS.map((r) => (
            <SelectablePill
              key={r}
              label={roleLabel(r)}
              active={roleFilter === r}
              onPress={() => setRoleFilter(r)}
            />
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="◌"
              title={users.length === 0 ? 'No users yet' : 'No users match the filters'}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <AppText style={styles.avatarText}>
                  {(item.name || item.email).slice(0, 1).toUpperCase()}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.name}>{item.name || '—'}</AppText>
                <AppText style={styles.email}>{item.email}</AppText>
                <View style={styles.metaRow}>
                  <Chip
                    label={roleLabel(item.role)}
                    color={roleColor[item.role]}
                    small
                  />
                  <AppText style={styles.muted}>{formatDate(item.createdAt)}</AppText>
                </View>
              </View>
              {isAdmin && (
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => setEditing(item)} hitSlop={8}>
                    <Ionicons name="create-outline" size={22} color={colors.brand} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={22} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <UserModal
        open={createOpen}
        user={null}
        onClose={() => setCreateOpen(false)}
        onSaved={load}
      />
      <UserModal
        open={!!editing}
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    </View>
  );
};

const UserModal: React.FC<{
  open: boolean;
  user: AppUser | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, user, onClose, onSaved }) => {
  const isEdit = !!user;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.TECHNICIAN);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setPassword('');
      setRole(user?.role ?? Role.TECHNICIAN);
    }
  }, [open, user]);

  const onSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Missing fields', 'Name and email are required');
      return;
    }
    if (!isEdit && password.length < 8) {
      Alert.alert('Password too short', 'Password must be 8+ characters');
      return;
    }
    setBusy(true);
    if (isEdit && user) {
      const payload: any = { name, email, role };
      if (password.length >= 8) payload.password = password;
      const res = await updateUser(user.id, payload);
      setBusy(false);
      if (res.success) { onClose(); onSaved(); }
      else Alert.alert('Error', formatErrorMessage(res.message));
    } else {
      const res = await createUser({ name, email, password, role, isApproved: true });
      setBusy(false);
      if (res.success) { onClose(); onSaved(); }
      else Alert.alert('Error', formatErrorMessage(res.message));
    }
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <AppText style={styles.modalTitle}>{isEdit ? 'Edit user' : 'New user'}</AppText>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Field label="Name" value={name} onChangeText={setName} />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label={isEdit ? 'New password (optional)' : 'Password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={isEdit ? 'Leave blank to keep current' : '8+ characters'}
          />

          <AppText style={styles.label}>Role</AppText>
          <View style={styles.pillWrap}>
            {ROLE_OPTIONS.map((r) => (
              <SelectablePill
                key={r}
                label={roleLabel(r)}
                active={role === r}
                onPress={() => setRole(r)}
              />
            ))}
          </View>

          <View style={{ height: spacing.md }} />
          <Button title={isEdit ? 'Save changes' : 'Create user'} loading={busy} onPress={onSave} />
        </View>
      </View>
    </Modal>
  );
};

export default UsersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 6, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadow.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brand, fontWeight: '700', fontSize: fontSize.lg },
  name: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  email: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  muted: { fontSize: fontSize.xs, color: colors.textFaint },
  actions: { flexDirection: 'row', gap: spacing.md, paddingLeft: spacing.sm },

  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.brand,
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,26,46,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.h2, fontWeight: '700', color: colors.text },
});
