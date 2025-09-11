import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthPost } from '../../auth/auth';
import Toast from 'react-native-toast-message';
const { width, height } = Dimensions.get('window');
const PLACEHOLDER_IMAGE = require('../../assets/img.png'); // Replace with your asset path

type RootStackParamList = {
  DoctorDashboard: undefined;
  // add other routes here if needed
};

const AccountVerified = () => {
    const navigation = useNavigation();
     const [loading, setLoading] = useState(false);

     console.log("go to dashboard")

 const handleGoToDashboard = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      Toast.show({ type: 'error', text1: 'Authentication token not found' });
      return;
    }

    const response = await AuthPost('users/updateFirstLogin', {}, token);
    console.log('updateFirstLogin response:', response);

    const statusVal = response?.status ?? response?.data?.statusCode ?? response?.data?.status;
    const isOk = statusVal === 200 || statusVal === 201 || statusVal === 'success';

    if (isOk) {
      navigation.navigate('DoctorDashboard');
      return;
    }

    Toast.show({
      type: 'error',
      text1: response?.data?.message || 'Failed to update first login',
    });
  } catch (error) {
    console.error('Error in handleGoToDashboard:', error);
    Toast.show({
      type: 'error',
      text1: error?.response?.data?.message || 'Failed to update first login',
    });
  } finally {
    setLoading(false);
  }
};

  const handleViewProfile = () => {
    setLoading(true);
    setTimeout(() => {
      // Add real navigation or functionality here
      setLoading(false);
    }, 1500);
  };
  return (
    <View style={styles.container}>
      {/* <Image
        source={PLACEHOLDER_IMAGE} // Replace with actual profile image URL
        style={styles.profileImage}
      /> */}
      <Ionicons
       name="checkmark-circle"
        size={25}
        color="#1E90FF"
        style={styles.checkmarkIcon}
      />
      <Text style={styles.verifiedText}>Account Verified</Text>
      <Text style={styles.congratsText}>
        Congratulations! Your account has been successfully verified. You now have full access to all features.
      </Text>
      {/* <TouchableOpacity style={styles.viewProfileButton}>
         {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>View Profile</Text>
        )}
      </TouchableOpacity> */}
      <TouchableOpacity style={styles.goToDashboardButton} onPress={handleGoToDashboard}>
        {/* <Text style={styles.buttonText2}>Go to Dashboard</Text> */}
         {loading ? (
          <ActivityIndicator color="#00203F" />
        ) : (
          <Text style={styles.buttonText2}>Go to Dashboard</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F3E6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#ADD8E6',
    marginBottom: 10,
  },
  checkmarkIcon: {
   
    zIndex:100,
    top: -30,
    left: 30,
  },
  verifiedText: {
    fontSize: width * 0.06,
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  congratsText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight:'500'
  },
  viewProfileButton: {
    backgroundColor: '#00203F',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 10,
    width: width * 0.8,
    alignItems: 'center',
  },
  goToDashboardButton: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: width * 0.8,
    alignItems: 'center',
    // borderWidth: 1,
    // borderColor: '#1E90FF',
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
  },
    buttonText2: {
    color: '#00203F',
    fontSize: width * 0.045,
    fontWeight: 'bold',
  },
});

export default AccountVerified;