import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Image,
  TextInput as TextInputType
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
import { UsePost } from '../auth/auth';
const { width } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Replace this with your actual stack param list
type RootStackParamList = {
  PersonalInfo: undefined;
  // add other routes here if needed
};

const DoctorLoginScreen = () => {
 const navigation = useNavigation<any>();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showOtp, setShowOtp] = useState(false);
  const [mobileError, setMobileError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);

    const otpRefs = useRef<(TextInputType | null)[]>(Array(6).fill(null));

 const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Move focus to next input if a digit is entered
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Move focus to previous input if the current input is cleared
    if (!text && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const validateMobile = (number: string) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  const handleSendOtp = async() => {
    if (!mobile) {
      setMobileError('Mobile number is required');
      return;
    }
    if (!validateMobile(mobile)) {
      setMobileError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setMobileError('');
    setShowOtp(true);
    try {
     const response = await UsePost('auth/login', {
        mobile,
        userType: 'doctor',
        language: 'tel',
      });
console.log("response",response)
if (response.status === 'success') {
        setShowOtp(true);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'OTP sent successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        setMobileError('message' in response ? response.message : 'Failed to send OTP');
      }
    } catch (error) {
      setMobileError('Network error. Please try again.');
      console.error('Error sending OTP:', error);
    } 
  };

 const handleLogin = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setOtpError('');
navigation.navigate('PersonalInfo');
    try {
      const response = await UsePost('auth/validateOtp', {
        userId,
        OTP: otpString,
        mobile,
      });
      console.log('validateOtp response', response);
      if (response.status === 'success') {
        const newToken = 'data' in response && response.data.token ? response.data.token : token; // Use new token if returned, else keep existing
        if (newToken) {
          await AsyncStorage.setItem('authToken', newToken);
        }
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Login successful',
          position: 'top',
          visibilityTime: 3000,
        });
        
        // TODO: Navigate to the next screen
      } else {
        setOtpError('message' in response ? response.message : 'Invalid OTP');
      }
    } catch (error) {
      setOtpError('Network error. Please try again.');
      console.error('Error validating OTP:', error);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
          />
        </View>
        <Text style={styles.portalTitle}>VYDHYO Doctor Portal</Text>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text style={styles.signInLink}>Sign in to your account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Mobile Number*</Text>
      <View style={[styles.inputContainer, mobileError ? styles.inputError : null]}>
        <Icon name="phone" size={20} color="#333" style={styles.icon} />
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

      <TouchableOpacity style={styles.sendOtpButton} onPress={handleSendOtp} disabled={isOtpSent}>
        <Text style={[styles.sendOtpText, isOtpSent ? styles.sendOtpButtonDisabled : null]}>
          Send OTP
        </Text>
      </TouchableOpacity>

      {showOtp && (
        <>
          <Text style={styles.label}>OTP</Text>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { otpRefs.current[index] = ref; }}
                style={styles.otpBox}
                keyboardType="numeric"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoWrapper: {
    width: 70,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  logo: {
    height: 70,
    width: 70,
  },
  portalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
    color: '#111827',
  },
  signInLink: {
    color: 'purple',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 10,
    color: '#000',
  },
  inputContainer: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 50,
  },
  inputError: {
    borderWidth: 1,
    borderColor: 'red',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  sendOtpButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sendOtpButtonDisabled: {
    backgroundColor: '#A5D6A7', // Lighter green to indicate disabled state
    opacity: 0.6,
  },
  sendOtpText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  otpBox: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 6,
    width: width * 0.11,
    height: 50,
    textAlign: 'center',
    fontSize: 18,
    backgroundColor: '#fff',
    color: '#000',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotText: {
    color: 'purple',
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: '#001F3F',
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 5,
  },
});

export default DoctorLoginScreen;