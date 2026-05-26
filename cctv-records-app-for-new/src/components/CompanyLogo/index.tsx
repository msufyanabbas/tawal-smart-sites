import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import GradientText from '../GradientText'; // Adjust the path if needed

const CompanyLogo = () => {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.imageRow}>
        <Image
          source={require('../../../assets/smart-life.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <GradientText text="X" />
        <Image
          source={require('../../../assets/tawal.png')}
          style={styles.tawalLogo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  logo: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 50,
  },
  tawalLogo: {
    width: 100,
    height: 100,
    margin: 5,
  },
});

export default CompanyLogo;
