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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { REGISTRATION_STEPS } from '../utility/registrationSteps';
import { AuthFetch, UsePost } from '../auth/auth';

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
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>(Array(6).fill(null));

  const validateMobile = (number: string) => /^[6-9]\d{9}$/.test(number);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) otpRefs.current[index + 1]?.focus();
    if (!text && index > 0) otpRefs.current[index - 1]?.focus();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isOtpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOtpSent, resendTimer]);

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
      setMobileError('Network error. Please try again.');
      setIsOtpSent(false);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(60);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');

    try {
      const response = await UsePost('auth/login', {
        mobile,
        userType: 'doctor',
        language: 'tel',
      });

      if (response?.status === 'success' && response?.data) {
        setUserId(response?.data?.userId);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response?.data?.message || 'OTP resent successfully',
          position: 'top',
        });
      } else {
        setMobileError(response?.message || 'Failed to resend OTP');
        setCanResend(true);
      }
    } catch (err) {
      setMobileError('Network error. Please try again.');
      setCanResend(true);
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
        <Text style={styles.headerTitle}>Partner Login</Text>
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer1}>
          <Image source={require('../assets/doclogo.png')} style={styles.doclogo} />
        </View>

        <Text style={styles.label}>Mobile Number*</Text>
        <View style={[styles.inputContainer, mobileError ? styles.inputError : null]}>
          <Icon name="phone" size={20} color="#00203F" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            editable={!isOtpSent}
            value={mobile}
            onChangeText={(text) => {
              const digitsOnly = text.replace(/\D/g, '');
              if (digitsOnly.length === 1 && !/[6-9]/.test(digitsOnly[0])) {
                setMobileError('Enter a valid mobile number.');
                setIsOtpSent(false);
                return;
              }
              setMobile(digitsOnly);
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

            {/* Add resend OTP option */}
            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimerText}>
                  Resend OTP in {resendTimer} seconds
                </Text>
              )}
            </View>
          </>
        )}
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
    marginTop: 10,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#DCFCE7', // Ensure ScrollView has the same background
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.03,
  },
  formContentContainer: {
    paddingBottom: height * 0.15, // Ensure enough padding for button to stay visible
    backgroundColor: '#DCFCE7', // Match container background
    minHeight: height, // Ensure content fills screen height
  },
  logoContainer1: {
    marginTop: 80,
    alignItems: 'center',
    marginBottom: height * 0.0,
  },
  doclogo: {
    width: width * 0.5,
    height: width * 0.5,
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
  resendContainer: {
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  resendText: {
    color: '#00203F',
    fontSize: width * 0.035,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  resendTimerText: {
    color: '#666',
    fontSize: width * 0.035,
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
    marginBottom: 30,
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