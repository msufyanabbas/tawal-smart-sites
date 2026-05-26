import React, { useEffect } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import AppText from "../components/AppText";

export default function FlashScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Create a single fade animation value to control both elements
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Single animation that controls both logo and text
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        // This will be handled by the conditional rendering in AppNavigation
        // Reset and navigate to Auth or Main based on isLoggedIn state
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Auth' }], // This will be overridden by the conditional in AppNavigation
          })
        );
      }, 1000);
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Wrap both elements in an Animated.View to fade them together */}
      <Animated.View style={{ 
        opacity: fadeAnim,
        alignItems: "center"
      }}>
        <Animated.Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
        />
        
        <MaskedView maskElement={<AppText style={styles.tagline}>We simplify your life</AppText>}>
          <LinearGradient
            colors={['#34BEEF', '#483C90', '#EC47DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <AppText style={[styles.tagline, { opacity: 0 }]}>We simplify your life</AppText>
          </LinearGradient>
        </MaskedView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1B2A47", // Navy splash matches the rest of the app
  },
  logo: { 
    width: 200, 
    height: 200, 
    resizeMode: "contain",
    marginBottom: 16 // Added margin to create space between logo and text
  },
  tagline: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  }
});