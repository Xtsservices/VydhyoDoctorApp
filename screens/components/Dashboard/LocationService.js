import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

class LocationService {
  static async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show your current position.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          // If permission denied but not permanently, show explanation
          if (granted === PermissionsAndroid.RESULTS.DENIED) {
            Alert.alert(
              'Location Permission Needed',
              'This app needs location permission to work properly. Please grant location permission in settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
          return false;
        }
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    // For iOS, permissions are handled differently
    return true;
  }

  static getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      };

      Geolocation.getCurrentPosition(
        resolve,
        reject,
        { ...defaultOptions, ...options }
      );
    });
  }

  static isInIndia(latitude, longitude) {
    return (
      latitude >= 6.554607 &&
      latitude <= 35.674545 &&
      longitude >= 68.111378 &&
      longitude <= 97.395561
    );
  }
}

export default LocationService;