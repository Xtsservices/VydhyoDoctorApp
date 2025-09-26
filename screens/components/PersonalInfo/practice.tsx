// PracticeScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Linking,
  Alert,
  Image,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthFetch, AuthPost } from '../../auth/auth';

// Initialize Geocoder (keep your key)
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

interface Errors {
  clinicName?: string;
  mobile?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
}

const { width, height } = Dimensions.get('window');

let markerImage: number | null = null;
try {
  markerImage = require('../../assets/marker.png');
} catch (e) {
  markerImage = null;
}

const PracticeScreen = () => {
  const navigation = useNavigation<any>();
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

  // composite key used for internal dedupe if needed
  const buildClinicKey = (a: { clinicName?: string; city?: string; pincode?: string }) =>
    `${(a.clinicName || '').trim().toLowerCase()}|${(a.city || '').trim().toLowerCase()}|${(a.pincode || '').trim()}`;

  // normalized name key (server enforces uniqueness on clinicName)
  const buildClinicNameKey = (a: { clinicName?: string }) =>
    (a.clinicName || '').trim().toLowerCase();

  const [existingAddressKeys, setExistingAddressKeys] = useState<Set<string>>(new Set()); // composite keys
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(new Set()); // composite keys from server
  const [existingClinicNameSet, setExistingClinicNameSet] = useState<Set<string>>(new Set()); // clinicName normalized
  const isPrefilledAddr = (addr: Address) => prefilledKeys.has(buildClinicKey(addr));
  const [errors, setErrors] = useState<{ [key: number]: Errors }>({});
  const [currentOpdIndex, setCurrentOpdIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [searchResultsPerAddress, setSearchResultsPerAddress] = useState<{ [key: number]: any[] }>({});
  const mapRefs = useRef<MapView[]>([]);
  const [searchQueryPerAddress, setSearchQueryPerAddress] = useState<{ [key: number]: string }>({});
  const [showSearchResultsPerAddress, setShowSearchResultsPerAddress] = useState<{ [key: number]: boolean }>({});
  const [locationRetryCount, setLocationRetryCount] = useState(0);
  const locationRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pointerCoordsPerAddress, setPointerCoordsPerAddress] = useState<{ [key: number]: { latitude: number; longitude: number } | null }>({});
  const reverseGeoDebounceRefs = useRef<{ [key: number]: NodeJS.Timeout | null }>({});
  const lastPanUpdateRefs = useRef<{ [key: number]: number }>({});
  const lastAutoSelectedRefs = useRef<{ [key: number]: string }>({});


  // ---------- NEW: keyboard state ----------
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // -----------------------------------------


  const isValidMobile = (mobile: string): boolean => {
    return mobile.length === 10 && /^[6-9]\d{9}$/.test(mobile);
  };

  const isInIndia = (latitude: number, longitude: number) =>
    latitude >= 6.554607 && latitude <= 35.674545 && longitude >= 68.111378 && longitude <= 97.395561;

  useEffect(() => {
    setCurrentOpdIndex(0);
  }, [opdAddresses.length]);

 // --- coords helpers ---
 const isBlankCoord = (v?: string) =>
   !v || v.trim() === '' || Number.isNaN(Number(v));

 const isDefaultIndia = (lat?: string, lng?: string) =>
   lat === '20.5937' && lng === '78.9629';

 const hasValidCoords = (a?: Partial<Address>) => {
   if (!a) return false;
   const lat = a.latitude, lng = a.longitude;
   if (isBlankCoord(lat) || isBlankCoord(lng)) return false;
   if (isDefaultIndia(lat!, lng!)) return false; // treat placeholder as "not set"
   return true;
 };



   useEffect(() => {
   const initializeAsNeeded = async () => {
     for (let i = 0; i < opdAddresses.length; i++) {
       const addr = opdAddresses[i];
       // If coords are missing/placeholder -> init; otherwise do nothing
       if (!hasValidCoords(addr) && !isPrefilledAddr(addr)) {
         await initLocation(i);
       }
     }
   };
   initializeAsNeeded();
   return () => {
     if (locationRetryTimeoutRef.current) clearTimeout(locationRetryTimeoutRef.current);
     Object.values(reverseGeoDebounceRefs.current).forEach(t => t && clearTimeout(t));
   };
 }, [opdAddresses, prefilledKeys]);

  // ---------- NEW: keyboard listeners ----------
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        const h = e.endCoordinates ? e.endCoordinates.height : 0;
        setKeyboardHeight(h);
        setKeyboardVisible(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setKeyboardVisible(false);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();

    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

  const fetchAddressDetails = async (latitude: number, longitude: number, index: number, setAsSelected = true, force = false) => {
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

        const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        if (lastAutoSelectedRefs.current[index] === key && setAsSelected && !force) {
          // already selected, skip
        } else {
          if (setAsSelected) {
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

            setSearchQueryPerAddress(prev => ({
              ...prev,
              [index]: address
            }));

            setLocationRetryCount(0);
          }
        }
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

  const initLocation = async (index: number) => {
    const addr = opdAddresses[index];
    if (addr && isPrefilledAddr(addr)) return;

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
            'Location appears outside India. Please select a location manually or ensure location services are correct.',
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

        setPointerCoordsPerAddress(prev => ({
          ...prev,
          [index]: { latitude, longitude }
        }));

        if (mapRefs.current[index]) {
          mapRefs.current[index].animateToRegion(newRegion, 1000);
        }

        fetchAddressDetails(latitude, longitude, index);
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

  const initLocationWithRetry = async (index: number) => {
    const addr = opdAddresses[index];
    if (addr && isPrefilledAddr(addr)) return;

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
            'Location appears outside India. Please select a location manually or ensure location services are correct.',
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

        setPointerCoordsPerAddress(prev => ({
          ...prev,
          [index]: { latitude, longitude }
        }));

        if (mapRefs.current[index]) {
          mapRefs.current[index].animateToRegion(newRegion, 1000);
        }

        fetchAddressDetails(latitude, longitude, index);
      },
      () => {
        setIsFetchingLocation(false);
        if (locationRetryCount < 3) {
          setLocationRetryCount(prev => prev + 1);
          setTimeout(() => initLocation(index), 2000);
        }
      },
      retryOptions
    );
  };

  const handleSearch = async (query: string, index: number) => {
    setSearchQueryPerAddress(prev => ({
      ...prev,
      [index]: query
    }));

    // Block for prefilled/view-only rows
    if (isPrefilledAddr(opdAddresses[index])) return;

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
    } catch {
      setSearchResultsPerAddress(prev => ({
        ...prev,
        [index]: []
      }));
    }
  };

  const handleSelectSearchResult = async (result: any, index: number) => {
    if (isPrefilledAddr(opdAddresses[index])) return; // view-only

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

        const countryComponent = (place.address_components || []).find((component: any) =>
          (component.types || []).includes('country')
        );

        if (!countryComponent || countryComponent.short_name !== 'IN') {
          Alert.alert('Invalid Location', 'Please select a location within India.', [{ text: 'OK', style: 'cancel' }]);
          setIsFetchingLocation(false);
          return;
        }

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

        setPointerCoordsPerAddress(prev => ({
          ...prev,
          [index]: { latitude, longitude }
        }));

        if (mapRefs.current[index]) {
          mapRefs.current[index].animateToRegion(newRegion, 500);
        }

        fetchAddressDetails(latitude, longitude, index);
      }
    } catch {
      Alert.alert('Error', 'Unable to fetch place details. Please try again.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const LIVE_REVERSE_DEBOUNCE_MS = 600;
  const FINAL_REVERSE_DEBOUNCE_MS = 700;

  const handleRegionChange = (index: number, r: Region) => {
    if (isPrefilledAddr(opdAddresses[index])) return; // no-op in view-only mode

    const now = Date.now();
    if (now - (lastPanUpdateRefs.current[index] || 0) < 120) return;
    lastPanUpdateRefs.current[index] = now;

    setPointerCoordsPerAddress(prev => ({
      ...prev,
      [index]: { latitude: r.latitude, longitude: r.longitude }
    }));

    setOpdAddresses(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        latitude: String(Number(r.latitude.toFixed(6))),
        longitude: String(Number(r.longitude.toFixed(6))),
      };
      return updated;
    });

    setErrors(prev => {
      const next = { ...prev };
      if (next[index]) {
        delete next[index].latitude;
        delete next[index].longitude;
      }
      return next;
    });

    if (reverseGeoDebounceRefs.current[index]) {
      clearTimeout(reverseGeoDebounceRefs.current[index] as NodeJS.Timeout);
    }
    reverseGeoDebounceRefs.current[index] = setTimeout(() => {
      const key = `${r.latitude.toFixed(6)},${r.longitude.toFixed(6)}`;
      if (lastAutoSelectedRefs.current[index] !== key) {
        fetchAddressDetails(r.latitude, r.longitude, index, false);
      }
    }, LIVE_REVERSE_DEBOUNCE_MS);
  };

  const handleRegionChangeComplete = (index: number, r: Region) => {
    if (isPrefilledAddr(opdAddresses[index])) return; // no-op in view-only mode

    setPointerCoordsPerAddress(prev => ({
      ...prev,
      [index]: { latitude: r.latitude, longitude: r.longitude }
    }));

    setOpdAddresses(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        latitude: String(Number(r.latitude.toFixed(6))),
        longitude: String(Number(r.longitude.toFixed(6))),
      };
      return updated;
    });

    setShowSearchResultsPerAddress(prev => ({
      ...prev,
      [index]: false
    }));

    setErrors(prev => {
      const next = { ...prev };
      if (next[index]) {
        delete next[index].latitude;
        delete next[index].longitude;
      }
      return next;
    });

    if (reverseGeoDebounceRefs.current[index]) {
      clearTimeout(reverseGeoDebounceRefs.current[index] as NodeJS.Timeout);
    }
    reverseGeoDebounceRefs.current[index] = setTimeout(() => {
      const key = `${r.latitude.toFixed(6)},${r.longitude.toFixed(6)}`;
      if (lastAutoSelectedRefs.current[index] !== key) {
        lastAutoSelectedRefs.current[index] = key;
        fetchAddressDetails(r.latitude, r.longitude, index, true);
      }
    }, FINAL_REVERSE_DEBOUNCE_MS);
  };

  const handleMapPress = (index: number, event: any) => {
    if (isPrefilledAddr(opdAddresses[index])) return; // no-op in view-only mode

    const { coordinate } = event.nativeEvent;
    const { latitude, longitude } = coordinate;

    if (!isInIndia(latitude, longitude)) {
      Alert.alert('Invalid Location', 'Please select a location within India.', [{ text: 'OK', style: 'cancel' }]);
      return;
    }

    setOpdAddresses(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      };
      return updated;
    });

    setPointerCoordsPerAddress(prev => ({
      ...prev,
      [index]: { latitude, longitude }
    }));

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

  const handleMyLocation = async (index: number) => {
    if (isPrefilledAddr(opdAddresses[index])) return; // disabled in view-only
    setLocationRetryCount(0);
    await initLocation(index);
  };

  const usePointerLocation = async (index: number) => {
    if (isPrefilledAddr(opdAddresses[index])) return; // disabled in view-only
    try {
      let center: { latitude: number; longitude: number } | null = null;
      const mapAny: any = mapRefs.current[index] as any;

      if (mapAny && typeof mapAny.getCamera === 'function') {
        try {
          const cam = await mapAny.getCamera();
          if (cam && cam.center && typeof cam.center.latitude === 'number' && typeof cam.center.longitude === 'number') {
            center = { latitude: cam.center.latitude, longitude: cam.center.longitude };
          }
        } catch { }
      }

      if (!center && pointerCoordsPerAddress[index]) {
        center = {
          latitude: pointerCoordsPerAddress[index]!.latitude,
          longitude: pointerCoordsPerAddress[index]!.longitude
        };
      }

      if (!center) {
        Alert.alert('Location Error', 'Unable to determine map center. Please pan the map or try again.');
        return;
      }

      if (!isInIndia(center.latitude, center.longitude)) {
        Alert.alert('Invalid Location', 'Please select a location within India.');
        return;
      }

      await fetchAddressDetails(center.latitude, center.longitude, index, true, true);
    } catch {
      const center = pointerCoordsPerAddress[index];
      if (center) {
        if (!isInIndia(center.latitude, center.longitude)) {
          Alert.alert('Invalid Location', 'Please select a location within India.');
          return;
        }
        await fetchAddressDetails(center.latitude, center.longitude, index, true, true);
        Toast.show({
          type: 'success',
          text1: 'Location set',
          text2: `${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)}`,
          position: 'top',
          visibilityTime: 2000
        });
      } else {
        Alert.alert('Error', 'Could not read map center. Please pan the map and try again.');
      }
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
      latitude: '20.5937',
      longitude: '78.9629',
    };

    setOpdAddresses(prev => [newAddress, ...prev]);
    mapRefs.current = [];
    setCurrentOpdIndex(0);
    setTimeout(() => {
      initLocation(0);
    }, 100);
  };

  const handleRemoveAddress = (index: number) => {
    // Prevent removing prefilled (server-provided) addresses
    const addr = opdAddresses[index];
    if (isPrefilledAddr(addr)) {
      Toast.show({
        type: 'info',
        text1: 'Cannot remove',
        text2: 'This location was prefilled from your account and cannot be removed here.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setOpdAddresses(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      const shifted: { [key: number]: Errors } = {};
      Object.keys(newErrors).forEach(k => {
        const ki = Number(k);
        if (ki > index) shifted[ki - 1] = newErrors[ki];
        else if (ki < index) shifted[ki] = newErrors[ki];
      });
      return shifted;
    });
    mapRefs.current = mapRefs.current.filter((_, i) => i !== index);
  };

  const handleInputChange = (index: number, field: keyof Address, value: string) => {
    if (isPrefilledAddr(opdAddresses[index])) return; // lock fields in view-only
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

    setErrors(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: undefined,
      },
    }));
  };

  const validateFields = (address: Address) => {
    const newErrors: Errors = {};
    if (!address.clinicName.trim()) newErrors.clinicName = 'Clinic Name is required';
    if (!address.mobile.trim()) newErrors.mobile = 'Mobile Number is required';
    else if (!isValidMobile(address.mobile)) newErrors.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
    if (!address.address.trim()) newErrors.address = 'Address is required';
    if (!address.pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(address.pincode)) newErrors.pincode = 'Enter a valid 6-digit pincode';
    if (!address.city.trim()) newErrors.city = 'City is required';
    if (!address.state.trim()) newErrors.state = 'State is required';
    if (!address.country.trim()) newErrors.country = 'Country is required';
    return newErrors;
  };

  // convert time strings like "6 AM" or "6:30 PM" to "HH:MM"
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

  const handleNext = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('authToken');

    // validate only non-prefilled (editable) addresses
    let hasErrors = false;
    const newErrors: { [key: number]: Errors } = {};
    opdAddresses.forEach((addr, index) => {
      if (isPrefilledAddr(addr)) return; // skip validation for view-only rows
      const e = validateFields(addr);
      if (Object.keys(e).length > 0) {
        newErrors[index] = e;
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

    // prepare payload with times converted (only for rows we can add)
    const payload = opdAddresses
      .filter(a => !isPrefilledAddr(a))
      .map(addr => ({
        ...addr,
        startTime: convertTo24HourFormat(addr?.startTime) || '06:00',
        endTime: convertTo24HourFormat(addr?.endTime) || '21:00',
      }));

    // Build a set of existing clinic names (normalized). Includes server prefilled names and any existingAddressKeys transformed.
    const combinedExistingNameSet = new Set<string>();
    existingClinicNameSet.forEach(n => combinedExistingNameSet.add(n));
    existingAddressKeys.forEach(k => {
      const namePart = k.split('|')[0];
      if (namePart) combinedExistingNameSet.add(namePart);
    });
    const uniqueByNameMap = new Map<string, typeof payload[0]>();
    for (const p of payload) {
      const nameKey = buildClinicNameKey(p);
      uniqueByNameMap.set(nameKey, p);
    }

    const toAddAll = Array.from(uniqueByNameMap.entries()).map(([nameKey, clinic]) => ({ nameKey, clinic }));

    const skippedNames: string[] = [];
    const toAdd: typeof payload = [];
    for (const item of toAddAll) {
      if (combinedExistingNameSet.has(item.nameKey)) {
        skippedNames.push(item.clinic.clinicName);
      } else {
        toAdd.push(item.clinic);
      }
    }

    if (skippedNames.length > 0 && toAdd.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'No new clinics',
        text2: `These clinic names already exist: ${skippedNames.join(', ')}`,
        position: 'top',
        visibilityTime: 4000,
      });
      setLoading(false);
      await AsyncStorage.setItem('currentStep', 'ConsultationPreferences');
      navigation.navigate('ConsultationPreferences');
      return;
    }

    if (skippedNames.length > 0) {
      Toast.show({
        type: 'info',
        text1: 'Success',
        text2: `${skippedNames.join(', ')}`,
        position: 'top',
        visibilityTime: 4000,
      });
    }

    // Final server posting loop
    let allOk = true;
    try {
      for (const clinic of toAdd) {
        try {
          const res = await AuthPost('users/addAddress', clinic, token);
          if (res?.status !== 'success') {
            allOk = false;
            // Show server message if provided (handle duplicate key message defensively)
            const serverMsg = res?.message?.message || res?.message || JSON.stringify(res);
            if (typeof serverMsg === 'string' && serverMsg.includes('E11000 duplicate')) {
              Toast.show({
                type: 'error',
                text1: 'Failed to update practice details',
                text2: `Clinic name already exists: ${clinic.clinicName}.`,
                position: 'top',
                visibilityTime: 4000,
              });
            } else {
              Toast.show({
                type: 'error',
                text1: 'Failed to update practice details',
                text2: serverMsg || 'An unexpected error occurred. Please try again.',
                position: 'top',
                visibilityTime: 4000,
              });
            }
            break;
          } else {
            const nameKey = buildClinicNameKey(clinic);
            setExistingClinicNameSet(prev => new Set([...Array.from(prev), nameKey]));
            const compKey = buildClinicKey(clinic);
            setExistingAddressKeys(prev => new Set([...Array.from(prev), compKey]));
          }
        } catch {
          allOk = false;
          Toast.show({
            type: 'error',
            text1: 'Network Error',
            text2: 'Unable to add clinic. Please check your connection and try again.',
            position: 'top',
            visibilityTime: 4000,
          });
          break;
        }
      }
    } finally {
      setLoading(false);
    }

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
        setSpecialization(userData?.specialization?.[0]?.name ?? '');

        if (userData?.addresses && userData.addresses.length > 0) {
          setSkipButton(true);
          const mapped = userData.addresses.map((a: any) => ({
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
          }));
          setOpdAddresses(mapped);

          // build composite keys and normalized clinic-name set from server addresses
          const serverCompKeys = new Set((userData.addresses || []).map((a: any) => buildClinicKey(a)));
          setPrefilledKeys(serverCompKeys);
          setExistingAddressKeys(prev => new Set([...Array.from(prev), ...Array.from(serverCompKeys)]));

          const serverNameKeys = new Set((userData.addresses || []).map((a: any) => buildClinicNameKey(a)));
          setExistingClinicNameSet(prev => new Set([...Array.from(prev), ...Array.from(serverNameKeys)]));
        } else {
          setSkipButton(false);
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
    } finally {
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
        {result.structured_formatting?.main_text ?? result.description}
      </Text>
      <Text style={styles.searchItemSecondaryText}>
        {result.structured_formatting?.secondary_text ?? ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
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

          {opdAddresses.map((addr, index) => {
            const viewOnly = isPrefilledAddr(addr);
            return (
              <View key={index} style={styles.addressContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Select Location on Map</Text>

                  {isFetchingLocation && !viewOnly && (
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

                  <View style={styles.searchContainer} pointerEvents={viewOnly ? 'none' : 'auto'}>
                    <View style={styles.searchInputContainer}>
                      <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
                      <TextInput
                        style={[styles.searchInput, viewOnly && styles.inputDisabled]}
                        placeholder="Search for an address or location"
                        placeholderTextColor="#A0AEC0"
                        value={searchQueryPerAddress[index] || (viewOnly ? addr.address : '')}
                        onChangeText={(text) => {
                          handleSearch(text, index);
                        }}
                        editable={!viewOnly}
                      />
                      {(searchQueryPerAddress[index] && searchQueryPerAddress[index].length > 0 && !viewOnly) && (
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

                    {showSearchResultsPerAddress[index] && searchResultsPerAddress[index] && searchResultsPerAddress[index].length > 0 && !viewOnly && (
                      <View style={styles.searchResultsContainer}>
                        <ScrollView style={styles.searchResultsList}>
                          {searchResultsPerAddress[index].map((result: any) => (
                            <View key={result.place_id}>
                              {renderSearchItem(result, index)}
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View style={styles.mapContainer} pointerEvents={viewOnly ? 'none' : 'auto'}>
                    <MapView
                    key={`${index}-${addr.latitude}-${addr.longitude}`}
                      ref={(ref) => {
                        if (ref) {
                          mapRefs.current[index] = ref;
                        }
                      }}
                      style={styles.map}
                      provider={PROVIDER_GOOGLE}
                      // initialRegion={{
                      //   latitude: parseFloat(addr.latitude) || 20.5937,
                      //   longitude: parseFloat(addr.longitude) || 78.9629,
                      //   latitudeDelta: 0.01,
                      //   longitudeDelta: 0.01,
                      // }}

                       region={{
     latitude: parseFloat(String(addr.latitude).trim()) || 20.5937,
   longitude: parseFloat(String(addr.longitude).trim()) || 78.9629,
     latitudeDelta: 0.01,
     longitudeDelta: 0.01,
   }}
                      onRegionChange={(r) => handleRegionChange(index, r)}
                      onRegionChangeComplete={(r) => handleRegionChangeComplete(index, r)}
                      onPress={(e) => handleMapPress(index, e)}
                      scrollEnabled={!viewOnly}
                      zoomEnabled={!viewOnly}
                      pitchEnabled={!viewOnly}
                      rotateEnabled={!viewOnly}
                      showsUserLocation={!viewOnly} // disable blue dot when view-only
                      showsMyLocationButton={false}
                      followsUserLocation={false}
                    >
                      <Marker
                        coordinate={{
                           latitude: parseFloat(String(addr.latitude).trim()) || 20.5937,
                           longitude: parseFloat(String(addr.longitude).trim()) || 78.9629,}}
                      />
                    </MapView>

                    <View style={styles.markerFixed}>
                      {markerImage ? (
                        <Image source={markerImage as any} style={styles.markerImage} />
                      ) : (
                        <View style={styles.marker}>
                          <View style={styles.markerInner} />
                        </View>
                      )}
                    </View>

                    {pointerCoordsPerAddress[index] && !viewOnly && (
                      <View style={styles.pointerPreview}>
                        <Text style={{ fontSize: 10 }}>Lat: {pointerCoordsPerAddress[index]?.latitude.toFixed(6)}</Text>
                        <Text style={{ fontSize: 10 }}>Lng: {pointerCoordsPerAddress[index]?.longitude.toFixed(6)}</Text>
                      </View>
                    )}

                    {!viewOnly && (
                      <>
                        <TouchableOpacity
                          style={styles.myLocationButton}
                          onPress={() => handleMyLocation(index)}
                        >
                          <Icon name="crosshairs-gps" size={24} color="#3182CE" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.usePointerButton}
                          onPress={() => usePointerLocation(index)}
                        >
                          <Text style={styles.usePointerText}>Use pointer location</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Clinic Name *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors[index]?.clinicName && styles.inputError,
                      viewOnly && styles.inputDisabled,
                    ]}
                    placeholder="Enter Clinic Name"
                    placeholderTextColor="#999"
                    value={addr.clinicName}
                    onChangeText={text => handleInputChange(index, 'clinicName', text)}
                    editable={!viewOnly}
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
                      viewOnly && styles.inputDisabled,
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
                    editable={!viewOnly}
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
                      styles.textArea,
                      errors[index]?.address && styles.inputError,
                      viewOnly && styles.inputDisabled,
                    ]}
                    placeholder="Address"
                    placeholderTextColor="#999"
                    value={addr.address}
                    onChangeText={text => handleInputChange(index, 'address', text)}
                    editable={!viewOnly}
                    multiline={true}
                    numberOfLines={2}
                    textAlignVertical="top"
                    scrollEnabled={false}
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
                      viewOnly && styles.inputDisabled,
                    ]}
                    placeholder="Pincode"
                    placeholderTextColor="#999"
                    value={addr.pincode}
                    maxLength={6}
                    onChangeText={text => handleInputChange(index, 'pincode', text)}
                    keyboardType="numeric"
                    editable={!viewOnly}
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
                      viewOnly && styles.inputDisabled,
                    ]}
                    placeholder="City"
                    placeholderTextColor="#999"
                    value={addr.city}
                    onChangeText={text => handleInputChange(index, 'city', text)}
                    editable={!viewOnly}
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
                      viewOnly && styles.inputDisabled,
                    ]}
                    placeholder="State"
                    placeholderTextColor="#999"
                    value={addr.state}
                    onChangeText={text => handleInputChange(index, 'state', text)}
                    editable={!viewOnly}
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

                {/* Remove button: hidden/disabled for prefilled addresses */}
                {!viewOnly && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveAddress(index)}
                    disabled={opdAddresses.length === 1}
                  >
                    <Text style={styles.removeText}>×</Text>
                  </TouchableOpacity>
                )}

                {viewOnly && (
                  <View style={[styles.removeButton, { opacity: 0.5 }]} />
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.spacer} />
      </ScrollView>

      {/* Next button (floating) */}
      <TouchableOpacity
        style={[
          styles.nextButtonFloating,
          {
            bottom: keyboardVisible ? keyboardHeight + 16 : 42
          }
        ]}
        onPress={handleNext}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    height: '100%',
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
  textArea: {
    height: height * 0.15,
    textAlignVertical: 'top',
    paddingVertical: height * 0.015,
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
    paddingBottom: height * 0.28,
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
  skipButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  nextButtonFloating: {
    position: 'absolute',
    left: width * 0.05,
    right: width * 0.05,
    backgroundColor: '#00203F',
    paddingVertical: height * 0.018,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 10,
    marginBottom: height * 0.035,
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
  markerImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
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
  usePointerButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 20,
  },
  usePointerText: {
    color: '#1E40AF',
    fontWeight: '600',
    fontSize: 12,
  },
  pointerPreview: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 8,
    borderRadius: 6,
    zIndex: 21,
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
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999',
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
});

export default PracticeScreen;
