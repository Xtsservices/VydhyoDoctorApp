import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const aadhar_icon = require('../../assets/aadhar.png');
const pancard_icon = require('../../assets/pan.png');

const { width, height } = Dimensions.get('window');

const KYCDetailsScreen = () => {
 const [aadhaarImage, setAadhaarImage] = useState<{ uri: string } | null>(null);
  const [panImage, setPanImage] = useState<{ uri: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigation = useNavigation<any>();

  const handleAadhaarUpload = () => {
    setAadhaarUploaded(true);
  };

  const handlePancardUpload = () => {
    setPancardUploaded(true);
  };

  const handleNext = () => {
    if (!aadhaarUploaded || !pancardUploaded || !termsAccepted) {
      Alert.alert('Error', 'Please upload both Aadhaar and Pancard proofs and accept the Terms & Conditions.');
      return;
    }
    navigation.navigate('ConfirmationScreen');
  };

  const handleBack = () => {
    navigation.goBack();
  };

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
          <Text style={styles.label}>Upload Aadhaar ID Proof</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handleAadhaarUpload}>
            <Icon name="card-account-details" size={width * 0.08} color="#00796B" style={styles.icon} />
            <Text style={styles.uploadText}>Drag & drop or click to upload</Text>
            <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
          </TouchableOpacity>
          {aadhaarUploaded && <Text style={styles.successText}>Aadhaar uploaded successfully!</Text>}

          <Text style={styles.label}>Upload Pancard Proof</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handlePancardUpload}>
            <Icon name="card" size={width * 0.08} color="#00796B" style={styles.icon} />
            <Text style={styles.uploadText}>Drag & drop or click to upload</Text>
            <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
          </TouchableOpacity>
          {pancardUploaded && <Text style={styles.successText}>Pancard uploaded successfully!</Text>}

          <View style={styles.termsContainer}>
            <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Icon name="check" size={width * 0.04} color="#fff" />}
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