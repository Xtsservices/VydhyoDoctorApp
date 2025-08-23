import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';

const { width, height } = Dimensions.get('window');

const ProfileReview: React.FC = () => {
  const navigation = useNavigation<any>();
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
    Alert.alert('Contact Support', 'Please email support@yourapp.com for assistance.');
    // Alternatively, implement navigation or email intent:
    // navigation.navigate('SupportScreen');
    // Linking.openURL('mailto:support@yourapp.com');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} >
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Review</Text>
      </View>

      <ProgressBar currentStep={getCurrentStepIndex('ConfirmationScreen')} totalSteps={TOTAL_STEPS} />


      {/* Content */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.card}>
          <View >
           <View style={styles.logoWrapper}>
                       <Image source={require('../../assets/logo.png')} style={styles.logo} />
                     </View>
          </View>
          <Text style={styles.title}>Will get back to you Shortly</Text>
          {/* <Text style={styles.subtitle}>
            Thank you for submitting your profile. Our medical team will review your information and get back to you within{' '}
            <Text style={{ color: '#00203F', fontWeight: '600' }}>48 hours</Text>.
          </Text>
          <Text style={styles.estimatedTime}>Estimated Time Left</Text>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text> */}
          <TouchableOpacity onPress={handleSupport}>
            <Text style={styles.helpText}>😊 Need help? Contact support</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer to ensure content is not hidden */}
        <View style={styles.spacer} />
      </ScrollView>
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
  circle: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  square: {
    width: width * 0.18,
    height: width * 0.18,
    backgroundColor: '#00203F',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  timer: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
    marginTop: height * 0.005,
  },
  title: {
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: height * 0.01,
  },
  subtitle: {
    fontSize: width * 0.04,
    color: '#666',
    textAlign: 'center',
    marginBottom: height * 0.02,
    fontWeight: '500',
    paddingHorizontal: width * 0.02,
  },
  estimatedTime: {
    fontSize: width * 0.035,
    color: '#333',
    fontWeight: '500',
    marginBottom: height * 0.01,
    marginTop: height * 0.03,
  },
  timerText: {
    fontSize: width * 0.06,
    color: '#00203F',
    fontWeight: '600',
    marginBottom: height * 0.03,
  },
  helpText: {
    fontSize: width * 0.035,
    color: '#00203F',
    textAlign: 'center',
    fontWeight: '500',
  },
  spacer: {
    height: height * 0.1,
  },
  logo: {
    width: width * 0.7,
    height: width * 0.7,
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileReview;