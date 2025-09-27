import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  NativeSyntheticEvent,
  TextInputFocusEventData,
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

  const [kbHeight, setKbHeight] = useState(0);
  const [kbVisible, setKbVisible] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const otpContainerYRef = useRef(0);
  const BUTTON_HEIGHT = height * 0.08; // visual height of button area (approx)
  const BUTTON_MARGIN = 16;            // spacing above keyboard

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKbVisible(true);
      setKbHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKbVisible(false);
      setKbHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const validateMobile = (number: string) => /^[6-9]\d{9}$/.test(number);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) otpRefs.current[index + 1]?.focus();
    if (!text && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpFocus = (_e?: NativeSyntheticEvent<TextInputFocusEventData>) => {
    // Scroll so the OTP row sits above the floating button + keyboard
    requestAnimationFrame(() => {
      const extraClearance = 24;
      const targetY =
        otpContainerYRef.current -
        (height * 0.15);

      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          y: targetY > 0 ? targetY : 0,
          animated: true,
        });
      }
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isOtpSent && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }

    return () => interval && clearInterval(interval);
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
    } catch {
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
    } catch {
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

        Toast.show({ type: 'success', text1: 'Login successful' });
        navigation.replace('Authloader');
      } else {
        setOtpError(response?.message || 'Invalid OTP');
      }
    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const renderActionButton = () => {
    const isLoginPhase = showOtp;
    return (
      <TouchableOpacity
        style={[styles.button]}
        onPress={isLoginPhase ? handleLogin : handleSendOtp}
        disabled={!isLoginPhase && isOtpSent}
        activeOpacity={0.8}
      >
        {isLoginPhase ? (
          verifyingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>
        ) : (
          sendingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isOtpSent ? 'OTP Sent' : 'Send OTP'}</Text>
        )}
      </TouchableOpacity>
    );
  };
  const contentBottomPad = (kbVisible ? kbHeight : 0) + BUTTON_HEIGHT + BUTTON_MARGIN + 24;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Partner Login</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.formContainer}
        contentContainerStyle={[styles.formContent, { paddingBottom: contentBottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
            returnKeyType="done"
          />
        </View>
        {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}

        {showOtp && (
          <>
            <Text style={styles.label}>OTP</Text>
            <View
              style={styles.otpContainer}
              onLayout={(e) => {
                otpContainerYRef.current = e.nativeEvent.layout.y;
              }}
            >
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                  style={styles.otpBox}
                  keyboardType="numeric"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onFocus={handleOtpFocus}
                  returnKeyType={index === 5 ? 'done' : 'next'}
                />
              ))}
            </View>
            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimerText}>Resend OTP in {resendTimer} seconds</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating action button just above keyboard (raised a bit higher) */}
      <View
        pointerEvents="box-none"
        style={[
          styles.floatingButtonContainer,
          { bottom: kbVisible ? kbHeight + 40 : 50 },
        ]}
      >
        {renderActionButton()}
      </View>
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
    zIndex: 2,
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
    backgroundColor: '#DCFCE7',
  },
  formContent: {
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.03,
  },
  logoContainer1: {
    alignItems: 'center',
    marginBottom: height * 0.03,
    marginTop: height * 0.04,
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
  icon: { marginHorizontal: width * 0.03 },
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
  errorText: {
    color: '#D32F2F',
    fontSize: width * 0.035,
    marginTop: height * 0.005,
    marginBottom: height * 0.01,
  },
  floatingButtonContainer: {
    position: 'absolute',
    left: width * 0.05,
    right: width * 0.05,
    zIndex: 3,
  },
});

export default DoctorLoginScreen;
