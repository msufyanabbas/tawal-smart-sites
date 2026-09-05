import React, { useState } from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import { Button, Field } from "./ui";
import { colors } from "../theme";
import { styles } from "../utils/Styles";

export interface RfpNarrative {
  currentStatus: string;
  nextAction: string;
}

/**
 * Asks for the two narrative fields that land on the report's Site
 * Installation Conclusion slide before the deck is generated.
 *
 * Both are optional — leaving one blank makes the backend fall back to wording
 * derived from the site's workflow status.
 */
const RfpReportSheet: React.FC<{
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onGenerate: (narrative: RfpNarrative) => void;
}> = ({ open, busy, onClose, onGenerate }) => {
  const [currentStatus, setCurrentStatus] = useState("");
  const [nextAction, setNextAction] = useState("");

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={() => !busy && onClose()}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <AppText style={styles.modalTitle}>Generate RFP report</AppText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              disabled={busy}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <AppText style={styles.muted}>
            These appear on the Site Installation Conclusion slide.
          </AppText>

          <Field
            label="Current status"
            value={currentStatus}
            onChangeText={setCurrentStatus}
            placeholder="e.g. Installation completed and verified on site."
            multiline
            numberOfLines={3}
            maxLength={400}
            editable={!busy}
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />

          <Field
            label="Next action"
            value={nextAction}
            onChangeText={setNextAction}
            placeholder="e.g. Awaiting TAWAL confirmation to proceed with PAT."
            multiline
            numberOfLines={3}
            maxLength={400}
            editable={!busy}
            helper="Leave a field blank to use wording derived from this site's status."
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />

          <Button
            title="Generate report"
            onPress={() => onGenerate({ currentStatus, nextAction })}
            loading={busy}
          />
        </View>
      </View>
    </Modal>
  );
};

export default RfpReportSheet;
