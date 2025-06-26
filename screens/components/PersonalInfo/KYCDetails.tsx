import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import LoadingScreen from '../../utility/LoadingScreen';

const voter_icon = require('../../assets/aadhar.png'); // Update with actual voter ID icon if available
const pancard_icon = require('../../assets/pan.png');

const { width, height } = Dimensions.get('window');

const KYCDetailsScreen = () => {
  const [voterImage, setVoterImage] = useState<{
    uri: string;
    name: string;
  } | null>(null);
  const [panImage, setPanImage] = useState<{
    uri: string;
    name: string;
  } | null>(null);
  const [voterUploaded, setVoterUploaded] = useState(false);
  const [pancardUploaded, setPancardUploaded] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [voterNumber, setVoterNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);

  const handleVoterUpload = async () => {
    try {
      const [result] = await pick({
        mode: 'open',
        type: [types.pdf, types.images],
      });
      if (result.uri && result.name) {
        setVoterImage({ uri: result.uri, name: result.name });
        setVoterUploaded(true);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to pick Voter ID document. Please try again.',
      );
      console.error('Voter ID upload error:', error);
    }
  };

  const handlePancardUpload = async () => {
    try {
      const [result] = await pick({
        mode: 'open',
        type: [types.pdf, types.images],
      });
      if (result.uri && result.name) {
        setPanImage({ uri: result.uri, name: result.name });
        setPancardUploaded(true);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to pick Pancard document. Please try again.',
      );
      console.error('Pancard upload error:', error);
    }
  };

  const validateVoterNumber = (number: string) => {
    // Assuming Voter ID is 10 characters (e.g., ABC1234567)
    const voterRegex = /^[A-Z]{3}[0-9]{7}$/;
    return voterRegex.test(number);
  };

  const validatePanNumber = (number: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(number);
  };

  const handleNext = async () => {
    if (!voterUploaded) {
      Alert.alert('Error', 'Please upload Voter ID document.');
      return;
    }
    if (!pancardUploaded) {
      Alert.alert('Error', 'Please upload Pancard document.');
      return;
    }
    if (!voterNumber || !validateVoterNumber(voterNumber)) {
      Alert.alert(
        'Error',
        'Please enter a valid 10-character Voter ID number (e.g., ABC1234567).',
      );
      return;
    }
    if (!panNumber || !validatePanNumber(panNumber)) {
      Alert.alert(
        'Error',
        'Please enter a valid 10-character PAN number (e.g., ABCDE1234F).',
      );
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept the Terms & Conditions.');
      return;
    }
    setLoading(true);

    // Prepare FormData for Axios POST request
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      console.log('userId', userId);
      if (!token) {
        Alert.alert(
          'Error',
          'Authentication token is missing. Please log in again.',
        );
        return;
      }
      if (!userId) {
        Alert.alert('Error', 'User ID is missing. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('voterNumber', voterNumber);
      formData.append('panNumber', panNumber);
      if (voterImage?.uri) {
        formData.append('voterFile', {
          uri: voterImage.uri,
          name: voterImage.name,
          type: voterImage.name.endsWith('.pdf')
            ? 'application/pdf'
            : 'image/jpeg',
        } as any);
      }
      if (panImage?.uri) {
        formData.append('panFile', {
          uri: panImage.uri,
          name: panImage.name,
          type: panImage.name.endsWith('.pdf')
            ? 'application/pdf'
            : 'image/jpeg',
        } as any);
      }

      console.log('Submitting KYC data: addKYCDetails', formData);
      const response = await axios.post(
        'http://192.168.1.42:4002/users/addKYCDetails',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      console.log('KYC submission response:', response.data);
      if (response.data.status === 'success') {
        setLoading(false);

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile updated successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        AsyncStorage.setItem('stepNo', '7');

        setTimeout(() => {
          navigation.navigate('ConfirmationScreen');
        }, 2000);
      }
    } catch (error) {
      setLoading(false);

      Alert.alert('Error', 'Failed to submit KYC details. Please try again.');
      console.error('KYC submission error:', error);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Details</Text>
      </View>

      {/* Form Content */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Upload Voter ID Proof</Text>
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={handleVoterUpload}
          >
            <Icon
              name="card-account-details"
              size={width * 0.08}
              color="#00796B"
              style={styles.icon}
            />
            <Text style={styles.uploadText}>Upload</Text>
            <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
          </TouchableOpacity>
          {voterUploaded && (
            <Text style={styles.successText}>
              File uploaded:{' '}
              {voterImage?.name || 'Voter ID uploaded successfully!'}
            </Text>
          )}

          <Text style={styles.label}>Enter Voter ID Number *</Text>
          <TextInput
            style={styles.input}
            value={voterNumber}
            onChangeText={setVoterNumber}
            placeholder="Enter 10-character Voter ID Number"
            keyboardType="default"
            maxLength={10}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Upload Pancard Proof</Text>
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={handlePancardUpload}
          >
            <Icon
              name="card"
              size={width * 0.08}
              color="#00796B"
              style={styles.icon}
            />
            <Text style={styles.uploadText}>Upload</Text>
            <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
          </TouchableOpacity>
          {pancardUploaded && (
            <Text style={styles.successText}>
              File uploaded:{' '}
              {panImage?.name || 'Pancard uploaded successfully!'}
            </Text>
          )}

          <Text style={styles.label}>Enter PAN Number *</Text>
          <TextInput
            style={styles.input}
            value={panNumber}
            onChangeText={setPanNumber}
            placeholder="Enter 10-character PAN Number"
            keyboardType="default"
            maxLength={10}
            autoCapitalize="characters"
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxChecked,
                ]}
              >
                {termsAccepted && (
                  <Icon name="check" size={width * 0.04} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>I agree to Terms & Conditions</Text>
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
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00796B',
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
    color: '#00796B',
    textAlign: 'center',
    fontWeight: '500',
  },
  acceptedText: {
    fontSize: width * 0.03,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  successText: {
    color: '#00796B',
    fontSize: width * 0.035,
    marginTop: height * 0.005,
    marginBottom: height * 0.01,
    textAlign: 'center',
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
    backgroundColor: '#00796B',
    borderColor: '#00796B',
  },
  termsText: {
    fontSize: width * 0.035,
    color: '#333',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#00796B',
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
});

export default KYCDetailsScreen;
