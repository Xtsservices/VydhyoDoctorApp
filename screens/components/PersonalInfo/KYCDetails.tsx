import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
const aadhar_icon = require('../../assets/aadhar.png');
const pancard_icon = require('../../assets/pan.png');
import IoIcon from 'react-native-vector-icons/MaterialCommunityIcons';


const KYCDetailsScreen = () => {
  const [aadhaarUploaded, setAadhaarUploaded] = useState(false);
  const [pancardUploaded, setPancardUploaded] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigation = useNavigation();

  const handleAadhaarUpload = () => {
    // Simulate file upload
    setAadhaarUploaded(true);
  };

  const handlePancardUpload = () => {
    // Simulate file upload
    setPancardUploaded(true);
  };

  const handleNext = () => {
    if (!aadhaarUploaded || !pancardUploaded || !termsAccepted) {
    //   alert('Please upload both Aadhaar and Pancard proofs and accept the Terms & Conditions.');
      return;
    }
    // navigation.navigate('NextScreen'); // Replace with your next screen
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
      
      <View style={styles.uploadContainer}>
        <Text style={styles.label}>Upload Aadhaar ID Proof</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={handleAadhaarUpload}>
          <Image source={aadhar_icon} style={styles.icon} />
          <Text style={styles.uploadText}>Drag & drop or click to upload</Text>
          <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
        </TouchableOpacity>
        {aadhaarUploaded && <Text style={styles.successText}>Aadhaar uploaded successfully!</Text>}
      </View>

      <View style={styles.uploadContainer}>
        <Text style={styles.label}>Upload Pancard Proof</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={handlePancardUpload}>
          <Image source={pancard_icon} style={styles.icon} />
          <Text style={styles.uploadPanText}>Drag & drop or click to upload</Text>
          <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
        </TouchableOpacity>
        {pancardUploaded && <Text style={styles.successText}>Pancard uploaded successfully!</Text>}
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
  uploadContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#000',
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
    backgroundColor: '#1e3a8a',
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