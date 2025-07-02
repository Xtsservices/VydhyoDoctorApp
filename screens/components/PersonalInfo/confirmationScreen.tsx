import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useSelector } from 'react-redux';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import Toast from 'react-native-toast-message';


interface FormData {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  practice: string;
  consultationPreferences: string;
  bank: string;
  accountNumber: string;
}

const { width, height } = Dimensions.get('window');

const ConfirmationScreen: React.FC = () => {
  const userId = useSelector((state: any) => state.currentUserID);
  console.log('Current User ID:', userId);
  const navigation = useNavigation<any>();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    practice: '',
    consultationPreferences: '',
    bank: '',
    accountNumber: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const validateForm = () => {
    let tempErrors: Partial<FormData> = {};
    if (!formData.name.trim()) tempErrors.name = 'Name is required';
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email))
      tempErrors.email = 'Valid email is required';
    if (
      !formData.phone.trim() ||
      !/^\+\d{2}\s\d{3}\s\d{3}\s\d{4}$/.test(formData.phone)
    )
      tempErrors.phone = 'Valid phone is required';
    if (!formData.specialization.trim())
      tempErrors.specialization = 'Specialization is required';
    // if (!formData.practice.trim())
    //   tempErrors.practice = 'Practice details are required';
    if (!formData.consultationPreferences.trim())
      tempErrors.consultationPreferences = 'Preferences are required';
    // if (!formData.bank.trim()) tempErrors.bank = 'Bank is required';
    // if (!formData.accountNumber.trim())
    //   tempErrors.accountNumber = 'Account number is required';
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async() => {
    if (!validateForm()) {
      Alert.alert(
        'Error',
        'Please correct the errors in the form before submitting.',
      );
      return;
    }
    await AsyncStorage.setItem('currentStep', 'ProfileReview');
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Profile submitted successfully',
      position: 'top',
      visibilityTime: 3000,
    });
    navigation.navigate('ProfileReview');
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleBack = () => {
    navigation.goBack();
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);

      try {
        // Retrieve token from AsyncStorage
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        AsyncStorage.setItem('stepNo', '7');

        // Make API call
        const response = await axios.get(
          'http://192.168.1.44:3000/users/getUser',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              userid: userId, // Include userId in headers
            },
            params: {
              userId, // Include userId in query params as well
            },
          },
        );
        console.log('User data fetched successfully:', response?.data?.data);
        // Check if response status is success
        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Failed to fetch user data');
        }

        const userData = response.data.data;
        // Format phone number to match +XX XXX XXX XXXX
        const rawMobile = userData.mobile || '';
        const formattedPhone =
          rawMobile.length === 10
            ? `+91 ${rawMobile.slice(0, 3)} ${rawMobile.slice(
                3,
                6,
              )} ${rawMobile.slice(6, 10)}`
            : '';

        // Helper function to mask account number
        const maskAccountNumber = (accountNumber: string) => {
          if (!accountNumber) return '';
          // Show only last 4 characters, mask the rest with '*'
          const visible = accountNumber.slice(-4);
          const masked = '*'.repeat(accountNumber.length - 4);
          return `${masked}${visible}`;
        };

        setFormData({
          name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim(),
          email: userData.email || '',
          phone: formattedPhone,
          specialization: userData.specialization.name || '',
          practice: userData.addresses.length > 0 ? userData.addresses[0] : '',
          consultationPreferences:
            userData.consultationModeFee.length > 0
              ? userData.consultationModeFee
                  .map((mode: any) => mode.type)
                  .join(', ')
              : '',
          bank: userData.bankDetails.bankName || '',
          accountNumber: maskAccountNumber(
            userData.bankDetails?.accountNumber || '',
          ),
        });
        // setLoading(false);
      } catch (error: any) {
        // setLoading(false);

        console.error('Error fetching user data:', error.message);
      }finally {
        setLoading(false); // Stop loading regardless of success or failure
      }
    };
    fetchUserData();
  }, []);

  // if (loading) {
  //   return <LoadingScreen />;
  // }

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
        <Text style={styles.headerTitle}>Confirmation</Text>
      </View>

      <ProgressBar currentStep={getCurrentStepIndex('ConfirmationScreen')} totalSteps={TOTAL_STEPS} />

      {/* Form Content */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Review Your Details</Text>

          {/* Personal Info Section */}
          <View style={styles.row}>
            <Icon name="account" size={width * 0.05} color="#00203F" />
            <Text style={styles.label}>Personal Info</Text>
            <TouchableOpacity onPress={() => handleChange('name', '')}>
              <Icon name="pencil" size={width * 0.05} color="#00203F" />
            </TouchableOpacity>
          </View>
          <TextInput
            value={formData.name}
            onChangeText={text => handleChange('name', text)}
            style={[styles.input, errors.name && styles.errorInput]}
            placeholder="Enter Name"
            placeholderTextColor="#999"
            autoCapitalize="words"
          />
          {errors.name && <Text style={styles.error}>{errors.name}</Text>}
          <TextInput
            value={formData.email}
            onChangeText={text => handleChange('email', text)}
            style={[styles.input, errors.email && styles.errorInput]}
            placeholder="Enter Email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.error}>{errors.email}</Text>}
          <TextInput
            value={formData.phone}
            onChangeText={text => handleChange('phone', text)}
            style={[styles.input, errors.phone && styles.errorInput]}
            placeholder="Enter Phone (e.g., +91 234 567 8901)"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

          {/* Specialization Section */}
          <View style={styles.row}>
            <Icon name="briefcase" size={width * 0.05} color="#00203F" />
            <Text style={styles.label}>Specialization</Text>
            <TouchableOpacity
              onPress={() => handleChange('specialization', '')}
            >
              <Icon name="pencil" size={width * 0.05} color="#00203F" />
            </TouchableOpacity>
          </View>
          <TextInput
            value={formData.specialization}
            onChangeText={text => handleChange('specialization', text)}
            style={[styles.input, errors.specialization && styles.errorInput]}
            placeholder="Enter Specialization"
            placeholderTextColor="#999"
          />
          {errors.specialization && (
            <Text style={styles.error}>{errors.specialization}</Text>
          )}

          {/* Practice Section */}
          <View style={styles.row}>
            <Icon name="office-building" size={width * 0.05} color="#00203F" />
            <Text style={styles.label}>Practice</Text>
            <TouchableOpacity onPress={() => handleChange('practice', '')}>
              <Icon name="pencil" size={width * 0.05} color="#00203F" />
            </TouchableOpacity>
          </View>
          <TextInput
            value={formData.practice}
            onChangeText={text => handleChange('practice', text)}
            style={[styles.input, errors.practice && styles.errorInput]}
            placeholder="Enter Practice"
            placeholderTextColor="#999"
          />
          {errors.practice && (
            <Text style={styles.error}>{errors.practice}</Text>
          )}

          {/* Consultation Preferences Section */}
          <View style={styles.row}>
            <Icon name="calendar" size={width * 0.05} color="#00203F" />
            <Text style={styles.label}>Consultation Preferences</Text>
            <TouchableOpacity
              onPress={() => handleChange('consultationPreferences', '')}
            >
              <Icon name="pencil" size={width * 0.05} color="#00203F" />
            </TouchableOpacity>
          </View>
          <TextInput
            value={formData.consultationPreferences}
            onChangeText={text => handleChange('consultationPreferences', text)}
            style={[
              styles.input,
              errors.consultationPreferences && styles.errorInput,
            ]}
            placeholder="Enter Preferences"
            placeholderTextColor="#999"
          />
          {errors.consultationPreferences && (
            <Text style={styles.error}>{errors.consultationPreferences}</Text>
          )}

          {/* Financial Setup Section */}
          <View style={styles.row}>
            <Icon name="bank" size={width * 0.05} color="#00203F" />
            <Text style={styles.label}>Financial Setup</Text>
            <TouchableOpacity onPress={() => handleChange('bank', '')}>
              <Icon name="pencil" size={width * 0.05} color="#00203F" />
            </TouchableOpacity>
          </View>
          <TextInput
            value={formData.bank}
            onChangeText={text => handleChange('bank', text)}
            style={[styles.input, errors.bank && styles.errorInput]}
            placeholder="Enter Bank"
            placeholderTextColor="#999"
          />
          {errors.bank && <Text style={styles.error}>{errors.bank}</Text>}
          <TextInput
            value={formData.accountNumber}
            onChangeText={text => handleChange('accountNumber', text)}
            style={[styles.input, errors.accountNumber && styles.errorInput]}
            placeholder="Enter Account Number"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
          {errors.accountNumber && (
            <Text style={styles.error}>{errors.accountNumber}</Text>
          )}
        </View>

        {/* Spacer to ensure content is not hidden by the Next button */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Next</Text>
      </TouchableOpacity>
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
  },
  sectionTitle: {
    fontSize: width * 0.045,
    fontWeight: '600',
    color: '#333',
    marginBottom: height * 0.02,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.015,
  },
  label: {
    flex: 1,
    marginLeft: width * 0.03,
    fontSize: width * 0.04,
    color: '#333',
    fontWeight: '500',
  },
  input: {
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
  errorInput: {
    borderColor: '#D32F2F',
  },
  error: {
    color: '#D32F2F',
    fontSize: width * 0.035,
    marginBottom: height * 0.01,
  },
  submitButton: {
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
  submitText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  spacer: {
    height: height * 0.1,
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

export default ConfirmationScreen;
