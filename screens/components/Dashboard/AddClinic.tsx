import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { AuthPost, AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';



const AddClinicForm = () => {
  const [form, setForm] = useState({
    clinicName: '',
    startTime: '',
    openingPeriod: 'AM',
    endTime: '',
    closingPeriod: 'PM',
    landmark: '',
    city: '',
    state: '',
    mobile: '',
    email: '',
    pincode: '',
     type: 'Clinic',
    address: '',
    country: 'India',
    latitude: 56.1304,
    longitude: -106.3468,
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const {
      clinicName,
      startTime,
      endTime,
      address,
      landmark,
      city,
      state,
      mobile,
      email,
      pincode,
    } = form;


    if (!clinicName.trim()) return 'Clinic name is required';
    if (!startTime || !endTime) return 'Opening and closing times are required';
    if (!address.trim()) return 'Address is required';
    if (!landmark.trim()) return 'Landmark is required';
    if (!city.trim() || !state.trim()) return 'City and State are required';
    if (!/^\d{10}$/.test(mobile)) return 'Enter a valid 10-digit mobile number';
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      return 'Enter a valid email address';
    if (!/^\d{6}$/.test(pincode)) return 'Enter a valid 6-digit pincode';

    return '';
  };

const convertTo24Hour = (timeStr: string, period: string): string => {
  let [hourStr, minuteStr] = timeStr.trim().split(':');
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr || '00', 10);

  if (period.toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

  const handleSubmit = async () => {
    const error = validateForm();
    console.log(form, 'Form Data to be sent');
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }
   

const { openingPeriod, closingPeriod,landmark,email, ...cleanForm } = form;
    const payload = {
      ...cleanForm,
      startTime: convertTo24Hour(form.startTime, form.openingPeriod),
      endTime: convertTo24Hour(form.endTime, form.closingPeriod),
    };
console.log(payload, 'Payload to be sent');
    try {
       const token = await AsyncStorage.getItem('authToken');
       const response = await AuthPost('users/addAddress', payload, token);
      console.log('Response from API:', response);
if (!response || !('data' in response) || response.data.status === 'success') {

   Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Appointment cancelled successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        return;
      }

      setForm({
          clinicName: '',
    startTime: '',
    openingPeriod: 'AM',
    endTime: '',
    closingPeriod: 'PM',
    landmark: '',
    city: '',
    state: '',
    mobile: '',
    email: '',
    pincode: '',
     type: "Clinic",
    address: "",
    country: "",
     latitude: 56.1304,
    longitude: -106.3468,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to add clinic.');
    }
  };

  console.log('Form state:', form);

  return (
    <ScrollView style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter clinic name"
        value={form.clinicName}
        onChangeText={(text) => handleChange('clinicName', text)}
      />

      {/* Opening & Closing Time */}
      <Text style={styles.label}>Opening & Closing Time</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.timeInput}
          placeholder="9"
          keyboardType="numeric"
          value={form.startTime}
          onChangeText={(text) => handleChange('startTime', text)}
        />
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            form.openingPeriod === 'AM' && styles.activeBtn,
          ]}
          onPress={() => handleChange('openingPeriod', 'AM')}
        >
          <Text style={styles.toggleText}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            form.openingPeriod === 'PM' && styles.activeBtn,
          ]}
          onPress={() => handleChange('openingPeriod', 'PM')}
        >
          <Text style={styles.toggleText}>PM</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TextInput
          style={styles.timeInput}
          placeholder="11"
          keyboardType="numeric"
          value={form.endTime}
          onChangeText={(text) => handleChange('endTime', text)}
        />
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            form.closingPeriod === 'AM' && styles.activeBtn,
          ]}
          onPress={() => handleChange('closingPeriod', 'AM')}
        >
          <Text style={styles.toggleText}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            form.closingPeriod === 'PM' && styles.activeBtn,
          ]}
          onPress={() => handleChange('closingPeriod', 'PM')}
        >
          <Text style={styles.toggleText}>PM</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Enter OPD address"
        multiline
        numberOfLines={3}
        value={form.address}
        onChangeText={(text) => handleChange('address', text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter landmark"
        value={form.landmark}
        onChangeText={(text) => handleChange('landmark', text)}
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="Enter city"
          value={form.city}
          onChangeText={(text) => handleChange('city', text)}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Enter state"
          value={form.state}
          onChangeText={(text) => handleChange('state', text)}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter 10-digit mobile number"
        keyboardType="numeric"
        value={form.mobile}
        onChangeText={(text) => handleChange('mobile', text)}
        maxLength={10}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter email address"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(text) => handleChange('email', text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter pincode"
        keyboardType="numeric"
        value={form.pincode}
        onChangeText={(text) => handleChange('pincode', text)}
      />

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setForm({ ...form, clinicName: '' })}>
          <Text style={styles.cancelText}>✖ Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit}>
          <Text style={styles.confirmText}>✔ Confirm</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AddClinicForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    padding: 16,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  textarea: {
    height: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
  },
  activeBtn: {
    backgroundColor: '#3B82F6',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 20,
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
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});
