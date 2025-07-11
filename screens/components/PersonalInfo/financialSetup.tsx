import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Dimensions ,ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import { AuthPost } from '../../auth/auth';

const { width, height } = Dimensions.get('window');

const FinancialSetupScreen = () => {
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [reenterAccountNumber, setReenterAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);


  const navigation = useNavigation<any>();

  // Popular Indian banks with account number length requirements
  const banks = [
    { name: 'State Bank of India (SBI)', accountLength: 7 },
    { name: 'HDFC Bank', accountLength: [13, 14] },
    { name: 'ICICI Bank', accountLength: 12 },
    { name: 'Axis Bank', accountLength: 15 },
    { name: 'Punjab National Bank (PNB)', accountLength: 16 },
    { name: 'Bank of Baroda (BoB)', accountLength: 14 },
    { name: 'Canara Bank', accountLength: 13 },
    { name: 'Union Bank of India', accountLength: 15 },
    { name: 'Kotak Mahindra Bank', accountLength: 14 },
    { name: 'Indian Bank', accountLength: 7 },
    { name: 'Yes Bank', accountLength: 15 },
    { name: 'IDFC First Bank', accountLength: 11 },
    { name: 'Federal Bank', accountLength: 14 },
    { name: 'IndusInd Bank', accountLength: 13 },
    { name: 'Bank of India (BOI)', accountLength: 15 },
  ];

  const validateForm = () => {
    let tempErrors: { [key: string]: string } = {};
    
    // Bank validation
    if (!bank) {
      tempErrors.bank = 'Please select a bank';
    }

    // Account number validation
    if (!accountNumber) {
      tempErrors.accountNumber = 'Account number is required';
    } else {
      const selectedBank = banks.find((b) => b.name === bank);
      if (selectedBank) {
        
        const validLength = Array.isArray(selectedBank.accountLength)
          ? selectedBank.accountLength.includes(accountNumber.length)
          : selectedBank.accountLength === accountNumber.length;
        if (!validLength) {
          const lengthText = Array.isArray(selectedBank.accountLength)
            ? selectedBank.accountLength.join(' or ')
            : selectedBank.accountLength;
          tempErrors.accountNumber = `${bank} account number must be ${lengthText} digits`;
        } else if (!/^\d+$/.test(accountNumber)) {
          tempErrors.accountNumber = 'Account number must contain only digits';
        }
      } else if (accountNumber.length < 7 || accountNumber.length > 18) {
        tempErrors.accountNumber = 'Account number must be between 7 to 18 digits';
      }
    }

    // Re-enter account number validation
    if (accountNumber !== reenterAccountNumber) {
      tempErrors.reenterAccountNumber = 'Account numbers do not match';
    }

    // IFSC code validation
    if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      tempErrors.ifscCode = 'Invalid IFSC code';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async() => {
    if (validateForm()) {
    try {
       setLoading(true); // Show loader

        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
           setLoading(false);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Authentication token not found',
            position: 'top',
            visibilityTime: 3000,
          });
          return;
        }

        const body = {
          bankDetails: {
            accountNumber,
            ifscCode,
            bankName: bank,
            accountHolderName,
          },
        };

        console.log('Form data to send:', body);

        const response = await AuthPost(
          'users/updateBankDetails',
          body,token
         
        );
        console.log('Response from updateBankDetails:', response);

        const status = (response as any).data?.status ?? response.status;
        const message =
          (response as any).data?.message ??
          (response as any).message ??
          'Failed to update bank details';

        if (status === "success") {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Bank details updated successfully',
            position: 'top',
            visibilityTime: 3000,
          });
          navigation.navigate('KYCDetailsScreen' as never);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: message,
            position: 'top',
            visibilityTime: 3000,
          });
        }
      } catch (error) {
        console.error('Error updating bank details:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Network error. Please try again.',
          position: 'top',
          visibilityTime: 3000,
        });
      }finally {
      setLoading(false); // Always hide loader
    }
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };
  

   const handleSkip = async () => {
      try {
        setLoading(true); // Show loader
       await AsyncStorage.setItem('currentStep', 'KYCDetailsScreen'); // Update current step
      console.log(getCurrentStepIndex('currentStep'), 'Current Step Updated');
        Toast.show({
          type: 'info',
          text1: 'Skipped',
          text2: 'Financial setup skipped',
          position: 'top',
          visibilityTime: 3000,
        });
        navigation.navigate('KYCDetailsScreen');
      } catch (error) {
        console.error('Error skipping financial setup:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to skip. Please try again.',
          position: 'top',
          visibilityTime: 3000,
        });
      } finally {
        setLoading(false); // Always hide loader
      }
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
        <Text style={styles.headerTitle}>Financial Setup</Text>
      </View>

      <ProgressBar currentStep={getCurrentStepIndex('FinancialSetupScreen')} totalSteps={TOTAL_STEPS} />

      {/* Form Content */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.card}>
          <Icon name="bank" size={width * 0.08} color="#00203F" style={styles.icon} />
          <Text style={styles.title}>Add Bank Details</Text>
          <Text style={styles.subtitle}>Please enter your bank account details to proceed.</Text>

          <Text style={styles.label}>Select Bank</Text>
          <View style={[styles.input, errors.bank && styles.errorInput]}>
            <Picker
              selectedValue={bank}
              onValueChange={(itemValue) => {
                setBank(itemValue);
                setErrors((prev) => ({ ...prev, bank: '' }));
              }}
              style={styles.picker}
              mode="dropdown"
              dropdownIconColor="#333"
            >
              <Picker.Item label="Select your bank" value="" />
              {banks.map((b) => (
                <Picker.Item key={b.name} label={b.name} value={b.name} />
              ))}
            </Picker>
          </View>
          {errors.bank && <Text style={styles.errorText}>{errors.bank}</Text>}

          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={[styles.input, errors.accountNumber && styles.errorInput]}
            value={accountNumber}
            onChangeText={(text) => {
              setAccountNumber(text);
              setErrors((prev) => ({ ...prev, accountNumber: '' }));
            }}
            placeholder="Enter account number"
            keyboardType="numeric"
            placeholderTextColor="#999"
            maxLength={18}
          />
          {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}

          <Text style={styles.label}>Re-enter Account Number</Text>
          <TextInput
            style={[styles.input, errors.reenterAccountNumber && styles.errorInput]}
            value={reenterAccountNumber}
            onChangeText={(text) => {
              setReenterAccountNumber(text);
              setErrors((prev) => ({ ...prev, reenterAccountNumber: '' }));
            }}
            placeholder="Re-enter account number"
            keyboardType="numeric"
            placeholderTextColor="#999"
            maxLength={18}
          />
          {errors.reenterAccountNumber && <Text style={styles.errorText}>{errors.reenterAccountNumber}</Text>}

          <Text style={styles.label}>IFSC Code</Text>
          <TextInput
            style={[styles.input, errors.ifscCode && styles.errorInput]}
            value={ifscCode}
            onChangeText={(text) => {
              setIfscCode(text.toUpperCase());
              setErrors((prev) => ({ ...prev, ifscCode: '' }));
            }}
            placeholder="Enter IFSC code"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            maxLength={11}
          />
          {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}

          <Text style={styles.label}>Account Holder Name</Text>
        <TextInput
          style={[styles.input, errors.accountHolderName && styles.errorInput]}
          value={accountHolderName}
          onChangeText={setAccountHolderName}
          placeholder="Enter account holder name"
          placeholderTextColor="#999"
        />
        {errors.accountHolderName && <Text style={styles.errorText}>{errors.accountHolderName}</Text>}

        </View>

        {/* Spacer to ensure content is not hidden by the Next button */}
        <View style={styles.spacer} />
      </ScrollView>

<View style={styles.buttonsContainer}>
        <TouchableOpacity style={[styles.button2, styles.skipButton]} onPress={handleSkip}>
          <Text style={[styles.buttonText2, styles.skipButtonText]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button2} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
      {/* Next Button */}
      {/* <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DCFCE7',
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
    alignItems: 'center',
  },
  icon: {
    marginBottom: height * 0.02,
  },
  title: {
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#333',
    marginBottom: height * 0.01,
  },
  subtitle: {
    fontSize: width * 0.035,
    color: '#666',
    textAlign: 'center',
    marginBottom: height * 0.02,
    fontWeight: '500',
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: height * 0.01,
    marginTop: height * 0.015,
  },
  input: {
    width: '100%',
    height: height * 0.06,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: width * 0.03,
    marginBottom: height * 0.01,
    backgroundColor: '#fff',
    color: '#333',
    fontSize: width * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  picker: {
    height: height * 0.06,
    width: '100%',
    color: '#333',
  },
  errorInput: {
    borderColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: width * 0.035,
    alignSelf: 'flex-start',
    marginBottom: height * 0.01,
  },
  button: {
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
  buttonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  spacer: {
    height: height * 0.1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: width * 0.05,
    marginBottom: height * 0.03,
  },
  button2: {
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: width * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  skipButton: {
    backgroundColor: '#fff',
    // borderWidth: 1,
    borderColor: '#00203F',
  },
  buttonText2: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  skipButtonText: {
    color: '#00203F',
  },
   loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black overlay
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

export default FinancialSetupScreen;