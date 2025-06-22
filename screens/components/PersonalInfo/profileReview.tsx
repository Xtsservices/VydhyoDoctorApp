import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const ProfileReview: React.FC = () => {
  const [hours, minutes, seconds] = [47, 59, 58];

  const validateTime = () => {
    if (hours < 0 || minutes < 0 || seconds < 0) {
    //   alert('Invalid time format!');
      return false;
    }
    return true;
  };

  return (
    <View style={styles.container}>
     <View style={styles.circle}>
  <View style={styles.square}>
    <Text style={styles.timer}>{`${hours}:${minutes}`}</Text>
  </View>
</View>
      <Text style={styles.title}>Profile Under Review</Text>
      <Text style={styles.subtitle}>
        Thank you for submitting your profile. Our medical team will review your information and get back to you within   <Text style={{ color: '#3C91E6' }}>48 hours</Text> 
      </Text>
      <Text style={styles.estimatedTime}>Estimated Time Left</Text>
      <Text style={styles.timerText}>{`${hours}:${minutes}:${seconds}`}</Text>
      <TouchableOpacity 
    //   onPress={() => alert('Contact support clicked!')}
      >
        <Text style={styles.helpText}>😊 Need help? Contact support</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F3E6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  square: {
    width: 70,
    height: 70,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#17406D',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#57606F',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  estimatedTime: {
    fontSize: 14,
    color: '#8D99AE',
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 40,
  },
  timerText: {
    fontSize: 24,
    color: '#4A90E2',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  helpText: {
    fontSize: 14,
    color: '#4A90E2',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ProfileReview;