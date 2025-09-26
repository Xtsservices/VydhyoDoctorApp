// AddClinicForm.tsx
import React, { useEffect, useRef, useState } from 'react';
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
  Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import MapView, { Region, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Geocoder from 'react-native-geocoding';
import { UploadFiles } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import ImageEditor from '@react-native-community/image-editor';
import { Camera, useCameraDevice, CameraPermissionStatus } from 'react-native-vision-camera';
import PhotoManipulator from 'react-native-photo-manipulator';

Geocoder.init('AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo');

const { width, height } = Dimensions.get('window');
let markerImage: number | null = null;
try {
  markerImage = require('../../assets/marker.png');
} catch (e) {
  markerImage = null;
}
const HEADER_TARGET_WIDTH = 1200;
const HEADER_TARGET_HEIGHT = 500;
const PREVIEW_ASPECT_RATIO = HEADER_TARGET_WIDTH / HEADER_TARGET_HEIGHT;
const PREVIEW_WIDTH = width - 32;
const PREVIEW_HEIGHT = Math.round(PREVIEW_WIDTH / PREVIEW_ASPECT_RATIO);

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
    latitude: '20.593700',
    longitude: '78.962900',
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
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [pointerCoords, setPointerCoords] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 20.5937,
    longitude: 78.9629,
  });

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const [locationRetryCount, setLocationRetryCount] = useState(0);
  const locationRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Files + previews
  const [headerFile, setHeaderFile] = useState<any>(null);
  const [headerPreview, setHeaderPreview] = useState<string | number | null>(null);
  const [signatureFile, setSignatureFile] = useState<any>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | number | null>(null);
  const [pharmacyHeaderFile, setPharmacyHeaderFile] = useState<any>(null);
  const [pharmacyHeaderPreview, setPharmacyHeaderPreview] = useState<string | number | null>(null);
  const [labHeaderFile, setLabHeaderFile] = useState<any>(null);
  const [labHeaderPreview, setLabHeaderPreview] = useState<string | number | null>(null);
  const [clinicQRFile, setClinicQRFile] = useState<any>(null);
  const [clinicQRPreview, setClinicQRPreview] = useState<string | number | null>(null);
  const [pharmacyQRFile, setPharmacyQRFile] = useState<any>(null);
  const [pharmacyQRPreview, setPharmacyQRPreview] = useState<string | number | null>(null);
  const [labQRFile, setLabQRFile] = useState<any>(null);
  const [labQRPreview, setLabQRPreview] = useState<string | number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [activeFileTypeForCamera, setActiveFileTypeForCamera] = useState<
    'header' | 'signature' | 'pharmacyHeader' | 'labHeader' | 'clinicQR' | 'pharmacyQR' | 'labQR' | null
  >(null);
  const [bypassModalVisible, setBypassModalVisible] = useState(false);
  const [bypassData, setBypassData] = useState<any>(null);
  const [bypassType, setBypassType] = useState<'pharmacy' | 'lab' | null>(null);

  const ensureFileUri = (p: string) => (String(p).startsWith('file://') ? String(p) : `file://${String(p)}`);
  const cropImageUsingDims = async (srcUri: string, srcW: number | null, srcH: number | null, targetW: number, targetH: number) => {
    try {
      const normalized = ensureFileUri(srcUri);
      let imgW = srcW || 0;
      let imgH = srcH || 0;

      if (!imgW || !imgH) {
        const size = await new Promise<{ w: number; h: number }>((resolve, reject) =>
          Image.getSize(
            normalized,
            (w, h) => resolve({ w, h }),
            (err) => reject(err)
          )
        );
        imgW = size.w;
        imgH = size.h;
      }
      if (!imgW || !imgH) return normalized;

      const targetRatio = targetW / targetH;
      const srcRatio = imgW / imgH;

      let cropW = imgW;
      let cropH = imgH;
      let offsetX = 0;
      let offsetY = 0;

      if (srcRatio > targetRatio) {
        cropH = imgH;
        cropW = Math.round(imgH * targetRatio);
        offsetX = Math.round((imgW - cropW) / 2);
      } else {
        cropW = imgW;
        cropH = Math.round(imgW / targetRatio);
        offsetY = Math.round((imgH - cropH) / 2);
      }

      const cropRegion = { x: offsetX, y: offsetY, width: cropW, height: cropH };
      const destSize = { width: targetW, height: targetH };

      const result = await PhotoManipulator.crop(normalized, cropRegion, destSize);
      return result || normalized;
    } catch (err) {
      return srcUri;
    }
  };
  const cameraRef = useRef<Camera | null>(null);
  const device = useCameraDevice('back');
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus | 'unknown'>('unknown');
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails.role === "doctor" ? currentuserDetails.userId : currentuserDetails.createdBy;
  const GOOGLE_MAPS_API_KEY = 'AIzaSyCrmF3351j82RVuTZbVBJ-X3ufndylJsvo';
  const lastPanUpdateRef = useRef<number>(0);
  const reverseGeoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoSelectedRef = useRef<string>('');
  const toUriString = (maybe: any): string | number | null => {
    if (maybe === null || maybe === undefined) return null;
    if (typeof maybe === 'number') return maybe; // require(...) returns number
    if (typeof maybe === 'string') {
      const s = maybe.trim();
      if (!s) return null;
      if (s.startsWith('/') && !s.startsWith('file://')) return `file://${s}`;
      if (s.startsWith('content://') || s.startsWith('file://') || s.startsWith('http://') || s.startsWith('https://')) {
        return s;
      }
      return s;
    }
    if (typeof maybe === 'object') {
      const candidate = maybe.uri || maybe.path || maybe.fileCopyUri || maybe.filePath || maybe.contentUri;
      if (candidate) {
        const s = String(candidate);
        if (!s) return null;
        if (s.startsWith('/') && !s.startsWith('file://')) return `file://${s}`;
        return s;
      }
    }
    return null;
  };

  const normalizeImageSource = (src?: string | number | null) => {
    const val = toUriString(src);
    if (val === null) return null;
    if (typeof val === 'number') return val;
    return { uri: val };
  };
  const getTargetCrop = (type: string) => {
    if (type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') {
      return { targetWidth: HEADER_TARGET_WIDTH, targetHeight: HEADER_TARGET_HEIGHT };
    }
    return { targetWidth: 1000, targetHeight: 1000 }; // Square-ish for QR codes / signature
  };

  const cropImageToCenter = async (uri: string, targetWidth: number, targetHeight: number) => {
    try {
      const normalized = String(uri).startsWith('file://') ? String(uri) : `file://${String(uri)}`;
      const { w: imgW, h: imgH } = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        Image.getSize(
          normalized,
          (w, h) => resolve({ w, h }),
          (err) => reject(err)
        );
      });
      const targetRatio = targetWidth / targetHeight;
      const srcRatio = imgW / imgH;

      let cropW = imgW;
      let cropH = imgH;
      let offsetX = 0;
      let offsetY = 0;

      if (srcRatio > targetRatio) {
        cropH = imgH;
        cropW = Math.round(imgH * targetRatio);
        offsetX = Math.round((imgW - cropW) / 2);
        offsetY = 0;
      } else {
        // source is taller -> crop vertically
        cropW = imgW;
        cropH = Math.round(imgW / targetRatio);
        offsetX = 0;
        offsetY = Math.round((imgH - cropH) / 2);
      }
      const cropRegion = {
        x: offsetX,
        y: offsetY,
        width: cropW,
        height: cropH,
      };
      const destSize = { width: targetWidth, height: targetHeight };
      const resultUri = await PhotoManipulator.crop(normalized, cropRegion, destSize);

      return resultUri || normalized;
    } catch (err) {
      Alert.alert('Photo Crop Error', String(err));
      return uri;
    }
  };

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
      } catch (err: any) {
        Alert.alert(
          'Location Permission Error',
          err?.message
            ? `Could not request location permission.\n\nDetails: ${err?.message}`
            : 'Could not request location permission. Please try again or enable it from Settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      try {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        return auth === 'granted' || auth === 'authorized' || auth === 'whenInUse';
      } catch (e) {
        return false;
      }
    }
  };

  // Request camera permission (and set local state)
  const requestCameraPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to take photos.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        });

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          setCameraPermission('authorized');
          return true;
        }

        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          setCameraPermission('denied');
          Alert.alert(
            'Camera Permission Required',
            'Camera permission was permanently denied. Please open settings and enable Camera permission for this app.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          setCameraPermission('denied');
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        }

        return false;
      } else {
        const permission = await Camera.requestCameraPermission();
        setCameraPermission(permission);
        if (permission === 'authorized') return true;

        if (permission === 'denied') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos. Please enable it in Settings if you want to use the camera.', [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }
        return false;
      }
    } catch (err: any) {
      Alert.alert('Camera Permission Error', err?.message || 'Unable to request camera permission.');
      setCameraPermission('denied');
      return false;
    }
  };

  // Check if coordinates are within India
  const isInIndia = (latitude: number, longitude: number) =>
    latitude >= 6.554607 && latitude <= 35.674545 && longitude >= 68.111378 && longitude <= 97.395561;

  // Fetch address from coordinates
  const fetchAddress = async (
    latitude: number,
    longitude: number,
    setAsSelected = true,
    force = false
  ) => {
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
          if (types.includes('street_number')) {
            street = street ? `${street} ${component.long_name}` : component.long_name;
          } else if (types.includes('route')) {
            street = street ? `${street} ${component.long_name}` : component.long_name;
          } else if (types.includes('sublocality') || types.includes('locality') || types.includes('administrative_area_level_2')) {
            if (!city) city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
          } else if (types.includes('postal_code')) {
            pincode = component.long_name;
          }
        }

        const address = street || result.formatted_address || '';

        const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        if (lastAutoSelectedRef.current === key && setAsSelected && !force) {
          // already selected
        } else {
          if (setAsSelected) {
            setForm(prev => ({
              ...prev,
              address,
              city: city || prev.city,
              state: state || prev.state,
              country,
              pincode: pincode || prev.pincode,
              latitude: String(Number(latitude.toFixed(6))),
              longitude: String(Number(longitude.toFixed(6))),
            }));

            const newRegion = {
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            try {
              mapRef.current?.animateToRegion(newRegion, 500);
            } catch (e) { 
                Alert.alert('Map Error', 'Could not animate to the selected region.');
            }

          } else {
            setForm(prev => ({
              ...prev,
              address,
              latitude: String(Number(latitude.toFixed(6))),
              longitude: String(Number(longitude.toFixed(6))),
            }));
            setPointerCoords({ latitude, longitude });
          }

          setSearchQuery(address);
          lastAutoSelectedRef.current = key;
          setLocationRetryCount(0);
        }
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Reverse Geocoding Error', text2: error?.message || 'Failed to fetch address details.' });
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
      distanceFilter: 0,
      forceRequestLocation: true,
    } as any;

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
        setRegion(newRegion);
        setPointerCoords({ latitude, longitude });
        setTimeout(() => {
          try {
            mapRef.current?.animateToRegion(newRegion, 800);
          } catch (e) { 
            Alert.alert('Map Error', 'Could not animate to the selected region.');
          }
        }, 300);
        setIsFetchingLocation(false);

        const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        if (lastAutoSelectedRef.current !== key) {
          lastAutoSelectedRef.current = key;
          fetchAddress(latitude, longitude, true);
        }
      },
      (error) => {
        let errorMessage = 'Unable to fetch current location.';
        if ((error as any).code === 1) {
          errorMessage = 'Location permission denied. Please enable location permissions in settings.';
        } else if ((error as any).code === 2) {
          errorMessage = 'Location information is unavailable. This might be due to being indoors or poor signal.';
        } else if ((error as any).code === 3) {
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

          const t = setTimeout(() => {
            initLocationWithRetry();
          }, 2000);
          locationRetryTimeoutRef.current = t;
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

  const initLocationWithRetry = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    const retryOptions: any = {
      enableHighAccuracy: locationRetryCount > 1,
      timeout: 20000,
      maximumAge: 30000,
      forceRequestLocation: true,
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
        setRegion(newRegion);
        setPointerCoords({ latitude, longitude });
        setTimeout(() => {
          try {
            mapRef.current?.animateToRegion(newRegion, 800);
          } catch (e) { }
        }, 300);
        setIsFetchingLocation(false);

        const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        if (lastAutoSelectedRef.current !== key) {
          lastAutoSelectedRef.current = key;
          fetchAddress(latitude, longitude, true);
        }
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
      if (reverseGeoDebounceRef.current) {
        clearTimeout(reverseGeoDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (error: any) {
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

        const countryComponent = (place.address_components || []).find((component: any) =>
          (component.types || []).includes('country')
        );

        if (!countryComponent || countryComponent.short_name !== 'IN') {
          Alert.alert(
            'Invalid Location',
            'Please select a location within India.',
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
        try {
          mapRef.current?.animateToRegion(newRegion, 500);
        } catch (e) { }
        setRegion(newRegion);
        setPointerCoords({ latitude, longitude });

        const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        if (lastAutoSelectedRef.current !== key) {
          lastAutoSelectedRef.current = key;
          await fetchAddress(latitude, longitude, true);
        }
      } else {
        Alert.alert('Error', 'Failed to fetch location details.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to fetch place details. Please try again.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Debounce durations
  const LIVE_REVERSE_DEBOUNCE_MS = 600;
  const FINAL_REVERSE_DEBOUNCE_MS = 700;

  // Handle region change during pan
  const handleRegionChange = (r: Region) => {
    const now = Date.now();
    if (now - lastPanUpdateRef.current < 120) return;
    lastPanUpdateRef.current = now;

    setPointerCoords({ latitude: r.latitude, longitude: r.longitude });

    setForm(prev => ({
      ...prev,
      latitude: String(Number(r.latitude.toFixed(6))),
      longitude: String(Number(r.longitude.toFixed(6))),
    }));

    setErrors(prev => {
      const next = { ...prev };
      delete next.latitude;
      delete next.longitude;
      return next;
    });

    if (reverseGeoDebounceRef.current) {
      clearTimeout(reverseGeoDebounceRef.current);
    }
    reverseGeoDebounceRef.current = setTimeout(() => {
      const key = `${r.latitude.toFixed(6)},${r.longitude.toFixed(6)}`;
      if (lastAutoSelectedRef.current !== key) {
        fetchAddress(r.latitude, r.longitude, true);
      }
    }, LIVE_REVERSE_DEBOUNCE_MS);
  };

  // Handle region change complete
  const handleRegionChangeComplete = (r: Region) => {
    setRegion(r);
    setPointerCoords({ latitude: r.latitude, longitude: r.longitude });

    setForm(prev => ({
      ...prev,
      latitude: String(Number(r.latitude.toFixed(6))),
      longitude: String(Number(r.longitude.toFixed(6))),
    }));

    setShowSearchResults(false);

    setErrors(prev => {
      const next = { ...prev };
      delete next.latitude;
      delete next.longitude;
      return next;
    });

    if (reverseGeoDebounceRef.current) {
      clearTimeout(reverseGeoDebounceRef.current);
    }
    reverseGeoDebounceRef.current = setTimeout(() => {
      const key = `${r.latitude.toFixed(6)},${r.longitude.toFixed(6)}`;
      if (lastAutoSelectedRef.current !== key) {
        lastAutoSelectedRef.current = key;
        fetchAddress(r.latitude, r.longitude, true);
      }
    }, FINAL_REVERSE_DEBOUNCE_MS);
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

  // Use pointer location (read map center)
  const usePointerLocation = async () => {
    try {
      let center: { latitude: number; longitude: number } | null = null;
      const mapAny: any = mapRef.current as any;

      if (mapAny && typeof mapAny.getCamera === 'function') {
        try {
          const cam = await mapAny.getCamera();
          if (cam && cam.center && typeof cam.center.latitude === 'number' && typeof cam.center.longitude === 'number') {
            center = { latitude: cam.center.latitude, longitude: cam.center.longitude };
          }
        } catch (e) {
            Alert.alert('Camera Error', `Unable to get camera center: ${e?.message || e}`);
        }
      }

      if (!center && pointerCoords) {
        center = { latitude: pointerCoords.latitude, longitude: pointerCoords.longitude };
      }
      if (!center && region) {
        center = { latitude: region.latitude, longitude: region.longitude };
      }

      if (!center) {
        Alert.alert('Location Error', 'Unable to determine map center. Please pan the map or try again.');
        return;
      }

      if (!isInIndia(center.latitude, center.longitude)) {
        Alert.alert('Invalid Location', 'Please select a location within India.');
        return;
      }

      await fetchAddress(center.latitude, center.longitude, true, true);
    } catch (err: any) {
      const center = pointerCoords ?? region;
      if (center) {
        if (!isInIndia(center.latitude, center.longitude)) {
          Alert.alert('Invalid Location', 'Please select a location within India.');
          return;
        }
        await fetchAddress(center.latitude, center.longitude, true, true);
        Toast.show({ type: 'success', text1: 'Location set', text2: `${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)}`, position: 'top', visibilityTime: 2000 });
      } else {
        Alert.alert('Error', 'Could not read map center. Please pan the map and try again.');
      }
    }
  };

  // Camera options for non-header images
  const OTHER_TARGET_MAX = 1000;
  const getOtherCameraOptions = (): CameraOptions => ({
    mediaType: 'photo',
    includeBase64: false,
    saveToPhotos: false,
    maxWidth: OTHER_TARGET_MAX,
    maxHeight: OTHER_TARGET_MAX,
    quality: 0.85,
    presentationStyle: 'fullScreen',
  });

  const getOtherLibraryOptions = (): ImageLibraryOptions => ({
    mediaType: 'photo',
    includeBase64: false,
    maxWidth: OTHER_TARGET_MAX,
    maxHeight: OTHER_TARGET_MAX,
    quality: 0.85,
  });
  const assignFileByType = (type: string, file: any, previewUri: any) => {
    const previewRaw = toUriString(previewUri);
    const originalUri = toUriString(file?.uri || file?.path || file) || previewRaw || null;
    const makeDisplayUri = (u: string | null) => {
      if (!u || typeof u !== 'string') return u;
      return `${u}${u.includes('?') ? '&' : '?'}t=${Date.now()}`;
    };

    const displayUri = makeDisplayUri(previewRaw || originalUri);
    const minimalFile = {
      uri: originalUri,
      name: file?.name || `${type}.jpg`,
      type: file?.type || 'image/jpeg',
    };
    if (type === 'header') {
      setHeaderFile(minimalFile);
      if (displayUri) setHeaderPreview(displayUri);
    } else if (type === 'signature') {
      setSignatureFile(minimalFile);
      if (displayUri) setSignaturePreview(displayUri);
    } else if (type === 'pharmacyHeader') {
      setPharmacyHeaderFile(minimalFile);
      if (displayUri) setPharmacyHeaderPreview(displayUri);
    } else if (type === 'labHeader') {
      setLabHeaderFile(minimalFile);
      if (displayUri) setLabHeaderPreview(displayUri);
    } else if (type === 'clinicQR') {
      setClinicQRFile(minimalFile);
      if (displayUri) setClinicQRPreview(displayUri);
    } else if (type === 'pharmacyQR') {
      setPharmacyQRFile(minimalFile);
      if (displayUri) setPharmacyQRPreview(displayUri);
    } else if (type === 'labQR') {
      setLabQRFile(minimalFile);
      if (displayUri) setLabQRPreview(displayUri);
    }
  };

  const pickFromGalleryAndCrop = async (type: string) => {
    try {
      const { targetWidth, targetHeight } = getTargetCrop(type);
      const options: ImageLibraryOptions = {
        mediaType: 'photo',
        includeBase64: false,
        quality: 0.85,
      };

      const result = await launchImageLibrary(options);

      if ((result as any).didCancel) return;
      if ((result as any).errorCode) {
        Alert.alert('Gallery Error', (result as any).errorMessage || 'Gallery access failed.');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const rawUri = asset.uri || asset.path || asset.fileCopyUri || asset.fileName;
        let uri = toUriString(rawUri) as string | null;
        if (!uri) {
          Alert.alert('Gallery Error', 'Could not read selected image.');
          return;
        }

        if (type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') {
          try {
            uri = (await cropImageToCenter(uri, targetWidth, targetHeight)) || uri;
          } catch (e) {
            Alert.alert('Crop Error', 'Could not crop the selected image. Using the original image.');
          }
        }
        const file = {
          uri,
          name: asset.fileName || `${type}_gallery.jpg`,
          type: asset.type || 'image/jpeg',
        };

        assignFileByType(type, file, uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Gallery access failed.');
    }
  };
  const onVisionCameraCapture = async (photoPathOrObj: any) => {
    try {
      if (!photoPathOrObj || !activeFileTypeForCamera) return;
      const rawPath =
        (typeof photoPathOrObj === 'string' ? photoPathOrObj : null) ||
        photoPathOrObj.path ||
        photoPathOrObj.uri ||
        photoPathOrObj.filePath ||
        photoPathOrObj?.photo?.path ||
        photoPathOrObj?.fileUri ||
        null;

      if (!rawPath) {
        Alert.alert('Capture Error', 'No photo path returned from camera.');
        return;
      }
      const providedWidth = Number(photoPathOrObj?.width) || Number(photoPathOrObj?.imageWidth) || null;
      const providedHeight = Number(photoPathOrObj?.height) || Number(photoPathOrObj?.imageHeight) || null;

      const imgUri = ensureFileUri(rawPath);
      await new Promise((r) => setTimeout(r, 120));

      const { targetWidth, targetHeight } = getTargetCrop(activeFileTypeForCamera);
      let finalUri = imgUri;
      try {
        finalUri = await cropImageUsingDims(imgUri, providedWidth, providedHeight, targetWidth, targetHeight);
      } catch (e) {

        Alert.alert('Crop Error', 'Could not crop the captured image. Using fallback crop.');
        try {
          finalUri = await cropImageToCenter(imgUri, targetWidth, targetHeight);
        } catch (e2) {

          finalUri = imgUri;
        }
      }
      try {
        await new Promise((resolve, reject) => {
          Image.getSize(
            finalUri,
            (w, h) => resolve({ w, h }),
            (err) => reject(err)
          );
        });
      } catch (err) {

        finalUri = imgUri;
      }
      const file = {
        uri: finalUri,
        name: `${activeFileTypeForCamera}_camera.jpg`,
        type: 'image/jpeg',
      };
      assignFileByType(activeFileTypeForCamera, file, finalUri);
      setCameraModalVisible(false);
      setActiveFileTypeForCamera(null);
    } catch (err) {
      Alert.alert('Capture Error', String(err));
    }
  };


  // Handle file change
  const handleFileChange = async (type: 'header' | 'signature' | 'pharmacyHeader' | 'labHeader' | 'clinicQR' | 'pharmacyQR' | 'labQR') => {
    try {
      let title = '';
      if (type === 'header') title = 'Header';
      else if (type === 'signature') title = 'Signature';
      else if (type === 'pharmacyHeader') title = 'Pharmacy Header';
      else if (type === 'labHeader') title = 'Lab Header';
      else if (type === 'clinicQR') title = 'Clinic QR Code';
      else if (type === 'pharmacyQR') title = 'Pharmacy QR Code';
      else if (type === 'labQR') title = 'Lab QR Code';

      const onCameraPressed = async () => {
        if (type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') {
          const hasPermission = await requestCameraPermission();
          if (!hasPermission) return;
          if (!device) {
            const fallback = await new Promise<boolean>((resolve) => {
              Alert.alert('Camera Unavailable', 'Camera device not ready. Would you like to use the normal camera as a fallback?', [
                { text: 'Yes', onPress: () => resolve(true) },
                { text: 'No', onPress: () => resolve(false), style: 'cancel' },
              ]);
            });
            if (fallback) {
              const options: CameraOptions = {
                mediaType: 'photo',
                includeBase64: false,
                saveToPhotos: false,
                maxWidth: HEADER_TARGET_WIDTH,
                maxHeight: HEADER_TARGET_HEIGHT,
                quality: 0.9,
              };
              const result = await launchCamera(options);
              if ((result as any).didCancel) return;
              if ((result as any).errorCode) {
                Alert.alert('Camera Error', (result as any).errorMessage || 'Camera failed.');
                return;
              }
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const rawUri = asset.uri || asset.path || asset.fileCopyUri || asset.fileName;
                let uri = toUriString(rawUri) as string | null;
                if (!uri) {
                  Alert.alert('Camera Error', 'Could not read captured image.');
                  return;
                }
                try {
                  uri = (await cropImageToCenter(uri, HEADER_TARGET_WIDTH, HEADER_TARGET_HEIGHT)) || uri;
                } catch (e) {
                    Alert.alert('Crop Error', 'Could not crop the captured image. Using the original image.');
                }
                const file = {
                  uri,
                  name: asset.fileName || `${type}_camera.jpg`,
                  type: asset.type || 'image/jpeg',
                };
                assignFileByType(type, file, uri);
              }
              return;
            } else {
              return;
            }
          }
          setActiveFileTypeForCamera(type);
          setCameraModalVisible(true);
        } else {
          const options = getOtherCameraOptions();
          const result = await launchCamera(options);

          if ((result as any).didCancel) return;
          if ((result as any).errorCode) {
            Alert.alert('Camera Error', (result as any).errorMessage || 'Camera failed.');
            return;
          }

          if (result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const rawUri = asset.uri || asset.path || asset.fileCopyUri || asset.fileName;
            const uri = toUriString(rawUri);
            const file = {
              uri,
              name: asset.fileName || `${type}_camera.jpg`,
              type: asset.type || 'image/jpeg',
            };
            assignFileByType(type, file, uri);
          }
        }
      };

      const onGalleryPressed = async () => {
        await pickFromGalleryAndCrop(type);
      };

      // Show options
      Alert.alert(`Upload ${title}`, 'Choose an option', [
        { text: 'Camera', onPress: onCameraPressed },
        { text: 'Gallery', onPress: onGalleryPressed },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to pick file. Please try again.');
    }
  };

  // Validate form
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
    if (form.pharmacyName && form.pharmacyName.trim()) {
      if (!form.pharmacyAddress?.trim()) newErrors.pharmacyAddress = 'Pharmacy address is required when pharmacy name is provided';
    }
    if (form.labName && form.labName.trim()) {
      if (!form.labAddress?.trim()) newErrors.labAddress = 'Lab address is required when lab name is provided';
    }

    setErrors(newErrors);
    return { valid: Object.keys(newErrors).length === 0, newErrors };
  };

  // Build form data for submission
  const buildFormData = () => {
    const formData = new FormData();

    formData.append('userId', doctorId || '');
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

    if (headerFile) {
      formData.append('file', {
        uri: headerFile.uri,
        type: headerFile.type || 'image/jpeg',
        name: headerFile.name || 'header.jpg',
      } as any);
    }
    if (signatureFile) {
      formData.append('signature', {
        uri: signatureFile.uri,
        type: signatureFile.type || 'image/jpeg',
        name: signatureFile.name || 'signature.jpg',
      } as any);
    }

    if (form.pharmacyName && form.pharmacyName.trim()) {
      formData.append('pharmacyName', form.pharmacyName);
      if (form.pharmacyRegNum) formData.append('pharmacyRegistrationNo', form.pharmacyRegNum);
      if (form.pharmacyGST) formData.append('pharmacyGst', form.pharmacyGST);
      if (form.pharmacyPAN) formData.append('pharmacyPan', form.pharmacyPAN);
      if (form.pharmacyAddress) formData.append('pharmacyAddress', form.pharmacyAddress);
      if (pharmacyHeaderFile) {
        formData.append('pharmacyHeader', {
          uri: pharmacyHeaderFile.uri,
          type: pharmacyHeaderFile.type || 'image/jpeg',
          name: pharmacyHeaderFile.name || 'pharmacy_header.jpg',
        } as any);
      }
    }

    if (form.labName && form.labName.trim()) {
      formData.append('labName', form.labName);
      if (form.labRegNum) formData.append('labRegistrationNo', form.labRegNum);
      if (form.labGST) formData.append('labGst', form.labGST);
      if (form.labPAN) formData.append('labPan', form.labPAN);
      if (form.labAddress) formData.append('labAddress', form.labAddress);
      if (labHeaderFile) {
        formData.append('labHeader', {
          uri: labHeaderFile.uri,
          type: labHeaderFile.type || 'image/jpeg',
          name: labHeaderFile.name || 'lab_header.jpg',
        } as any);
      }
    }

    if (clinicQRFile) {
      formData.append('clinicQR', {
        uri: clinicQRFile.uri,
        type: clinicQRFile.type || 'image/jpeg',
        name: clinicQRFile.name || 'clinic_qr.jpg',
      } as any);
    }
    if (pharmacyQRFile) {
      formData.append('pharmacyQR', {
        uri: pharmacyQRFile.uri,
        type: pharmacyQRFile.type || 'image/jpeg',
        name: pharmacyQRFile.name || 'pharmacy_qr.jpg',
      } as any);
    }
    if (labQRFile) {
      formData.append('labQR', {
        uri: labQRFile.uri,
        type: labQRFile.type || 'image/jpeg',
        name: labQRFile.name || 'lab_qr.jpg',
      } as any);
    }

    return formData;
  };
  const handleBypassSubmit = async () => {
    if (!bypassData || !bypassType) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const bypassFormData = bypassData;
      const url = bypassType === 'pharmacy' 
        ? 'users/addAddressFromWeb?bypassCheck=true'
        : 'users/addAddressFromWeb?bypassCheck=true';

      const response = await UploadFiles(url, bypassFormData, token);
      
      if (response.status === 'success' || response.status === 200 || response.status === 201) {
        Toast.show({ 
          type: 'success', 
          text1: 'Success', 
          text2: bypassType === 'pharmacy' 
            ? 'Pharmacy linked successfully' 
            : 'Lab linked successfully', 
          position: 'top', 
          visibilityTime: 3000 
        });
        setBypassModalVisible(false);
        setBypassData(null);
        setBypassType(null);
        navigation.navigate('Clinic' as never);
      } else {
        Toast.show({ 
          type: 'error', 
          text1: 'Error', 
          text2: response.message || `Failed to link ${bypassType}.`, 
          position: 'top', 
          visibilityTime: 3000 
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || `Failed to link ${bypassType}.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    const { valid, newErrors } = validateForm();
    if (!valid) {
      const firstError = Object.values(newErrors)[0] || 'Please fix the form errors';
      Toast.show({ type: 'error', text1: 'Validation Error', text2: firstError, position: 'top', visibilityTime: 3000 });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const formData = buildFormData();

      // upload
      const response = await UploadFiles('users/addAddressFromWeb', formData, token);
      const isWarning = 
        response?.data?.status === 'warning' ||
        String(response?.message || response?.data?.message || '').toLowerCase().includes('already registered');

      if (isWarning) {
        const message = response?.data?.message || response?.message || '';
        
        if (message.toLowerCase().includes('pharmacy')) {
          setBypassType('pharmacy');
          setBypassData(formData);
          setBypassModalVisible(true);
          return;
        } else if (message.toLowerCase().includes('lab')) {
          setBypassType('lab');
          setBypassData(formData);
          setBypassModalVisible(true);
          return;
        }
      }

      if (response.status === 'success' || response.status === 200 || response.status === 201) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Clinic added successfully', position: 'top', visibilityTime: 3000 });
        navigation.navigate('Clinic' as never);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: response.message || 'Failed to add clinic.', position: 'top', visibilityTime: 3000 });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add clinic.');
    } finally {
      setLoading(false);
    }
  };

  const CameraModal = ({ visible, onClose, device }: { visible: boolean; onClose: () => void; device: any }) => {
    if (!visible) return null;

    const activeType = activeFileTypeForCamera || 'header';
    const { targetWidth, targetHeight } = getTargetCrop(activeType);
    const screenPadding = 32;
    const maxOverlayWidth = width - screenPadding * 2;
    const overlayRatio = targetWidth / targetHeight;
    let overlayWidth = maxOverlayWidth;
    let overlayHeight = Math.round(overlayWidth / overlayRatio);
    if (overlayHeight > height * 0.6) {
      overlayHeight = Math.round(height * 0.6);
      overlayWidth = Math.round(overlayHeight * overlayRatio);
    }

    const overlayStyle = {
      width: overlayWidth,
      height: overlayHeight,
    };

    useEffect(() => {
      (async () => {
        try {
          if (Platform.OS === 'android') {
            const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
            if (!has) {
              Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
              onClose();
            } else {
              setCameraPermission('authorized');
            }
          } else {
            const permission = await Camera.getCameraPermissionStatus();
            setCameraPermission(permission);
            if (permission !== 'authorized') {
              const asked = await Camera.requestCameraPermission();
              setCameraPermission(asked);
              if (asked !== 'authorized') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                onClose();
              }
            }
          }
        } catch (err) {
            Alert.alert('Camera Permission Error', err?.message || 'Unable to check camera permission.');
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.cameraModalContainer}>
          {/* overlay masks: top flexible, center overlay, bottom flexible */}
          <View style={styles.overlayMaskContainer} pointerEvents="none">
            <View style={styles.maskFlex} />
            <View style={[styles.overlayCenterRow, { height: overlayHeight }]}>
              <View style={styles.sideMask} />

              <View style={[styles.overlayBox, overlayStyle]}>
                <View style={styles.overlayBorderTop}>
                  <Text style={styles.overlayText}>{`${targetWidth} × ${targetHeight}`}</Text>
                </View>

                <View style={{ width: overlayWidth, height: overlayHeight, overflow: 'hidden', borderRadius: 6 }}>
                  {device && cameraPermission === 'authorized' ? (
                    <Camera
                      style={{ width: overlayWidth, height: overlayHeight }}
                      device={device}
                      isActive={visible}
                      photo
                      ref={cameraRef as any}
                    />
                  ) : (
                    <View style={{ width: overlayWidth, height: overlayHeight, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                      <Text style={{ color: '#fff' }}>Camera not ready</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.sideMask} />
            </View>
            <View style={styles.maskFlex} />
          </View>

          {/* controls */}
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cameraCancel} onPress={() => { onClose(); }}>
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraCapture}
              onPress={async () => {
                try {
                  if (!cameraRef.current) {
                    Alert.alert('Camera Error', 'Camera not ready.');
                    return;
                  }
                  let photo: any;
                  try {
                    if (typeof (cameraRef.current as any).takePhoto === 'function') {
                      photo = await (cameraRef.current as any).takePhoto({ flash: 'off' });
                    } else if (typeof (cameraRef.current as any).takeSnapshot === 'function') {
                      photo = await (cameraRef.current as any).takeSnapshot();
                    } else if (typeof (cameraRef.current as any).capture === 'function') {
                      photo = await (cameraRef.current as any).capture();
                    } else {
                      throw new Error('No capture method available on cameraRef.');
                    }
                  } catch (err) {

                    const { targetWidth: fbW, targetHeight: fbH } = getTargetCrop(activeFileTypeForCamera || 'header');
                    const options: CameraOptions = {
                      mediaType: 'photo',
                      includeBase64: false,
                      saveToPhotos: false,
                      maxWidth: fbW,
                      maxHeight: fbH,
                      quality: 0.9,
                    };
                    const result = await launchCamera(options);
                    if ((result as any).didCancel) {
                      return;
                    }
                    if ((result as any).errorCode) {
                      Alert.alert('Camera Error', (result as any).errorMessage || 'Camera failed.');
                      return;
                    }
                    if (result.assets && result.assets.length > 0) {
                      const asset = result.assets[0];
                      const rawUri = asset.uri || asset.path || asset.fileCopyUri || asset.fileName;
                      const uri = toUriString(rawUri);
                      const finalUri = (await cropImageToCenter(uri as string, fbW, fbH)) || uri;
                      const file = {
                        uri: finalUri,
                        name: asset.fileName || `fallback_${activeFileTypeForCamera}_camera.jpg`,
                        type: asset.type || 'image/jpeg',
                      };
                      assignFileByType(activeFileTypeForCamera as string, file, finalUri);
                      onClose();
                      setActiveFileTypeForCamera(null);
                      return;
                    }
                  }

                  const path = (photo as any)?.path || (photo as any)?.uri || photo;
                  await onVisionCameraCapture(photo || path);
                  onClose();
                } catch (err: any) {
                  Alert.alert('Capture Error', err?.message || String(err));
                } finally {
                  setActiveFileTypeForCamera(null);
                }
              }}
            >
              <View style={styles.captureCircle} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cameraGallery} onPress={async () => {
              if (activeFileTypeForCamera) await pickFromGalleryAndCrop(activeFileTypeForCamera);
              onClose();
              setActiveFileTypeForCamera(null);
            }}>
              <Text style={{ color: '#fff' }}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  const BypassModal = () => (
    <Modal visible={bypassModalVisible} transparent animationType="fade">
      <View style={styles.bypassModalContainer}>
        <View style={styles.bypassModalContent}>
          <Text style={styles.bypassModalTitle}>
            {bypassType === 'pharmacy' ? 'Pharmacy Already Exists' : 'Lab Already Exists'}
          </Text>
          <Text style={styles.bypassModalText}>
            {bypassType === 'pharmacy' 
              ? 'This pharmacy is already registered with another doctor. Do you want to link this pharmacy to your clinic?'
              : 'This lab is already registered with another doctor. Do you want to link this lab to your clinic?'}
          </Text>
          <View style={styles.bypassModalButtons}>
            <TouchableOpacity 
              style={[styles.bypassModalButton, styles.bypassModalCancel]} 
              onPress={() => {
                setBypassModalVisible(false);
                setBypassData(null);
                setBypassType(null);
              }}
            >
              <Text style={styles.bypassModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bypassModalButton, styles.bypassModalConfirm]} 
              onPress={handleBypassSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.bypassModalConfirmText}>
                  {bypassType === 'pharmacy' ? 'Link Pharmacy' : 'Link Lab'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render file upload element
  const renderFileUpload = (type: 'header' | 'signature' | 'pharmacyHeader' | 'labHeader' | 'clinicQR' | 'pharmacyQR' | 'labQR', label: string, preview: string | number | null) => {
    const { targetWidth, targetHeight } = getTargetCrop(type);
    const source = normalizeImageSource(preview);
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {label} {type === 'header' || type === 'pharmacyHeader' || type === 'labHeader' ? `(${targetWidth}×${targetHeight})` : ''}
        </Text>
        <TouchableOpacity style={[styles.uploadBox, (type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') ? styles.headerUploadBox : null]} onPress={() => handleFileChange(type)}>
          {source ? (
            (type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') ? (
              <Image source={source as any} style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, borderRadius: 4, resizeMode: 'cover' }} />
            ) : (
              <Image source={source as any} style={styles.previewImage} />
            )
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Icon name="upload" size={24} color="#6B7280" />
              <Text style={styles.uploadText}>Select File</Text>
              {(type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') && (
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>Banner target: {targetWidth}×{targetHeight}px</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchItem = (result: any) => (
    <TouchableOpacity key={result.place_id} style={styles.searchItem} onPress={() => handleSelectSearchResult(result)}>
      <Text style={styles.searchItemMainText}>{result.structured_formatting?.main_text}</Text>
      <Text style={styles.searchItemSecondaryText}>{result.structured_formatting?.secondary_text}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={styles.keyboardAvoidingContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}
      
      <BypassModal />
      
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.mapSection}>
          <Text style={styles.label}>Location (Move map to position pointer — map auto-selects when you stop)</Text>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for an address or location"
                placeholderTextColor="#A0AEC0"
                value={searchQuery}
                onChangeText={(text) => { setSearchQuery(text); handleSearch(text); }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {showSearchResults && searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <ScrollView style={styles.searchResultsList}>
                  {searchResults.map((result) => renderSearchItem(result))}
                </ScrollView>
              </View>
            )}
          </View>

          {isFetchingLocation && (
            <View style={styles.locationStatus}>
              <ActivityIndicator size="small" color="#3182CE" />
              <Text style={styles.locationStatusText}>{locationRetryCount > 0 ? `Getting location (attempt ${locationRetryCount + 1})...` : 'Getting your location...'}</Text>
            </View>
          )}

          <View style={styles.mapContainer}>
            <MapView
              ref={(r) => (mapRef.current = r)}
              style={styles.map}
              initialRegion={region}
              onRegionChange={handleRegionChange}
              onRegionChangeComplete={handleRegionChangeComplete}
              showsUserLocation={true}
              showsMyLocationButton={false}
              provider={PROVIDER_GOOGLE}
              toolbarEnabled={false}
            />

            <View style={styles.markerFixed} pointerEvents="none">
              {markerImage ? (
                <Image source={markerImage as any} style={styles.markerImage} />
              ) : (
                <View style={styles.marker}>
                  <View style={styles.markerInner} />
                </View>
              )}
            </View>

            {pointerCoords && (
              <View style={styles.pointerPreview}>
                <Text style={{ fontSize: 12 }}>Lat: {pointerCoords.latitude.toFixed(6)}</Text>
                <Text style={{ fontSize: 12 }}>Lng: {pointerCoords.longitude.toFixed(6)}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
              <Icon name="crosshairs-gps" size={22} color="#3182CE" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.usePointerButton} onPress={usePointerLocation}>
              <Text style={styles.usePointerText}>Use pointer location</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Clinic Name*</Text>
        <TextInput style={[styles.input, errors.clinicName && styles.inputError]} placeholder="Enter clinic name" value={form.clinicName} onChangeText={(text) => handleChange('clinicName', text)} placeholderTextColor="gray" />
        {errors.clinicName && <Text style={styles.errorText}>{errors.clinicName}</Text>}

        <Text style={styles.label}>Address *</Text>
        <TextInput style={[styles.input, styles.textarea, errors.address && styles.inputError]} placeholder="Enter clinic address" multiline numberOfLines={3} value={form.address} onChangeText={(text) => handleChange('address', text)} placeholderTextColor="gray" />
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>City *</Text>
            <TextInput style={[styles.input, errors.city && styles.inputError]} placeholder="Enter city" value={form.city} onChangeText={(text) => handleChange('city', text)} placeholderTextColor="gray" />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>State *</Text>
            <TextInput style={[styles.input, errors.state && styles.inputError]} placeholder="Enter state" value={form.state} onChangeText={(text) => handleChange('state', text)} placeholderTextColor="gray" />
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>
        </View>

        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput style={[styles.input, errors.mobile && styles.inputError]} placeholder="Enter 10-digit mobile number" keyboardType="phone-pad" value={form.mobile} onChangeText={(text) => {
          const digitsOnly = text.replace(/\D/g, '');
          if (digitsOnly.length === 1 && !/[6-9]/.test(digitsOnly[0])) {
            Toast.show({ type: 'error', text1: 'Invalid Mobile Number', text2: 'Enter a valid mobile number', position: 'top', visibilityTime: 3000 });
            return;
          }
          handleChange('mobile', digitsOnly);
        }} maxLength={10} placeholderTextColor="gray" />
        {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}

        <Text style={styles.label}>Email</Text>
        <TextInput style={[styles.input, errors.email && styles.inputError]} placeholder="Enter email address" keyboardType="email-address" value={form.email} onChangeText={(text) => handleChange('email', text)} placeholderTextColor="gray" />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <Text style={styles.label}>Pin Code</Text>
        <TextInput style={[styles.input, errors.pincode && styles.inputError]} placeholder="Enter pincode" keyboardType="numeric" value={form.pincode} onChangeText={(text) => handleChange('pincode', text)} maxLength={6} placeholderTextColor="gray" />
        {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Latitude *</Text>
            <TextInput style={[styles.input, errors.latitude && styles.inputError]} placeholder="Latitude" keyboardType="decimal-pad" value={form.latitude} editable={false} placeholderTextColor="gray" />
            {errors.latitude && <Text style={styles.errorText}>{errors.latitude}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Longitude *</Text>
            <TextInput style={[styles.input, errors.longitude && styles.inputError]} placeholder="Longitude" keyboardType="decimal-pad" value={form.longitude} editable={false} placeholderTextColor="gray" />
            {errors.longitude && <Text style={styles.errorText}>{errors.longitude}</Text>}
          </View>
        </View>

        {renderFileUpload('header', 'Clinic Header Image', headerPreview)}
        {renderFileUpload('signature', 'Digital Signature (Optional)', signaturePreview)}
        {renderFileUpload('clinicQR', 'Clinic QR Code (Optional)', clinicQRPreview)}

        <Text style={styles.sectionTitle}>Pharmacy Details (Optional)</Text>

        <Text style={styles.label}>Pharmacy Name</Text>
        <TextInput style={styles.input} placeholder="Enter pharmacy name" value={form.pharmacyName} onChangeText={(text) => handleChange('pharmacyName', text)} placeholderTextColor="gray" />

        <Text style={styles.label}>Pharmacy Registration Number</Text>
        <TextInput style={styles.input} placeholder="Enter registration number" value={form.pharmacyRegNum} onChangeText={(text) => handleChange('pharmacyRegNum', text)} placeholderTextColor="gray" />

        <Text style={styles.label}>Pharmacy GST Number</Text>
        <TextInput style={styles.input} placeholder="Enter GST number" value={form.pharmacyGST} onChangeText={(text) => handleChange('pharmacyGST', text)} placeholderTextColor="gray" />

        <Text style={styles.label}>Pharmacy PAN</Text>
        <TextInput style={styles.input} placeholder="Enter PAN number" value={form.pharmacyPAN} onChangeText={(text) => handleChange('pharmacyPAN', text)} placeholderTextColor="gray" />

               <Text style={styles.label}>Pharmacy Address</Text>
        <TextInput 
          style={[styles.input, styles.textarea, errors.pharmacyAddress && styles.inputError]} 
          placeholder="Enter pharmacy address" 
          multiline 
          numberOfLines={3} 
          value={form.pharmacyAddress} 
          onChangeText={(text) => handleChange('pharmacyAddress', text)} 
          placeholderTextColor="gray" 
        />
        {errors.pharmacyAddress && <Text style={styles.errorText}>{errors.pharmacyAddress}</Text>}

        {renderFileUpload('pharmacyHeader', 'Pharmacy Header Image (Optional)', pharmacyHeaderPreview)}
        {renderFileUpload('pharmacyQR', 'Pharmacy QR Code (Optional)', pharmacyQRPreview)}

        <Text style={styles.sectionTitle}>Lab Details (Optional)</Text>

        <Text style={styles.label}>Lab Name</Text>
        <TextInput style={styles.input} placeholder="Enter lab name" value={form.labName} onChangeText={(text) => handleChange('labName', text)} placeholderTextColor="gray" />

        <Text style={styles.label}>Lab Registration Number</Text>
        <TextInput style={styles.input} placeholder="Enter registration number" value={form.labRegNum} onChangeText={(text) => handleChange('labRegNum', text)} placeholderTextColor="gray" />

        <Text style={styles.label}>Lab GST Number</Text>
        <TextInput style={styles.input} placeholder="Enter GST number" value={form.labGST} onChangeText={(text) => handleChange('labGST', text)} placeholderTextColor="gray" />

        <Text style={styles.label}>Lab PAN</Text>
        <TextInput style={styles.input} placeholder="Enter PAN number" value={form.labPAN} onChangeText={(text) => handleChange('labPAN', text)} placeholderTextColor="gray" />

        <Text style={styles.label}>Lab Address</Text>
        <TextInput 
          style={[styles.input, styles.textarea, errors.labAddress && styles.inputError]} 
          placeholder="Enter lab address" 
          multiline 
          numberOfLines={3} 
          value={form.labAddress} 
          onChangeText={(text) => handleChange('labAddress', text)} 
          placeholderTextColor="gray" 
        />
        {errors.labAddress && <Text style={styles.errorText}>{errors.labAddress}</Text>}

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

      <CameraModal visible={cameraModalVisible} onClose={() => {
        setCameraModalVisible(false);
        setActiveFileTypeForCamera(null);
      }} device={device} />
    </KeyboardAvoidingView>
  );
};

export default AddClinicForm;

const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F0FDF4', padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 12, color: 'black' },
  label: { fontSize: 14, color: '#161b20ff', marginTop: 8, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: '#D1D5DB', color: 'black' },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: -8, marginBottom: 12 },
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  column: { flex: 1 },
  inputGroup: { marginBottom: 12 },
  uploadBox: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center', height: 100 },
  headerUploadBox: { height: PREVIEW_HEIGHT + 16, padding: 8, justifyContent: 'center' },
  uploadPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  uploadText: { marginTop: 8, color: '#6B7280', fontSize: 12 },
  previewImage: { width: 80, height: 80, borderRadius: 4 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 20, marginBottom: 50 },
  cancelBtn: { flex: 1, backgroundColor: '#D1D5DB', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: '#3B82F6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '600' },
  mapSection: { marginBottom: 20 },
  searchContainer: { position: 'relative', zIndex: 50, marginBottom: 10 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#2D3748' },
  searchResultsContainer: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 4, maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 6, zIndex: 100 },
  searchResultsList: { flex: 1 },
  searchItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchItemMainText: { fontSize: 14, fontWeight: '500', color: '#2D3748' },
  searchItemSecondaryText: { fontSize: 12, color: '#718096', marginTop: 2 },
  mapContainer: { height: 300, borderRadius: 8, overflow: 'hidden', position: 'relative', backgroundColor: '#E6EEF8' },
  map: { ...StyleSheet.absoluteFillObject },
  markerFixed: { position: 'absolute', left: '50%', top: '50%', marginLeft: -24, marginTop: -48, zIndex: 15, pointerEvents: 'none', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  markerImage: { width: 60, height: 60, resizeMode: 'contain' },
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
  myLocationButton: { position: 'absolute', bottom: 10, right: 10, width: 44, height: 44, backgroundColor: '#FFFFFF', borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, zIndex: 20 },
  usePointerButton: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', zIndex: 20 },
  usePointerText: { color: '#1E40AF', fontWeight: '600' },
  locationStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#EBF8FF', padding: 8, borderRadius: 4 },
  locationStatusText: { marginLeft: 8, fontSize: 12, color: '#3182CE' },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loaderText: { color: '#fff', fontSize: width * 0.04, marginTop: height * 0.02 },
  pointerPreview: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 6, zIndex: 21 },

  /* camera modal & overlay */
  cameraModalContainer: { flex: 1, backgroundColor: '#000' },
  overlayMaskContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 30, pointerEvents: 'none' },
  maskFlex: { flex: 1, width: '100%' },
  overlayCenterRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sideMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBox: { borderColor: '#fff', borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  overlayBorderTop: { position: 'absolute', top: -26, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  overlayText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  cameraControls: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 24, zIndex: 40 },
  cameraCancel: { padding: 10 },
  cameraGallery: { padding: 10 },
  cameraCapture: { padding: 10 },
  captureCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', opacity: 0.9 },

  /* bypass modal styles */
  bypassModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bypassModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  bypassModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  bypassModalText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  bypassModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bypassModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bypassModalCancel: {
    backgroundColor: '#F3F4F6',
  },
  bypassModalConfirm: {
    backgroundColor: '#3B82F6',
  },
  bypassModalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  bypassModalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
