import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';
import { AuthPost } from '../../auth/auth';

const { width, height } = Dimensions.get('window');

const ProfileReview: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const initialTime = 48 * 60 * 60; // 48 hours in seconds
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const validateTime = (hours: number, minutes: number, seconds: number) => {
    if (hours < 0 || minutes < 0 || seconds < 0) {
      Alert.alert('Error', 'Invalid time format!');
      return false;
    }
    return true;
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (!validateTime(h, m, s)) return '00:00:00';
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSupport = () => {
    Alert.alert('Contact Support', 'Please email vydhyo@gmail.com for assistance.');
  };

  // Logout functionality
  const confirmLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: handleLogout,
        },
      ],
      { cancelable: true }
    );
  };

  const handleLogout = async () => {
    try {
      // Clear AsyncStorage
      const storedToken = await AsyncStorage.getItem('authToken');

      // Call logout API if token exists
      if (storedToken) {
        const response = await AuthPost("auth/logout", {}, storedToken);
      }

      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('currentStep');

      // Clear Redux user data
      dispatch({ type: 'currentUser', payload: null });
      dispatch({ type: 'currentUserID', payload: null });

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Logged out successfully',
        position: 'top',
        visibilityTime: 3000,
      });

      // Navigate to Login screen
      navigation.navigate('Login');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to log out. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Review</Text>
      </View>

      <ProgressBar currentStep={getCurrentStepIndex('ConfirmationScreen')} totalSteps={TOTAL_STEPS} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} />
            </View>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Will get back to you Shortly</Text>
            </View>

            <View style={styles.timerContainer}>
              <Text style={styles.subtitle}>
                Thank you for submitting your profile. Our medical team will review your information and get back to you shortly.
              </Text>
            </View>

            <View style={styles.supportContainer}>
              <TouchableOpacity
                style={styles.supportButton}
                onPress={handleSupport}
              >
                <Icon name="help-circle" size={20} color="#007AFF" />
                <Text style={styles.supportText}>Need help? Contact support</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={confirmLogout}
            >
              <Icon name="logout" size={20} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  backButton: {
    padding: width * 0.02,
  },
  headerTitle: {
    flex: 1,
    fontSize: width * 0.05,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginRight: width * 0.06,
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.03,
    justifyContent: 'center',
  },
  card: {
    marginTop: -10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: width * 0.05,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxHeight: height * 0.8,
  },
  logoContainer: {
    // marginTop: -50,
    marginBottom: -100,
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    resizeMode: 'contain',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: height * 0.03,
  },
  title: {
    fontSize: width * 0.05,
    fontWeight: '700',
    color: '#00203F',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: '#4ADE80',
    borderRadius: 2,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: height * 0.03,
    width: '100%',
  },
  estimatedTime: {
    fontSize: width * 0.038,
    color: '#666',
    fontWeight: '600',
    marginBottom: height * 0.015,
  },
  timerCircle: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: width * 0.175,
    backgroundColor: '#00203F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  timerText: {
    fontSize: width * 0.055,
    color: '#fff',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: width * 0.035,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: width * 0.02,
    lineHeight: 20,
  },
  highlightedText: {
    color: '#00203F',
    fontWeight: '700',
  },
  supportContainer: {
    marginBottom: height * 0.03,
    width: '100%',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.04,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1F0FF',
  },
  supportText: {
    marginLeft: 8,
    fontSize: width * 0.035,
    color: '#007AFF',
    fontWeight: '600',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: height * 0.02,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e114bff',
    paddingVertical: height * 0.018,
    paddingHorizontal: width * 0.05,
    borderRadius: 12,
    width: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: width * 0.038,
    fontWeight: '700',
    marginLeft: width * 0.02,
  },
});

export default ProfileReview;