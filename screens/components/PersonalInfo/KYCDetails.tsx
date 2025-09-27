import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
  LayoutAnimation,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import { UploadFiles, AuthFetch } from '../../auth/auth';
import WebView from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const voter_icon = require('../../assets/aadhar.png');
const pancard_icon = require('../../assets/pan.png');

const { width, height } = Dimensions.get('window');

const TERMS_URL = 'https://vydhyo.com/terms-and-conditions';

// JS to hide site header/footer and keep only middle terms content.
// Runs before content loads and also via MutationObserver to catch late-rendered elements (e.g., Elementor).
const hideHeaderFooterJS = `
(function() {
  function applyHiding() {
    try {
      var selectors = [
        'header',
        'footer',
        '.site-header',
        '.site-footer',
        '.elementor-location-header',
        '.elementor-location-footer',
        '[data-elementor-type="header"]',
        '[data-elementor-type="footer"]',
        '.ast-desktop-header',            /* common WP themes */
        '.ast-mobile-header-wrap',
        '#masthead',
        '#colophon'
      ];
      selectors.forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){
          el.style.setProperty('display','none','important');
          el.style.setProperty('visibility','hidden','important');
          el.style.setProperty('height','0px','important');
          el.style.setProperty('margin','0','important');
          el.style.setProperty('padding','0','important');
        });
      });

      // Remove any body/page top spacing reserved for sticky headers
      document.documentElement.style.setProperty('scroll-behavior','smooth','important');
      document.body.style.setProperty('padding-top','0px','important');
      document.body.style.setProperty('margin-top','0px','important');

      // Stretch main content to full width if constrained by layout wrappers
      var wrappers = ['main', '#content', '.site-content', '.elementor', '.elementor-section-wrap'];
      wrappers.forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){
          el.style.setProperty('max-width','100%','important');
          el.style.setProperty('margin','0 auto','important');
        });
      });
    } catch(e) {}
  }

  // Initial run
  applyHiding();

  // Observe DOM changes (catch SPA/theme late injections)
  var obs = new MutationObserver(function(){ applyHiding(); });
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function(){
      applyHiding();
      obs.observe(document.body, { childList: true, subtree: true });
    });
  }

  true; // required to signal completion for RN WebView
})();
`;

const KYCDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [voterImage, setVoterImage] = useState<{ uri: string; name: string; type?: string } | null>(null);
  const [panImage, setPanImage] = useState<{ uri: string; name: string; type?: string } | null>(null);
  const [voterUploaded, setVoterUploaded] = useState(false);
  const [pancardUploaded, setPancardUploaded] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [voterNumber, setVoterNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [fileViewModalVisible, setFileViewModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; type?: string } | null>(null);

  const [prefill, setPrefill] = useState(false);

  // keyboard height & refs for scrolling if needed later
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  // ---------- Keyboard listeners ----------
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const h = e.endCoordinates?.height ?? 0;
      if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(h);
    };
    const onHide = () => {
      if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ---------- Pickers / image handlers ----------
  const handleVoterUpload = async () => {
    try {
      const [result] = await pick({ mode: 'open', type: [types.images] });
      if (result?.uri && result?.name) {
        setVoterImage({ uri: result.uri, name: result.name, type: result.type || 'image/jpeg' });
        setVoterUploaded(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick Voter ID image. Please try again.');
    }
  };

  const handlePancardUpload = async () => {
    Alert.alert(
      'Upload PAN Card',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              const result = await launchCamera({ mediaType: 'photo', includeBase64: false });
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setPanImage({
                  uri: asset.uri!,
                  name: asset.fileName || 'pan_camera.jpg',
                  type: asset.type || 'image/jpeg',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('No image selected from camera');
              }
            } catch (err) {
              Alert.alert('Error', 'Camera access failed.');
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: false });
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setPanImage({
                  uri: asset.uri!,
                  name: asset.fileName || 'pan_gallery.jpg',
                  type: asset.type || 'image/jpeg',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('No image selected from gallery');
              }
            } catch (err) {
              Alert.alert('Error', 'Gallery access failed.');
            }
          },
        },
        {
          text: 'Upload File',
          onPress: async () => {
            try {
              const [res] = await pick({ type: [types.images] });
              if (res && res.uri && res.name) {
                setPanImage({ uri: res.uri, name: res.name, type: res.type || 'image/jpeg' });
                setPancardUploaded(true);
              } else {
                Alert.alert('Error', 'Invalid image selected. Please try again.');
              }
            } catch (err) {
              Alert.alert('Error', 'Image selection failed.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const removeVoterFile = () => {
    setVoterImage(null);
    setVoterUploaded(false);
  };

  const removePanFile = () => {
    setPanImage(null);
    setPancardUploaded(false);
    if (prefill) setPrefill(false);
  };

  const viewFile = (file: { uri: string; type?: string }) => {
    if (file.type?.includes('image') || /\.jpe?g$|\.png$/i.test(file.uri)) {
      setSelectedFile(file);
      setFileViewModalVisible(true);
    } else {
      Alert.alert('Error', 'Unsupported file type.');
    }
  };

  // ---------- Validation helpers ----------
  const validateVoterNumber = (number: string) => {
    const voterRegex = /^[A-Z]{3}[0-9]{7}$/;
    return voterRegex.test(number);
  };
  const validatePanNumber = (number: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(number);
  };

  // ---------- Fetch user KYC if present ----------
  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        navigation.navigate('Login' as any);
        return;
      }
      const response = await AuthFetch('users/getKycByUserId', token);
      if (response?.data?.status === 'success') {
        const userData = response?.data?.data;
        if (userData?.pan?.number) {
          setPanNumber(userData.pan.number);
        }
        if (userData?.pan?.attachmentUrl) {
          setPanImage({
            uri: userData.pan.attachmentUrl,
            name: userData.pan.attachmentFileName || 'pan_certificate.jpg',
            type: 'image/jpeg',
          });
          setPancardUploaded(true);
          setPrefill(true);
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
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // ---------- Submit / Next ----------
  const handleNext = async () => {
    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept the Terms & Conditions to proceed.');
      return;
    }
    if (!panNumber && !pancardUploaded) {
      try {
        setLoading(true);
        await AsyncStorage.setItem('currentStep', 'ConfirmationScreen');
        Toast.show({
          type: 'info',
          text1: 'Skipped',
          text2: 'KYC details skipped',
          position: 'top',
          visibilityTime: 3000,
        });
        navigation.navigate('ConfirmationScreen');
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to skip. Please try again.',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!panNumber || !validatePanNumber(panNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-character PAN number (e.g., ABCDE1234F).');
      return;
    }

    if (!pancardUploaded || !panImage?.uri) {
      Alert.alert('Error', 'Please upload a PAN Card image.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }
      if (!userId) {
        Alert.alert('Error', 'User ID is missing. Please log in again.');
        setLoading(false);
        return;
      }

      const fd = new FormData();
      fd.append('userId', userId);
      fd.append('panNumber', panNumber);

      fd.append('panFile', {
        uri: panImage.uri,
        name: panImage.name || 'pan.jpg',
        type: panImage.type || 'image/jpeg',
      } as any);

      const response = await UploadFiles('users/addKYCDetails', fd, token);

      if (response?.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'KYC details saved successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        await AsyncStorage.setItem('currentStep', 'ConfirmationScreen');
        navigation.navigate('ConfirmationScreen');
      } else {
        Alert.alert('Error', response?.message || 'Failed to submit KYC details. Please try again.');
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to submit KYC details. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('FinancialSetupScreen');
  };

  // ---------- Layout math for Next button ----------
  const androidBuffer = Platform.OS === 'android' ? 12 : 0;
  const extraGap = 10;
  const nextBottom = keyboardHeight > 0 ? keyboardHeight + insets.bottom + androidBuffer + extraGap : insets.bottom + 24;

  const renderWebviewLoader = () => (
    <View style={styles.webviewLoader}>
      <ActivityIndicator size="large" color="#00203F" />
      <Text style={styles.webviewLoaderText}>Loading Terms & Conditions…</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}

      {/* Terms modal */}
      <Modal
        animationType="slide"
        transparent
        visible={termsModalVisible}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms and Conditions</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Icon name="close" size={width * 0.06} color="#00203F" />
              </TouchableOpacity>
            </View>

            <WebView
              originWhitelist={['*']}
              source={{ uri: TERMS_URL }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              setSupportMultipleWindows={false}
              startInLoadingState
              renderLoading={renderWebviewLoader}
              injectedJavaScriptBeforeContentLoaded={hideHeaderFooterJS}
              injectedJavaScript={hideHeaderFooterJS}
              mixedContentMode="always"
              allowFileAccess
              allowUniversalAccessFromFileURLs
            />
          </View>
        </View>
      </Modal>

      {/* File view modal */}
      <Modal
        animationType="slide"
        transparent
        visible={fileViewModalVisible}
        onRequestClose={() => setFileViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fileModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>View File</Text>
              <TouchableOpacity onPress={() => setFileViewModalVisible(false)}>
                <Icon name="close" size={width * 0.06} color="#00203F" />
              </TouchableOpacity>
            </View>
            {selectedFile && selectedFile.uri ? (
              <Image source={{ uri: selectedFile.uri }} style={styles.fileImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Details</Text>
      </View>

      <ProgressBar currentStep={getCurrentStepIndex('KYCDetailsScreen')} totalSteps={TOTAL_STEPS} />

      <ScrollView
        ref={c => (scrollRef.current = c)}
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: Math.max(260, keyboardHeight + insets.bottom + 120) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Upload PAN card Proof</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handlePancardUpload}>
            <Icon name="card" size={width * 0.08} color="#00203F" style={styles.icon} />
            <Text style={styles.uploadText}>Upload</Text>
            <Text style={styles.acceptedText}>Accepted: JPG, PNG</Text>
          </TouchableOpacity>

          {pancardUploaded && panImage && (
            <View style={styles.uploadedFileContainer}>
              <View style={styles.fileInfo}>
                <Icon name="image" size={20} color="#00203F" />
                {prefill && <Text style={{ color: 'green', marginLeft: 8, fontWeight: 'bold' }}>Uploaded</Text>}
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {panImage.name}
                </Text>
              </View>

              <View style={styles.fileActions}>
                <TouchableOpacity onPress={() => viewFile(panImage)} style={styles.actionButton}>
                  <Icon name="eye" size={20} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity onPress={removePanFile} style={styles.actionButton}>
                  <Icon name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.label}>Enter PAN Number</Text>
          <TextInput
            style={styles.input}
            value={panNumber}
            onChangeText={text => setPanNumber(text.toUpperCase())}
            placeholder="Enter 10-character PAN Number"
            placeholderTextColor="#9aa0a6"
            keyboardType="default"
            maxLength={10}
            autoCapitalize="characters"
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Icon name="check" size={width * 0.04} color="#fff" />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTermsModalVisible(true)}>
              <Text style={styles.linkText}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Floating Next button */}
      <TouchableOpacity
        style={[
          styles.nextButton,
          {
            position: 'absolute',
            left: width * 0.05,
            right: width * 0.05,
            bottom: nextBottom,
            zIndex: 9999,
            elevation: 30,
          },
        ]}
        onPress={handleNext}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextText}>Next</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#DCFCE7' },
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
  backButton: { padding: width * 0.02 },
  headerTitle: {
    flex: 1,
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginRight: width * 0.06,
  },
  formContainer: { flex: 1, paddingHorizontal: width * 0.05, paddingVertical: height * 0.03 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: width * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: { fontSize: 16, marginBottom: 10, color: '#000', fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: width * 0.03,
    fontSize: width * 0.035,
    marginBottom: height * 0.02,
    color: '#333',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: width * 0.04,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: height * 0.01,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: { marginBottom: height * 0.01 },
  uploadText: { fontSize: width * 0.035, color: '#00203F', textAlign: 'center', fontWeight: '500' },
  acceptedText: { fontSize: width * 0.03, color: '#666', textAlign: 'center', fontWeight: '500' },
  uploadedFileContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fileName: { marginLeft: 10, color: '#495057', flexShrink: 1 },
  fileActions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: 5, marginLeft: 10 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: height * 0.015, marginBottom: height * 0.02 },
  checkbox: {
    width: width * 0.06,
    height: width * 0.06,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.03,
  },
  checkboxChecked: { backgroundColor: '#00203F', borderColor: '#00203F' },
  linkText: { color: '#007BFF', textDecorationLine: 'underline', marginLeft: 8 },
  nextButton: {
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: width * 0.05,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  nextText: { color: '#fff', fontSize: width * 0.045, fontWeight: '600' },
  spacer: { height: height * 0.1 },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderText: { color: '#fff', fontSize: width * 0.04, marginTop: height * 0.02 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: width * 0.9, height: height * 0.8, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden' },
  fileModalContent: { width: width * 0.9, height: height * 0.6, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: width * 0.04, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#E0E0E0'
  },
  modalTitle: { fontSize: width * 0.05, fontWeight: '600', color: '#00203F' },
  webview: { flex: 1, backgroundColor: '#fff', marginTop: -30 },
  fileImage: { width: '100%', height: '100%' },
  webviewLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  webviewLoaderText: { marginTop: 8, color: '#00203F' },
});

export default KYCDetailsScreen;
