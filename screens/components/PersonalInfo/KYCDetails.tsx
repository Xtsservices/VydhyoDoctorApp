import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image , TextInput} from 'react-native';
const aadhar_icon = require('../../assets/aadhar.png');
const pancard_icon = require('../../assets/pan.png');
import IoIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const KYCDetailsScreen = () => {
 const [aadhaarImage, setAadhaarImage] = useState<{ uri: string } | null>(null);
  const [panImage, setPanImage] = useState<{ uri: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const navigation = useNavigation();


  const validateForm = () => {
    let tempErrors: { [key: string]: string } = {};
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber))
      tempErrors.aadhaarNumber = 'Aadhaar number must be 12 digits';
    if (!panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber))
      tempErrors.panNumber = 'PAN number must be 10 alphanumeric characters (e.g., AWXPV7865F)';
    if (!aadhaarImage) tempErrors.aadhaarImage = 'Please upload Aadhaar proof';
    if (!panImage) tempErrors.panImage = 'Please upload Pancard proof';
    if (!termsAccepted) tempErrors.termsAccepted = 'Please accept Terms & Conditions';
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

 

  
  const handleNext2 = () => {
    navigation.navigate('ConfirmationScreen' as never); 

   
  };


  const handleAadhaarUpload = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled Aadhaar image picker');
      } else if (response.errorCode) {
        console.log('Aadhaar image picker error: ', response.errorMessage);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to pick Aadhaar image',
          position: 'top',
          visibilityTime: 3000,
        });
      } else if (
        response.assets &&
        response.assets[0] &&
        typeof response.assets[0].uri === 'string'
      ) {
        setAadhaarImage({ uri: response.assets[0].uri });
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Aadhaar image uploaded successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    });
  };

  const handlePancardUpload = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled PAN image picker');
      } else if (response.errorCode) {
        console.log('PAN image picker error: ', response.errorMessage);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to pick PAN image',
          position: 'top',
          visibilityTime: 3000,
        });
      } else if (
        response.assets &&
        response.assets[0] &&
        typeof response.assets[0].uri === 'string'
      ) {
        setPanImage({ uri: response.assets[0].uri });
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'PAN image uploaded successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    });
  };

 const handleNext = async () => {
  if (!validateForm()) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Please complete all fields and accept Terms & Conditions',
      position: 'top',
      visibilityTime: 3000,
    });
    return;
  }

  try {
    const token = await AsyncStorage.getItem('authToken');
    console.log('Auth Token:', token);
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Authentication token not found',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    // Construct FormData
    const formData = new FormData();

    formData.append('panNumber', panNumber); // Add plain text
    formData.append('aadharNumber', aadhaarNumber); // Add plain text

    // PAN image file
    if (panImage?.uri) {
      formData.append('panFile', {
        uri: panImage.uri,
        name: 'pan.jpg', // Adjust based on actual file
        type: 'image/jpeg', // Or 'image/png'
      });
    }

    // Aadhaar image file (if needed)
    if (aadhaarImage?.uri) {
      formData.append('aadharFile', {
        uri: aadhaarImage.uri,
        name: 'aadhaar.jpg', // Adjust name/type as needed
        type: 'image/jpeg',
      });
    }

    console.log('Sending FormData:', formData);

    const response = await axios.post(
      'http://216.10.251.239:3000/users/addKYCDetails',
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('Response from addKYCDetails:', response);

    if (response.status === 200 || response.status === 201) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'KYC details submitted successfully',
        position: 'top',
        visibilityTime: 3000,
      });
      // navigation.navigate('ConfirmationScreen', { userId });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2:
          response.data?.message || 'Failed to submit KYC details',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  } catch (error: any) {
    console.error('KYC Submission Error:', error);

    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error?.response?.data?.message?.message ||
        error?.response?.data?.message ||
        'Something went wrong. Please try again.',
      position: 'top',
      visibilityTime: 3000,
    });
  }
};

   const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                                <IoIcon name="arrow-left" size={20} color="#000" />
                              </TouchableOpacity>
      <Text style={styles.header}>Step 5 - KYC Details</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Aadhaar Number</Text>
        <TextInput
          style={[styles.input, errors.aadhaarNumber && styles.errorInput]}
          value={aadhaarNumber}
          onChangeText={setAadhaarNumber}
          placeholder="Enter 12-digit Aadhaar number"
          keyboardType="numeric"
          maxLength={12}
          placeholderTextColor="#999"
        />
        {errors.aadhaarNumber && <Text style={styles.errorText}>{errors.aadhaarNumber}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>PAN Number</Text>
        <TextInput
          style={[styles.input, errors.panNumber && styles.errorInput]}
          value={panNumber}
          onChangeText={setPanNumber}
          placeholder="Enter PAN number (e.g., AWXPV7865F)"
          maxLength={10}
          placeholderTextColor="#999"
        />
        {errors.panNumber && <Text style={styles.errorText}>{errors.panNumber}</Text>}
      </View>
      <View style={styles.uploadContainer}>
        <Text style={styles.label}>Upload Aadhaar ID Proof</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={handleAadhaarUpload}>
          <Image source={aadhar_icon} style={styles.icon} />
          <Text style={styles.uploadText}>Drag & drop or click to upload</Text>
          <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
        </TouchableOpacity>
        {aadhaarImage && <Text style={styles.successText}>Aadhaar uploaded successfully!</Text>}
      </View>

      <View style={styles.uploadContainer}>
        <Text style={styles.label}>Upload Pancard Proof</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={handlePancardUpload}>
          <Image source={pancard_icon} style={styles.icon} />
          <Text style={styles.uploadPanText}>Drag & drop or click to upload</Text>
          <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
        </TouchableOpacity>
        {panImage && <Text style={styles.successText}>Pancard uploaded successfully!</Text>}
      </View>

      <View style={styles.termsContainer}>
        <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]} />
        </TouchableOpacity>
        <Text style={styles.termsText}>I agree to Terms & Conditions</Text>
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>Next →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6ffe6',
    padding: 20,
  },
     backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 100,
    color: '#000',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#000',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#F9F9F9',
    color: '#333',
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  uploadContainer: {
    marginBottom: 20,
  },
 
  uploadBox: {
    borderWidth: 2,
    borderColor: '#00bfff',
    borderStyle: 'dashed',
    borderRadius: 5,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  icon: {
    width: 30,
    height: 30,
    marginBottom: 10,
    borderRadius: 5,
  },
  uploadText: {
    fontSize: 14,
    color: '#1D4ED8',
    textAlign: 'center',
    fontWeight: '500',
  },
   uploadPanText: {
    fontSize: 14,
    color: '#15803D',
    textAlign: 'center',
    fontWeight: '500',

  },
  acceptedText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  successText: {
    color: 'green',
    marginTop: 10,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  termsText: {
    fontSize: 14,
    color: '#000',
  },
  nextButton: {
    backgroundColor: '#00203F',
    padding: 15,
    borderRadius: 8,
    position: 'absolute',
    bottom: 20,
    width: '90%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default KYCDetailsScreen;