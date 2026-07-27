import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../components/AppText";

import { Site } from "../types";
import { STATUS_STEPS, formatDateTime } from "../utils/helpers";
import { colors, statusColor } from "../theme";
import { styles } from "../utils/Styles";

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
export default StatusTimeline;
