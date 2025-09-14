import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions, Alert, TextInput, ActivityIndicator, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import { UploadFiles, AuthFetch } from '../../auth/auth';

const voter_icon = require('../../assets/aadhar.png');
const pancard_icon = require('../../assets/pan.png');

const { width, height } = Dimensions.get('window');
import TermsAndConditionsModal from './TermsAndConditionsModal';

const KYCDetailsScreen = () => {
  const [voterImage, setVoterImage] = useState<{ uri: string, name: string, type?: string } | null>(null);
  const [panImage, setPanImage] = useState<{ uri: string, name: string, type?: string } | null>(null);
  const [voterUploaded, setVoterUploaded] = useState(false);
  const [pancardUploaded, setPancardUploaded] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [voterNumber, setVoterNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleVoterUpload = async () => {
    try {
      const [result] = await pick({
        mode: 'open',
        type: [types.pdf, types.images],
      });
      if (result.uri && result.name) {
        setVoterImage({
          uri: result.uri,
          name: result.name,
          type: result.type || (result.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
        });
        setVoterUploaded(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick Voter ID document. Please try again.');
    }
  };

  const handlePancardUpload = async () => {
    Alert.alert(
      'Upload PAN Card',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              const result = await launchCamera({
                mediaType: 'photo',
                includeBase64: false,
              });

              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];

                setPanImage({
                  uri: asset.uri!,
                  name: asset.fileName || 'pan_camera.jpg',
                  type: asset.type || 'image/jpeg',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('No image selected from camera');
              }
            } catch (error) {
              Alert.alert('Error', 'Camera access failed.');
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                includeBase64: false,
              });

              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];

                setPanImage({
                  uri: asset.uri!,
                  name: asset.fileName || 'pan_gallery.jpg',
                  type: asset.type || 'image/jpeg',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('No image selected from gallery');
              }
            } catch (error) {
              Alert.alert('Error', 'Gallery access failed.');
            }
          },
        },
        {
          text: 'Upload PDF',
          onPress: async () => {
            try {
              const [res] = await pick({
                type: [types.pdf, types.images],
              });

              if (res && res.uri && res.name) {
                setPanImage({
                  uri: res.uri,
                  name: res.name,
                  type: res.type || 'application/pdf',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('Error', 'Invalid file selected. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'PDF selection failed.');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const removeVoterFile = () => {
    setVoterImage(null);
    setVoterUploaded(false);
  };

  const removePanFile = () => {
    setPanImage(null);
    setPancardUploaded(false);
  };

  const viewFile = async (file: { uri: string, type?: string }) => {
    try {
      // For Android, we can try to open the file with the default app
      const supported = await Linking.canOpenURL(file.uri);

      if (supported) {
        await Linking.openURL(file.uri);
      } else {
        Alert.alert('Error', 'Cannot open this file type on your device.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the file.');
    }
  };

  const validateVoterNumber = (number: string) => {
    const voterRegex = /^[A-Z]{3}[0-9]{7}$/;
    return voterRegex.test(number);
  };

  const validatePanNumber = (number: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(number);
  };

  const handleNext = async () => {
    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept the Terms & Conditions.');
      return;
    }

    if (!panNumber && !pancardUploaded) {
      try {
        setLoading(true);
        await AsyncStorage.setItem('currentStep', 'ConfirmationScreen');
        Toast.show({
          type: 'info',
          text1: 'Skipped',
          text2: 'KYC details skipped',
          position: 'top',
          visibilityTime: 3000,
        });

        navigation.navigate('ConfirmationScreen');
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to skip. Please try again.',
          position: 'top',
          visibilityTime: 3000,
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!panNumber || !validatePanNumber(panNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-character PAN number (e.g., ABCDE1234F).');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        return;
      }

      if (!userId) {
        Alert.alert('Error', 'User ID is missing. Please log in again.');
        return;
      }

      if (!panImage?.uri) {
        Alert.alert('Error', 'Please upload a Pancard document.');
        return;
      }

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('panNumber', panNumber);

      if (panImage?.uri) {
        formData.append('panFile', {
          uri: panImage.uri,
          name: panImage.name,
          type: panImage.type || (panImage.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        } as any);
      }

      const response = await UploadFiles('users/addKYCDetails', formData, token);

      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile updated successfully',
          position: 'top',
          visibilityTime: 3000,
        });

        setTimeout(async () => {
          setLoading(false)
          await AsyncStorage.setItem('currentStep', 'ConfirmationScreen');
          navigation.navigate('ConfirmationScreen');
        }, 2000);
      } else {
        Alert.alert(response?.message?.error || 'Error', 'Failed to submit KYC details. Please try again.');
        setLoading(false);
      }
    } catch (error: any) {
      setLoading(false);
      const errorMessage =
        (error?.response?.data?.message as string) ||
        (error?.message as string) ||
        'Failed to submit KYC details. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const fetchUserData = async () => {

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        navigation.navigate("/Login")
      }
      const response = await AuthFetch('users/getKycByUserId', token);

      if (response?.data?.status === 'success') {
        const userData = response?.data?.data;
        // Set existing data if available
        if (userData.panNumber) {
          setPanNumber(userData.panNumber);
        }
        // You might want to handle pre-uploaded files here as well
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch user data.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleBack = () => {
    navigation.navigate('FinancialSetupScreen');
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Details</Text>
      </View>

      <ProgressBar currentStep={getCurrentStepIndex('KYCDetailsScreen')} totalSteps={TOTAL_STEPS} />

      {/* Form Content */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Upload PAN card Proof</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handlePancardUpload}>
            <Icon name="card" size={width * 0.08} color="#00203F" style={styles.icon} />
            <Text style={styles.uploadText}>Upload</Text>
            <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
          </TouchableOpacity>

          {pancardUploaded && panImage && (
            <View style={styles.uploadedFileContainer}>
              <View style={styles.fileInfo}>
                <Icon name={panImage.type?.includes('pdf') ? "file-pdf-box" : "image"} size={20} color="#00203F" />
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {panImage.name}
                </Text>
              </View>

              <View style={styles.fileActions}>
                <TouchableOpacity onPress={() => viewFile(panImage)} style={styles.actionButton}>
                  <Icon name="eye" size={20} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity onPress={removePanFile} style={styles.actionButton}>
                  <Icon name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.label}>Enter PAN Number </Text>
          <TextInput
            style={styles.input}
            value={panNumber}
            onChangeText={setPanNumber}
            placeholder="Enter 10-character PAN Number"
            placeholderTextColor="#9aa0a6"
            keyboardType="default"
            maxLength={10}
            autoCapitalize="characters"
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Icon name="check" size={width * 0.04} color="#fff" />}
              </View>
            </TouchableOpacity>

            <Text style={styles.linkText} onPress={() => Linking.openURL('https://vydhyo.com/terms-and-conditions')}>
              Terms & Conditions
            </Text>
          </View>
        </View>

        {/* Spacer to ensure content is not hidden by the Next button */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DCFCE7',
  },
  linkText: {
    color: '#007BFF',
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    padding: width * 0.02,
  },
  headerTitle: {
    flex: 1,
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginRight: width * 0.06,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.03,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: width * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#000',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: width * 0.03,
    fontSize: width * 0.035,
    marginBottom: height * 0.02,
    color: '#333',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: width * 0.04,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: height * 0.01,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginBottom: height * 0.01,
  },
  uploadText: {
    fontSize: width * 0.035,
    color: '#00203F',
    textAlign: 'center',
    fontWeight: '500',
  },
  acceptedText: {
    fontSize: width * 0.03,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  uploadedFileContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    marginLeft: 10,
    color: '#495057',
    flexShrink: 1,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: height * 0.015,
    marginBottom: height * 0.02,
  },
  checkbox: {
    width: width * 0.06,
    height: width * 0.06,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.03,
  },
  checkboxChecked: {
    backgroundColor: '#00203F',
    borderColor: '#00203F',
  },
  nextButton: {
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: width * 0.05,
    marginBottom: height * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  nextText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  spacer: {
    height: height * 0.1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderText: {
    color: '#fff',
    fontSize: width * 0.04,
    marginTop: height * 0.02,
  },
});

export default KYCDetailsScreen;