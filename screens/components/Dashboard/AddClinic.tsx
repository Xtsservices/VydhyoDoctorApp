import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Dimensions,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Geocoder from 'react-native-geocoding';
import { UploadFiles } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// Initialize Geocoder with your Google Maps API key
Geocoder.init('AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo');

const { width, height } = Dimensions.get('window');

const AddClinicForm = () => {
  const navigation = useNavigation<any>();
  const [form, setForm] = useState({
    clinicName: '',
    startTime: '09:00',
    endTime: '17:00',
    address: '',
    city: '',
    state: '',
    mobile: '',
    email: '',
    pincode: '',
    type: 'Clinic',
    country: 'India',
    latitude: '20.5937',
    longitude: '78.9629',
    pharmacyName: '',
    pharmacyRegNum: '',
    pharmacyGST: '',
    pharmacyPAN: '',
    pharmacyAddress: '',
    labName: '',
    labRegNum: '',
    labGST: '',
    labPAN: '',
    labAddress: '',
  });

  // Map related states
  const [region, setRegion] = useState<Region>({
    latitude: 20.5937, // Default to India center
    longitude: 78.9629,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [locationRetryCount, setLocationRetryCount] = useState(0);
  const locationRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [headerFile, setHeaderFile] = useState<any>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<any>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [pharmacyHeaderFile, setPharmacyHeaderFile] = useState<any>(null);
  const [pharmacyHeaderPreview, setPharmacyHeaderPreview] = useState<string | null>(null);
  const [labHeaderFile, setLabHeaderFile] = useState<any>(null);
  const [labHeaderPreview, setLabHeaderPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [clinicQRFile, setClinicQRFile] = useState<any>(null);
  const [clinicQRPreview, setClinicQRPreview] = useState<string | null>(null);
  const [pharmacyQRFile, setPharmacyQRFile] = useState<any>(null);
  const [pharmacyQRPreview, setPharmacyQRPreview] = useState<string | null>(null);
  const [labQRFile, setLabQRFile] = useState<any>(null);
  const [labQRPreview, setLabQRPreview] = useState<string | null>(null);

  const GOOGLE_MAPS_API_KEY = 'AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo';

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
        Alert.alert(
          'Location Permission Error',
          err?.message
            ? `Could not request location permission.\n\nDetails: ${err?.message}`
            : 'Could not request location permission. Please try again or enable it from Settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  // Check if coordinates are within India
  const isInIndia = (latitude: number, longitude: number) => {
    return (
      latitude >= 6.554607 &&
      latitude <= 35.674545 &&
      longitude >= 68.111378 &&
      longitude <= 97.395561
    );
  };

  // Fetch address from coordinates
  const fetchAddress = async (latitude: number, longitude: number) => {
    setIsFetchingLocation(true);
    try {
      const response = await Geocoder.from(latitude, longitude);

      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const addressComponents = result.address_components || [];

        let street = '';
        let city = '';
        let state = '';
        let country = 'India';
        let pincode = '';

        for (const component of addressComponents) {
          const types = component.types;
          if (types.includes('route') || types.includes('street_number')) {
            street = street ? `${street} ${component.long_name}` : component.long_name;
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
          } else if (types.includes('postal_code')) {
            pincode = component.long_name;
          }
        }

        const address = street || result.formatted_address;

        setForm(prev => ({
          ...prev,
          address,
          city: city || prev.city,
          state: state || prev.state,
          country,
          pincode: pincode || prev.pincode,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        }));

        setSearchQuery(address);
        setLocationRetryCount(0); // Reset retry count on success
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
      Alert?.alert('Error', error?.message || 'Failed to fetch address details. Please try again.');

    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Initialize map with current location
  const initLocation = async () => {
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

    const locationOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    };

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (!isInIndia(latitude, longitude)) {
          Alert.alert(
            'Invalid Location',
            'Failed to fetch location. Please ensure location services are enabled or try to search.',
            [{ text: 'OK', style: 'cancel' }]
          );
          setIsFetchingLocation(false);
          return;
        }

        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        fetchAddress(latitude, longitude);
      },
      (error) => {

        let errorMessage = 'Unable to fetch current location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied. Please enable location permissions in settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information is unavailable. This might be due to being indoors or poor signal.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out. Please try again.';
        }

        if (locationRetryCount < 3) {
          setLocationRetryCount(prev => prev + 1);
          Toast.show({
            type: 'info',
            text1: 'Getting Location',
            text2: `Trying again... Attempt ${locationRetryCount + 1} of 3`,
            position: 'top',
            visibilityTime: 2000,
          });

          locationRetryTimeoutRef.current = setTimeout(() => {
            initLocationWithRetry();
          }, 2000);
        } else {
          Alert.alert(
            'Location Error',
            `${errorMessage} Please ensure location services are enabled and try again, or select a location manually.`,
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              {
                text: 'Try Again',
                onPress: () => {
                  setLocationRetryCount(0);
                  initLocation();
                },
              },
              { text: 'Select Manually', style: 'cancel' },
            ]
          );
          setIsFetchingLocation(false);
        }
      },
      locationOptions
    );
  };

  // Retry location fetching with different settings
  const initLocationWithRetry = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    const retryOptions = {
      enableHighAccuracy: locationRetryCount > 1,
      timeout: 20000,
      maximumAge: 30000,
    };

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (!isInIndia(latitude, longitude)) {
          Alert.alert(
            'Invalid Location',
            'Failed to fetch location. Please ensure location services are enabled or try to search.',
            [{ text: 'OK', style: 'cancel' }]
          );
          setIsFetchingLocation(false);
          return;
        }

        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        fetchAddress(latitude, longitude);
      },
      (error) => {
        setIsFetchingLocation(false);

        if (locationRetryCount < 3) {
          setLocationRetryCount(prev => prev + 1);
          setTimeout(() => initLocation(), 2000);
        }
      },
      retryOptions
    );
  };

  useEffect(() => {
    initLocation();

    return () => {
      if (locationRetryTimeoutRef.current) {
        clearTimeout(locationRetryTimeoutRef.current);
      }
    };
  }, []);

  // Handle search input
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`
      );

      const data = await response.json();
      if (data.status === 'OK') {
        setSearchResults(data.predictions);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Unable to fetch search results. Please try again.');
      setSearchResults([]);
    }
  };

  // Handle selecting a search result
  const handleSelectSearchResult = async (result: any) => {
    setSearchQuery(result.description);
    setShowSearchResults(false);
    setIsFetchingLocation(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.place_id}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      if (data.status === 'OK') {
        const place = data.result;
        const location = place.geometry.location;
        const latitude = location.lat;
        const longitude = location.lng;

        const countryComponent = place.address_components.find(component =>
          component.types.includes('country')
        );

        if (!countryComponent || countryComponent.short_name !== 'IN') {
          Alert.alert(
            'Invalid Location',
            'Failed to fetch location. Please select a location within India.',
            [{ text: 'OK', style: 'cancel' }]
          );
          setIsFetchingLocation(false);
          return;
        }

        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 500);
        fetchAddress(latitude, longitude);
      } else {
        Alert.alert('Error', 'Failed to fetch location details.');
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Unable to fetch place details. Please try again.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Handle map press to select a location
  const handleMapPress = (e: any) => {
    const { coordinate } = e.nativeEvent;
    const { latitude, longitude } = coordinate;
    const newRegion = {
      ...region,
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 500);
    fetchAddress(latitude, longitude);
    setShowSearchResults(false);
  };

  // Move to current location
  const handleMyLocation = async () => {
    setLocationRetryCount(0);
    await initLocation();
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (field === 'address') {
      setSearchQuery(value);
    }
  };

  const handleFileChange = async (type: 'header' | 'signature' | 'pharmacyHeader' | 'labHeader' | 'clinicQR' | 'pharmacyQR' | 'labQR') => {
    try {
      // Update the alert title based on type
      let title = '';
      if (type === 'header') title = 'Header';
      else if (type === 'signature') title = 'Signature';
      else if (type === 'pharmacyHeader') title = 'Pharmacy Header';
      else if (type === 'labHeader') title = 'Lab Header';
      else if (type === 'clinicQR') title = 'Clinic QR Code';
      else if (type === 'pharmacyQR') title = 'Pharmacy QR Code';
      else if (type === 'labQR') title = 'Lab QR Code';

      Alert.alert(
        `Upload ${title}`,
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              try {
                const result = await launchCamera({
                  mediaType: 'photo',
                  includeBase64: false,
                });

                if (result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  const file = {
                    uri: asset.uri!,
                    name: asset.fileName || `${type}_camera.jpg`,
                    type: asset.type || 'image/jpeg',
                  };

                  // Handle different file types
                  if (type === 'header') {
                    setHeaderFile(file);
                    setHeaderPreview(asset.uri!);
                  } else if (type === 'signature') {
                    setSignatureFile(file);
                    setSignaturePreview(asset.uri!);
                  } else if (type === 'pharmacyHeader') {
                    setPharmacyHeaderFile(file);
                    setPharmacyHeaderPreview(asset.uri!);
                  } else if (type === 'labHeader') {
                    setLabHeaderFile(file);
                    setLabHeaderPreview(asset.uri!);
                  } else if (type === 'clinicQR') {
                    setClinicQRFile(file);
                    setClinicQRPreview(asset.uri!);
                  } else if (type === 'pharmacyQR') {
                    setPharmacyQRFile(file);
                    setPharmacyQRPreview(asset.uri!);
                  } else if (type === 'labQR') {
                    setLabQRFile(file);
                    setLabQRPreview(asset.uri!);
                  }
                }
              } catch (error) {
                Alert.alert('Error', error?.message || 'Camera access failed.');
              }
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              try {
                const result = await launchImageLibrary({
                  mediaType: 'photo',
                  includeBase64: false,
                });

                if (result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  const file = {
                    uri: asset.uri!,
                    name: asset.fileName || `${type}_gallery.jpg`,
                    type: asset.type || 'image/jpeg',
                  };

                  // Handle different file types
                  if (type === 'header') {
                    setHeaderFile(file);
                    setHeaderPreview(asset.uri!);
                  } else if (type === 'signature') {
                    setSignatureFile(file);
                    setSignaturePreview(asset.uri!);
                  } else if (type === 'pharmacyHeader') {
                    setPharmacyHeaderFile(file);
                    setPharmacyHeaderPreview(asset.uri!);
                  } else if (type === 'labHeader') {
                    setLabHeaderFile(file);
                    setLabHeaderPreview(asset.uri!);
                  } else if (type === 'clinicQR') {
                    setClinicQRFile(file);
                    setClinicQRPreview(asset.uri!);
                  } else if (type === 'pharmacyQR') {
                    setPharmacyQRFile(file);
                    setPharmacyQRPreview(asset.uri!);
                  } else if (type === 'labQR') {
                    setLabQRFile(file);
                    setLabQRPreview(asset.uri!);
                  }
                }
              } catch (error) {
                Alert.alert('Error', error?.message || 'Gallery access failed.');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to pick file. Please try again.');
    }
  };
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.clinicName.trim()) newErrors.clinicName = 'Clinic name is required';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state.trim()) newErrors.state = 'State is required';

    if (!form.mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9][0-9]{9}$/.test(form.mobile)) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
    }

    if (!form.latitude) newErrors.latitude = 'Latitude is required';
    else if (isNaN(Number(form.latitude))) newErrors.latitude = 'Latitude must be a valid number';

    if (!form.longitude) newErrors.longitude = 'Longitude is required';
    else if (isNaN(Number(form.longitude))) newErrors.longitude = 'Longitude must be a valid number';

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      newErrors.pincode = 'Enter a valid 6-digit pincode';
    }

    // Add validation for header and signature
    if (headerFile && !signatureFile) {
      newErrors.signature = 'Signature is required when uploading a header image';
    }
    if (signatureFile && !headerFile) {
      newErrors.header = 'Header image is required when uploading a signature';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      const firstError = Object.values(errors)[0];
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: firstError,
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

      const formData = new FormData();

      formData.append('userId', userId || '');
      formData.append('type', form.type);
      formData.append('clinicName', form.clinicName);
      formData.append('address', form.address);
      formData.append('city', form.city);
      formData.append('state', form.state);
      formData.append('country', form.country);
      formData.append('mobile', form.mobile);
      formData.append('pincode', form.pincode);
      formData.append('startTime', form.startTime);
      formData.append('endTime', form.endTime);
      formData.append('latitude', form.latitude);
      formData.append('longitude', form.longitude);

      if (headerFile && signatureFile) {
        formData.append('file', headerFile as any);
        formData.append('signature', signatureFile as any);
      }

      if (form.pharmacyName) formData.append('pharmacyName', form.pharmacyName);
      if (form.pharmacyRegNum) formData.append('pharmacyRegistrationNo', form.pharmacyRegNum);
      if (form.pharmacyGST) formData.append('pharmacyGst', form.pharmacyGST);
      if (form.pharmacyPAN) formData.append('pharmacyPan', form.pharmacyPAN);
      if (form.pharmacyAddress) formData.append('pharmacyAddress', form.pharmacyAddress);
      if (pharmacyHeaderFile) formData.append('pharmacyHeader', pharmacyHeaderFile as any);

      if (form.labName) formData.append('labName', form.labName);
      if (form.labRegNum) formData.append('labRegistrationNo', form.labRegNum);
      if (form.labGST) formData.append('labGst', form.labGST);
      if (form.labPAN) formData.append('labPan', form.labPAN);
      if (form.labAddress) formData.append('labAddress', form.labAddress);
      if (labHeaderFile) formData.append('labHeader', labHeaderFile as any);

      if (clinicQRFile) formData.append('clinicQR', clinicQRFile as any);
      if (pharmacyQRFile) formData.append('pharmacyQR', pharmacyQRFile as any);
      if (labQRFile) formData.append('labQR', labQRFile as any);
console.log("Submitting form data:", formData);
      const response = await UploadFiles('users/addAddressFromWeb', formData, token);
      console.log('Add Clinic Response:', response);

      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Clinic added successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        navigation.navigate('Clinic' as never);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to add clinic.',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to add clinic.');
    } finally {
      setLoading(false);
    }
  };
  const renderFileUpload = (
    type: 'header' | 'signature' | 'pharmacyHeader' | 'labHeader' | 'clinicQR' | 'pharmacyQR' | 'labQR',
    label: string,
    preview: string | null
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.uploadBox}
        onPress={() => handleFileChange(type)}
      >
        {preview ? (
          <Image source={{ uri: preview }} style={styles.previewImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Icon name="upload" size={24} color="#6B7280" />
            <Text style={styles.uploadText}>Select File</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSearchItem = (result: any) => (
    <TouchableOpacity
      style={styles.searchItem}
      onPress={() => handleSelectSearchResult(result)}
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
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}
      <ScrollView style={styles.container}>
        <View style={styles.mapSection}>
          <Text style={styles.label}>Location (Tap on map to select)</Text>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for an address or location"
                placeholderTextColor="#A0AEC0"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  handleSearch(text);
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <ScrollView style={styles.searchResultsList}>
                  {searchResults.map((result) => (
                    <View key={result.place_id}>
                      {renderSearchItem(result)}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Location status indicator */}
          {isFetchingLocation && (
            <View style={styles.locationStatus}>
              <ActivityIndicator size="small" color="#3182CE" />
              <Text style={styles.locationStatusText}>
                {locationRetryCount > 0
                  ? `Getting location (attempt ${locationRetryCount + 1})...`
                  : 'Getting your location...'}
              </Text>
            </View>
          )}

          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              region={region}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={false}
              provider={PROVIDER_GOOGLE}
            >
              <Marker
                coordinate={{
                  latitude: parseFloat(form.latitude) || 20.5937,
                  longitude: parseFloat(form.longitude) || 78.9629,
                }}
              />
            </MapView>

            {/* Custom marker in center of map */}
            <View style={styles.markerFixed}>
              <View style={styles.marker}>
                <View style={styles.markerInner} />
              </View>
            </View>

            {/* My Location Button */}
            <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
              <Icon name="crosshairs-gps" size={24} color="#3182CE" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Clinic Name *</Text>
        <TextInput
          style={[styles.input, errors.clinicName && styles.inputError]}
          placeholder="Enter clinic name"
          value={form.clinicName}
          onChangeText={(text) => handleChange('clinicName', text)}
          placeholderTextColor="gray"
        />
        {errors.clinicName && <Text style={styles.errorText}>{errors.clinicName}</Text>}

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, styles.textarea, errors.address && styles.inputError]}
          placeholder="Enter clinic address"
          multiline
          numberOfLines={3}
          value={form.address}
          onChangeText={(text) => handleChange('address', text)}
          placeholderTextColor="gray"
        />
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="Enter city"
              value={form.city}
              onChangeText={(text) => handleChange('city', text)}
              placeholderTextColor="gray"
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={[styles.input, errors.state && styles.inputError]}
              placeholder="Enter state"
              value={form.state}
              onChangeText={(text) => handleChange('state', text)}
              placeholderTextColor="gray"
            />
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>
        </View>

        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput
          style={[styles.input, errors.mobile && styles.inputError]}
          placeholder="Enter 10-digit mobile number"
          keyboardType="phone-pad"
          value={form.mobile}
          onChangeText={(text) => {
            const digitsOnly = text.replace(/\D/g, '');
            if (digitsOnly.length === 1 && !/[6-9]/.test(digitsOnly[0])) {
              Toast.show({
                type: 'error',
                text1: 'Invalid Mobile Number',
                text2: 'Enter a valid mobile number',
                position: 'top',
                visibilityTime: 3000,
              });
              return;
            }
            handleChange('mobile', digitsOnly)
          }} maxLength={10}
          placeholderTextColor="gray"
        />
        {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Enter email address"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => handleChange('email', text)}
          placeholderTextColor="gray"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <Text style={styles.label}>Pin Code</Text>
        <TextInput
          style={[styles.input, errors.pincode && styles.inputError]}
          placeholder="Enter pincode"
          keyboardType="numeric"
          value={form.pincode}
          onChangeText={(text) => handleChange('pincode', text)}
          maxLength={6}
          placeholderTextColor="gray"
        />
        {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Latitude *</Text>
            <TextInput
              style={[styles.input, errors.latitude && styles.inputError]}
              placeholder="Latitude"
              keyboardType="decimal-pad"
              value={form.latitude}
              onChangeText={(text) => handleChange('latitude', text)}
              editable={false}
              placeholderTextColor="gray"
            />
            {errors.latitude && <Text style={styles.errorText}>{errors.latitude}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Longitude *</Text>
            <TextInput
              style={[styles.input, errors.longitude && styles.inputError]}
              placeholder="Longitude"
              keyboardType="decimal-pad"
              value={form.longitude}
              onChangeText={(text) => handleChange('longitude', text)}
              editable={false}
              placeholderTextColor="gray"
            />
            {errors.longitude && <Text style={styles.errorText}>{errors.longitude}</Text>}
          </View>
        </View>

        {renderFileUpload('header', 'Clinic Header Image', headerPreview)}
        {renderFileUpload('signature', 'Digital Signature (Optional)', signaturePreview)}
        {renderFileUpload('clinicQR', 'Clinic QR Code (Optional)', clinicQRPreview)}

        <Text style={styles.sectionTitle}>Pharmacy Details (Optional)</Text>

        <Text style={styles.label}>Pharmacy Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter pharmacy name"
          value={form.pharmacyName}
          onChangeText={(text) => handleChange('pharmacyName', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Pharmacy Registration Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter registration number"
          value={form.pharmacyRegNum}
          onChangeText={(text) => handleChange('pharmacyRegNum', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Pharmacy GST Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter GST number"
          value={form.pharmacyGST}
          onChangeText={(text) => handleChange('pharmacyGST', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Pharmacy PAN</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter PAN number"
          value={form.pharmacyPAN}
          onChangeText={(text) => handleChange('pharmacyPAN', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Pharmacy Address</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Enter pharmacy address"
          multiline
          numberOfLines={3}
          value={form.pharmacyAddress}
          onChangeText={(text) => handleChange('pharmacyAddress', text)}
          placeholderTextColor="gray"
        />

        {renderFileUpload('pharmacyHeader', 'Pharmacy Header Image (Optional)', pharmacyHeaderPreview)}
        {renderFileUpload('pharmacyQR', 'Pharmacy QR Code (Optional)', pharmacyQRPreview)}

        <Text style={styles.sectionTitle}>Lab Details (Optional)</Text>

        <Text style={styles.label}>Lab Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter lab name"
          value={form.labName}
          onChangeText={(text) => handleChange('labName', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Lab Registration Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter registration number"
          value={form.labRegNum}
          onChangeText={(text) => handleChange('labRegNum', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Lab GST Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter GST number"
          value={form.labGST}
          onChangeText={(text) => handleChange('labGST', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Lab PAN</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter PAN number"
          value={form.labPAN}
          onChangeText={(text) => handleChange('labPAN', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Lab Address</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Enter lab address"
          multiline
          numberOfLines={3}
          value={form.labAddress}
          onChangeText={(text) => handleChange('labAddress', text)}
          placeholderTextColor="gray"
        />

        {renderFileUpload('labHeader', 'Lab Header Image (Optional)', labHeaderPreview)}
        {renderFileUpload('labQR', 'Lab QR Code (Optional)', labQRPreview)}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>✖ Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>✔ Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddClinicForm;

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
    color: 'black',
  },
  label: {
    fontSize: 14,
    color: '#161b20ff',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: 'black',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  column: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 20,
    marginBottom: 50,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#111827',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Map related styles
  mapSection: {
    marginBottom: 20,
  },
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
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
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