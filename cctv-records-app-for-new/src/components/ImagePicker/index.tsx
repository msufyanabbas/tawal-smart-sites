import React, { useState } from 'react';
import { TouchableOpacity, Image, StyleSheet, View, ActionSheetIOS, Platform, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AppText from '../AppText';

interface CustomImagePickerProps {
  imageUri?: string;
  onImageSelected: (uri: string) => void;
  label?: string;
}

const CustomImagePicker: React.FC<CustomImagePickerProps> = ({ imageUri, onImageSelected, label }) => {
  const [loading, setLoading] = useState(false);

  const requestCameraPermission = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      alert('Permission to access camera is required!');
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async () => {
    const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!galleryPermission.granted) {
      alert('Permission to access camera roll is required!');
      return false;
    }
    return true;
  };

  const processImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets[0]) {
      const selectedImage = result.assets[0];
      // Prefer the file URI so on-device OCR (ML Kit) can read the image.
      if (selectedImage.uri) {
        onImageSelected(selectedImage.uri);
      } else if (selectedImage.base64) {
        onImageSelected(`data:image/jpeg;base64,${selectedImage.base64}`);
      }
    }
  };

  const takePhoto = async () => {
    try {
      setLoading(true);
      const hasPermission = await requestCameraPermission();
      
      if (!hasPermission) {
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      setLoading(false);
      processImageResult(result);
    } catch (error) {
      setLoading(false);
      console.error('Error taking photo:', error);
    }
  };

  const pickImage = async () => {
    try {
      setLoading(true);
      const hasPermission = await requestGalleryPermission();
      
      if (!hasPermission) {
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      setLoading(false);
      processImageResult(result);
    } catch (error) {
      setLoading(false);
      console.error('Error picking image:', error);
    }
  };

  const showImageSourceOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
          }
        }
      );
    } else {
      // For Android
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Gallery', onPress: pickImage },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.imagePicker} onPress={showImageSourceOptions}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholderContainer}>
            <AppText style={styles.placeholderText}>{label || 'Select Image'}</AppText>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row', // ✅ horizontal layout
    alignItems: 'center',
    marginVertical: 10,
  },
  label: {
    marginRight: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    width: 100,
  },
  imagePicker: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#666',
  },
});

export default CustomImagePicker;
