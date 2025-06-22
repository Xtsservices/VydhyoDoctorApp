import React, {useCallback} from 'react';
import { Image, TouchableOpacity , StyleSheet, Dimensions, View } from 'react-native';
import { useNavigation} from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation<any>();

  const handleLogin = () => {
    navigation.navigate('Login');
  };



  return (
    <TouchableOpacity style={styles.container} onPress={handleLogin} >
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
      />
     
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