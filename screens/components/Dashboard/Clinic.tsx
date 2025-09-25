// ClinicManagementScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  PermissionsAndroid,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthFetch, AuthPost, UploadFiles, UpdateFiles, AuthPut } from '../../auth/auth';
import Toast from 'react-native-toast-message';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useSelector } from 'react-redux';
import { Camera, useCameraDevice, CameraPermissionStatus } from 'react-native-vision-camera';
import PhotoManipulator from 'react-native-photo-manipulator';

// constants
const { width, height } = Dimensions.get('window');

interface Clinic {
  endTime: string;
  startTime: string;
  id: string;
  name: string;
  type: string;
  city: string;
  mobile: string;
  status: 'Active' | 'Pending' | 'Inactive';
  Avatar?: string;
  addressId?: string;
  address?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  headerImage?: string;
  digitalSignature?: string;
  pharmacyName?: string;
  pharmacyRegNum?: string;
  pharmacyGST?: string;
  pharmacyPAN?: string;
  pharmacyAddress?: string;
  pharmacyHeaderImage?: string;
  labName?: string;
  labRegNum?: string;
  labGST?: string;
  labPAN?: string;
  labAddress?: string;
  labHeaderImage?: string;
  clinicQrCode?: string;
  pharmacyQrCode?: string;
  labQrCode?: string;
}

// design helpers
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Active':
      return { backgroundColor: '#DCFCE7', color: '#16A34A' };
    case 'Pending':
      return { backgroundColor: '#FEF9C3', color: '#D97706' };
    case 'Inactive':
      return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    default:
      return { backgroundColor: '#E5E7EB', color: '#6B7280' };
  }
};

// Target crop sizes
const HEADER_TARGET_WIDTH = 1200;
const HEADER_TARGET_HEIGHT = 500;
const OTHER_TARGET_SIZE = 1000; // square-ish for QR/signature previews

const FOOTER_HEIGHT = 72; // approximate height of modal footer area (used to keep footer visible when keyboard opens)

const ClinicManagementScreen = () => {
  const navigation = useNavigation<any>();
  const [clinics, setClinic] = useState<Clinic[]>([]);
  const [totalClinics, setTotalClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [imageEditModalVisible, setImageEditModalVisible] = useState(false);
  const [headerModalVisible, setHeaderModalVisible] = useState(false);
  const [pharmacyModalVisible, setPharmacyModalVisible] = useState(false);
  const [labModalVisible, setLabModalVisible] = useState(false);
  const [imagePreviewModalVisible, setImagePreviewModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [headerFile, setHeaderFile] = useState<any>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<any>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [pharmacyHeaderFile, setPharmacyHeaderFile] = useState<any>(null);
  const [pharmacyHeaderPreview, setPharmacyHeaderPreview] = useState<string | null>(null);
  const [labHeaderFile, setLabHeaderFile] = useState<any>(null);
  const [labHeaderPreview, setLabHeaderPreview] = useState<string | null>(null);
  const [clinicQrFile, setClinicQrFile] = useState<any>(null);
  const [clinicQrPreview, setClinicQrPreview] = useState<string | null>(null);
  const [pharmacyQrFile, setPharmacyQrFile] = useState<any>(null);
  const [pharmacyQrPreview, setPharmacyQrPreview] = useState<string | null>(null);
  const [labQrFile, setLabQrFile] = useState<any>(null);
  const [labQrPreview, setLabQrPreview] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);

  // Vision camera states
  const cameraRef = useRef<Camera | null>(null);
  const device = useCameraDevice('back');
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus | 'unknown'>('unknown');
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [activeFileTypeForCamera, setActiveFileTypeForCamera] = useState<
    'header' | 'pharmacyHeader' | 'labHeader' | 'signature' | 'clinicQR' | 'pharmacyQR' | 'labQR' | null
  >(null);

  const userId = useSelector((state: any) => state.currentUserId);
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const isPhysiotherapist = currentuserDetails?.specialization?.name === 'Physiotherapist';
  const doctorId = currentuserDetails.role === 'doctor' ? currentuserDetails.userId : currentuserDetails.createdBy;

  const [pharmacyViewModalVisible, setPharmacyViewModalVisible] = useState(false);
  const [labViewModalVisible, setLabViewModalVisible] = useState(false);

  const [form, setForm] = useState({
    id: '',
    name: '',
    type: 'General',
    city: 'unknown',
    mobile: '',
    status: 'Active' as Clinic['status'],
    Avatar: 'https://i.pravatar.cc/150?img=12',
    startTime: '',
    endTime: '',
    addressId: '',
    address: '',
    state: '',
    pincode: '',
    country: 'India',
    latitude: '56.1304',
    longitude: '-106.3468',
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

  type FormKeys = keyof typeof form;
  const FIELD_CONFIGS: Array<{
    key: FormKeys;
    label: string;
    editableInEdit?: boolean;
    multiline?: boolean;
    keyboardType?:
    | 'default'
    | 'phone-pad'
    | 'numeric'
    | 'email-address'
    | 'number-pad'
    | 'decimal-pad';
    showInView?: boolean;
  }> = [
      { key: 'name', label: 'Clinic Name' },
      { key: 'status', label: 'Status', editableInEdit: false },
      { key: 'type', label: 'Clinic Type' },
      { key: 'mobile', label: 'Mobile', keyboardType: 'phone-pad' },
      { key: 'address', label: 'Address', multiline: true },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pincode', label: 'Pincode', keyboardType: 'number-pad' },
      { key: 'country', label: 'Country' },
      { key: 'pharmacyName', label: 'Pharmacy Name' },
      { key: 'pharmacyRegNum', label: 'Pharmacy Registration Number' },
      { key: 'pharmacyGST', label: 'Pharmacy GST Number' },
      { key: 'pharmacyPAN', label: 'Pharmacy PAN Number' },
      { key: 'pharmacyAddress', label: 'Pharmacy Address', multiline: true },
      { key: 'labName', label: 'Lab Name' },
      { key: 'labRegNum', label: 'Lab Registration Number' },
      { key: 'labGST', label: 'Lab GST Number' },
      { key: 'labPAN', label: 'Lab PAN Number' },
      { key: 'labAddress', label: 'Lab Address', multiline: true },
    ];

  // keyboard height tracking for modals
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: any) => {
      const h = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(h);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const ensureFileUri = (p: string) => (String(p).startsWith('file://') ? String(p) : `file://${String(p)}`);
  const cropImageUsingDims = async (
    srcUri: string,
    srcW: number | null,
    srcH: number | null,
    targetW: number,
    targetH: number
  ) => {
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

  const getTargetCrop = (type: string) => {
    if (type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') {
      return { targetWidth: HEADER_TARGET_WIDTH, targetHeight: HEADER_TARGET_HEIGHT };
    }
    return { targetWidth: OTHER_TARGET_SIZE, targetHeight: OTHER_TARGET_SIZE };
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
      const imgUri = String(rawPath).startsWith('file://') ? String(rawPath) : `file://${String(rawPath)}`;
      await new Promise((r) => setTimeout(r, 120));
      const { targetWidth, targetHeight } = getTargetCrop(activeFileTypeForCamera);
      let finalUri = imgUri;
      try {
        finalUri = await cropImageUsingDims(imgUri, providedWidth, providedHeight, targetWidth, targetHeight);
      } catch (e) {
        finalUri = imgUri;
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
        Alert.alert('Image Error', 'Unable to load the captured image. Please try again or pick a different image.');
      }

      const file = { uri: finalUri, name: `${activeFileTypeForCamera}_camera.jpg`, type: 'image/jpeg' };
      if (activeFileTypeForCamera === 'header') {
        setHeaderFile(file);
        setHeaderPreview(finalUri);
      } else if (activeFileTypeForCamera === 'pharmacyHeader') {
        setPharmacyHeaderFile(file);
        setPharmacyHeaderPreview(finalUri);
      } else if (activeFileTypeForCamera === 'labHeader') {
        setLabHeaderFile(file);
        setLabHeaderPreview(finalUri);
      } else if (activeFileTypeForCamera === 'signature') {
        setSignatureFile(file);
        setSignaturePreview(finalUri);
      } else if (activeFileTypeForCamera === 'clinicQR') {
        setClinicQrFile(file);
        setClinicQrPreview(finalUri);
      } else if (activeFileTypeForCamera === 'pharmacyQR') {
        setPharmacyQrFile(file);
        setPharmacyQrPreview(finalUri);
      } else if (activeFileTypeForCamera === 'labQR') {
        setLabQrFile(file);
        setLabQrPreview(finalUri);
      }

      setCameraModalVisible(false);
      setActiveFileTypeForCamera(null);
    } catch (err: any) {
      Alert.alert('Capture Error', err?.message || String(err));
      setCameraModalVisible(false);
      setActiveFileTypeForCamera(null);
    }
  };
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
              { text: 'Open Settings', onPress: () => PermissionsAndroid.openSettings && PermissionsAndroid.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          setCameraPermission('denied');
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        }
        return false;
      } else {
        // iOS
        const permission = await Camera.getCameraPermissionStatus();
        setCameraPermission(permission);
        if (permission === 'authorized') return true;
        const asked = await Camera.requestCameraPermission();
        setCameraPermission(asked);
        if (asked === 'authorized') return true;
        Alert.alert('Permission Denied', 'Camera permission is required to take photos. Please enable it in Settings.');
        return false;
      }
    } catch (err: any) {
      Alert.alert('Camera Permission Error', err?.message || 'Unable to request camera permission.');
      setCameraPermission('denied');
      return false;
    }
  };
  const CameraModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
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

    useEffect(() => {
      (async () => {
        try {
          if (Platform.OS === 'android') {
            const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
            if (!has) {
              const got = await requestCameraPermission();
              if (!got) {
                onClose();
              }
            } else {
              setCameraPermission('authorized');
            }
          } else {
            const p = await Camera.getCameraPermissionStatus();
            setCameraPermission(p);
            if (p !== 'authorized') {
              const asked = await Camera.requestCameraPermission();
              setCameraPermission(asked);
              if (asked !== 'authorized') onClose();
            }
          }
        } catch (err) {
          Alert.alert('Camera Permission Error', err?.message || String(err));
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.cameraModalContainer}>
          <View style={styles.overlayMaskContainer} pointerEvents="none">
            <View style={styles.maskFlex} />
            <View style={[styles.overlayCenterRow, { height: overlayHeight }]}>
              <View style={styles.sideMask} />
              <View style={[styles.overlayBox, { width: overlayWidth, height: overlayHeight }]}>
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
                    const result = await launchCamera({
                      mediaType: 'photo',
                      includeBase64: false,
                      maxWidth: fbW,
                      maxHeight: fbH,
                      quality: 0.9,
                    } as any);

                    if ((result as any).didCancel) {
                      return;
                    }
                    if ((result as any).errorCode) {
                      Alert.alert('Camera Error', (result as any).errorMessage || 'Camera failed.');
                      return;
                    }
                    if (result.assets && result.assets.length > 0) {
                      const asset = result.assets[0];
                      const rawUri = asset.uri || asset.path || null;
                      if (!rawUri) {
                        Alert.alert('Camera Error', 'Captured image not available.');
                        return;
                      }
                      // crop using PhotoManipulator
                      const finalUri = await cropImageUsingDims(String(rawUri).startsWith('file://') ? String(rawUri) : `file://${String(rawUri)}`, asset.width || null, asset.height || null, fbW, fbH);
                      await onVisionCameraCapture({ path: finalUri, width: asset.width, height: asset.height });
                      return;
                    }
                  }

                  const path = (photo as any)?.path || (photo as any)?.uri || photo;
                  await onVisionCameraCapture(photo || path);
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
              if (!activeFileTypeForCamera) {
                onClose();
                return;
              }
              try {
                const { targetWidth: gbW, targetHeight: gbH } = getTargetCrop(activeFileTypeForCamera);
                const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: false } as any);
                if (result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  const rawUri = asset.uri || asset.path || null;
                  if (!rawUri) return;
                  const finalUri = await cropImageUsingDims(String(rawUri).startsWith('file://') ? String(rawUri) : `file://${String(rawUri)}`, asset.width || null, asset.height || null, gbW, gbH);
                  // assign
                  await onVisionCameraCapture({ path: finalUri, width: asset.width, height: asset.height });
                }
              } catch (err) {
                Alert.alert('Gallery Error', err?.message || 'Failed to pick from gallery.');
              } finally {
                setActiveFileTypeForCamera(null);
                onClose();
              }
            }}>
              <Text style={{ color: '#fff' }}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // -------------------------
  // handleFileChange: use vision camera for header types (unchanged)
  // -------------------------
  const handleFileChange = async (type: 'header' | 'signature' | 'pharmacyHeader' | 'labHeader' | 'clinicQR' | 'pharmacyQR' | 'labQR') => {
    try {
      const title =
        type === 'header' ? 'Header' :
          type === 'signature' ? 'Signature' :
            type === 'pharmacyHeader' ? 'Pharmacy Header' :
              type === 'labHeader' ? 'Lab Header' :
                type === 'clinicQR' ? 'Clinic QR' :
                  type === 'pharmacyQR' ? 'Pharmacy QR' : 'Lab QR';

      Alert.alert(`Upload ${title}`, 'Choose an option', [
        {
          text: 'Camera',
          onPress: async () => {
            // For banner/header types prefer vision camera with overlay cropping
            if (type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') {
              const has = await requestCameraPermission();
              if (!has) return;

              setActiveFileTypeForCamera(
                type === 'header' ? 'header' : type === 'pharmacyHeader' ? 'pharmacyHeader' : 'labHeader'
              );
              setCameraModalVisible(true);
              return;
            }

            // Non-header: use launchCamera and simple square crop
            try {
              const result = await launchCamera({ mediaType: 'photo', includeBase64: false, maxWidth: OTHER_TARGET_SIZE, maxHeight: OTHER_TARGET_SIZE, quality: 0.9 } as any);
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const rawUri = asset.uri || asset.path || null;
                if (!rawUri) {
                  Alert.alert('Camera Error', 'Captured image not available.');
                  return;
                }
                // crop to square for non-header
                const finalUri = await cropImageUsingDims(String(rawUri).startsWith('file://') ? String(rawUri) : `file://${String(rawUri)}`, asset.width || null, asset.height || null, OTHER_TARGET_SIZE, OTHER_TARGET_SIZE);

                const file = { uri: finalUri, name: `${type}_camera.jpg`, type: asset.type || 'image/jpeg' };

                if (type === 'signature') {
                  setSignatureFile(file);
                  setSignaturePreview(finalUri);
                } else if (type === 'clinicQR') {
                  setClinicQrFile(file);
                  setClinicQrPreview(finalUri);
                } else if (type === 'pharmacyQR') {
                  setPharmacyQrFile(file);
                  setPharmacyQrPreview(finalUri);
                } else if (type === 'labQR') {
                  setLabQrFile(file);
                  setLabQrPreview(finalUri);
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Camera access failed.');
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: false } as any);
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const rawUri = asset.uri || asset.path || null;
                if (!rawUri) return;

                if (type === 'header' || type === 'pharmacyHeader' || type === 'labHeader') {
                  const { targetWidth, targetHeight } = getTargetCrop(type);
                  const finalUri = await cropImageUsingDims(String(rawUri).startsWith('file://') ? String(rawUri) : `file://${String(rawUri)}`, asset.width || null, asset.height || null, targetWidth, targetHeight);
                  const file = { uri: finalUri, name: `${type}_gallery.jpg`, type: asset.type || 'image/jpeg' };
                  if (type === 'header') {
                    setHeaderFile(file); setHeaderPreview(finalUri);
                  } else if (type === 'pharmacyHeader') {
                    setPharmacyHeaderFile(file); setPharmacyHeaderPreview(finalUri);
                  } else if (type === 'labHeader') {
                    setLabHeaderFile(file); setLabHeaderPreview(finalUri);
                  }
                } else {
                  // non-header -> square crop
                  const finalUri = await cropImageUsingDims(String(rawUri).startsWith('file://') ? String(rawUri) : `file://${String(rawUri)}`, asset.width || null, asset.height || null, OTHER_TARGET_SIZE, OTHER_TARGET_SIZE);
                  const file = { uri: finalUri, name: `${type}_gallery.jpg`, type: asset.type || 'image/jpeg' };
                  if (type === 'signature') {
                    setSignatureFile(file); setSignaturePreview(finalUri);
                  } else if (type === 'clinicQR') {
                    setClinicQrFile(file); setClinicQrPreview(finalUri);
                  } else if (type === 'pharmacyQR') {
                    setPharmacyQrFile(file); setPharmacyQrPreview(finalUri);
                  } else if (type === 'labQR') {
                    setLabQrFile(file); setLabQrPreview(finalUri);
                  }
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Gallery access failed.');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to pick file. Please try again.');
    }
  };

  const fetchClinicQRCode = async (clinicId: string, qrType: 'clinic' | 'pharmacy' | 'lab') => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const clinic = totalClinics.find(c => c.id === clinicId || c.addressId === clinicId);
      const addressId = clinic?.addressId || clinicId;

      const response = await AuthFetch(`users/getClinicsQRCode/${addressId}?userId=${doctorId}`, token);
      if (response?.status === 'success' && response.data?.data) {
        let qrCodeUrl = '';

        switch (qrType) {
          case 'clinic':
            qrCodeUrl = response.data.data.clinicQrCode;
            setPreviewTitle('Clinic QR Code');
            break;
          case 'pharmacy':
            qrCodeUrl = response.data.data.pharmacyQrCode;
            setPreviewTitle('Pharmacy QR Code');
            break;
          case 'lab':
            qrCodeUrl = response.data.data.labQrCode;
            setPreviewTitle('Lab QR Code');
            break;
        }
        const toUriString = (maybe: any): string | null => {
          if (!maybe) return null;
          if (typeof maybe === 'string') {
            const s = maybe.trim();
            if (!s) return null;
            if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('file://') || s.startsWith('content://') || s.startsWith('ph://')) return s;
            if (s.startsWith('/')) return `file://${s}`;
            return s;
          }
          if (typeof maybe === 'object') {
            const candidate = maybe.uri || maybe.path || maybe.fileCopyUri || maybe.filePath || maybe.contentUri;
            if (!candidate) return null;
            const s = String(candidate).trim();
            if (!s) return null;
            if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('file://') || s.startsWith('content://') || s.startsWith('ph://')) return s;
            if (s.startsWith('/')) return `file://${s}`;
            return s;
          }
          return null;
        };
        const normalizedUrl = toUriString(qrCodeUrl);
        if (normalizedUrl) {
          setQrCodeImage(normalizedUrl);
          setQrModalVisible(true);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'QR code not available',
            position: 'top',
            visibilityTime: 3000
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response?.message || 'Failed to fetch QR code',
          position: 'top',
          visibilityTime: 3000
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to fetch QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openPharmacyViewModal = async (clinic: Clinic) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      const response = await AuthFetch(`users/getPharmacyByClinicId/${clinic.addressId}`, token);

      if (response?.status === 'success' && response.data?.data) {
        let pharmacyDetails = response.data.data;

        if (pharmacyDetails) {
          const qrResponse = await AuthFetch(`users/getClinicsQRCode/${clinic.addressId}?userId=${doctorId}`, token);

          if (qrResponse?.status === 'success' && qrResponse.data?.data) {
            pharmacyDetails = { ...pharmacyDetails, pharmacyQrCode: qrResponse.data.data.pharmacyQrCode || null };
          }
        }

        setSelectedClinic(clinic);
        setForm((prev) => ({
          ...prev,
          pharmacyName: pharmacyDetails.pharmacyName || '',
          pharmacyRegNum: pharmacyDetails.pharmacyRegNum || pharmacyDetails.pharmacyRegistrationNo || '',
          pharmacyGST: pharmacyDetails.pharmacyGST || pharmacyDetails.pharmacyGst || '',
          pharmacyPAN: pharmacyDetails.pharmacyPAN || pharmacyDetails.pharmacyPan || '',
          pharmacyAddress: pharmacyDetails.pharmacyAddress || '',
        }));

        setPharmacyHeaderPreview(pharmacyDetails.pharmacyHeaderImage || pharmacyDetails.pharmacyHeader || null);
        setPharmacyQrPreview(pharmacyDetails.pharmacyQrCode || null);
        setPharmacyViewModalVisible(true);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch pharmacy details', position: 'top', visibilityTime: 3000 });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to fetch pharmacy details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openLabViewModal = async (clinic: Clinic) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      const response = await AuthFetch(`users/getLabByClinicId/${clinic.addressId}`, token);

      if (response?.status === 'success' && response.data?.data) {
        let labDetails = response.data.data;

        if (labDetails) {
          const qrResponse = await AuthFetch(`users/getClinicsQRCode/${clinic.addressId}?userId=${doctorId}`, token);

          if (qrResponse?.status === 'success' && qrResponse.data?.data) {
            labDetails = { ...labDetails, labQrCode: qrResponse.data.data.labQrCode || null };
          }
        }

        setSelectedClinic(clinic);
        setForm((prev) => ({
          ...prev,
          labName: labDetails.labName || '',
          labRegNum: labDetails.labRegNum || labDetails.labRegistrationNo || '',
          labGST: labDetails.labGST || labDetails.labGst || '',
          labPAN: labDetails.labPAN || labDetails.labPan || '',
          labAddress: labDetails.labAddress || '',
        }));

        setLabHeaderPreview(labDetails.labHeaderImage || labDetails.labHeader || null);
        setLabQrPreview(labDetails.labQrCode || null);
        setLabViewModalVisible(true);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch lab details', position: 'top', visibilityTime: 3000 });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to fetch lab details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const normalizeClinicData = (appt: any): Clinic => {
    return {
      id: appt.addressId || appt.appointmentId || '',
      addressId: appt.addressId || '',
      address: appt.address || '',
      state: appt.state || '',
      country: appt.country || '',
      pincode: appt.pincode || '',
      latitude: appt.latitude || '',
      longitude: appt.longitude || '',
      name: appt.clinicName || '',
      type: appt.appointmentType || 'General',
      city: appt.city || 'unknown',
      mobile: appt.mobile || '',
      status: 'Active',
      Avatar: 'https://i.pravatar.cc/150?img=12',
      startTime: appt.startTime || '',
      endTime: appt.endTime || '',
      headerImage: appt.headerImage || '',
      digitalSignature: appt.digitalSignature || '',
      pharmacyName: appt.pharmacyName || '',
      pharmacyRegNum: appt.pharmacyRegNum || appt.pharmacyRegistrationNo || '',
      pharmacyGST: appt.pharmacyGST || appt.pharmacyGst || '',
      pharmacyPAN: appt.pharmacyPAN || appt.pharmacyPan || '',
      pharmacyAddress: appt.pharmacyAddress || '',
      pharmacyHeaderImage: appt.pharmacyHeaderImage || '',
      labName: appt.labName || '',
      labRegNum: appt.labRegNum || appt.labRegistrationNo || '',
      labGST: appt.labGST || appt.labGst || '',
      labPAN: appt.labPAN || appt.labPan || '',
      labAddress: appt.labAddress || '',
      labHeaderImage: appt.labHeaderImage || '',
      clinicQrCode: appt.clinicQrCode || '',
      pharmacyQrCode: appt.pharmacyQrCode || '',
      labQrCode: appt.labQrCode || '',
    };
  };

  const fetchClinics = async () => {
    try {
      setInitialLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await AuthFetch(`users/getClinicAddress?doctorId=${doctorId}`, token);

      let data: any[] | undefined;
      if ('data' in res && Array.isArray(res.data?.data)) {
        data = res.data?.data?.reverse();
      } else {
        data = undefined;
      }

      if (data && Array.isArray(data)) {
        const formattedClinics: Clinic[] = data
          .filter((appt: any) => appt.status === 'Active')
          .map(normalizeClinicData);

        setTotalClinics(formattedClinics);
        setClinic(formattedClinics);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to fetch appointments. Please try again.');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  useEffect(() => {
    if (!modalVisible && !imageEditModalVisible) {
      fetchClinics();
    }
  }, [modalVisible, imageEditModalVisible]);

  useEffect(() => {
    if (search) {
      const q = search.toLowerCase();
      const filteredClinics = totalClinics.filter(
        (clinic) =>
          (clinic.name || '').toLowerCase().includes(q) ||
          (clinic.id || '').toLowerCase().includes(q)
      );
      setClinic(filteredClinics);
    } else {
      setClinic(totalClinics);
    }
  }, [search, totalClinics]);

  const openModal = (type: 'view' | 'edit' | 'delete', clinic: Clinic) => {
    setForm({
      id: clinic.id,
      name: clinic.name,
      type: clinic.type || 'General',
      city: clinic.city || 'unknown',
      mobile: clinic.mobile || '',
      status: clinic.status || 'Active',
      Avatar: clinic.Avatar || 'https://i.pravatar.cc/150?img=12',
      startTime: clinic.startTime || '',
      endTime: clinic.endTime || '',
      addressId: clinic.addressId || '',
      address: clinic.address || '',
      state: clinic.state || '',
      country: clinic.country || '',
      pincode: clinic.pincode || '',
      latitude: clinic.latitude || '',
      longitude: clinic.longitude || '',
      pharmacyName: clinic.pharmacyName || '',
      pharmacyRegNum: clinic.pharmacyRegNum || '',
      pharmacyGST: clinic.pharmacyGST || '',
      pharmacyPAN: clinic.pharmacyPAN || '',
      pharmacyAddress: clinic.pharmacyAddress || '',
      labName: clinic.labName || '',
      labRegNum: clinic.labRegNum || '',
      labGST: clinic.labGST || '',
      labPAN: clinic.labPAN || '',
      labAddress: clinic.labAddress || '',
    });
    setHeaderPreview(clinic.headerImage || null);
    setSignaturePreview(clinic.digitalSignature || null);
    setClinicQrPreview(clinic.clinicQrCode || null);
    setPharmacyQrPreview(clinic.pharmacyQrCode || null);
    setLabQrPreview(clinic.labQrCode || null);
    setMode(type);
    setModalVisible(true);
  };

  const openImageEditModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setHeaderPreview(clinic.headerImage || null);
    setClinicQrPreview(clinic.clinicQrCode || null);
    setPharmacyHeaderPreview(clinic.pharmacyHeaderImage || null);
    setPharmacyQrPreview(clinic.pharmacyQrCode || null);
    setLabHeaderPreview(clinic.labHeaderImage || null);
    setLabQrPreview(clinic.labQrCode || null);
    setHeaderFile(null);
    setClinicQrFile(null);
    setPharmacyHeaderFile(null);
    setPharmacyQrFile(null);
    setLabHeaderFile(null);
    setLabQrFile(null);
    setSignatureFile(null);
    setSignaturePreview(clinic.digitalSignature || null);
    setImageEditModalVisible(true);
  };

  const formatTimeTo12Hour = (time24: string): string => {
    if (!time24) return '—';
    const [hours, minutes] = time24.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const closeModal = () => {
    setModalVisible(false);
    setImageEditModalVisible(false);
    setMode(null);
    setHeaderFile(null);
    setSignatureFile(null);
    setClinicQrFile(null);
    setPharmacyQrFile(null);
    setLabQrFile(null);
    setHeaderPreview(null);
    setSignaturePreview(null);
    setClinicQrPreview(null);
    setPharmacyQrPreview(null);
    setLabQrPreview(null);
    setKeyboardHeight(0);
  };

  const openHeaderModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setHeaderModalVisible(true);
    setHeaderFile(null);
    setHeaderPreview(clinic.headerImage || null);
    setSignatureFile(null);
    setSignaturePreview(clinic.digitalSignature || null);
  };

  const openPharmacyModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setForm({
      ...form,
      pharmacyName: clinic.pharmacyName || '',
      pharmacyRegNum: clinic.pharmacyRegNum || '',
      pharmacyGST: clinic.pharmacyGST || '',
      pharmacyPAN: clinic.pharmacyPAN || '',
      pharmacyAddress: clinic.pharmacyAddress || '',
      addressId: clinic.addressId || '',
    });
    setPharmacyHeaderPreview(clinic.pharmacyHeaderImage || null);
    setPharmacyQrPreview(clinic.pharmacyQrCode || null);
    setPharmacyModalVisible(true);
  };

  const openLabModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setForm({
      ...form,
      labName: clinic.labName || '',
      labRegNum: clinic.labRegNum || '',
      labGST: clinic.labGST || '',
      labPAN: clinic.labPAN || '',
      labAddress: clinic.labAddress || '',
      addressId: clinic.addressId || '',
    });
    setLabHeaderPreview(clinic.labHeaderImage || null);
    setLabQrPreview(clinic.labQrCode || null);
    setLabModalVisible(true);
  };

  const openImagePreview = (imageUrl: string, title: string) => {
    setSelectedImage(imageUrl);
    setPreviewTitle(title);
    setImagePreviewModalVisible(true);
  };
  const handleHeaderSubmit = async () => {
    if (!selectedClinic || !headerFile) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Header image is required.', position: 'top', visibilityTime: 3000 });
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', headerFile as any);
      if (signatureFile) formData.append('signature', signatureFile as any);
      formData.append('addressId', selectedClinic.addressId || '');

      const response = await UploadFiles('users/uploadClinicHeader', formData, token);
      if (response.status === 'success') {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Header uploaded successfully', position: 'top', visibilityTime: 3000 });
        setHeaderModalVisible(false);
        await fetchClinics();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: response.message || 'Failed to upload header', position: 'top', visibilityTime: 3000 });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to upload header. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleEditSubmit = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const requestData: any = {
        addressId: form.addressId,
        clinicName: form.name,
        mobile: form.mobile,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        latitude: form.latitude,
        longitude: form.longitude,
      };

      if (form.pharmacyName && form.pharmacyName.trim()) {
        requestData.pharmacyName = form.pharmacyName;
        requestData.pharmacyRegistrationNo = form.pharmacyRegNum;
        requestData.pharmacyGst = form.pharmacyGST;
        requestData.pharmacyPan = form.pharmacyPAN;
        requestData.pharmacyAddress = form.pharmacyAddress;
      }

      // Only include lab fields if lab name exists
      if (form.labName && form.labName.trim()) {
        requestData.labName = form.labName;
        requestData.labRegistrationNo = form.labRegNum;
        requestData.labGst = form.labGST;
        requestData.labPan = form.labPAN;
        requestData.labAddress = form.labAddress;
      }

      const res = await AuthPut('users/updateAddress', requestData, token);
      if (res?.data?.message?.includes('lab is already registered with another doctor')) {
        Alert.alert('Lab Already Registered', res.data.message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Link Lab',
            onPress: async () => {
              try {
                Toast.show({ type: 'info', text1: 'Linking lab...', position: 'top', visibilityTime: 2000 });

                // FIX: Add labId from the response to the bypass data
                const linkLabData = {
                  ...requestData,
                };

                const linkResponse = await AuthPut('users/updateAddress?bypassCheck=true', linkLabData, token);

                if (linkResponse?.status === 'success') {
                  Toast.show({ type: 'success', text1: 'Success', text2: 'Lab linked successfully', position: 'top', visibilityTime: 3000 });
                  await fetchClinics();
                  closeModal();
                } else {
                  throw new Error(linkResponse?.message || 'Failed to link lab');
                }
              } catch (error: any) {
                Toast.show({ type: 'error', text1: 'Error', text2: error?.response?.data?.message || error?.message || 'Failed to link lab', position: 'top', visibilityTime: 3000 });
                await fetchClinics();
              }
            },
          },
        ], { cancelable: true });
        setLoading(false);
        return;
      }

      if (res?.data?.message?.includes('pharmacy is already registered with another doctor')) {
        Alert.alert('Pharmacy Already Registered', res.data.message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Link Pharmacy',
            onPress: async () => {
              try {
                Toast.show({ type: 'info', text1: 'Linking pharmacy...', position: 'top', visibilityTime: 2000 });

                const linkPharmacyData = {
                  ...requestData,
                };
                const linkResponse = await AuthPut('users/updateAddress?bypassCheck=true', linkPharmacyData, token);

                if (linkResponse?.status === 'success') {
                  Toast.show({ type: 'success', text1: 'Success', text2: 'Pharmacy linked successfully', position: 'top', visibilityTime: 3000 });
                  await fetchClinics(); // FIX: Refresh clinics after linking
                  closeModal();
                } else {
                  throw new Error(linkResponse?.message || 'Failed to link pharmacy');
                }
              } catch (error: any) {
                Toast.show({ type: 'error', text1: 'Error', text2: error?.response?.data?.message || error?.message || 'Failed to link pharmacy', position: 'top', visibilityTime: 3000 });
                await fetchClinics(); // FIX: Refresh even on error
              }
            },
          },
        ], { cancelable: true });
        setLoading(false);
        return;
      }

      if (res?.status === 'success') {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Clinic updated successfully', position: 'top', visibilityTime: 3000 });
        await fetchClinics();
        closeModal();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res?.message || res?.data?.message || 'Failed to update clinic', position: 'top', visibilityTime: 3000 });
        await fetchClinics();
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to update clinic. Please try again.');
      await fetchClinics();
    } finally {
      setLoading(false);
    }
  };

  const handleImageEditSubmit = async () => {
    if (!selectedClinic) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('userId', userId || (await AsyncStorage.getItem('userId')) || '');
      formData.append('addressId', selectedClinic.addressId || '');
      formData.append('type', 'Clinic');

      if (headerFile) formData.append('file', headerFile as any);
      if (clinicQrFile) formData.append('clinicQR', clinicQrFile as any);
      if (pharmacyHeaderFile) formData.append('pharmacyHeader', pharmacyHeaderFile as any);
      if (pharmacyQrFile) formData.append('pharmacyQR', pharmacyQrFile as any);
      if (labHeaderFile) formData.append('labHeader', labHeaderFile as any);
      if (labQrFile) formData.append('labQR', labQrFile as any);
      // NEW: include signature when editing images
      if (signatureFile) formData.append('signature', signatureFile as any);

      const response = await UpdateFiles('users/updateImagesAddress', formData, token);
      if (response.status === 'success') {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Images updated successfully', position: 'top', visibilityTime: 3000 });
        setImageEditModalVisible(false);
        await fetchClinics();
      } else {
        Alert.alert('Error', response?.message?.message || 'Failed to update images');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePharmacySubmit = async () => {
    if (!selectedClinic) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userIdLocal = await AsyncStorage.getItem('userId');
      const formData = new FormData();
      formData.append('userId', userIdLocal || '');
      formData.append('addressId', selectedClinic.addressId || '');
      formData.append('pharmacyName', form.pharmacyName);
      formData.append('pharmacyRegistrationNo', form.pharmacyRegNum);
      formData.append('pharmacyGst', form.pharmacyGST);
      formData.append('pharmacyPan', form.pharmacyPAN);
      formData.append('pharmacyAddress', form.pharmacyAddress);

      if (pharmacyHeaderFile) formData.append('pharmacyHeader', pharmacyHeaderFile as any);
      if (pharmacyQrFile) formData.append('pharmacyQR', pharmacyQrFile as any);

      const response = await UploadFiles('users/addPharmacyToClinic', formData, token);
      if (response.status === 'success') {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Pharmacy details added successfully', position: 'top', visibilityTime: 3000 });
        setPharmacyModalVisible(false);
        await fetchClinics();
      } else {
        Alert.alert('Warning', response?.message?.message || 'Failed to add pharmacy details');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add pharmacy details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLabSubmit = async () => {
    if (!selectedClinic) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userIdLocal = await AsyncStorage.getItem('userId');
      const formData = new FormData();
      formData.append('userId', userIdLocal || '');
      formData.append('addressId', selectedClinic.addressId || '');
      formData.append('labName', form.labName);
      formData.append('labRegistrationNo', form.labRegNum);
      formData.append('labGst', form.labGST);
      formData.append('labPan', form.labPAN);
      formData.append('labAddress', form.labAddress);
      if (labHeaderFile) formData.append('labHeader', labHeaderFile as any);
      if (labQrFile) formData.append('labQR', labQrFile as any);

      const response = await UploadFiles('users/addLabToClinic', formData, token);
      if (response.status === 'success') {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Lab details added successfully', position: 'top', visibilityTime: 3000 });
        setLabModalVisible(false);
        await fetchClinics();
      } else {
        Alert.alert('Warning', response?.message?.message || 'Failed to add lab details');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add lab details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addressId: any) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthPost('users/deleteClinicAddress', { addressId }, token);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: response?.data?.message || response?.message || 'Failed to delete clinic',
        position: 'top',
        visibilityTime: 3000,
      });

      if ((response as any)?.status === 'success') {
        Toast.show({ type: 'success', text1: 'Success', text2: (response as any).data?.message || (response as any).message || 'Clinic deleted successfully', position: 'top', visibilityTime: 3000 });
        setClinic((prev) => prev.filter((c) => c.addressId !== addressId));
        closeModal();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: (response as any).data?.message || (response as any).message || 'Failed to delete clinic', position: 'top', visibilityTime: 3000 });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete clinic. Please try again.');
    }
  };

  // helper to compute modal maxHeight when keyboard is open
  const computeModalMaxHeight = (basePercent = 0.8) => {
    const reserved = Platform.OS === 'ios' ? 40 : 24;
    const available = Math.max(120, height - keyboardHeight - reserved);
    const desired = Math.floor(height * basePercent);
    return Math.min(desired, available);
  };

  return (
    <View style={styles.container}>
      {/* Camera modal for headers */}
      <CameraModal visible={cameraModalVisible} onClose={() => { setCameraModalVisible(false); setActiveFileTypeForCamera(null); }} />

      <View style={styles.headerContainer}>
        <Text style={styles.header}></Text>
        {!isPhysiotherapist && (
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddClinic')}>
            <Icon name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Clinic</Text>
          </TouchableOpacity>
        )}
      </View>


      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput placeholder="Search by Clinic Name" style={styles.searchInput} value={search} onChangeText={setSearch} placeholderTextColor="#6B7280" />
        </View>
      </View>

      {/* Pharmacy View Modal */}
      <Modal visible={pharmacyViewModalVisible} transparent animationType="fade" onRequestClose={() => setPharmacyViewModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.8) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pharmacy Details</Text>
                <TouchableOpacity onPress={() => setPharmacyViewModalVisible(false)} style={styles.closeButton}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: keyboardHeight + FOOTER_HEIGHT }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}><Text style={styles.label}>Pharmacy Name</Text><Text style={styles.value}>{form.pharmacyName || '—'}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Registration Number</Text><Text style={styles.value}>{form.pharmacyRegNum || '—'}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.label}>GST Number</Text><Text style={styles.value}>{form.pharmacyGST || '—'}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.label}>PAN Number</Text><Text style={styles.value}>{form.pharmacyPAN || '—'}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Pharmacy Address</Text><Text style={styles.value}>{form.pharmacyAddress || '—'}</Text></View>

                {pharmacyHeaderPreview && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Pharmacy Header Image</Text>
                    <TouchableOpacity onPress={() => openImagePreview(pharmacyHeaderPreview, 'Pharmacy Header')}>
                      <Image source={{ uri: pharmacyHeaderPreview }} style={styles.previewImage} />
                    </TouchableOpacity>
                  </View>
                )}

                {pharmacyQrPreview && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Pharmacy QR Code</Text>
                    <TouchableOpacity onPress={() => openImagePreview(pharmacyQrPreview, 'Pharmacy QR Code')}>
                      <Image source={{ uri: pharmacyQrPreview }} style={styles.previewImage} />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setPharmacyViewModalVisible(false)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lab View Modal */}
      <Modal visible={labViewModalVisible} transparent animationType="fade" onRequestClose={() => setLabViewModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.8) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lab Details</Text>
                <TouchableOpacity onPress={() => setLabViewModalVisible(false)} style={styles.closeButton}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: keyboardHeight + FOOTER_HEIGHT }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}><Text style={styles.label}>Lab Name</Text><Text style={styles.value}>{form.labName || '—'}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Registration Number</Text><Text style={styles.value}>{form.labRegNum || '—'}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.label}>GST Number</Text><Text style={styles.value}>{form.labGST || '—'}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.label}>PAN Number</Text><Text style={styles.value}>{form.labPAN || '—'}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Lab Address</Text><Text style={styles.value}>{form.labAddress || '—'}</Text></View>

                {labHeaderPreview && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lab Header Image</Text>
                    <TouchableOpacity onPress={() => openImagePreview(labHeaderPreview, 'Lab Header')}>
                      <Image source={{ uri: labHeaderPreview }} style={styles.previewImage} />
                    </TouchableOpacity>
                  </View>
                )}

                {labQrPreview && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lab QR Code</Text>
                    <TouchableOpacity onPress={() => openImagePreview(labQrPreview, 'Lab QR Code')}>
                      <Image source={{ uri: labQrPreview }} style={styles.previewImage} />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setLabViewModalVisible(false)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Main Clinic Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.85) - FOOTER_HEIGHT }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {mode === 'view' && 'View Clinic Details'}
                  {mode === 'edit' && 'Edit Clinic Details'}
                  {mode === 'delete' && 'Delete Clinic'}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: keyboardHeight + FOOTER_HEIGHT }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {FIELD_CONFIGS.map((cfg) => {
                  const value = String(form[cfg.key] ?? '');
                  const isEditable = mode === 'edit' && (cfg.editableInEdit === undefined ? true : cfg.editableInEdit);
                  return (
                    <View key={String(cfg.key)} style={styles.inputGroup}>
                      <Text style={styles.label}>{cfg.label}</Text>
                      {mode === 'view' ? (
                        <Text style={styles.value}>{value || '—'}</Text>
                      ) : (
                        <TextInput value={value} onChangeText={(text) => setForm((prev) => ({ ...prev, [cfg.key]: text }))} style={[styles.input, !isEditable && { backgroundColor: '#f3f4f6', opacity: 0.8 }]} editable={isEditable} multiline={!!cfg.multiline} keyboardType={cfg.keyboardType || 'default'} placeholder={cfg.label} placeholderTextColor="#6b7280" />
                      )}
                    </View>
                  );
                })}

                {mode === 'view' && (
                  <>
                    {headerPreview && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Header Image</Text>
                        <TouchableOpacity onPress={() => openImagePreview(headerPreview, 'Header Image')}>
                          <Image source={{ uri: headerPreview }} style={styles.previewImage} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {signaturePreview && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Digital Signature</Text>
                        <TouchableOpacity onPress={() => openImagePreview(signaturePreview, 'Digital Signature')}>
                          <Image source={{ uri: signaturePreview }} style={styles.previewImage} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {clinicQrPreview && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Clinic QR Code</Text>
                        <TouchableOpacity onPress={() => openImagePreview(clinicQrPreview, 'Clinic QR Code')}>
                          <Image source={{ uri: clinicQrPreview }} style={styles.previewImage} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {pharmacyHeaderPreview && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Pharmacy Header Image</Text>
                        <TouchableOpacity onPress={() => openImagePreview(pharmacyHeaderPreview, 'Pharmacy Header')}>
                          <Image source={{ uri: pharmacyHeaderPreview }} style={styles.previewImage} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {pharmacyQrPreview && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Pharmacy QR Code</Text>
                        <TouchableOpacity onPress={() => openImagePreview(pharmacyQrPreview, 'Pharmacy QR Code')}>
                          <Image source={{ uri: pharmacyQrPreview }} style={styles.previewImage} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {labHeaderPreview && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Lab Header Image</Text>
                        <TouchableOpacity onPress={() => openImagePreview(labHeaderPreview, 'Lab Header')}>
                          <Image source={{ uri: labHeaderPreview }} style={styles.previewImage} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {labQrPreview && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Lab QR Code</Text>
                        <TouchableOpacity onPress={() => openImagePreview(labQrPreview, 'Lab QR Code')}>
                          <Image source={{ uri: labQrPreview }} style={styles.previewImage} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>

                {mode === 'edit' && (
                  <TouchableOpacity style={[styles.saveButton, loading && styles.disabledButton]} onPress={handleEditSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
                  </TouchableOpacity>
                )}

                {mode === 'delete' && <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(form.addressId)}><Text style={styles.deleteText}>Delete Clinic</Text></TouchableOpacity>}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Edit Modal */}
      <Modal visible={imageEditModalVisible} transparent animationType="fade" onRequestClose={() => setImageEditModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.85) - FOOTER_HEIGHT }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Images</Text>
                <TouchableOpacity onPress={() => setImageEditModalVisible(false)} style={styles.closeButton}><Icon name="close" size={24} color="#6B7280" /></TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: keyboardHeight + FOOTER_HEIGHT }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Clinic Header Image (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('header')}>
                    {headerPreview ? <Image source={{ uri: headerPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="image-outline" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload clinic header</Text></View>}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Clinic QR Code (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('clinicQR')}>
                    {clinicQrPreview ? <Image source={{ uri: clinicQrPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="qrcode" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload clinic QR code</Text></View>}
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Digital Signature (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('signature')}>
                    {signaturePreview ? <Image source={{ uri: signaturePreview }} style={[styles.previewImage, { height: 80 }]} /> : <View style={styles.uploadPlaceholder}><Icon name="draw" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload digital signature</Text></View>}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pharmacy Header Image (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('pharmacyHeader')}>
                    {pharmacyHeaderPreview ? <Image source={{ uri: pharmacyHeaderPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="image-outline" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload pharmacy header</Text></View>}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pharmacy QR Code (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('pharmacyQR')}>
                    {pharmacyQrPreview ? <Image source={{ uri: pharmacyQrPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="qrcode" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload pharmacy QR code</Text></View>}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Lab Header Image (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('labHeader')}>
                    {labHeaderPreview ? <Image source={{ uri: labHeaderPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="image-outline" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload lab header</Text></View>}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Lab QR Code (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('labQR')}>
                    {labQrPreview ? <Image source={{ uri: labQrPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="qrcode" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload lab QR code</Text></View>}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setImageEditModalVisible(false)} disabled={loading}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, loading && styles.disabledButton]} onPress={handleImageEditSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Images</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* QR Code Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.6), width: width * 0.8 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{previewTitle}</Text>
                <TouchableOpacity onPress={() => setQrModalVisible(false)} style={styles.closeButton}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                {qrCodeImage ? (
                  <Image
                    source={{ uri: qrCodeImage }}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                    onError={(e) => {
                      Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Failed to load QR code image',
                        position: 'top',
                        visibilityTime: 3000
                      });
                    }}
                  />
                ) : (
                  <ActivityIndicator size="large" color="#3B82F6" />
                )}
              </View>

              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setQrModalVisible(false)}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Header Upload Modal */}
      <Modal visible={headerModalVisible} transparent animationType="fade" onRequestClose={() => setHeaderModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.75) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Header and Signature</Text>
                <TouchableOpacity onPress={() => setHeaderModalVisible(false)} style={styles.closeButton}><Icon name="close" size={24} color="#6B7280" /></TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: keyboardHeight + FOOTER_HEIGHT }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Header Image</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('header')}>
                    {headerPreview ? <Image source={{ uri: headerPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="image-outline" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload header image</Text></View>}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Digital Signature</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('signature')}>
                    {signaturePreview ? <Image source={{ uri: signaturePreview }} style={[styles.previewImage, { height: 80 }]} /> : <View style={styles.uploadPlaceholder}><Icon name="draw" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload signature</Text></View>}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setHeaderModalVisible(false)} disabled={loading}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, (!headerFile || !signatureFile || loading) && styles.disabledButton]} onPress={handleHeaderSubmit} disabled={!headerFile || !signatureFile || loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Upload</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pharmacy Modal */}
      <Modal visible={pharmacyModalVisible} transparent animationType="fade" onRequestClose={() => setPharmacyModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.85) - FOOTER_HEIGHT }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pharmacy Details</Text>
                <TouchableOpacity onPress={() => setPharmacyModalVisible(false)} style={styles.closeButton}><Icon name="close" size={24} color="#6B7280" /></TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: keyboardHeight + FOOTER_HEIGHT }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}><Text style={styles.label}>Pharmacy Name</Text><TextInput value={form.pharmacyName} onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyName: text }))} style={styles.input} placeholder="Enter pharmacy name" placeholderTextColor='gray' /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Registration Number</Text><TextInput value={form.pharmacyRegNum} onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyRegNum: text }))} style={styles.input} placeholder="Enter registration number" placeholderTextColor='gray' /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>GST Number</Text><TextInput value={form.pharmacyGST} onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyGST: text }))} style={styles.input} placeholder="Enter GST number" placeholderTextColor='gray' /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>PAN Number</Text><TextInput value={form.pharmacyPAN} onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyPAN: text }))} style={styles.input} placeholder="Enter PAN number" placeholderTextColor='gray' /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Pharmacy Address</Text><TextInput value={form.pharmacyAddress} onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyAddress: text }))} style={[styles.input, { height: 80 }]} multiline placeholder="Enter pharmacy address" placeholderTextColor='gray' /></View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pharmacy Header Image (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('pharmacyHeader')}>
                    {pharmacyHeaderPreview ? <Image source={{ uri: pharmacyHeaderPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="image-outline" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload pharmacy header</Text></View>}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pharmacy QR Code (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('pharmacyQR')}>
                    {pharmacyQrPreview ? <Image source={{ uri: pharmacyQrPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="qrcode" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload pharmacy QR code</Text></View>}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setPharmacyModalVisible(false)} disabled={loading}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, loading && styles.disabledButton]} onPress={handlePharmacySubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Details</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lab Modal */}
      <Modal visible={labModalVisible} transparent animationType="fade" onRequestClose={() => setLabModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.85) - FOOTER_HEIGHT }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lab Details</Text>
                <TouchableOpacity onPress={() => setLabModalVisible(false)} style={styles.closeButton}><Icon name="close" size={24} color="#6B7280" /></TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: keyboardHeight + FOOTER_HEIGHT }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}><Text style={styles.label}>Lab Name</Text><TextInput value={form.labName} onChangeText={(text) => setForm(prev => ({ ...prev, labName: text }))} style={styles.input} placeholder="Enter lab name" placeholderTextColor='gray' /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Registration Number</Text><TextInput value={form.labRegNum} onChangeText={(text) => setForm(prev => ({ ...prev, labRegNum: text }))} style={styles.input} placeholder="Enter registration number" placeholderTextColor='gray' /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>GST Number</Text><TextInput value={form.labGST} onChangeText={(text) => setForm(prev => ({ ...prev, labGST: text }))} style={styles.input} placeholder="Enter GST number" placeholderTextColor='gray' /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>PAN Number</Text><TextInput value={form.labPAN} onChangeText={(text) => setForm(prev => ({ ...prev, labPAN: text }))} style={styles.input} placeholder="Enter PAN number" placeholderTextColor='gray' /></View>
                <View style={styles.inputGroup}><Text style={styles.label}>Lab Address</Text><TextInput value={form.labAddress} onChangeText={(text) => setForm(prev => ({ ...prev, labAddress: text }))} style={[styles.input, { height: 80 }]} multiline placeholder="Enter lab address" placeholderTextColor='gray' /></View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Lab Header Image (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('labHeader')}>
                    {labHeaderPreview ? <Image source={{ uri: labHeaderPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="image-outline" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload lab header</Text></View>}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Lab QR Code (Optional)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => handleFileChange('labQR')}>
                    {labQrPreview ? <Image source={{ uri: labQrPreview }} style={styles.previewImage} /> : <View style={styles.uploadPlaceholder}><Icon name="qrcode" size={32} color="#6B7280" /><Text style={styles.uploadText}>Tap to upload lab QR code</Text></View>}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setLabModalVisible(false)} disabled={loading}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, loading && styles.disabledButton]} onPress={handleLabSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Details</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={imagePreviewModalVisible} transparent animationType="fade" onRequestClose={() => setImagePreviewModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: computeModalMaxHeight(0.8), width: width * 0.9 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{previewTitle}</Text>
                <TouchableOpacity onPress={() => setImagePreviewModalVisible(false)} style={styles.closeButton}><Icon name="close" size={24} color="#6B7280" /></TouchableOpacity>
              </View>
              {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullPreviewImage} resizeMode="contain" />}
              <View style={[styles.modalFooter, { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setImagePreviewModalVisible(false)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loading Overlay */}
      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading clinics...</Text>
        </View>
      ) : (
        <ScrollView style={styles.clinicsContainer}>
          {clinics.length === 0 ? (
            <View style={styles.emptyState}>

              <Icon name="hospital-building" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No clinics found</Text>
              <Text style={styles.emptyStateSubtext}>Add your first clinic to get started</Text>
            </View>
          ) : (
            clinics.map((clinic) => {
              const statusStyle = getStatusStyle(clinic.status);
              return (
                <View key={clinic.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.placeholderCircle}>
                      <Text style={styles.placeholderText}>{(clinic.name && clinic.name[0] ? clinic.name[0].toUpperCase() : '')}</Text>
                    </View>
                    <View style={styles.clinicInfo}>
                      <Text style={styles.clinicName}>{clinic.name}</Text>
                      <Text style={styles.clinicType}>{clinic.type}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                      <Text style={{ color: statusStyle.color, fontSize: 12, fontWeight: '600' }}>{clinic.status}</Text>
                    </View>
                  </View>

                  <View style={styles.clinicDetails}>
                    <View style={styles.detailRow}><Icon name="map-marker" size={16} color="#6B7280" /><Text style={styles.detailText}>{clinic.city}, {clinic.state}</Text></View>
                    <View style={styles.detailRow}><Icon name="phone" size={16} color="#6B7280" /><Text style={styles.detailText}>{clinic.mobile}</Text></View>
                    <View style={styles.detailRow}><Icon name="clock-outline" size={16} color="#6B7280" /><Text style={styles.detailText}>{formatTimeTo12Hour(clinic.startTime)} - {formatTimeTo12Hour(clinic.endTime)}</Text></View>
                  </View>

                  <View style={styles.actionsContainer}>
                    <View style={styles.actionGroup}>
                      <Text style={styles.actionGroupTitle}>Clinic Actions</Text>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => openModal('view', clinic)}><Text style={styles.actionButtonText}>View</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => openModal('edit', clinic)}><Text style={styles.actionButtonText}>Edit</Text></TouchableOpacity>

                        {clinic.clinicQrCode && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => fetchClinicQRCode(clinic.addressId || clinic.id, 'clinic')}
                          >
                            <Icon name="qrcode" size={18} color="#3B82F6" />
                            <Text style={styles.actionButtonText}>View Clinic QR</Text>
                          </TouchableOpacity>
                        )}

                        {clinic.pharmacyQrCode && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => fetchClinicQRCode(clinic.addressId || clinic.id, 'pharmacy')}
                          >
                            <Icon name="qrcode" size={18} color="#3B82F6" />
                            <Text style={styles.actionButtonText}>View Pharmacy QR</Text>
                          </TouchableOpacity>
                        )}

                        {clinic.labQrCode && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => fetchClinicQRCode(clinic.addressId || clinic.id, 'lab')}
                          >
                            <Icon name="qrcode" size={18} color="#3B82F6" />
                            <Text style={styles.actionButtonText}>View Lab QR</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionButton} onPress={() => openImageEditModal(clinic)}><Text style={styles.actionButtonText}>Edit Images</Text></TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.actionGroup}>
                      <Text style={styles.actionGroupTitle}>Pharmacy</Text>
                      <View style={styles.actionButtons}>
                        {clinic.pharmacyName ? (
                          <>
                            <TouchableOpacity style={styles.actionButton} onPress={() => openPharmacyViewModal(clinic)}><Text style={styles.actionButtonText}>View</Text></TouchableOpacity>
                            {clinic.pharmacyQrCode && <TouchableOpacity style={styles.actionButton} onPress={() => fetchClinicQRCode(clinic.id, 'pharmacy')}><Icon name="qrcode" size={18} color="#3B82F6" /><Text style={styles.actionButtonText}>View Pharmacy QR</Text></TouchableOpacity>}
                          </>
                        ) : (
                          <TouchableOpacity style={[styles.actionButton, styles.addButtonSmall]} onPress={() => openPharmacyModal(clinic)}><Icon name="plus" size={18} color="#FFFFFF" /><Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Add Pharmacy</Text></TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.actionGroup}>
                      <Text style={styles.actionGroupTitle}>Lab</Text>
                      <View style={styles.actionButtons}>
                        {clinic.labName ? (
                          <>
                            <TouchableOpacity style={styles.actionButton} onPress={() => openLabViewModal(clinic)}><Text style={styles.actionButtonText}>View</Text></TouchableOpacity>
                            {clinic.labQrCode && <TouchableOpacity style={styles.actionButton} onPress={() => fetchClinicQRCode(clinic.id, 'lab')}><Icon name="qrcode" size={18} color="#3B82F6" /><Text style={styles.actionButtonText}>View Lab QR</Text></TouchableOpacity>}
                          </>
                        ) : (
                          <TouchableOpacity style={[styles.actionButton, styles.addButtonSmall]} onPress={() => openLabModal(clinic)}><Icon name="plus" size={18} color="#FFFFFF" /><Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Add Lab</Text></TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity style={styles.deleteAction} onPress={() => openModal('delete', clinic)}>
                      <Icon name="delete-outline" size={20} color="#EF4444" />
                      <Text style={styles.deleteActionText}>Delete Clinic</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}
    </View>
  );
};

export default ClinicManagementScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  header: { fontSize: 24, fontWeight: '700', color: '#111827' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  searchContainer: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827', paddingVertical: 12 },
  clinicsContainer: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#000000' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  placeholderCircle: { width: 50, height: 50, borderRadius: 30, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  placeholderText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 2 },
  clinicType: { fontSize: 14, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  clinicDetails: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailText: { fontSize: 14, color: '#4B5563', marginLeft: 8 },
  actionsContainer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  actionGroup: { marginBottom: 16 },
  actionGroupTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 4 },
  actionButtonText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  addButtonSmall: { backgroundColor: '#10B981' },
  deleteAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 6, gap: 8, marginTop: 8 },
  deleteActionText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  qrCodeImage: { width: 200, height: 200, alignSelf: 'center', marginVertical: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modal: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  closeButton: { padding: 4 },
  modalContent: { padding: 20 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  value: { fontSize: 16, color: '#111827', paddingVertical: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, padding: 12, fontSize: 16, color: '#111827', backgroundColor: '#FFFFFF' },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#F3F4F6', borderRadius: 6 },
  cancelText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#3B82F6', borderRadius: 6 },
  saveText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  deleteButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#EF4444', borderRadius: 6 },
  deleteText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  disabledButton: { backgroundColor: '#D1D5DB' },
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40
  },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  uploadBox: { borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 6, padding: 16, justifyContent: 'center', alignItems: 'center', minHeight: 120, backgroundColor: '#F9FAFB' },
  uploadPlaceholder: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  previewImage: { width: '100%', height: 100, borderRadius: 6, resizeMode: 'cover' },
  fullPreviewImage: { width: '100%', height: height * 0.5, borderRadius: 6, marginVertical: 20 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 16, fontSize: 16, color: '#111827' },

  /* camera modal & overlay styles */
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
});
