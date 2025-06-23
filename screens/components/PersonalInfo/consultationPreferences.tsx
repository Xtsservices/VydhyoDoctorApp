import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IoIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';


const ConsultationPreferences = () => {
  const [consultationMode, setConsultationMode] = useState('In-Person');
  const [fees, setFees] = useState({ inPerson: '', video: '', homeVisit: '' });

  const navigation = useNavigation();

  const handleFeeChange = (mode: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '' || (parseInt(numericValue) >= 0 && numericValue.length <= 5)) {
      setFees({ ...fees, [mode]: numericValue });
    }
  };

  const isFormValid = () => {
    return fees.inPerson !== '' && fees.video !== '' && fees.homeVisit !== '';
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = async () => {
    if (!isFormValid()) return;

    const payload = {
      consultationModeFee: [
        { type: 'In-Person', fee: parseInt(fees.inPerson) },
        { type: 'Video', fee: parseInt(fees.video) },
        { type: 'Home Visit', fee: parseInt(fees.homeVisit) },
      ],
    };

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Token not found',
        });
        return;
      }

      const response = await axios.post(
        'http://216.10.251.239:3000/users/updateConsultationModes',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('API Response:', response);
      if (response.status == 200) {
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
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <IoIcon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      <Text style={styles.header}>Step 4 - Consultation Preferences</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Choose Consultation Mode</Text>
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeButton, consultationMode === 'In-Person' && styles.selectedMode]}
            onPress={() => setConsultationMode('In-Person')}
          >
            <Icon name="person" size={20} color={consultationMode === 'In-Person' ? '#fff' : '#6b7280'} />
            <Text style={[styles.modeText, consultationMode === 'In-Person' && styles.selectedText]}>In-Person</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, consultationMode === 'Video' && styles.selectedMode]}
            onPress={() => setConsultationMode('Video')}
          >
            <Icon name="videocam" size={20} color={consultationMode === 'Video' ? '#fff' : '#6b7280'} />
            <Text style={[styles.modeText, consultationMode === 'Video' && styles.selectedText]}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, consultationMode === 'Home Visit' && styles.selectedMode]}
            onPress={() => setConsultationMode('Home Visit')}
          >
            <Icon name="home" size={20} color={consultationMode === 'Home Visit' ? '#fff' : '#6b7280'} />
            <Text style={[styles.modeText, consultationMode === 'Home Visit' && styles.selectedText]}>Home Visit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>Set Fees (in ₹)</Text>
        <View style={styles.feeContainer}>
          <View style={styles.feeRow}>
            <Icon name="person" size={20} color="#007bff" style={styles.feeIcon} />
            <Text style={styles.feeLabel}>In-Person</Text>
            <TextInput
              style={styles.input}
              value={fees.inPerson}
              onChangeText={(value) => handleFeeChange('inPerson', value)}
              keyboardType="numeric"
              maxLength={5}
              placeholder="₹XX"
              placeholderTextColor="#999"

            />
          </View>
          <View style={styles.feeRow}>
            <Icon name="videocam" size={20} color="#6b7280" style={styles.feeIcon} />
            <Text style={styles.feeLabel}>Video</Text>
            <TextInput
              style={styles.input}
              value={fees.video}
              onChangeText={(value) => handleFeeChange('video', value)}
              keyboardType="numeric"
              maxLength={5}
              placeholder="₹YY"
              placeholderTextColor="#999"

            />
          </View>
          <View style={styles.feeRow}>
            <Icon name="home" size={20} color="#10b981" style={styles.feeIcon} />
            <Text style={styles.feeLabel}>Home Visit</Text>
            <TextInput
              style={styles.input}
              value={fees.homeVisit}
              onChangeText={(value) => handleFeeChange('homeVisit', value)}
              keyboardType="numeric"
              maxLength={5}
              placeholder="₹ZZ"
              placeholderTextColor="#999"

            />
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.nextButton, !isFormValid() && styles.disabledButton]}
        disabled={!isFormValid()}
        onPress={handleNext}
      // onPress={() => (navigation as any).navigate('FinancialSetupScreen')}
      >
        <Text style={styles.nextText}>Next →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e0f7e0', padding: 20 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#1f2937', textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, top: '10%' },
  label: { fontSize: 16, marginBottom: 10, color: '#1f2937' },
  modeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modeButton: { padding: 10, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 5, width: '30%', alignItems: 'center' },
  selectedMode: { backgroundColor: '#007bff', borderColor: '#007bff' },
  modeText: { textAlign: 'center', color: '#1f2937', marginTop: 5 },
  selectedText: { color: '#fff' },
  feeContainer: { marginBottom: 20 },
  feeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  feeIcon: { marginRight: 10 },
  feeLabel: { flex: 1, fontSize: 16, color: '#1f2937' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 5, padding: 5, textAlign: 'center', color: '#6b7280' },
  nextButton: { backgroundColor: '#00203f', padding: 15, borderRadius: 8, alignItems: 'center', position: 'absolute', bottom: 20, left: 20, right: 20 },
  disabledButton: { backgroundColor: '#a3bffa' },
  nextText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});

export default ConsultationPreferences;