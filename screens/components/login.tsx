import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
import { AuthFetch, UsePost } from '../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { REGISTRATION_STEPS } from '../utility/registrationSteps';

const { width, height } = Dimensions.get('window');

const DoctorLoginScreen = () => {
  const dispatch = useDispatch();

  const navigation = useNavigation<any>();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showOtp, setShowOtp] = useState(false);
  const [mobileError, setMobileError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Added for auto-login loading state


  const otpRefs = useRef<(TextInput | null)[]>(Array(6).fill(null));

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (!text && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const validateMobile = (number: string) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  // Check for existing token on mount
useEffect(() => {
  const checkAuthToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUserId = await AsyncStorage.getItem('userId');
      // const storedStep = await AsyncStorage.getItem('currentStep');

      if (storedToken && storedUserId) {
        const profileResponse = await AuthFetch('users/getUser', storedToken);
        console.log('Profile response:', profileResponse);

        if (
          profileResponse.status === 'success' &&
          'data' in profileResponse &&
          profileResponse.data
        ) {
          const userData = profileResponse.data.data;
          dispatch({ type: 'currentUserID', payload: storedUserId });
          const { screen, params } = determineNextScreen(userData);
          await AsyncStorage.setItem('currentStep', screen);

          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Auto-login successful',
            position: 'top',
            visibilityTime: 3000,
          });

          navigation.navigate(screen, params || {});
        } 
        else {
        setIsLoading(false);
      }
      } else {
        setIsLoading(false);
      }
      
    } catch (error) {
      console.error('Error checking auth token:', error);
     setIsLoading(false);
    }
  };

  checkAuthToken();
}, []);


  const handleSendOtp = async () => {
    if (!mobile) {
      setMobileError('Mobile number is required');
      return;
    }
    if (!validateMobile(mobile)) {
      setMobileError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setMobileError('');
    setIsOtpSent(true);
    try {
      const response = await UsePost('auth/login', {
        mobile,
        userType: 'doctor',
        language: 'tel',
      });
      console.log('response', response);
      if (response.status === 'success' && 'data' in response && response.data) {
        setUserId(response.data.userId);
        setShowOtp(true);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response.data.message || 'OTP sent successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        setMobileError('message' in response ? response.message : 'Failed to send OTP');
        setIsOtpSent(false);
      }
    } catch (error) {
      setMobileError('Network error. Please try again.');
      setIsOtpSent(false);
      console.error('Error sending OTP:', error);
    }
  };

  

  const determineNextScreen = (userData: any): { screen: string; params?: any } => {
   console.log('User Data:======', userData);
    if (!userData.firstname || !userData.lastname || !userData.email || !userData.medicalRegistrationNumber) {
      return { screen: 'PersonalInfo', params: undefined };
    }
    if (!userData.specialization || !userData.specialization.name) {
      return { screen: 'Specialization', params: undefined };
    }
    // if (!userData.addresses || userData.addresses.length === 0) {
    if (!userData.consultationModeFee || userData.consultationModeFee.length === 0) {

      return { screen: 'Practice', params: undefined };
    }
    if (!userData.consultationModeFee || userData.consultationModeFee.length === 0) {
      return { screen: 'ConsultationPreferences', params: undefined };
    }
    if (!userData.bankDetails || !userData.bankDetails.bankName) {
      return { screen: 'FinancialSetupScreen', params: undefined };
    }
    // Assuming KYC fields are part of the schema (e.g., pan, aadhar)
    if (!userData.kycDetails) {
      return { screen: 'KYCDetailsScreen', params: undefined };
    }
    if (userData.status === 'pending') {
      return { screen: 'ConfirmationScreen', params: undefined };
    }
     if (userData.status === 'inActive') {
      return { screen: 'ProfileReview', params: undefined };
    }
     if (userData.status === 'approved') {
      return { screen: 'AccountVerified', params: undefined };
    }
    return { screen: 'ProfileReview', params: undefined }; // Default or final step
  };

  const handleLogin = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setOtpError('');

    if (!userId) {
      setOtpError('User ID is required');
      return;
    }
    if (!mobile) {
      setOtpError('Mobile number is required');
      return;
    }
    console.log('validateOtp body', userId, otpString, mobile);

    try {
      const response = await UsePost('auth/validateOtp', {
        userId,
        OTP: otpString,
        mobile,
      });
      console.log('validateOtp response', response);
      if (response.status === 'success' && 'data' in response && response.data) {
        const { accessToken } = response.data;
        const userId = response.data.userData.userId;
        console.log('userid:', userId);
        if (accessToken) {
          await AsyncStorage.setItem('authToken', accessToken);
          await AsyncStorage.setItem('userId', userId);
          dispatch({ type: 'currentUserID', payload: userId });

          setToken(accessToken);
        }

        const profileResponse = await AuthFetch('users/getUser', accessToken);
          console.log('Profile response:', profileResponse);

          if (
            profileResponse.status === 'success' &&
            'data' in profileResponse &&
            profileResponse.data
          ) {
            const userData = profileResponse.data.data;
            const { screen, params } = determineNextScreen(userData);
            await AsyncStorage.setItem('currentStep', screen);

            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: response.data.message ? response.data.message : 'Login successful',
              position: 'top',
              visibilityTime: 3000,
            });

            navigation.navigate(screen, params || {});
          } else {
            // Fallback to PersonalInfo if profile fetch fails
            await AsyncStorage.setItem('currentStep', 'PersonalInfo');
            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: 'Login successful, starting from Personal Info',
              position: 'top',
              visibilityTime: 3000,
            });
            navigation.navigate('PersonalInfo');
          }
        }
        else {
        setOtpError('message' in response ? response.message : 'Invalid OTP');
      }
    } catch (error) {
      console.log('Error validating OTP:', error);
      setOtpError('Network error. Please try again.');
      console.error('Error validating OTP:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00796B" />
        <Text style={styles.loadingText}>Checking login status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Doctor Login</Text>
      </View>

      {/* Form Content */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
          </View>
          <Text style={styles.portalTitle}>VYDHYO Doctor Portal</Text>
          <TouchableOpacity onPress={() => Linking.openURL('#')}>
            <Text style={styles.signInLink}>Sign in to your account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Mobile Number*</Text>
        <View style={[styles.inputContainer, mobileError ? styles.inputError : null]}>
          <Icon name="phone" size={20} color="#00796B" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={(text) => {
              setMobile(text);
              setMobileError('');
              setIsOtpSent(false);
            }}
            maxLength={10}
          />
        </View>
        {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}

        {showOtp && (
          <>
            <Text style={styles.label}>OTP</Text>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    otpRefs.current[index] = ref;
                  }}
                  style={styles.otpBox}
                  keyboardType="numeric"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                />
              ))}
            </View>
            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
          </>
        )}

        {/* Spacer to ensure content is not hidden by the button */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Send OTP or Login Button */}
      {!showOtp ? (
        <TouchableOpacity
          style={[styles.button, isOtpSent && styles.disabledButton]}
          onPress={handleSendOtp}
          disabled={isOtpSent}
        >
          <Text style={styles.buttonText}>{isOtpSent ? 'OTP Sent' : 'Send OTP'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      )}
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
  headerTitle: {
    flex: 1,
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.03,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: height * 0.04,
  },
  logoWrapper: {
    width: width * 0.2,
    height: width * 0.2,
    backgroundColor: '#FFFFFF',
    borderRadius: width * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  logo: {
    width: width * 0.2,
    height: width * 0.2,
  },
  portalTitle: {
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#333',
    marginVertical: height * 0.01,
  },
  signInLink: {
    color: '#00796B',
    fontSize: width * 0.04,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#333',
    marginBottom: height * 0.01,
    marginTop: height * 0.015,
  },
  inputContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    height: height * 0.06,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: '#D32F2F',
    borderWidth: 1,
  },
  icon: {
    marginHorizontal: width * 0.03,
  },
  input: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#333',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: height * 0.01,
    marginBottom: height * 0.02,
  },
  otpBox: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    width: width * 0.12,
    height: height * 0.06,
    textAlign: 'center',
    fontSize: width * 0.04,
    backgroundColor: '#fff',
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  button: {
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
  disabledButton: {
    backgroundColor: '#B0BEC5',
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: width * 0.035,
    marginTop: height * 0.005,
    marginBottom: height * 0.01,
  },
  spacer: {
    height: height * 0.1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: height * 0.02,
    fontSize: width * 0.04,
    color: '#333',
  },
});

export default DoctorLoginScreen;