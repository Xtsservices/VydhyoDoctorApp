import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Linking,
  Alert,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation,useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Geocoder from 'react-native-geocoding';
import ProgressBar from '../progressBar/progressBar';
import {
  getCurrentStepIndex,
  TOTAL_STEPS,
} from '../../utility/registrationSteps';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthFetch, AuthPost } from '../../auth/auth';
import { typesAreEqual } from '@react-native-documents/picker/lib/typescript/types';
 
// Initialize Geocoder with your Google Maps API key
Geocoder.init('AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo');
 
interface Address {
  address: string;
  pincode: string;
  city: string;
  state: string;
  startTime: string;
  endTime: string;
  clinicName: string;
  mobile: string;
  type: 'Clinic';
  country: 'India';
  latitude: string;
  longitude: string;
}
 
interface Suggestion {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}
 
interface Errors {
  clinicName?: string;
  mobile?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
}
 
const { width, height } = Dimensions.get('window');
 
const PracticeScreen = () => {
  const navigation = useNavigation<any>();
  const [affiliation, setAffiliation] = useState<string | null>(null);
  const [opdAddresses, setOpdAddresses] = useState<Address[]>([
    {
      address: '',
      pincode: '',
      city: '',
      state: '',
      startTime: '',
      endTime: '',
      clinicName: '',
      mobile: '',
      type: 'Clinic',
      country: 'India',
      latitude: '20.5937',
      longitude: '78.9629',
    },
  ]);

  const buildClinicKey = (a: { clinicName?: string; city?: string; pincode?: string }) =>
    `${(a.clinicName || '').trim().toLowerCase()}|${(a.city || '').trim().toLowerCase()}|${(a.pincode || '').trim()}`;

  const [existingAddressKeys, setExistingAddressKeys] = useState<Set<string>>(new Set());
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(new Set());
  const isPrefilledAddr = (addr: Address) => prefilledKeys.has(buildClinicKey(addr));
  const [errors, setErrors] = useState<{ [key: number]: Errors }>({});
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentOpdIndex, setCurrentOpdIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultsPerAddress, setSearchResultsPerAddress] = useState<{ [key: number]: any[] }>({});
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRefs = useRef<MapView[]>([]);
  const [searchQueryPerAddress, setSearchQueryPerAddress] = useState<{ [key: number]: string }>({});
  const [showSearchResultsPerAddress, setShowSearchResultsPerAddress] = useState<{ [key: number]: boolean }>({});
  const [locationRetryCount, setLocationRetryCount] = useState(0);
  const locationRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 
  const isValidMobile = (mobile: string): boolean => {
    return mobile.length === 10 && /^[6-9]\d{9}$/.test(mobile);
  };


  
 
  useEffect(() => {
    setCurrentOpdIndex(opdAddresses.length - 1);
  }, [opdAddresses.length]);
 
  // Initialize location for all addresses when component mounts
  useEffect(() => {
    const initializeAllLocations = async () => {
      for (let i = 0; i < opdAddresses.length; i++) {
        await initLocation(i);
      }
    };
 
    initializeAllLocations();
 
    // Clean up any pending timeouts when component unmounts
    return () => {
      if (locationRetryTimeoutRef.current) {
        clearTimeout(locationRetryTimeoutRef.current);
      }
    };
  }, []);
 
  // Request location permission
  const requestLocationPermission = async () => {
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
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
    return true;
  };
 
  // Fetch address from coordinates
  const fetchAddressDetails = async (latitude: number, longitude: number, index: number) => {
    setIsFetchingLocation(true);
    try {
      const response = await Geocoder.from(latitude, longitude);
 
      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const addressComponents = result.address_components;
 
        let address = '';
        let city = '';
        let state = '';
        let pincode = '';
        let country = 'India';
 
        addressComponents.forEach((component: any) => {
          if (component.types.includes('street_number') || component.types.includes('route')) {
            address += component.long_name + ' ';
          }
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name;
          }
          if (component.types.includes('postal_code')) {
            pincode = component.long_name;
          }
          if (component.types.includes('country')) {
            country = component.long_name;
          }
        });
 
        address = address.trim() || result.formatted_address;
 
        setOpdAddresses(prev => {
            const updated = [...prev];
   updated[index] = {
     ...updated[index],
     address,
     pincode,
     city,
     state,
     country,
     latitude: latitude.toString(),
     longitude: longitude.toString(),
   };
   return updated;
 });
 
        // Update search query for this address
        setSearchQueryPerAddress(prev => ({
          ...prev,
          [index]: address
        }));
 
        // Reset retry count on success
        setLocationRetryCount(0);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch address details',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch address details',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setIsFetchingLocation(false);
    }
  };
 
  // Initialize map with current location
  const initLocation = async (index: number) => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to show your current location.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
 
    setIsFetchingLocation(true);
 
    // Configure high accuracy for better indoor positioning
    const locationOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds timeout
      maximumAge: 10000, // Accept cached location up to 10 seconds old
    };
 
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
 
        setOpdAddresses(prev => {
   const updated = [...prev];
   if (!updated[index]) return prev;
   updated[index] = {
     ...updated[index],
     latitude: latitude.toString(),
     longitude: longitude.toString(),
   };
   return updated;
 });
 
        if (mapRefs.current[index]) {
          mapRefs.current[index].animateToRegion(newRegion, 1000);
        }
 
        fetchAddressDetails(latitude, longitude, index);
      },
      (error) => {
        // Handle different error codes
        let errorMessage = 'Unable to fetch current location.';
 
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied. Please enable location permissions in settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information is unavailable. This might be due to being indoors or poor signal.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out. Please try again.';
        }
 
        // If we're indoors or have poor GPS, try again with a different approach
        if (locationRetryCount < 3) {
          setLocationRetryCount(prev => prev + 1);
 
          Toast.show({
            type: 'info',
            text1: 'Getting Location',
            text2: `Trying again... Attempt ${locationRetryCount + 1} of 3`,
            position: 'top',
            visibilityTime: 2000,
          });
 
          // Retry after a delay with different settings
          locationRetryTimeoutRef.current = setTimeout(() => {
            initLocationWithRetry(index);
          }, 2000);
        } else {
          Alert.alert(
            'Location Error',
            `${errorMessage} Please ensure location services are enabled and try again, or select a location manually.`,
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              {
                text: 'Try Again', onPress: () => {
                  setLocationRetryCount(0);
                  initLocation(index);
                }
              },
              { text: 'Select Manually', style: 'cancel' },
            ]
          );
        }
 
        setIsFetchingLocation(false);
      },
      locationOptions
    );
  };
 
  // Alternative method for getting location with different settings
  const initLocationWithRetry = async (index: number) => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;
 
    // Use different settings for retry
    const retryOptions = {
      enableHighAccuracy: locationRetryCount > 1, // Try high accuracy on second retry
      timeout: 20000, // Longer timeout
      maximumAge: 30000, // Accept older locations
    };
 
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setOpdAddresses(prev => {
          const updated = [...prev];
          if (!updated[index]) return prev;
          updated[index] = {
            ...updated[index],
            latitude: latitude.toString(),
            longitude: longitude.toString(),
   };
   return updated;
 });
 
        if (mapRefs.current[index]) {
          mapRefs.current[index].animateToRegion(newRegion, 1000);
        }
 
        fetchAddressDetails(latitude, longitude, index);
      },
      (error) => {
        setIsFetchingLocation(false);
 
        // If this retry also failed, try the original method again
        if (locationRetryCount < 3) {
          setLocationRetryCount(prev => prev + 1);
          setTimeout(() => initLocation(index), 2000);
        }
      },
      retryOptions
    );
  };
 
  // Update handleSearch function
  const handleSearch = async (query: string, index: number) => {
    setSearchQueryPerAddress(prev => ({
      ...prev,
      [index]: query
    }));
 
    if (query.length < 3) {
      setSearchResultsPerAddress(prev => ({
        ...prev,
        [index]: []
      }));
      setShowSearchResultsPerAddress(prev => ({
        ...prev,
        [index]: false
      }));
      return;
    }
 
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo&components=country:in`
      );
 
      const data = await response.json();
      if (data.status === 'OK') {
        setSearchResultsPerAddress(prev => ({
          ...prev,
          [index]: data.predictions
        }));
        setShowSearchResultsPerAddress(prev => ({
          ...prev,
          [index]: true
        }));
      } else {
        setSearchResultsPerAddress(prev => ({
          ...prev,
          [index]: []
        }));
      }
    } catch (error) {
      setSearchResultsPerAddress(prev => ({
        ...prev,
        [index]: []
      }));
    }
  };
 
  // Handle selecting a search result
  const handleSelectSearchResult = async (result: any, index: number) => {
    setSearchQueryPerAddress(prev => ({
      ...prev,
      [index]: result.description
    }));
    setShowSearchResultsPerAddress(prev => ({
      ...prev,
      [index]: false
    }));
    setIsFetchingLocation(true);
 
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.place_id}&key=AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo`
      );
 
      const data = await response.json();
      if (data.status === 'OK') {
        const place = data.result;
        const location = place.geometry.location;
        const latitude = location.lat;
        const longitude = location.lng;
 
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setOpdAddresses(prev => {
   const updated = [...prev];
   updated[index] = {
     ...updated[index],
     latitude: latitude.toString(),
     longitude: longitude.toString(),
   };
   return updated;
 });
 
        if (mapRefs.current[index]) {
          mapRefs.current[index].animateToRegion(newRegion, 500);
        }
 
        fetchAddressDetails(latitude, longitude, index);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to fetch place details. Please try again.');
    } finally {
      setIsFetchingLocation(false);
    }
  };
 
  // Handle map press to select a location
  const handleMapPress = (index: number, event: any) => {
    const { coordinate } = event.nativeEvent;
    const { latitude, longitude } = coordinate;
 
    const updatedAddresses = [...opdAddresses];
    updatedAddresses[index] = {
      ...updatedAddresses[index],
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    };
    setOpdAddresses(updatedAddresses);
 
    // Center map on selected location
    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
 
    if (mapRefs.current[index]) {
      mapRefs.current[index].animateToRegion(newRegion, 500);
    }
 
    fetchAddressDetails(latitude, longitude, index);
  };
 
  // Move to current location
  const handleMyLocation = async (index: number) => {
    setLocationRetryCount(0);
    await initLocation(index);
  };
 
  const handleAddAddress = () => {
    const newAddress: Address = {
      address: '',
      pincode: '',
      city: '',
      state: '',
      startTime: '',
      endTime: '',
      clinicName: '',
      mobile: '',
      type: 'Clinic',
      country: 'India',
      latitude: '20.5937',
      longitude: '78.9629',
    };
    setOpdAddresses(prev => [...prev, newAddress]);

 
    // Initialize location for the new address
    setTimeout(() => {
      initLocation(opdAddresses.length);
    }, 100);
  };
 
  const handleRemoveAddress = (index: number) => {
    setOpdAddresses(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };
 
  const handleTimeChange = (
    event: any,
    selectedTime: Date | undefined,
    type: 'startTime' | 'endTime',
    index: number,
  ) => {
    const currentTime = selectedTime || new Date();
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    const updatedAddresses = [...opdAddresses];
    updatedAddresses[index][type] = currentTime
      .toLocaleTimeString([], { hour: 'numeric', hour12: true })
      .replace(':00', '');
    setOpdAddresses(updatedAddresses);
  };
 
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;
    const [hourStr, period] = timeStr.split(' ');
    let hours = parseInt(hourStr, 10);
    if (period?.toLowerCase() === 'pm' && hours !== 12) hours += 12;
    if (period?.toLowerCase() === 'am' && hours === 12) hours = 0;
    return hours * 60;
  };
 
  const handleInputChange = (index: number, field: keyof Address, value: string) => {
 setOpdAddresses(prev => {
   const updated = [...prev];
   updated[index] = { ...updated[index], [field]: value } as Address;
   return updated;
 });
 
    if (field === 'address') {
      setSearchQueryPerAddress(prev => ({
        ...prev,
        [index]: value
      }));
    }
 
    // Clear error for the field when user starts typing
    setErrors(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: undefined,
      },
    }));
  };
 
  const validateFields = (address: Address, index: number) => {
    const newErrors: Errors = {};
    if (!address.clinicName.trim()) {
      newErrors.clinicName = 'Clinic Name is required';
    }
    if (!address.mobile.trim()) {
      newErrors.mobile = 'Mobile Number is required';
    } else if (!isValidMobile(address.mobile)) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
    }
    if (!address.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!address.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(address.pincode)) {
      newErrors.pincode = 'Enter a valid 6-digit pincode';
    }
    if (!address.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!address.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!address.country.trim()) {
      newErrors.country = 'Country is required';
    }
    return newErrors;
  };
 
  const handleNext = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('authToken');
    let hasErrors = false;
    const newErrors: { [key: number]: Errors } = {};
 
    // Validate all addresses
    opdAddresses.forEach((addr, index) => {
      const addressErrors = validateFields(addr, index);
      if (Object.keys(addressErrors).length > 0) {
        newErrors[index] = addressErrors;
        hasErrors = true;
      }
    });
 
    setErrors(newErrors);
 
    if (hasErrors) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill all required fields correctly',
        position: 'top',
        visibilityTime: 4000,
      });
      setLoading(false);
      return;
    }
 
    function convertTo24HourFormat(timeStr: string): string {
      if (!timeStr || typeof timeStr !== 'string') return '';
 
      const parts = timeStr.trim().toLowerCase().split(/\s+/);
      if (parts.length !== 2) return '';
 
      const [time, marker] = parts;
      let [hours, minutes] = time.split(':');
      minutes = minutes || '00';
 
      let hrs = parseInt(hours, 10);
      if (isNaN(hrs)) return '';
 
      if (marker === 'pm' && hrs !== 12) hrs += 12;
      if (marker === 'am' && hrs === 12) hrs = 0;
 
      return `${hrs.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
 
    const payload = opdAddresses.map(addr => ({
      ...addr,
      startTime: convertTo24HourFormat(addr?.startTime) || '06:00',
      endTime: convertTo24HourFormat(addr?.endTime) || '21:00',
    }));
 
    // Keep only NEW clinics (not already on server) and de-dup within current payload
const uniqueToAddMap = new Map<string, typeof payload[0]>();
for (const c of payload) {
  const key = buildClinicKey(c);
  if (!existingAddressKeys.has(key)) {
    // last one wins if user added same clinic twice in this screen
    uniqueToAddMap.set(key, c);
  }
}
const toAdd = Array.from(uniqueToAddMap.values());

if (toAdd.length === 0) {
  Toast.show({
    type: 'info',
    text1: 'No new clinics',
    text2: 'All listed clinics are already saved.',
    position: 'top',
    visibilityTime: 3000,
  });
  setLoading(false);
  await AsyncStorage.setItem('currentStep', 'ConsultationPreferences');
  navigation.navigate('ConsultationPreferences');
  return;
}

// Post only the new clinics, navigate once at the end
let allOk = true;
for (const clinic of toAdd) {
  const res = await AuthPost('users/addAddress', clinic, token);
  console.log('Add clinic response:', res);
  if (res?.status !== 'success') {
    allOk = false;
    if (response?.message?.message?.includes('E11000 duplicate key error collection: User.addresses index:')) {
           Toast.show({
          type: 'error',
          text1: 'Failed to update practice details',
          text2: 'Clinic name already exists. Please use a different name. or Skip to next step',
          position: 'top',
          visibilityTime: 4000,
        });
        }else{
Toast.show({
          type: 'error',
          text1: 'Failed to update practice details',
          text2: response?.message?.message || 'An unexpected error occurred. Please try again.',
          position: 'top',
          visibilityTime: 4000,
        });
        }
    break;
  } else {
    // optionally remember newly-added keys in this session
    const k = buildClinicKey(clinic);
    setExistingAddressKeys(prev => new Set([...Array.from(prev), k]));
  }
}

setLoading(false);
if (allOk) {
  Toast.show({
    type: 'success',
    text1: 'Success',
    text2: 'Practice details updated successfully!',
    position: 'top',
    visibilityTime: 3000,
  });
  await AsyncStorage.setItem('currentStep', 'ConsultationPreferences');
  navigation.navigate('ConsultationPreferences');
}

    setLoading(false);
  };
 
  const handleSkip = async () => {
    await AsyncStorage.setItem('currentStep', 'ConsultationPreferences');
        navigation.navigate('ConsultationPreferences');
  };
  const handleBack = () => {
    navigation.navigate('Specialization');
  };
 
  const [specialization, setSpecialization] = useState('');
  const [skipButton, setSkipButton] = useState(false);
 const [loadingUser, setLoadingUser] = useState(false);
  const fetchUserData = async () => {
    setLoadingUser(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('users/getUser', token);
      if (response?.data?.status === 'success') {
        const userData = response.data.data;
        setSpecialization(userData?.specialization[0]?.name);
 
        if (userData?.addresses && userData?.addresses?.length > 0) {
          setSkipButton(true)
          setOpdAddresses(
         userData.addresses.map((a) => ({
           address: a.address ?? '',
           pincode: a.pincode ?? '',
           city: a.city ?? '',
           state: a.state ?? '',
           startTime: a.startTime ?? '',
           endTime: a.endTime ?? '',
           clinicName: a.clinicName ?? '',
           mobile: a.mobile ?? '',
           type: a.type ?? 'Clinic',
           country: a.country ?? 'India',
           latitude: String(a.latitude ?? '20.5937'),
           longitude: String(a.longitude ?? '78.9629'),
         }))
       );
       setPrefilledKeys(
         new Set((userData.addresses || []).map((a: any) => buildClinicKey(a)))
       );
          setTimeout(() => {
            userData.addresses.forEach((_, index) => {
              initLocation(index);
            });
          }, 500);
        }
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch user data.',
        position: 'top',
        visibilityTime: 4000,
      });
    }finally{
      setLoadingUser(false);
    }
  };
 
 useFocusEffect(
   useCallback(() => {
     fetchUserData();
   }, [])
 );
 
  const isPhysio =
    Array.isArray(specialization)
      ? specialization.some(s => s?.trim().toLowerCase() === 'physiotherapist')
      : String(specialization ?? '').trim().toLowerCase() === 'physiotherapist';
 
  const renderSearchItem = (result: any, index: number) => (
    <TouchableOpacity
      style={styles.searchItem}
      onPress={() => handleSelectSearchResult(result, index)}
    >
      <Text style={styles.searchItemMainText}>
        {result.structured_formatting.main_text}
      </Text>
      <Text style={styles.searchItemSecondaryText}>
        {result.structured_formatting.secondary_text}
      </Text>
    </TouchableOpacity>
  );
  return (
    <KeyboardAvoidingView
      // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      {(loading || loadingUser) && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>
            {loadingUser ? 'Loading practice details...' : 'Processing...'}
          </Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice</Text>
      </View>
 
      <ProgressBar
        currentStep={getCurrentStepIndex('Practice')}
        totalSteps={TOTAL_STEPS}
      />
 
      <ScrollView
        style={styles.formContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.addressSection}>
          <View style={styles.headerRow}>
            <Text style={styles.label}>OPD Address(es)</Text>
            <TouchableOpacity
              style={[styles.addButton, isPhysio && styles.addButtonDisabled]}
              onPress={isPhysio ? undefined : handleAddAddress}
              disabled={isPhysio}
              accessibilityState={{ disabled: isPhysio }}
            >
              <Text style={styles.addButtonText}>+ Add Location</Text>
            </TouchableOpacity>
          </View>
 
          {opdAddresses.map((addr, index) => (
            <View key={index} style={styles.addressContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Select Location on Map</Text>
 
                {/* Location status indicator */}
                {isFetchingLocation && (
                  <View style={styles.locationStatus}>
                    <ActivityIndicator size="small" color="#3182CE" />
                    <Text style={styles.locationStatusText}>
                      {locationRetryCount > 0
                        ? `Getting location (attempt ${locationRetryCount + 1})...`
                        : 'Getting your location...'
                      }
                    </Text>
                  </View>
                )}
 
                {/* Search Input */}
                <View style={styles.searchContainer} pointerEvents={isPrefilledAddr(addr) ? 'none' : 'auto'}>
                  <View style={styles.searchInputContainer}>
                    <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
                    <TextInput
                      style={[styles.searchInput, isPrefilledAddr(addr) && styles.inputDisabled]}
                      placeholder="Search for an address or location"
                      placeholderTextColor="#A0AEC0"
                      value={searchQueryPerAddress[index] || ''}
                      onChangeText={(text) => {
                        handleSearch(text, index);
                      }}
                      editable={!isPrefilledAddr(addr)}
                    />
                    {searchQueryPerAddress[index] && searchQueryPerAddress[index].length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setSearchQueryPerAddress(prev => ({
                            ...prev,
                            [index]: ''
                          }));
                        }}
                      >
                        <Icon name="close" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </View>
 
                  {/* Search Results */}
                  {showSearchResultsPerAddress[index] && searchResultsPerAddress[index] && searchResultsPerAddress[index].length > 0 && (
                    <View style={styles.searchResultsContainer}>
                      <ScrollView style={styles.searchResultsList}>
                        {searchResultsPerAddress[index].map((result) => (
                          <View key={result.place_id}>
                            {renderSearchItem(result, index)}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
 
                <View style={styles.mapContainer} pointerEvents={isPrefilledAddr(addr) ? 'none' : 'auto'}>
                  <MapView
                    ref={(ref) => {
                      if (ref) {
                        mapRefs.current[index] = ref;
                      }
                    }}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                      latitude: parseFloat(addr.latitude) || 20.5937,
                      longitude: parseFloat(addr.longitude) || 78.9629,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    onPress={(e) => handleMapPress(index, e)}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    pitchEnabled={true}
                    rotateEnabled={true}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    followsUserLocation={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: parseFloat(addr.latitude) || 20.5937,
                        longitude: parseFloat(addr.longitude) || 78.9629,
                      }}
                    />
                  </MapView>
 
                  {/* Custom center marker - placed outside MapView */}
                  <View style={styles.markerFixed}>
                    <View style={styles.marker}>
                      <View style={styles.markerInner} />
                    </View>
                  </View>
 
                  <TouchableOpacity
                    style={[styles.myLocationButton, isPrefilledAddr(addr) && { opacity: 0.5 }]}
                    onPress={() => handleMyLocation(index)}
                    disabled={isPrefilledAddr(addr)}
                  >
                    <Icon name="crosshairs-gps" size={24} color="#3182CE" />
                  </TouchableOpacity>
                </View>
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Clinic Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors[index]?.clinicName && styles.inputError,
                    isPrefilledAddr(addr) && styles.inputDisabled,
                  ]}
                  placeholder="Enter Clinic Name"
                  placeholderTextColor="#999"
                  value={addr.clinicName}
                  onChangeText={text => handleInputChange(index, 'clinicName', text)}
                  editable={!isPrefilledAddr(addr)}
                />
                {errors[index]?.clinicName && (
                  <Text style={styles.errorText}>{errors[index].clinicName}</Text>
                )}
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Mobile *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors[index]?.mobile && styles.inputError,
                    isPrefilledAddr(addr) && styles.inputDisabled,
                  ]}
                  placeholder="Enter Mobile Number"
                  placeholderTextColor="#999"
                  value={addr.mobile}
                  onChangeText={(text) => {
                    const filteredText = text.replace(/[^0-9]/g, '');
                    if (filteredText.length > 0) {
                      const firstDigit = filteredText.charAt(0);
                      if (!['6', '7', '8', '9'].includes(firstDigit)) {
                        return;
                      }
                    }
                    handleInputChange(index, 'mobile', filteredText);
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                  editable={!isPrefilledAddr(addr)}
                />
                {errors[index]?.mobile && (
                  <Text style={styles.errorText}>{errors[index].mobile}</Text>
                )}
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={[
    styles.input,
    errors[index]?.address && styles.inputError,
    isPrefilledAddr(addr) && styles.inputDisabled,
  ]}
                  placeholder="Address"
                  placeholderTextColor="#999"
                  value={addr.address}
                  onChangeText={text => handleInputChange(index, 'address', text)}
                  editable={!isPrefilledAddr(addr)}
                />
                {errors[index]?.address && (
                  <Text style={styles.errorText}>{errors[index].address}</Text>
                )}
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Pincode *</Text>
                <TextInput
                   style={[
    styles.input,
    errors[index]?.pincode && styles.inputError,
    isPrefilledAddr(addr) && styles.inputDisabled,
  ]}
                  placeholder="Pincode"
                  placeholderTextColor="#999"
                  value={addr.pincode}
                  maxLength={6}
                  onChangeText={text => handleInputChange(index, 'pincode', text)}
                  keyboardType="numeric"
                  editable={!isPrefilledAddr(addr)}
                />
                {errors[index]?.pincode && (
                  <Text style={styles.errorText}>{errors[index].pincode}</Text>
                )}
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors[index]?.city && styles.inputError,
                    isPrefilledAddr(addr) && styles.inputDisabled,
                  ]}
                  placeholder="City"
                  placeholderTextColor="#999"
                  value={addr.city}
                  onChangeText={text => handleInputChange(index, 'city', text)}
                  editable={!isPrefilledAddr(addr)}
                />
                {errors[index]?.city && (
                  <Text style={styles.errorText}>{errors[index].city}</Text>
                )}
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>State *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors[index]?.state && styles.inputError,
                    isPrefilledAddr(addr) && styles.inputDisabled,
                  ]}
                  placeholder="State"
                  placeholderTextColor="#999"
                  value={addr.state}
                  onChangeText={text => handleInputChange(index, 'state', text)}
                  editable={!isPrefilledAddr(addr)}
                />
                {errors[index]?.state && (
                  <Text style={styles.errorText}>{errors[index].state}</Text>
                )}
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Country *</Text>
                <TextInput
                  style={[styles.input, errors[index]?.country && styles.inputError]}
                  placeholder="Country"
                  placeholderTextColor="#999"
                  value={addr.country}
                  onChangeText={text => handleInputChange(index, 'country', text)}
                  editable={false}
                />
                {errors[index]?.country && (
                  <Text style={styles.errorText}>{errors[index].country}</Text>
                )}
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Latitude"
                  placeholderTextColor="#999"
                  value={String(addr?.latitude)}
                  onChangeText={text => handleInputChange(index, 'latitude', text)}
                  editable={false}
                />
              </View>
 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Longitude"
                  placeholderTextColor="#999"
                  value={String(addr?.longitude)}
                  onChangeText={text => handleInputChange(index, 'longitude', text)}
                  editable={false}
                />
              </View>
 
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveAddress(index)}
                disabled={opdAddresses.length === 1}
              >
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.spacer} />
      </ScrollView>
      <View style={styles.buttonsContainer}>
       
      </View>
      {skipButton &&(
<TouchableOpacity style={styles.nextButton} onPress={handleSkip}>
        <Text style={styles.nextButtonText}>Skip</Text>
      </TouchableOpacity>
      )}
     
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingBottom: height * 0.1,
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#333',
    marginBottom: height * 0.01,
    marginTop: height * 0.015,
  },
  addressSection: {
    marginTop: height * 0.02,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: height * 0.015,
  },
  addressContainer: {
    marginBottom: height * 0.03,
    backgroundColor: '#fff',
    padding: width * 0.04,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    zIndex: 1,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: height * 0.015,
  },
  input: {
    height: height * 0.06,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: width * 0.03,
    color: '#333',
    backgroundColor: '#fff',
    fontSize: width * 0.04,
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: width * 0.035,
    marginTop: height * 0.005,
  },
  removeButton: {
    position: 'absolute',
    top: height * 0.0001,
    right: width * 0.02,
    zIndex: 10,
  },
  removeText: {
    color: '#D32F2F',
    fontSize: width * 0.05,
    fontWeight: 'bold',
  },
  addButton: {
    padding: width * 0.02,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#00203F',
    fontSize: width * 0.04,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: width * 0.05,
    marginBottom: height * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  spacer: {
    height: height * 0.1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderText: {
    color: '#fff',
    fontSize: width * 0.04,
    marginTop: height * 0.02,
  },
  // Map related styles
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // Custom marker styles
  markerFixed: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -12,
    marginTop: -24,
    zIndex: 15,
    pointerEvents: 'none',
  },
  marker: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    height: 24,
    width: 24,
    backgroundColor: '#3182CE',
    borderWidth: 3,
    borderColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#718096',
  },
  // Search related styles
  searchContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2D3748',
  },
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 20,
  },
  searchResultsList: {
    flex: 1,
  },
  searchItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchItemMainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3748',
  },
  searchItemSecondaryText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  // Location status indicator
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#EBF8FF',
    padding: 8,
    borderRadius: 4,
  },
  locationStatusText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#3182CE',
  },
  inputDisabled: {
   backgroundColor: '#F5F5F5',
   color: '#999',
 },
});
 
export default PracticeScreen;