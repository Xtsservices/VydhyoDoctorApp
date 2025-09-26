import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  LayoutAnimation,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import { AuthFetch, AuthPost } from '../../auth/auth';

const { width, height } = Dimensions.get("window");

const ConsultationPreferences = () => {
  const insets = useSafeAreaInsets();

  const [selectedModes, setSelectedModes] = useState({
    inPerson: false,
    video: false,
    homeVisit: false,
  });

  const [fees, setFees] = useState<{ inPerson: string; video: string; homeVisit: string }>({
    inPerson: '0',
    video: '0',
    homeVisit: '0',
  });

  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);

  const navigation = useNavigation<any>();

  // keyboard height state
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView | null>(null);
  const inPersonRef = useRef<TextInput | null>(null);
  const videoRef = useRef<TextInput | null>(null);
  const homeVisitRef = useRef<TextInput | null>(null);

  // measurements for fixed card placement
  const headerHeightRef = useRef(0);
  const progressHeightRef = useRef(0);
  const [cardTop, setCardTop] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: any) => {
      const h = e.endCoordinates?.height ?? 0;
      if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(h);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleModeToggle = (mode: keyof typeof selectedModes) => {
    setSelectedModes(prev => {
      const next = !prev[mode];
      if (!next) {
        setFees(f => ({ ...f, [mode]: '0' }));
      }
      return { ...prev, [mode]: next };
    });
  };

  const handleFeeChange = (mode: keyof typeof selectedModes, value: string) => {
    if (!selectedModes[mode]) return;
    let v = value.replace(/\D/g, "");
    v = v.replace(/^0+(?=\d)/, "");
    if (v.length > 5) v = v.slice(0, 5);
    if (v === "") v = "0";
    setFees(prev => ({ ...prev, [mode]: v }));
  };

  const isFormValid = () => {
    const hasSelectedMode = selectedModes.inPerson || selectedModes.video || selectedModes.homeVisit;
    if (!hasSelectedMode) return false;
    return (
      (!selectedModes.inPerson || parseInt(fees.inPerson || '0', 10) > 0) &&
      (!selectedModes.video || parseInt(fees.video || '0', 10) > 0) &&
      (!selectedModes.homeVisit || parseInt(fees.homeVisit || '0', 10) > 0)
    );
  };

  const handleBack = () => {
    navigation.navigate('Practice');
  };

  const handleNext = async () => {
    if (!isFormValid()) {
      Toast.show({
        type: 'error',
        text1: 'Selection Required',
        text2: 'Please select at least one consultation mode and set a valid fee.',
      });
      return;
    }

    const payload = {
      consultationModeFee: [
        { type: 'In-Person', fee: parseInt(fees?.inPerson || '0', 10) },
        { type: 'Video', fee: parseInt(fees?.video || '0', 10) },
        { type: 'Home Visit', fee: parseInt(fees?.homeVisit || '0', 10) },
      ],
    };
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Token not found',
        });
        return;
      }
      const response = await AuthPost('users/updateConsultationModes', payload, token);

      if (response.status == 'success') {
        Toast.show({
          type: 'success',
          text1: 'Preferences saved successfully',
        });
        await AsyncStorage.setItem('currentStep', 'FinancialSetupScreen');
        (navigation as any).navigate('FinancialSetupScreen');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: response?.message || 'Unable to update preferences.',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to update preferences',
        text2: error?.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    setLoadingUser(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const response = await AuthFetch('users/getUser', token);
        if (response.data.status === 'success') {
          const userData = response.data.data;
          const consultationFee = userData.consultationModeFee || [];

          let updatedModes = { inPerson: false, video: false, homeVisit: false };
          let updatedFees = { inPerson: '0', video: '0', homeVisit: '0' };

          consultationFee.forEach((mode: any) => {
            const { type, fee } = mode;
            if (type === 'In-Person') {
              updatedFees.inPerson = String(fee ?? '0');
              if (fee > 0) updatedModes.inPerson = true;
            } else if (type === 'Video') {
              updatedFees.video = String(fee ?? '0');
              if (fee > 0) updatedModes.video = true;
            } else if (type === 'Home Visit') {
              updatedFees.homeVisit = String(fee ?? '0');
              if (fee > 0) updatedModes.homeVisit = true;
            }
          });

          setSelectedModes(updatedModes);
          setFees(updatedFees);
        }
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to load user data.');
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // helper to scroll focused input into view (measures the input relative to window)
  const scrollToInput = (ref: React.RefObject<TextInput>) => {
    setTimeout(() => {
      const input = ref.current;
      if (!input || !scrollRef.current) return;
      input.measure?.((fx, fy, w, h, px, py) => {
        // py = Y coordinate relative to the window
        // We want to ensure input is visible above keyboard. Compute desired scroll offset.
        const safeAreaBottom = insets.bottom;
        const kbHeight = keyboardHeight;
        // the bottom area available (window height - keyboardHeight)
        const visibleBottom = height - kbHeight;
        // if input's bottom would be overlapped, scroll the ScrollView
        const inputBottom = py + h;
        if (inputBottom > visibleBottom - 20) {
          const overlap = inputBottom - (visibleBottom - 20);
          const currentScroll = 0; // we don't track current scroll offset; scroll by overlap + buffer
          scrollRef.current?.scrollTo({ x: 0, y: overlap + 40, animated: true });
        } else if (py < cardTop + 10) {
          // if input is too close to top of card, scroll a bit up
          scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        }
      });
    }, 120);
  };

  // calculate final bottom offset for Next button:
  const androidBuffer = Platform.OS === 'android' ? 8 : 0;
  const nextBottom = keyboardHeight > 0
    ? keyboardHeight + insets.bottom + androidBuffer + 8
    : insets.bottom + 24;

  // onLayout handlers to compute top for fixed card
  const onHeaderLayout = (e: any) => {
    const h = e.nativeEvent.layout.height;
    headerHeightRef.current = h;
    setCardTop(headerHeightRef.current + progressHeightRef.current + 12);
  };
  const onProgressLayout = (e: any) => {
    const h = e.nativeEvent.layout.height;
    progressHeightRef.current = h;
    setCardTop(headerHeightRef.current + progressHeightRef.current + 12);
  };
  const onCardLayout = (e: any) => {
    const h = e.nativeEvent.layout.height;
    setCardHeight(h);
  };

  return (
    <SafeAreaView style={styles.container}>
      {(loading || loadingUser) && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>
            {loadingUser ? 'Loading user data...' : 'Processing...'}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header} onLayout={onHeaderLayout}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Icon name="arrow-left" size={width * 0.06} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Consultation Preferences</Text>
            </View>

            {/* Progress bar measured for card placement */}
            <View onLayout={onProgressLayout}>
              <ProgressBar currentStep={getCurrentStepIndex('ConsultationPreferences')} totalSteps={TOTAL_STEPS} />
            </View>

            {/* Fixed card (positioned absolutely below header + progress) */}
            <View
              style={[
                styles.card,
                {
                  position: 'absolute',
                  left: width * 0.05,
                  right: width * 0.05,
                  top: cardTop,
                  zIndex: 10,
                    // ensure elevation on android
                  elevation: 6,
                },
              ]}
              onLayout={onCardLayout}
            >
              <Text style={styles.label}>Set Consultation Fees (in ₹)</Text>
              <View style={styles.feeContainer}>
                <View style={styles.feeRow}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      selectedModes.inPerson && styles.checkboxSelected,
                    ]}
                    onPress={() => handleModeToggle("inPerson")}
                  >
                    {selectedModes.inPerson && (
                      <Icon name="check" size={width * 0.04} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <Icon name="account" size={width * 0.05} color="#00203F" style={styles.feeIcon} />
                  <Text style={styles.feeLabel}>In-Person</Text>
                  <TextInput
                    ref={inPersonRef}
                    style={[styles.input, !selectedModes.inPerson && styles.inputDisabled]}
                    value={fees.inPerson}
                    onFocus={() => scrollToInput(inPersonRef)}
                    onChangeText={(value) => handleFeeChange("inPerson", value)}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="₹0"
                    placeholderTextColor="#999"
                    editable={selectedModes.inPerson}
                  />
                </View>

                <View style={styles.feeRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, selectedModes.video && styles.checkboxSelected]}
                    onPress={() => handleModeToggle("video")}
                  >
                    {selectedModes.video && (
                      <Icon name="check" size={width * 0.04} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <Icon name="video" size={width * 0.05} color="#00203F" style={styles.feeIcon} />
                  <Text style={styles.feeLabel}>Video</Text>
                  <TextInput
                    ref={videoRef}
                    style={[styles.input, !selectedModes.video && styles.inputDisabled]}
                    value={fees.video}
                    onFocus={() => scrollToInput(videoRef)}
                    onChangeText={(value) => handleFeeChange("video", value)}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="₹0"
                    placeholderTextColor="#999"
                    editable={selectedModes.video}
                  />
                </View>

                <View style={styles.feeRow}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      selectedModes.homeVisit && styles.checkboxSelected,
                    ]}
                    onPress={() => handleModeToggle("homeVisit")}
                  >
                    {selectedModes.homeVisit && (
                      <Icon name="check" size={width * 0.04} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <Icon name="home" size={width * 0.05} color="#00203F" style={styles.feeIcon} />
                  <Text style={styles.feeLabel}>Home Visit</Text>
                  <TextInput
                    ref={homeVisitRef}
                    style={[styles.input, !selectedModes.homeVisit && styles.inputDisabled]}
                    value={fees.homeVisit}
                    onFocus={() => scrollToInput(homeVisitRef)}
                    onChangeText={(value) => handleFeeChange("homeVisit", value)}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="₹0"
                    placeholderTextColor="#999"
                    editable={selectedModes.homeVisit}
                  />
                </View>
              </View>
            </View>

            {/* Main scroll area sits below the fixed card */}
            <ScrollView
              ref={c => (scrollRef.current = c)}
              style={styles.formContainer}
              contentContainerStyle={{
                // ensure content starts below the fixed card (cardTop + cardHeight + some spacing)
                paddingTop: Math.max(cardTop + cardHeight + 12, height * 0.35),
                paddingBottom: Math.max(200, keyboardHeight + insets.bottom + 80),
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
          
              {/* Extra spacer so scroll area is generous when keyboard is up */}
              <View style={{ height: 240 }} />
            </ScrollView>

            {/* Floating Next Button */}
            <TouchableOpacity
              style={[
                styles.nextButton,
                !isFormValid() && styles.disabledButton,
                {
                  position: 'absolute',
                  left: width * 0.05,
                  right: width * 0.05,
                  bottom: nextBottom,
                  zIndex: 9999,
                  elevation: 30,
                },
              ]}
              disabled={!isFormValid() || loading}
              onPress={handleNext}
              activeOpacity={0.85}
            >
                <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DCFCE7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00203F",
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.04,
    shadowColor: "#000",
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
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginRight: width * 0.06,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    // paddingVertical: height * 0.03, // handled via contentContainerStyle
  },
  card: {
    backgroundColor: "#fff",
    padding: width * 0.04,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: "500",
    color: "#333",
    marginBottom: height * 0.015,
    marginTop: 0,
  },
  feeContainer: {
    marginBottom: height * 0.02,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.015,
  },
  checkbox: {
    width: width * 0.06,
    height: width * 0.06,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: width * 0.03,
  },
  checkboxSelected: {
    backgroundColor: "#00203F",
    borderColor: "#00203F",
  },
  feeIcon: {
    marginRight: width * 0.03,
  },
  feeLabel: {
    flex: 1,
    fontSize: width * 0.04,
    color: "#333",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: width * 0.03,
    textAlign: "center",
    color: "#333",
    fontSize: width * 0.04,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    height: height * 0.06,
  },
  inputDisabled: {
    backgroundColor: "#F5F5F5",
    color: "#999",
  },
  nextButton: {
    backgroundColor: "#00203F",
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  disabledButton: {
    backgroundColor: "#B0BEC5",
  },
  nextText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontWeight: "600",
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

export default ConsultationPreferences;
