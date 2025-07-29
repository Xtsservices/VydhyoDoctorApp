import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import { AuthFetch, AuthPost } from '../../auth/auth';

const { width, height } = Dimensions.get("window");

const ConsultationPreferences = () => {
  const [selectedModes, setSelectedModes] = useState({
    inPerson: false,
    video: false,
    homeVisit: false,
  });
  const [fees, setFees] = useState({ inPerson: 0, video: 0, homeVisit: 0 });
 const [loading, setLoading] = useState(false);


  const navigation = useNavigation<any>();

  const handleModeToggle = (mode: keyof typeof selectedModes) => {
    setSelectedModes((prev: typeof selectedModes) => ({ ...prev, [mode]: !prev[mode] }));
  };

  const handleFeeChange = (mode: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue === "" || (parseInt(numericValue) >= 0 && numericValue.length <= 5)) {
      setFees({ ...fees, [mode]: numericValue });
    }
  };

  const isFormValid = () => {
    const hasSelectedMode = selectedModes.inPerson || selectedModes.video || selectedModes.homeVisit;
    if (!hasSelectedMode) return false;
    return (
      (!selectedModes.inPerson || fees.inPerson !== "") &&
      (!selectedModes.video || fees.video !== "") &&
      (!selectedModes.homeVisit || fees.homeVisit !== "")
    );
  };

  const handleBack = () => {
    navigation.navigate('Practice');
  };

  const handleNext = async () => {
    // if (!isFormValid()) return;

    const payload = {
      consultationModeFee: [
        { type: 'In-Person', fee: parseInt(fees.inPerson) },
        { type: 'Video', fee: parseInt(fees.video) },
        { type: 'Home Visit', fee: parseInt(fees.homeVisit) },
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
      console.log('Sending payload:', payload);
      const response = await AuthPost('users/updateConsultationModes', payload, token);
      
      console.log('API Response:', response);
      if (response.status == 'success') {
        Toast.show({
          type: 'success',
          text1: 'Preferences saved successfully',
        });
        (navigation as any).navigate('FinancialSetupScreen')
      }

      // navigation.navigate('FinancialSetupScreen');
    } catch (error: any) {
      console.error('API Error:', error?.response?.data || error.message);
      Toast.show({
        type: 'error',
        text1: 'Failed to update preferences',
        text2: error?.response?.data?.message || 'Something went wrong',
      });
    } finally {
    setLoading(false); // Always hide loader after request
  }

  };
  


const fetchUserData = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      const response = await AuthFetch('users/getUser', token);
      if (response.data.status === 'success') {
        const userData = response.data.data;
        const consultationFee = userData.consultationModeFee;

        let updatedModes = { inPerson: false, video: false, homeVisit: false };
        let updatedFees = { inPerson: '', video: '', homeVisit: '' };

        consultationFee.forEach((mode) => {
          const { type, fee } = mode;
          if (type === 'In-Person') {
            updatedFees.inPerson = fee.toString();
            if (fee > 0) updatedModes.inPerson = true;
          } else if (type === 'Video') {
            updatedFees.video = fee.toString();
            if (fee > 0) updatedModes.video = true;
          } else if (type === 'Home Visit') {
            updatedFees.homeVisit = fee.toString();
            if (fee > 0) updatedModes.homeVisit = true;
          }
        });

        setSelectedModes(updatedModes);
        setFees(updatedFees);
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
};



  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <View style={styles.container}>

        {loading && (
                    <View style={styles.loaderOverlay}>
                      <ActivityIndicator size="large" color="#00203F" />
                      <Text style={styles.loaderText}>Processing...</Text>
                    </View>
                  )}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation Preferences</Text>
      </View>

      <ProgressBar currentStep={getCurrentStepIndex('ConsultationPreferences')} totalSteps={TOTAL_STEPS} />

      {/* Form Content */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.card}>
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
                style={[styles.input, !selectedModes.inPerson && styles.inputDisabled]}
                value={fees.inPerson}
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
                style={[styles.input, !selectedModes.video && styles.inputDisabled]}
                value={fees.video}
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
                style={[styles.input, !selectedModes.homeVisit && styles.inputDisabled]}
                value={fees.homeVisit}
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
        {/* Spacer to ensure content is not hidden by the Next button */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.nextButton]}
        // disabled={!isFormValid()}
        onPress={handleNext}
        // onPress={() => {
        //   setTimeout(() => {
        //     navigation.navigate("FinancialSetupScreen");
        //   }, 3000);
        // }}
      >
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </View>
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
    paddingVertical: height * 0.03,
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
    marginTop: height * 0.015,
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
    marginHorizontal: width * 0.05,
    marginBottom: height * 0.03,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black overlay
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