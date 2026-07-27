import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../components/AppText";
import { Chip, EmptyState, LoadingState } from "../components/ui";
import { AppUser } from "../types";
import { colors } from "../theme";
import { styles } from "../utils/Styles";
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
export default AssignSheet;
