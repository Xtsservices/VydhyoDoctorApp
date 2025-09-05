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
import MapView, { Marker, Region, LongPressEvent } from 'react-native-maps';
import ProgressBar from '../progressBar/progressBar';
import {
  getCurrentStepIndex,
  TOTAL_STEPS,
} from '../../utility/registrationSteps';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthFetch, AuthPost } from '../../auth/auth';

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
      latitude: '56.1304',
      longitude: '-106.3468',
    },
  ]);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<
    number | null
  >(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentOpdIndex, setCurrentOpdIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentOpdIndex(opdAddresses.length - 1);
  }, [opdAddresses.length]);

  const fetchAddressSuggestions = async (
    query: string,
    isAffiliation: boolean,
    index?: number,
  ) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(
        `http://192.168.1.14:3000/address/googleAddressSuggession?input=${encodeURIComponent(
          query,
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
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

  const fetchAddressDetails = async (
    latitude: number,
    longitude: number,
    index: number,
  ) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(
        `http://192.168.1.14:3000/address/reverseGeocode?lat=${latitude}&lng=${longitude}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log('Reverse geocode response:', response.data);

      if (
        response.data.status === 'success' &&
        response.data.data.results.length > 0
      ) {
        const result = response.data.data.results[0];
        const addressComponents = result.address_components;

        let address = '';
        let city = '';
        let state = '';
        let pincode = '';
        let country = 'India';

        addressComponents.forEach((component: any) => {
          if (
            component.types.includes('street_number') ||
            component.types.includes('route')
          ) {
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
    }
  };

  const fetchCoordinatesFromPlaceId = async (
    placeId: string,
    index: number,
  ) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(
        `http://192.168.1.14:3000/address/placeDetails?place_id=${placeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log('Place details response:', response.data);

      if (response.data.status === 'success' && response.data.data.result) {
        const { lat, lng } = response.data.data.result.geometry.location;
        const updatedAddresses = [...opdAddresses];
        updatedAddresses[index] = {
          ...updatedAddresses[index],
          latitude: lat.toString(),
          longitude: lng.toString(),
        };
        setOpdAddresses(updatedAddresses);
        fetchAddressDetails(lat, lng, index);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch place coordinates',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error('Error fetching place coordinates:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch place coordinates',
        position: 'top',
        visibilityTime: 4000,
      });
    }
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
      latitude: '56.1304',
      longitude: '-106.3468',
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

  const handleSelectAddress = (
    suggestion: Suggestion,
    isAffiliation: boolean,
    index?: number,
  ) => {
    const selectedAddress =
      suggestion.structured_formatting?.main_text || suggestion.description;
    if (isAffiliation) {
      setAffiliation(selectedAddress);
    } else if (index !== undefined) {
      const updatedAddresses = [...opdAddresses];
      updatedAddresses[index] = {
        ...updatedAddresses[index],
        address: selectedAddress,
      };
      setOpdAddresses(updatedAddresses);
      fetchCoordinatesFromPlaceId(suggestion.place_id, index);
    }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleInputChange = (
    index: number,
    field: keyof Address,
    value: string,
  ) => {
    const updatedAddresses = [...opdAddresses];
    (updatedAddresses[index][field] as string) = value;
    setOpdAddresses(updatedAddresses);

    if (field === 'address') {
      setSelectedAddressIndex(index);
      // fetchAddressSuggestions(value, false, index);
    }
  };

  const handleMapPress = (index: number, event: LongPressEvent) => {
    console.log('Map pressed at index:', event);
    // const { latitude, longitude } = event.nativeEvent.coordinate;
    // console.log(`Map pressed at index ${index}:`, latitude, longitude);
    // const updatedAddresses = [...opdAddresses];
    // updatedAddresses[index] = {
    //   ...updatedAddresses[index],
    //   latitude: latitude.toString(),
    //   longitude: longitude.toString(),
    // };
    // setOpdAddresses(updatedAddresses);
    // fetchAddressDetails(latitude, longitude, index);
  };

//   const handleNext = async () => {
//   const token = await AsyncStorage.getItem('authToken');

//   // Convert 12-hour time to 24-hour
//   function convertTo24HourFormat(timeStr: string): string {
//     if (!timeStr || typeof timeStr !== 'string') return '';

//     const parts = timeStr.trim().toLowerCase().split(/\s+/);
//     if (parts.length !== 2) return '';

//     const [time, marker] = parts;
//     let [hours, minutes] = time.split(':');
//     minutes = minutes || '00';

//     let hrs = parseInt(hours, 10);
//     if (isNaN(hrs)) return '';

//     if (marker === 'pm' && hrs !== 12) hrs += 12;
//     if (marker === 'am' && hrs === 12) hrs = 0;

//     return `${hrs.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
//   }

//   function parseTimeToMinutes(time: string): number {
//     const [hourStr, minuteStr] = time.split(':');
//     const hours = parseInt(hourStr, 10);
//     const minutes = parseInt(minuteStr, 10);
//     if (isNaN(hours) || isNaN(minutes)) return -1;
//     return hours * 60 + minutes;
//   }

//   // Validate required address fields
//   const hasInvalidAddress = opdAddresses.some(
//     addr => !addr.address || !addr.pincode || !addr.city || !addr.state
//   );
//   if (hasInvalidAddress) {
//     Toast.show({
//       type: 'error',
//       text1: 'Error',
//       text2: 'Please fill all required OPD Address fields',
//       position: 'top',
//       visibilityTime: 4000,
//     });
//     return;
//   }

//   // Prepare payload with converted times
//   const payload = opdAddresses.map(addr => ({
//     ...addr,
//     startTime: convertTo24HourFormat(addr.startTime || '6:00 am'),
//     endTime: convertTo24HourFormat(addr.endTime || '9:00 pm'),
//   }));

//   // Validate time logic: end > start
//   const hasInvalidTime = payload.some(addr => {
//     const startMinutes = parseTimeToMinutes(addr.startTime);
//     const endMinutes = parseTimeToMinutes(addr.endTime);
//     return (
//       startMinutes >= endMinutes || startMinutes === -1 || endMinutes === -1
//     );
//   });

//   if (hasInvalidTime) {
//     Toast.show({
//       type: 'error',
//       text1: 'Error',
//       text2: 'End time must be after Start time for all OPD addresses',
//       position: 'top',
//       visibilityTime: 4000,
//     });
//     return;
//   }

//   // API Call
//   setLoading(true);
//   try {
//     const response = await AuthPost('users/addAddress', payload, token);

//     if (response.status !== 'success') {
//        Toast.show({
//         type: 'error',
//         text1: 'Failed to update practice details',
//         text2: response?.message?.message || 'Unable to update clinic details',
//         position: 'top',
//         visibilityTime: 4000,
//       });
//       return;
//     }

//     Toast.show({
//       type: 'success',
//       text1: 'Success',
//       text2: 'Practice details updated successfully!',
//       position: 'top',
//       visibilityTime: 3000,
//     });
//     await AsyncStorage.setItem('currentStep', 'ConsultationPreferences');

//     navigation.navigate('ConsultationPreferences');
//   } catch (err) {
//     console.error('API error:', err);
//     let errorMessage = 'Failed to update practice details.';
//     if (axios.isAxiosError(err) && err.response?.data?.message) {
//       errorMessage = err.response.data.message;
//     } else if (err instanceof Error) {
//       errorMessage = err.message;
//     }
//     Toast.show({
//       type: 'error',
//       text1: 'Error',
//       text2: errorMessage,
//       position: 'top',
//       visibilityTime: 4000,
//     });
//   } finally {
//     setLoading(false);
//   }
// };


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

   

    const hasInvalidTime = opdAddresses.some(addr => {
      const startMinutes = parseTimeToMinutes(addr.startTime);
      const endMinutes = parseTimeToMinutes(addr.endTime);
      return (
        startMinutes >= endMinutes || startMinutes === -1 || endMinutes === -1
      );
    });
    // if (hasInvalidTime) {
    //   Toast.show({
    //     type: 'error',
    //     text1: 'Error',
    //     text2: 'End time must be after Start time for all OPD addresses',
    //     position: 'top',
    //     visibilityTime: 4000,
    //   });
    //   return;
    // }

    setLoading(true);
    // try {
    //   const token = await AsyncStorage.getItem('authToken');
    //   const response = await AuthPost('users/addAddress', payload, token);

    //   console.log(response, "add address response")

    //   Toast.show({
    //     type: 'success',
    //     text1: 'Success',
    //     text2: 'Practice details updated successfully!',
    //     position: 'top',
    //     visibilityTime: 3000,
    //   });
    //   navigation.navigate('ConsultationPreferences');
    // } catch (err) {
    //   console.error('API error:', err);
    //   let errorMessage = 'Failed to update practice details.';
    //   if (axios.isAxiosError(err) && err.response?.data?.message) {
    //     errorMessage = err.response.data.message;
    //   }
    //   Toast.show({
    //     type: 'error',
    //     text1: 'error',
    //     text2: errorMessage,
    //     position: 'top',
    //     visibilityTime: 4000,
    //   });
    // } finally {
    //   setLoading(false);
    // }
  };
  

  const handleBack = () => {
    navigation.navigate('Specialization');
  };
  const [specialization,setSpecialization] = useState('')

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


  // somewhere near your component state/props:
const isPhysio =
  Array.isArray(specialization)
    ? specialization.some(s => s?.trim().toLowerCase() === 'physiotherapist')
    : String(specialization ?? '').trim().toLowerCase() === 'physiotherapist';


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
                {/* <Text style={styles.label}>Select Location on Map</Text>
                <View style={{ flex: 1 }} pointerEvents="box-none">
                  <MapView
                    style={{
                      height: 200,
                      width: '100%',
                      borderRadius: 8,
                      zIndex: 0,
                      elevation: 0,
                    }}
                    initialRegion={{
                      latitude: 56.1304,
                      longitude: -106.3468,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    onPress={() => console.log('Map pressed')}
                    // onPress={(e) => {
                    //   const { latitude, longitude } = e.nativeEvent.coordinate;
                    //   console.log('Pressed coordinates:', latitude, longitude);
                    //   handleMapPress(index, e);
                    // }}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    pitchEnabled={true}
                    rotateEnabled={true}
                  />
                </View> */}
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
                  placeholder="Search OPD Address"
                  placeholderTextColor="#999"
                  value={addr.address}
                  onChangeText={text =>
                    handleInputChange(index, 'address', text)
                  }
                />
              </View>
              {showSuggestions &&
                suggestions.length > 0 &&
                selectedAddressIndex === index && (
                  <View style={styles.suggestionsContainer}>
                    <FlatList
                      data={suggestions}
                      keyExtractor={item => item.place_id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.suggestionItem}
                          onPress={() =>
                            handleSelectAddress(item, false, index)
                          }
                        >
                          <Text style={styles.suggestionMainText}>
                            {item.structured_formatting?.main_text ||
                              item.description}
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
                )}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Pincode *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Pincode"
                  placeholderTextColor="#999"
                  value={addr.pincode}
                  maxLength={6}
                  onChangeText={text =>
                    handleInputChange(index, 'pincode', text)
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter City"
                  placeholderTextColor="#999"
                  value={addr.city}
                  onChangeText={text => handleInputChange(index, 'city', text)}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>State *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter State"
                  placeholderTextColor="#999"
                  value={addr.state}
                  onChangeText={text => handleInputChange(index, 'state', text)}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Country *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Country"
                  placeholderTextColor="#999"
                  value={addr.country}
                  onChangeText={text =>
                    handleInputChange(index, 'country', text)
                  }
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Latitude"
                  placeholderTextColor="#999"
                  value={String(addr?.latitude)}
                  onChangeText={text =>
                    handleInputChange(index, 'latitude', text)
                  }
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Longitude"
                  placeholderTextColor="#999"
                  value={String(addr?.longitude)}
                  onChangeText={text =>
                    handleInputChange(index, 'longitude', text)
                  }
                />
              </View>
              {/* <View style={styles.timeContainer} >
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setSelectedAddressIndex(index);
                    setShowStartTimePicker(true);
                  }}
                  disabled={true}
                >
                  <View style={styles.timeButtonContent}>
                    <Icon
                      name="clock-outline"
                      size={width * 0.045}
                      color="#00203F"
                      style={styles.clockIcon}
                    />
                    <Text style={styles.timeText}>
                      Start: {addr.startTime || 'Select'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setSelectedAddressIndex(index);
                    setShowEndTimePicker(true);
                  }}
                  disabled={true}
                >
                  <View style={styles.timeButtonContent}>
                    <Icon
                      name="clock-outline"
                      size={width * 0.045}
                      color="#00203F"
                      style={styles.clockIcon}
                    />
                    <Text style={styles.timeText}>
                      End: {addr.endTime || 'Select'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View> */}
              {showStartTimePicker && selectedAddressIndex === index && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) =>
                    handleTimeChange(event, selectedTime, 'startTime', index)
                  }
                />
              )}
              {showEndTimePicker && selectedAddressIndex === index && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) =>
                    handleTimeChange(event, selectedTime, 'endTime', index)
                  }
                />
              )}
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
});

export default PracticeScreen;
