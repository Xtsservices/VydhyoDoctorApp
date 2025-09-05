import React, { useEffect, useState, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
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
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentOpdIndex, setCurrentOpdIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRefs = useRef<MapView[]>([]);
  const [searchQueryPerAddress, setSearchQueryPerAddress] = useState<{[key: number]: string}>({});
  const [showSearchResultsPerAddress, setShowSearchResultsPerAddress] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    setCurrentOpdIndex(opdAddresses.length - 1);
  }, [opdAddresses.length]);

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
        console.warn('Permission error:', err);
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

        const updatedAddresses = [...opdAddresses];
        updatedAddresses[index] = {
          ...updatedAddresses[index],
          address: address,
          pincode: pincode,
          city: city,
          state: state,
          country: country,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        };
        setOpdAddresses(updatedAddresses);
        
        // Update search query for this address
        setSearchQueryPerAddress(prev => ({
          ...prev,
          [index]: address
        }));
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
      console.error('Error fetching address details:', error);
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
      Alert.alert('Permission Denied', 'Location permission is required to show your current location.');
      return;
    }

    setIsFetchingLocation(true);
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        const updatedAddresses = [...opdAddresses];
        updatedAddresses[index] = {
          ...updatedAddresses[index],
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        };
        setOpdAddresses(updatedAddresses);
        
        if (mapRefs.current[index]) {
          mapRefs.current[index].animateToRegion(newRegion, 1000);
        }
        
        fetchAddressDetails(latitude, longitude, index);
      },
      (error) => {
        console.error('Location Error:', error);
        Alert.alert(
          'Location Error',
          'Unable to fetch current location. Please ensure location services are enabled and try again, or select a location manually.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'OK', style: 'cancel' },
          ]
        );
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    );
  };

  // Handle search input
  const handleSearch = async (query: string, index: number) => {
    setSearchQueryPerAddress(prev => ({
      ...prev,
      [index]: query
    }));

    if (query.length < 3) {
      setSearchResults([]);
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
        setSearchResults(data.predictions);
        setShowSearchResultsPerAddress(prev => ({
          ...prev,
          [index]: true
        }));
      } else {
        console.log('Autocomplete failed:', data.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
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
        
        const updatedAddresses = [...opdAddresses];
        updatedAddresses[index] = {
          ...updatedAddresses[index],
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        };
        setOpdAddresses(updatedAddresses);
        
        if (mapRefs.current[index]) {
          mapRefs.current[index].animateToRegion(newRegion, 500);
        }
        
        fetchAddressDetails(latitude, longitude, index);
      } else {
        console.log('Place details failed:', data.status);
      }
    } catch (error) {
      console.error('Place details error:', error);
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
    setOpdAddresses([...opdAddresses, newAddress]);
  };

  const handleRemoveAddress = (index: number) => {
    setOpdAddresses(opdAddresses.filter((_, i) => i !== index));
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

  const handleInputChange = (
    index: number,
    field: keyof Address,
    value: string,
  ) => {
    const updatedAddresses = [...opdAddresses];
    (updatedAddresses[index][field] as string) = value;
    setOpdAddresses(updatedAddresses);
  };

  const handleNext = async () => {
    const token = await AsyncStorage.getItem('authToken');
    const hasInvalidAddress = opdAddresses.some(
      addr => !addr.address || !addr.pincode || !addr.city || !addr.state,
    );
     if (hasInvalidAddress) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2:
          'Please fill all required OPD Address fields (address, pincode, city, state, and times)',
        position: 'top',
        visibilityTime: 4000,
      });
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

    console.log(
      'Converting times to 24-hour format...',
      convertTo24HourFormat(opdAddresses[0].startTime),
    );

    const payload = opdAddresses.map(addr => ({
      ...addr,
      startTime: convertTo24HourFormat(addr?.startTime) || '06:00 ',
      endTime: convertTo24HourFormat(addr?.endTime )|| '21:00 ',
    }));

    console.log('Payload for API:', payload);

    for (const clinic of payload) {
      const response = await AuthPost('users/addAddress', clinic, token);
      console.log('API Response:12', response);
   
      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Practice details updated successfully!',
          position: 'top',
          visibilityTime: 4000,
        });
        await AsyncStorage.setItem('currentStep', 'ConsultationPreferences');
        navigation.navigate('ConsultationPreferences');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to update practice details',
          text2: response?.message?.message,
          position: 'top',
          visibilityTime: 4000,
        });
        return;
      }
    }
  };

  const handleBack = () => {
    navigation.navigate('Specialization');
  };
  
  const [specialization, setSpecialization] = useState('')

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('users/getUser', token);
      console.log(response)
      if (response.data.status === 'success') {
        const userData = response.data.data;
        setSpecialization(userData?.specialization[0]?.name)
        setOpdAddresses(userData?.addresses)
        console.log(userData, "complete response")
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch user data.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Check if user is physiotherapist
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>Processing...</Text>
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
                
                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search for an address or location"
                      placeholderTextColor="#A0AEC0"
                      value={searchQueryPerAddress[index] || ''}
                      onChangeText={(text) => {
                        handleSearch(text, index);
                      }}
                    />
                    {searchQueryPerAddress[index] && searchQueryPerAddress[index].length > 0 && (
                      <TouchableOpacity onPress={() => {
                        setSearchQueryPerAddress(prev => ({
                          ...prev,
                          [index]: ''
                        }));
                      }}>
                        <Icon name="close" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Search Results */}
                  {showSearchResultsPerAddress[index] && searchResults.length > 0 && (
                    <View style={styles.searchResultsContainer}>
                      <ScrollView style={styles.searchResultsList}>
                        {searchResults.map((result) => (
                          <View key={result.place_id}>
                            {renderSearchItem(result, index)}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                <View style={styles.mapContainer}>
                  <MapView
                    ref={ref => {
                      if (ref) mapRefs.current[index] = ref;
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
                  >
                    <Marker
                      coordinate={{
                        latitude: parseFloat(addr.latitude) || 20.5937,
                        longitude: parseFloat(addr.longitude) || 78.9629,
                      }}
                    />
                  </MapView>
                  
                  <TouchableOpacity 
                    style={styles.myLocationButton} 
                    onPress={() => handleMyLocation(index)}
                  >
                    <Icon name="crosshairs-gps" size={24} color="#3182CE" />
                  </TouchableOpacity>
                </View>
                
                {isFetchingLocation && (
                  <View style={styles.locationLoading}>
                    <ActivityIndicator size="small" color="#3182CE" />
                    <Text style={styles.locationLoadingText}>Fetching location...</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Clinic Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Clinic Name"
                  placeholderTextColor="#999"
                  value={addr.clinicName}
                  onChangeText={text =>
                    handleInputChange(index, 'clinicName', text)
                  }
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Mobile *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Mobile Number"
                  placeholderTextColor="#999"
                  value={addr.mobile}
                  onChangeText={text =>
                    handleInputChange(index, 'mobile', text)
                  }
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Address"
                  placeholderTextColor="#999"
                  value={addr.address}
                  onChangeText={text =>
                    handleInputChange(index, 'address', text)
                  }
                  editable={false}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Pincode *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Pincode"
                  placeholderTextColor="#999"
                  value={addr.pincode}
                  maxLength={6}
                  onChangeText={text =>
                    handleInputChange(index, 'pincode', text)
                  }
                  keyboardType="numeric"
                  editable={false}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#999"
                  value={addr.city}
                  onChangeText={text => handleInputChange(index, 'city', text)}
                  editable={false}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>State *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor="#999"
                  value={addr.state}
                  onChangeText={text => handleInputChange(index, 'state', text)}
                  editable={false}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Country *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Country"
                  placeholderTextColor="#999"
                  value={addr.country}
                  onChangeText={text =>
                    handleInputChange(index, 'country', text)
                  }
                  editable={false}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Latitude"
                  placeholderTextColor="#999"
                  value={String(addr?.latitude)}
                  onChangeText={text =>
                    handleInputChange(index, 'latitude', text)
                  }
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
                  onChangeText={text =>
                    handleInputChange(index, 'longitude', text)
                  }
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
});

export default PracticeScreen;