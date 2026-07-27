import { View } from "react-native";

import AppText from "../components/AppText";
import { Card } from "../components/ui";

import { Site } from "../types";

import { styles } from "../utils/Styles";
const CountsCard: React.FC<{ site: Site }> = ({ site }) => {
  const items: Array<[string, number]> = [];
  const push = (k: string, v: number) => {
    if (v > 0) items.push([k, v]);
  };
  push("RMS units", site.numberOfRms);
  push("Expanders", site.numberOfExpanders);
  push("SIMs", site.numberOfSims);
  push("Fence Locks", site.numberOfFenceLocks);
  push("Shelter Locks", site.numberOfShelterLocks);
  push("ODUs", site.numberOfOdus);
  push("Tenants", site.numberOfTenants);
  push("Smart Meters", site.numberOfSmartMeters);
  push("CT Splits", site.numberOfCtSplits);
  push("Silbo Gateways", site.numberOfSilboGateways);
  if (items.length === 0) return null;
  return (
    <Card>
      <AppText style={styles.cardTitle}>Equipment counts</AppText>
      <View style={styles.countsGrid}>
        {items.map(([k, v]) => (
          <View key={k} style={styles.countBox}>
            <AppText style={styles.countLabel}>{k}</AppText>
            <AppText style={styles.countValue}>{v}</AppText>
          </View>
        ))}
      </View>
    </Card>
  );
};
export default CountsCard;
