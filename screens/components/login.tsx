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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
// import { AuthFetch, UsePost } from '../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { REGISTRATION_STEPS } from '../utility/registrationSteps';
import { AuthFetch , UsePost} from '../auth/auth';

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
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>(Array(6).fill(null));

  const validateMobile = (number: string) => /^[6-9]\d{9}$/.test(number);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) otpRefs.current[index + 1]?.focus();
    if (!text && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleSendOtp = async () => {
    if (!mobile) return setMobileError('Mobile number is required');
    if (!validateMobile(mobile)) return setMobileError('Enter a valid 10-digit mobile number');

    setMobileError('');
    setSendingOtp(true);
    setIsOtpSent(true);

    try {
      const response = await UsePost('auth/login', {
        mobile,
        userType: 'doctor',
        language: 'tel',
      });
      console.log("responselogin", response);
      if (response?.status === 'success' && response?.data) {
        setUserId(response?.data?.userId);
        setShowOtp(true);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response?.data?.message || 'OTP sent successfully',
          position: 'top',
        });
      } else {
        setMobileError(response?.message || 'Failed to send OTP');
        setIsOtpSent(false);
      }
    } catch (err) {
      console.log('Error sending OTP:', err);
      setMobileError('Network error. Please try again.');
      setIsOtpSent(false);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleLogin = async () => {
    await AsyncStorage.removeItem('currentStep');
    const otpString = otp.join('');
    if (otpString.length !== 6) return setOtpError('Enter a valid 6-digit OTP');

    setOtpError('');
    setVerifyingOtp(true);

    try {
      const response = await UsePost('auth/validateOtp', {
        userId,
        OTP: otpString,
        mobile,
      });

      if (response.status === 'success' && response.data) {
        const { accessToken, userData } = response.data;
        const id = userData?.userId;

        await AsyncStorage.setItem('authToken', accessToken);
        await AsyncStorage.setItem('userId', id);

        dispatch({ type: 'currentUser', payload: userData });
        dispatch({ type: 'currentUserID', payload: id });

        Toast.show({
          type: 'success',
          text1: 'Login successful',
        });

        navigation.replace('Authloader');
      } else {
        setOtpError(response?.message || 'Invalid OTP');
      }
    } catch (err) {
      console.log('Error validating OTP:', err);
      setOtpError('Network error. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Doctor Login</Text>
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={styles.portalTitle}>VYDHYO Doctor Portal</Text>
        </View>

        <Text style={styles.label}>Mobile Number*</Text>
        <View style={[styles.inputContainer, mobileError ? styles.inputError : null]}>
          <Icon name="phone" size={20} color="#00203F" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            editable={!isOtpSent}
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
                  ref={(ref) => (otpRefs.current[index] = ref)}
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
        <View style={styles.spacer} />
      </ScrollView>

      {!showOtp ? (
        <TouchableOpacity
          style={[styles.button, isOtpSent && styles.disabledButton]}
          onPress={handleSendOtp}
          disabled={isOtpSent}
        >
          {sendingOtp ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isOtpSent ? 'OTP Sent' : 'Send OTP'}</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          {verifyingOtp ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: width * 0.7,
  },
  portalTitle: {
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#333',
    marginVertical: height * 0.01,
  },
  signInLink: {
    color: '#00203F',
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
    backgroundColor: '#DCFCE7',
  },
  loadingText: {
    marginTop: height * 0.02,
    fontSize: width * 0.04,
    color: '#333',
  },
});

export default DoctorLoginScreen;