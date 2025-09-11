// AuthLoader.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { AuthFetch } from '../auth/auth';

const { width, height } = Dimensions.get('window');

const AuthLoader = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [isPatient, setIsPatient] = useState(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUserId = await AsyncStorage.getItem('userId');

        if (!storedToken || !storedUserId) {
          navigation.replace('Login');
          return;
        }

        const profileResponse = await AuthFetch('users/getUser', storedToken);

        if (
          profileResponse?.status === 'success' &&
          profileResponse?.data &&
          profileResponse?.data.data
        ) {
          const userData = profileResponse?.data?.data;
          console.log(userData, "current user data")

           if (userData.role === 'patient') {
            console.log(userData.role, 'user is a patient');
            setIsPatient(true); // Set state to show unauthorized message
            return;
          }

          dispatch({ type: 'currentUser', payload: userData });
          dispatch({ type: 'currentUserID', payload: { userId: storedUserId } });

          if (userData.role !== 'doctor') {
            navigation.replace('DoctorDashboard');
            return;
          }

         

          

          const { screen, params } = await determineNextScreen(userData);
          await AsyncStorage.setItem('currentStep', screen);
          navigation.replace(screen, params || {});
        } else {
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Login check failed:', error);
        navigation.replace('Login');
      }
    };

    checkLoginStatus();
  }, []);

  console.log(AsyncStorage.getItem('currentStep'), "userCurren step")

  const determineNextScreen = async (userData: any): Promise<{ screen: string; params?: any }> => {
    console.log(userData, "complete user data")
    if (userData?.role !== 'doctor') {
      return { screen: 'DoctorDashboard' };
    }

    if (userData?.status === 'approved' && userData?.isFirstLogin===true) {
      console.log("12qw")
      return { screen: 'AccountVerified' };
    }else if (userData?.status === 'approved' && userData?.isFirstLogin===false) { 
      return { screen: 'DoctorDashboard' };
    }

    const storedStep = await AsyncStorage.getItem('currentStep');
    console.log("storedStep",storedStep)
    if (storedStep === 'ProfileReview') {
      return { screen: 'ProfileReview' };
    }

    if (!userData?.firstname || !userData?.lastname || !userData?.email || !userData?.medicalRegistrationNumber) {
      return { screen: 'PersonalInfo' };
    }
    if (!userData?.specialization || !userData?.specialization.name) {
      return { screen: 'Specialization' };
    }
     if (!userData?.addresses || userData?.addresses?.length === 0) {
      return { screen: 'Practice' };
    }

    if (!userData?.consultationModeFee || userData?.consultationModeFee?.length === 0) {
      return { screen: 'ConsultationPreferences' };
    }


  if ((!userData?.bankDetails || !userData?.bankDetails?.bankName) && !storedStep) {
  return { screen: 'FinancialSetupScreen' };
}

    if (!userData?.kycDetails) {
      return { screen: 'KYCDetailsScreen' };
    }
    if (userData?.status === 'pending') {
      return { screen: 'ConfirmationScreen' };
    }
    if (userData?.status === 'inActive') {
      return { screen: 'ProfileReview' };
    }

    return { screen: 'ProfileReview' };
  };

  if (isPatient) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>You are not Authorized to access this app</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007bff" />
      <Text style={styles.text}>Checking login status...</Text>
    </View>
  );
};

export default AuthLoader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
  },
  text: {
    marginTop: height * 0.02,
    fontSize: width * 0.04,
    color: '#333',
  },
  errorText: {
    fontSize: width * 0.05,
    color: '#FF0000',
    textAlign: 'center',
    paddingHorizontal: width * 0.05,
  },

});
