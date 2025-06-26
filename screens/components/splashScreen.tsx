import React, { useEffect, useState } from 'react';
import { Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userId] = useState<string>(''); // Set a default or fetch as needed
  const [userStatus, setUserStatus] = useState<string>(''); // State to hold user status

  const handleLogin = () => {
    if (userStatus === 'approved') {
      navigation.navigate('VerificationScreen');
      return;
    }
    if (!isLoading) {
      navigation.navigate('Login');
    }
  };


  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true); // Set loading state to true initially
      try {
        // Retrieve token from AsyncStorage
        const token = await AsyncStorage.getItem('authToken');
        // await AsyncStorage.removeItem('stepNo');

        if (!token) {
          throw new Error('Authentication token not found');
        }

        const step = await AsyncStorage.removeItem('stepNo');
        console.log(`Step removed from AsyncStorage: ${step}`);

        // Make API call
        const response = await axios.get(
          'http://216.10.251.239:3000/users/getUser',
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
        setIsLoading(false); // Set loading state to true initially

        console.log('User data fetched successfully:', response?.data?.data);
        setUserStatus(response?.data?.data.status); // Set user status from response
        // Check if response status is success
        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Failed to fetch user data');
        }

        // Helper function to mask account number
      } catch (error: any) {
        setIsLoading(false); // Set loading state to true initially

        console.error('Error fetching user data:', error.message);
      }
    };
    fetchUserData();
  }, [userId]);

  return (
    <TouchableOpacity style={styles.container} onPress={handleLogin}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    resizeMode: 'contain',
  },
});

export default SplashScreen;
