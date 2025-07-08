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
import {
  getCurrentStepIndex,
  TOTAL_STEPS,
} from '../../utility/registrationSteps';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const { width, height } = Dimensions.get('window');

const PracticeScreen = () => {
  const navigation = useNavigation<any>();
  const [affiliation, setAffiliation] = useState<string | null>(null);
  const [opdAddresses, setOpdAddresses] = useState<Address[]>([
    {
      id: 1,
      address: '',
      landmark: '',
      pincode: '',
      city: '',
      state: '',
      startTime: '',
      endTime: '',
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
        `http://192.168.1.44:3000/address/googleAddressSuggession?input=${encodeURIComponent(
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
    setOpdAddresses(opdAddresses.filter(addr => addr.id !== id));
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

    if (field === 'address' || field === 'pincode') {
      // fetchAddressSuggestions(value, false, index);
    }
  };

  const handleNext = async () => {
    const hasInvalidAddress = opdAddresses.some(
      addr =>
        !addr.address ||
        !addr.pincode ||
        !addr.city ||
        !addr.state ||
        !addr.startTime ||
        !addr.endTime,
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

    navigation.navigate('ConsultationPreferences');
    return;

    const hasInvalidTime = opdAddresses.some(addr => {
      const startMinutes = parseTimeToMinutes(addr.startTime);
      const endMinutes = parseTimeToMinutes(addr.endTime);
      return (
        startMinutes >= endMinutes || startMinutes === -1 || endMinutes === -1
      );
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

        <View style={styles.addressSection}>
          <View style={styles.headerRow}>
            <Text style={styles.label}>OPD Address(es)</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddAddress}
            >
              <Text style={styles.addButtonText}>+ Add Location</Text>
            </TouchableOpacity>
          </View>

          {opdAddresses.map((addr, index) => (
            <View key={addr.id} style={styles.addressContainer}>
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
                <Text style={styles.label}>Landmark</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Landmark"
                  placeholderTextColor="#999"
                  value={addr.landmark}
                  onChangeText={text =>
                    handleInputChange(index, 'landmark', text)
                  }
                />
              </View>
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
              <View style={styles.timeContainer}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setSelectedAddressIndex(index);
                    setShowStartTimePicker(true);
                  }}
                >
                  <View style={styles.timeButtonContent}>
                    <Icon
                      name="clock-outline"
                      size={width * 0.045}
                      color="#00203F"
                      style={styles.clockIcon}
                    />
                    <Text style={styles.timeText}>
                      Start Time: {addr.startTime || 'Select'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setSelectedAddressIndex(index);
                    setShowEndTimePicker(true);
                  }}
                >
                  <View style={styles.timeButtonContent}>
                    <Icon
                      name="clock-outline"
                      size={width * 0.045}
                      color="#00203F"
                      style={styles.clockIcon}
                    />
                    <Text style={styles.timeText}>
                      End Time: {addr.endTime || 'Select'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
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
                onPress={() => handleRemoveAddress(addr.id)}
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
});

export default PracticeScreen;
