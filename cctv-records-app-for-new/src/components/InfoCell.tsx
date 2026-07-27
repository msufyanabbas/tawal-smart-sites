import { View } from "react-native";
import AppText from "./AppText";

const InfoCell: React.FC<{
  label: string;
  value: string;
  styles: any;
}> = ({ label, value, styles }) => (
  <View style={styles.infoCell}>
    <AppText style={styles.infoKey}>{label}</AppText>
    <AppText style={styles.infoVal}>{value}</AppText>
  </View>
);
export default InfoCell;
