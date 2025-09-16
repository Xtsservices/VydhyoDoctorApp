import React, {useCallback, useEffect} from 'react';
import { Image, TouchableOpacity , StyleSheet, Dimensions, View } from 'react-native';
import { useNavigation} from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation<any>();

  const handleLogin = () => {
    navigation.navigate('Authloader');
  };

useEffect(() => {
    const timeout = setTimeout(() => {
      handleLogin();
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timeout); // cleanup if component unmounts
  }, []);

  return (
    <TouchableOpacity style={styles.container} onPress={handleLogin} >
      <Image
        source={require('../assets/doclogo.png')}
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