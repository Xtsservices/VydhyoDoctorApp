import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // For the bank icon
import IoIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';


const FinancialSetupScreen = () => {
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [reenterAccountNumber, setReenterAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const navigation = useNavigation();

  const validateForm = () => {
    let tempErrors: { [key: string]: string } = {};
    if (!bank) tempErrors.bank = 'Please select a bank';
    if (!accountNumber || accountNumber.length < 9 || accountNumber.length > 18) 
      tempErrors.accountNumber = 'Account number must be between 9 and 18 digits';
    if (accountNumber !== reenterAccountNumber) 
      tempErrors.reenterAccountNumber = 'Account numbers do not match';
    if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) 
      tempErrors.ifscCode = 'Invalid IFSC code';
    if (!accountHolderName) tempErrors.accountHolderName = 'Please enter account holder name';
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

 

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        const token = await AsyncStorage.getItem('authToken');
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

        const body = {
          bankDetails: {
            accountNumber,
            ifscCode,
            bankName: bank,
            accountHolderName,
          },
        };

        console.log('Form data to send:', body);

        const response = await axios.post(
          'http://216.10.251.239:3000/users/updateBankDetails',
          body,
          {
            headers: {
               'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('Response from updateBankDetails:', response);

        if (response.status === 200) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Bank details updated successfully',
            position: 'top',
            visibilityTime: 3000,
          });
           navigation.navigate('KYCDetailsScreen' as never)
          // Navigate to KYCDetailsScreen with userId
          // navigation.navigate('KYCDetailsScreen', { userId });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2:
              response.data && response.data.message
                ? response.data.message
                : 'Failed to update bank details',
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
      }
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
      <Text style={styles.stepText}> Step 5 - Financial Setup</Text>
      
      <View style={styles.card}>
        <Icon name="bank" size={30} color="#007AFF" style={styles.icon} />
        <Text style={styles.title}>Add Bank Details</Text>
        <Text style={styles.subtitle}>Please enter your bank account details to proceed.</Text>

        <Text style={styles.label}>Select Bank</Text>
       <View style={[styles.input, errors.bank && styles.errorInput]}>
          <Picker
            selectedValue={bank}
            onValueChange={(itemValue) => setBank(itemValue)}
            style={styles.picker}
            placeholder="Select your bank"
            mode="dropdown"
            dropdownIconColor="#333"

          >
            <Picker.Item label="Select your bank" value="" />
            <Picker.Item label="HDFC" value="HDFC" />
            <Picker.Item label="Bank B" value="Bank B" />
            <Picker.Item label="Bank C" value="Bank C" />
          </Picker>
        </View>
        {errors.bank && <Text style={styles.errorText}>{errors.bank}</Text>}

        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={[styles.input, errors.accountNumber && styles.errorInput]}
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="Enter account number"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
        {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}

        <Text style={styles.label}>Re-enter Account Number</Text>
        <TextInput
          style={[styles.input, errors.reenterAccountNumber && styles.errorInput]}
          value={reenterAccountNumber}
          onChangeText={setReenterAccountNumber}
          placeholder="Re-enter account number"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
        {errors.reenterAccountNumber && <Text style={styles.errorText}>{errors.reenterAccountNumber}</Text>}

        <Text style={styles.label}>IFSC Code</Text>
        <TextInput
          style={[styles.input, errors.ifscCode && styles.errorInput]}
          value={ifscCode}
          onChangeText={setIfscCode}
          placeholder="Enter IFSC code"
          placeholderTextColor="#999"
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

        {/* Submit Button */}


        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6FFE6',
    padding: 20,
  },
   backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    top: '10%',
  },
  icon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight:'500'
  },
  label: {
    fontSize: 16,
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: 5,
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
  picker: {
    height: 40,
    width: '100%',
    color: '#333',
    textAlign: 'center',
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#00203f',
    paddingVertical: 10,
    paddingHorizontal: 80,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default FinancialSetupScreen;