import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width,  } = Dimensions.get('window');

const VerificationScreen = () => {
    const navigation = useNavigation<any>();
  return (
    <View style={styles.container}>
      <Image
        style={styles.profileImage}
        source={require('../assets/approvedmaledoc.png')} 
      />
      <Text style={styles.title}>Account Verified</Text>
      <Text style={styles.subtitle}>
        Congratulations! Your account has been successfully verified. You now have full access to all features.
      </Text>
    
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Text style={styles.buttonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d4f0e2', // Matching the light green background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: (width * 0.2) / 2,
    borderWidth: 2,
    borderColor: '#1DA1F2', // Blue border as in image
    marginBottom: 20,
  },
  title: {
    fontSize: width * 0.055,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: width * 0.035,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#1DA1F2', // Matching blue button color
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 5,
    marginVertical: 8,
    width: width * 0.6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.04,
    fontWeight: '500',
  },
});

export default VerificationScreen;