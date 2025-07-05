import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthPost, AuthFetch } from '../../auth/auth';
import Geolocation from '@react-native-community/geolocation';
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';




interface Address {
  id: number;
  address: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
  startTime: string;
  endTime: string;
}

interface Suggestion {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

const initialData = {
  type: 'Clinic',
  clinicName: 'sindhu clinic',
  address:
    '1/2/50/135, Jai Bharat Nagar, Hyder Nagar, Brindavan Colony, Nizampet, Hyderabad, Telangana 500090, India',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  mobile: '9403850934',
  pincode: '500090',
  startTime: '09:00',
  endTime: '17:00',
  latitude: '17.5020946',
  longitude: '78.3856337',
  userId: 'VYDUSER39',
};

const { width, height } = Dimensions.get('window');

const PracticeScreen = () => {
  const navigation = useNavigation<any>();
  const [affiliation, setAffiliation] = useState<string | null>(null);
  const [opdAddresses, setOpdAddresses] = useState<Address[]>([
    { id: 1, address: '', landmark: '', pincode: '', city: '', state: '', startTime: '', endTime: '' },
  ]);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentOpdIndex, setCurrentOpdIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: '17.5020946',
    longitude: '78.3856337',
    clinicName: 'Sindhu Clinic',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
  })

  const GOOGLE_API_KEY = 'AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo'; 
  

  useEffect(() => {
    setCurrentOpdIndex(opdAddresses.length - 1);
  }, [opdAddresses.length]);

  const fetchAddressSuggestions = async (query: string, isAffiliation: boolean, index?: number) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(
        `http://192.168.1.42:3000/address/googleAddressSuggession?input=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Address suggestions response:', response.data);

      if (response.data.status === 'success') {
        setSuggestions(response.data.data.prediction || []);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch address suggestions',
        position: 'top',
        visibilityTime: 4000,
      });
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddAddress = () => {
    const newAddress = {
      id: opdAddresses.length + 1,
      address: '',
      landmark: '',
      pincode: '',
      city: '',
      state: '',
      startTime: '',
      endTime: '',
    };
    setOpdAddresses([...opdAddresses, newAddress]);
  };

  const handleRemoveAddress = (id: number) => {
    setOpdAddresses(opdAddresses.filter((addr) => addr.id !== id));
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined, type: 'startTime' | 'endTime', index: number) => {
    const currentTime = selectedTime || new Date();
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    const updatedAddresses = [...opdAddresses];
    updatedAddresses[index][type] = currentTime.toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(':00', '');
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

  const handleSelectAddress = (suggestion: Suggestion, isAffiliation: boolean, index?: number) => {
    const selectedAddress = suggestion.structured_formatting?.main_text || suggestion.description;
    if (isAffiliation) {
      setAffiliation(selectedAddress);
    } else if (index !== undefined) {
      const updatedAddresses = [...opdAddresses];
      updatedAddresses[index] = { ...updatedAddresses[index], address: selectedAddress };
      setOpdAddresses(updatedAddresses);
    }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleInputChange = (index: number, field: keyof Address, value: string) => {
     if (field === 'pincode' && value && !/^\d{6}$/.test(value)) {
      if (value.length > 6) return; // Prevent typing beyond 6 digits
      Toast.show({
        type: 'error',
        text1: 'Invalid Pincode',
        text2: 'Pincode must be exactly 6 digits',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }
    const updatedAddresses = [...opdAddresses];
    (updatedAddresses[index][field] as string) = value;
    setOpdAddresses(updatedAddresses);
    if (field === 'address') {
      fetchAddressSuggestions(value, false, index);
    }
  };

  const handleNext = async () => {
    const hasInvalidAddress = opdAddresses.some(
      (addr) => !addr.address || !addr.pincode || !addr.city || !addr.state || !addr.startTime || !addr.endTime
    );

    
    if (hasInvalidAddress) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill all required OPD Address fields (address, pincode, city, state, and times)',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    const hasInvalidTime = opdAddresses.some((addr) => {
      const startMinutes = parseTimeToMinutes(addr.startTime);
      const endMinutes = parseTimeToMinutes(addr.endTime);
      return startMinutes >= endMinutes || startMinutes === -1 || endMinutes === -1;
    });
    if (hasInvalidTime) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'End time must be after Start time for all OPD addresses',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

    const data = {
  type: 'Clinic',
  clinicName: 'sindhu clinic',
  address: '1/2/50/135, Jai Bharat Nagar, Hyder Nagar, Brindavan Colony, Nizampet, Hyderabad, Telangana 500090, India',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  mobile: '9403850934',
  pincode: '500090',
  startTime: '09:00',
  endTime: '17:00',
  latitude: '17.5020946',
  longitude: '78.3856337',
  userId: 'VYDUSER39'
}
    const res = await AuthPost('users/addAddress', data, token);
    

     

       Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Practice details updated successfully!',
          position: 'top',
          visibilityTime: 3000,
        });
        navigation.navigate('ConsultationPreferences');

     
    } catch (err) {
      console.error('API error:', err);
      let errorMessage = 'Failed to update practice details.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  console.log('OPD Addresses:', opdAddresses);
  console.log('Affiliation:', affiliation);
  console.log('Suggestions:', suggestions);
  console.log('Current OPD Index:', currentOpdIndex);


  const handleMapPress = async (event: MapPressEvent) => {

    console.log('Map pressed at:', event.nativeEvent.coordinate);
    const { latitude, longitude } = event.nativeEvent.coordinate;

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
      );

      if (response.data.status === 'OK') {
        const result = response.data.results[0];
        const address = result.formatted_address;

        // Parse parts (city, state, etc.)
        let city = '', state = '', country = '', postalCode = '';
        result.address_components.forEach((component: any) => {
          const types = component.types;
          if (types.includes('locality')) city = component.long_name;
          if (types.includes('administrative_area_level_1')) state = component.long_name;
          if (types.includes('country')) country = component.long_name;
          if (types.includes('postal_code')) postalCode = component.long_name;
        });

        setSelectedLocation({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          clinicName: 'Selected Clinic',
          address,
          city,
          state,
          country,
          pincode: postalCode,
        });
      } else {
        // Alert.alert('Failed to fetch address from Google Maps');
      }
    } catch (err) {
      console.error(err);
      // Alert.alert('Error fetching location data');
    }
  };

  const region = {
    latitude: parseFloat(selectedLocation.latitude),
    longitude: parseFloat(selectedLocation.longitude),
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

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
      <ProgressBar currentStep={getCurrentStepIndex('Practice')} totalSteps={TOTAL_STEPS} />
      <ScrollView
        style={styles.formContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Uncomment if Clinic/Hospital Affiliation is needed */}
        {/* <Text style={styles.label}>Clinic/Hospital Affiliation</Text>
        <View style={styles.searchContainer}>
          <Icon name="map-marker" size={width * 0.05} color="#00203F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or select..."
            placeholderTextColor="#999"
            value={affiliation || ''}
            onChangeText={(text) => {
              setAffiliation(text);
              fetchAddressSuggestions(text, true);
            }}
          />
        </View>
        {showSuggestions && suggestions.length > 0 && selectedAddressIndex === null && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectAddress(item, true)}
                >
                  <Text style={styles.suggestionMainText}>
                    {item.structured_formatting?.main_text || item.description}
                  </Text>
                  {item.structured_formatting?.secondary_text && (
                    <Text style={styles.suggestionSecondaryText}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.suggestionsList}
              nestedScrollEnabled={true}
            />
          </View>
        )} */}

         <View style={{ flex: 1 }}>
      <MapView style={styles.map} region={region} onPress={handleMapPress}>
        <Marker
          coordinate={{
            latitude: parseFloat(selectedLocation.latitude),
            longitude: parseFloat(selectedLocation.longitude),
          }}
          title={selectedLocation.clinicName}
          description={selectedLocation.address}
        />
      </MapView>

      <View style={styles.infoBox}>
        <Text>Address: {selectedLocation.address}</Text>
        <Text>City: {selectedLocation.city}</Text>
        <Text>State: {selectedLocation.state}</Text>
        <Text>Country: {selectedLocation.country}</Text>
        <Text>Pincode: {selectedLocation.pincode}</Text>
        <Text>Latitude: {selectedLocation.latitude}</Text>
        <Text>Longitude: {selectedLocation.longitude}</Text>
      </View>
    </View>
        <View style={styles.spacer} />
      </ScrollView>
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: height * 0.25,
    borderRadius: 8,
    marginBottom: height * 0.02,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: height * 0.01,
  },
  value: {
    fontSize: width * 0.04,
    color: '#333',
  },
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
    paddingBottom: height * 0.1, // Extra padding to ensure content is scrollable above keyboard
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#333',
    marginBottom: height * 0.01,
    marginTop: height * 0.015,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    height: height * 0.06,
    marginBottom: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginHorizontal: width * 0.03,
  },
  searchInput: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#333',
    paddingHorizontal: width * 0.03,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    maxHeight: height * 0.25,
    marginBottom: height * 0.02,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
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
  suggestionsList: {
    maxHeight: height * 0.25,
  },
  suggestionItem: {
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.04,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    minHeight: height * 0.05,
  },
  suggestionMainText: {
    fontSize: width * 0.04,
    color: '#333',
    fontWeight: '600',
    flexWrap: 'wrap',
    lineHeight: width * 0.05,
  },
  suggestionSecondaryText: {
    fontSize: width * 0.035,
    color: '#666',
    flexWrap: 'wrap',
    lineHeight: width * 0.045,
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 0,
  },
  timeButton: {
    height: height * 0.06,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    flex: 1,
    marginRight: width * 0.02,
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.03,
  },
  clockIcon: {
    marginRight: width * 0.02,
  },
  timeText: {
    color: '#333',
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
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: width * 0.04,
    marginTop: height * 0.02,
    marginBottom: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default PracticeScreen;