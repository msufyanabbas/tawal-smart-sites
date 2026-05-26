import React from 'react';
import { View } from 'react-native';

// Old SiteItem referenced the legacy nested schema. The new HomeScreen renders
// cards inline (see screens/HomeScreen.tsx), so this component is kept only as
// a no-op to satisfy any historical imports.
const SiteItem: React.FC = () => <View />;
export default SiteItem;
