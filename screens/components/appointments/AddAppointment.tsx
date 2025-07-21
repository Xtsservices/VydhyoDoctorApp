import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,Dimensions,Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
const { width, height } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from "moment";


const AddAppointment = () => {
    const userId = useSelector((state: any) => state.currentUserId);
    const currentuserDetails =  useSelector((state: any) => state.currentUser);
    const doctorId = currentuserDetails.role==="doctor"? currentuserDetails.userId : currentuserDetails.createdBy
    console.log(currentuserDetails, "currentuserDetails")// Make sure your Redux state has currentUser with firstname and lastname
  const [gender, setGender] = useState('Male');
  const [selectedTime, setSelectedTime] = useState('10:30 AM');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [searchMobile, setSearchMobile] = useState('');
  const navigation = useNavigation<any>();
   const [mobileError, setMobileError] = useState<string | null>(null);
   
     const [fieldsDisabled, setFieldsDisabled] = useState(false);
  const [timeSlots , setTimeSlots] = useState([])
const [patientformData, setpatientFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male',
    dob: '',
    age: '',
    mobile: '',
  });
  const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  dob: '',
  age: '',
  gender: '',
  appointmentType: '',
  department: '',
  appointmentDate: '',
  selectedTime: '',
  paymentMethod: 'UPI Payment',
  visitReason: '',
  fee:"",
  clinicName:'',
  clinicAddressId:''
});
const [patientId, setPatientId] = useState<string>('');
const [userData,setUserDate] = useState<any>(null);
 const [showDatePicker, setShowDatePicker] = useState(false);
 const [showappointmentDatePicker, setShowappointmentDatePicker] =useState(false)
 const [activeclinicsData, setActiveclinicsData] = useState<any[]>([])


const validateMobile = (value: string) => {
  const regex = /^[6-9]\d{9}$/;
  if (!regex.test(value)) {
    setMobileError('Please enter a valid 10-digit mobile number');
  } else {
    setMobileError(null);
  }
};

const formatDOBToDDMMYYYY = (dobString: string): string => {
    console.log('Formatting DOB:', dobString);
  const [month, day, year] = dobString.split('/');
  return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
};

 const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = `${selectedDate.getDate().toString().padStart(2, '0')}-${(selectedDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${selectedDate.getFullYear()}`;
      setpatientFormData({ ...patientformData, dob: formattedDate });
    }
  };
const handleSearch = async () => {
  try {
    console.log('Searching for patient with mobile:', searchMobile);
    const token = await AsyncStorage.getItem('authToken');
    console.log('Auth Token:', token);
    const response = await AuthFetch(`doctor/searchUser?mobile=${searchMobile}`, token);
console.log('Search response:', response);

    if ('data' in response && response.data?.data?.totalAppointments) {
      const patients = response.data.data.totalAppointments;
      const matched = patients.find(
        (item: any) => item.mobile === patientformData.mobile
      );

      if (matched) {
        setpatientFormData({
          firstName: matched.firstname,
          lastName: matched.lastname,
          dob: matched.DOB,
          age: '', // optional: you can auto-calculate age
          gender: matched.gender,
          mobile: matched.mobile,
        });
        setFieldsDisabled(true);
        Alert.alert('Patient Found', 'Patient details have been filled.');
      } else {
        Alert.alert('Not Found', 'Patient does not exist. Please add patient.');
        setFieldsDisabled(false);
      }
    }
  } catch (error) {
    console.error('Search error:', error);
  }
};

 const handleAddPatient = async () => {
    console.log('Adding patient with data:', patientformData);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const payload = {
  firstname: patientformData.firstName,
  lastname: patientformData.lastName,
  gender: patientformData.gender,
  DOB: patientformData.dob,
  mobile: patientformData.mobile,
  age: patientformData.age || calculateAge(patientformData.dob)
};
      const response = await AuthPost('doctor/createPatient', payload, token);
      const data = 'data' in response ? response.data : null;
      setPatientId(data.data.userId || ''); // Assuming userId is returned in the response
      console.log('Add patient response:', data);
       Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Patient Added Successfully',
                  position: 'top',
                  visibilityTime: 3000,
                });

               setpatientFormData({
    firstName: data.data?.firstname || '',
    lastName: data.data?.lastname || '',
    gender: data.data?.gender,
    dob: data.data?.DOB || '',
    age: data.data?.age || '',
    mobile: data.data?.mobile || '',
  });
    } catch (error) {
      console.error('Add patient error:', error);
      Alert.alert('Error', 'Failed to add patient');
    }
  };

const handleCreateAppointment = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');

   

    if (!token) {
      Alert.alert('Authentication Error', 'Please login again.');
      return;
    }
    const discount = 0;
    const discountType = 'percentage';
    const paymentStatus = 'paid';

    const patientData = { ...formData, ...patientformData };
 console.log('Creating appointment with data:', patientData);

 const [day, month, year] = patientData.appointmentDate.split("-");

const formattedDate = `${year}-${month}-${day}`;
    const appointmentRequest = {
      userId: patientId,
      doctorId: doctorId,
      doctorName: `${currentuserDetails.firstName} ${currentuserDetails.lastName}`,
      patientName: `${patientData.firstName} ${patientData.lastName}`,
      addressId:patientData.
clinicAddressId,
      appointmentType: patientData.appointmentType,
      appointmentDepartment: patientData.department,
      appointmentDate: formattedDate,
    appointmentTime: patientData.selectedTime,
      appointmentStatus: 'scheduled',
      appointmentReason: patientData.visitReason || 'Not specified',
      amount: patientData.fee,
      discount: discount,
      discountType: discountType,
      paymentStatus: paymentStatus,
    };

    console.log('Final appointment payload:', appointmentRequest);

    const response = await AuthPost('appointment/createAppointment', appointmentRequest, token);

    console.log('Create appointment response:', response);

    if (response.status === 'success') {
      Alert.alert('Success', 'Appointment created successfully!');
      navigation.goBack(); // Optional: navigate back
    } else {
    //   Alert.alert('Error', response.message || 'Failed to create appointment');
    }

  } catch (error: any) {
    console.error('Create appointment error:', error);
    Alert.alert('Error', error.response?.data?.message || 'Failed to create appointment');
  }
};

const handleBack = () => {
    navigation.goBack();
  };

  useEffect(() => {
    const fetchClinicAddress = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        console.log(token, doctorId, "to be sent details")
        const response = await AuthFetch(`users/getClinicAddress?doctorId=${doctorId}`, token);
       
        if (response.status === "success"){
let clinics: any[] = [];
if ('data' in response && Array.isArray(response.data?.data)) {
  clinics = response.data.data;
}
if (clinics.length > 0) {
  const activeClinics = clinics.filter((clinic: { status: string; }) => clinic.status === "Active");
  setActiveclinicsData(activeClinics);
} else {
  Toast.show({
    type: 'Error',
    text1: 'Error',
    text2: 'No Clinics Found',
    position: 'top',
    visibilityTime: 3000,
  });
}
      } 
    
    }catch (error) {
         Toast.show({
    type: 'Error',
    text1: 'Error',
    text2: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error',
    position: 'top',
    visibilityTime: 3000,
  });// handle error if needed
      }
    }
     
    fetchClinicAddress();
  }, []);

   const fetchTimeSlots = useCallback(async (selectedDate: any, clinicId: any) => {


      if (!selectedDate || !clinicId || !doctorId) return;

      try {
        const token = await AsyncStorage.getItem('authToken');
        const [day, month, year] = selectedDate.split("-");

const formattedDate = `${year}-${month}-${day}`;
        console.log(selectedDate, clinicId, doctorId, token, "requiredData for fetching slots")
        
        const response = await AuthFetch(
          `appointment/getSlotsByDoctorIdAndDate?doctorId=${doctorId}&date=${formattedDate}&addressId=${clinicId}`,
          token
        );

        console.log(response, "selectedTimeSlots")
        const data = 'data' in response ? response.data : null;

      if (data.status === "success" && data.data?.slots && data.data.addressId === clinicId) {
       const availableSlots = data.data.slots
  .filter((slot: { status: string; }) => slot.status === "available")
  .map((slot: { time: any; }) => slot.time) // no need to format
  .filter((time: any) => {
    const slotMoment = moment(`${formattedDate} ${time}`, "YYYY-MM-DD HH:mm");
    return slotMoment.isAfter(moment());
  });
        setTimeSlots(availableSlots);
       
   
      } else {
        setTimeSlots([]);
       
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setTimeSlots([]);
     
    } 
  }, []);

  
     useEffect(() => {
    if (formData.appointmentDate && formData.clinicAddressId && doctorId) {
      console.log("patient")
      fetchTimeSlots(formData.appointmentDate, formData.clinicAddressId);
    } else {
      setTimeSlots([]);
      // setPatientData((prev) => ({ ...prev, selectedTimeSlot: "" }));
    }
  }, [formData.appointmentDate, formData.clinicAddressId, fetchTimeSlots]);

  const calculateAge = useCallback((dob: string): string => {
  if (!dob ) return "";
  const [day, month, year] = dob.split('-');
  const dobDate = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const monthDiff = today.getMonth() - dobDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
    age--;
  }
  return String(age);
}, []);

  return (
    <ScrollView style={styles.container}>
     
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Walk-In Consultation</Text>
        <Ionicons name="ellipsis-vertical" size={22} color="#333" />
      </View> */}
<Text style={styles.sectionTitle}>Search By Mobile Number</Text>
      <View style={styles.searchRow}>
  <View style={styles.inputContainer}>
    <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
    <TextInput
      placeholder="Enter mobile number"
      style={styles.input}
      keyboardType="number-pad"
      value={searchMobile}
      onChangeText={setSearchMobile}
      placeholderTextColor="#9CA3AF"
    />
  </View>
  <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
    <Text style={styles.searchButtonText}>Search</Text>
  </TouchableOpacity>
</View>

     {/* <View style={styles.searchRow}>
  <Ionicons name="search" size={24} color="#0a84ff" />
  <TextInput
    placeholder="Enter mobile number"
    style={styles.input}
    keyboardType="number-pad"
    value={searchMobile}
    onChangeText={setSearchMobile}
  />
  <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
    <Text style={styles.searchButtonText}>Search</Text>
  </TouchableOpacity>
</View> */}
  
     <View  style={styles.patientsContainer}>
      <Text style={styles.sectionTitle}>Patient Information</Text>
     
      
      <View style={styles.row}>
   <View style={styles.inputWrapper}>
    <Text style={styles.label}>First Name*</Text>
        <TextInput
          placeholder="First Name"
          style={styles.inputFlex}
          value={patientformData.firstName}
          onChangeText={(text) => setpatientFormData({ ...patientformData, firstName: text })}
        />
        </View>
           <View style={styles.inputWrapper}>
    <Text style={styles.label}>Last Name*</Text>
        <TextInput
          placeholder="Last Name"
          style={styles.inputFlex}
          value={patientformData.lastName}
          onChangeText={(text) => setpatientFormData({ ...patientformData, lastName: text })}
        />
        </View>
      </View>


      <View style={styles.row}>
         <View style={styles.inputWrapper}>
    <Text style={styles.label}>Date of Birth</Text>
         <TouchableOpacity style={styles.inputFlex} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: patientformData.dob ? '#000' : '#9CA3AF' }}>
                {patientformData.dob || 'DD/MM/YYYY'}
              </Text>
            </TouchableOpacity>

             {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
      </View>
<View style={styles.inputWrapper}>
    <Text style={styles.label}>Age</Text>

        <TextInput
          placeholder="Age"
          style={styles.inputFlex}
          keyboardType="numeric"
           value={
              patientformData.dob
                ? calculateAge(patientformData.dob) || patientformData.age
                : patientformData.age
            }
          onChangeText={(text) => setpatientFormData({ ...patientformData, age: text })}
          editable={!patientformData.dob} 
        /> 
        </View>     
      </View>
       <Text style={styles.label}>Mobile Number*</Text>
      <View style={styles.row}>
        
      <TextInput
        placeholder="Mobile Number"
        style={[styles.inputFlex, mobileError ? styles.errorInput : null]}
        keyboardType="phone-pad"
        maxLength={10}
        value={patientformData.mobile}
        onChangeText={(text: string) => {
          setpatientFormData({ ...patientformData, mobile: text });
          if (mobileError) validateMobile(text); // Live recheck if already errored
        }}
        onBlur={() => validateMobile(patientformData.mobile)}
      />
      {mobileError && <Text style={styles.errorText}>{mobileError}</Text>}
    </View>

      <Text style={styles.label}>Gender</Text>
      <View style={styles.radioRow}>
        {['Male', 'Female', 'Other'].map((option) => (
          <View key={option} style={styles.radioItem}>
            <RadioButton
              value={option}
              status={formData.gender === option ? 'checked' : 'unchecked'}
              onPress={() => setFormData({ ...formData, gender: option })}
            />
            <Text>{option}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddPatient}>
        <Text style={styles.addButtonText}>Add Patient</Text>
      </TouchableOpacity>
    </View>

  <View  style={styles.patientsContainer}>

  
      <Text style={styles.sectionTitle}>Appointment Information</Text>
      <Text>Appointment Type *</Text>
      <View style={styles.pickerContainer}>
  <Picker
    selectedValue={formData.appointmentType}
    onValueChange={(itemValue) =>
      setFormData((prev) => ({ ...prev, appointmentType: itemValue }))
    }
    style={styles.picker}
  >
    <Picker.Item label="Select Type" value="" />
    <Picker.Item label="New Walkin" value="new-walkin" />
    <Picker.Item label="New HomeCare" value="new-homecare" />
    <Picker.Item label="Followup Walkin" value="followup-walkin" />
    <Picker.Item label="Followup Video" value="followup-video" />
    <Picker.Item label="Followup Homecare" value="followup-homecare" />
  </Picker>
</View>
      <Text>Department *</Text>
     <View style={styles.pickerContainer}>
        <TextInput
          placeholder="Eg : cardio"
          value={formData.department}
          onChangeText={(text) => setFormData({ ...formData, department: text })}
        />
  {/* <Picker
    selectedValue={formData.department}
    onValueChange={(itemValue) =>
      setFormData((prev) => ({ ...prev, department: itemValue }))
    }
    style={styles.picker}
  >
    <Picker.Item label="Select Department" value="" />
    <Picker.Item label="Cardiology" value="cardiology" />
    <Picker.Item label="Neurology" value="neuro" />
    <Picker.Item label="Orthopedics" value="ortho" />
  </Picker> */}
</View>

<Text>Appointment Date *</Text>

<View style={styles.pickerContainer}>
         <TouchableOpacity style={styles.input} onPress={() => setShowappointmentDatePicker(true)}>
              <Text style={{ color: patientformData.dob ? '#000' : '#9CA3AF' }}>
               {formData.appointmentDate || 'DD/MM/YYYY'}
              </Text>
            </TouchableOpacity>

             {showappointmentDatePicker && (
<DateTimePicker
  value={
    formData.appointmentDate
      ? (() => {
          const [day, month, year] = formData.appointmentDate.split('-');
          if (day && month && year) {
            return new Date(Number(year), Number(month) - 1, Number(day));
          }
          return new Date();
        })()
      : new Date()
  }
  mode="date"
   minimumDate={new Date()}
  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
  onChange={(event, selectedDate) => {
     setShowappointmentDatePicker(false);
    if (selectedDate) {
      const formattedDate = `${selectedDate.getDate().toString().padStart(2, '0')}-${(selectedDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${selectedDate.getFullYear()}`;
      setFormData({ ...formData, appointmentDate: formattedDate });
    }
  }}
/>
      )}
           
      </View>

      <Text>Clinic Name *</Text>

       <View style={styles.pickerContainer}>
        <Picker
  selectedValue={formData.clinicName}
  onValueChange={(itemValue) => {
    const selectedClinic = activeclinicsData.find(
      (clinic: any) => clinic.clinicName === itemValue
    );
    setFormData((prev) => ({
      ...prev,
      clinicName: itemValue,
      clinicAddressId: selectedClinic?.addressId || "", 
    }));
  }}
  style={styles.picker}
>
  {/* <Picker
    selectedValue={formData.clinicName}
    onValueChange={(itemValue) =>
      setFormData((prev) => ({ ...prev, clinicName: itemValue }))
    }
    style={styles.picker}
  > */}
     <Picker.Item label="Select Clinic" value="" />

  {activeclinicsData.length > 0 &&
    activeclinicsData.map((clinic: any) => (
      <Picker.Item
        key={clinic._id || clinic.id} // use unique id
        label={clinic.
clinicName}
        value={clinic.clinicName}
      />
    ))}
   
  </Picker>
</View>
      {/* <TextInput placeholder="mm/dd/yyyy" style={styles.input}    value={formData.appointmentDate}
  onChangeText={(text) => setFormData({ ...formData, appointmentDate: text })}/> */}

      {/* Time Slots */}

      <Text>Available Slots *</Text>
      <View style={styles.timeSlotContainer}>
        {timeSlots.map((slot) => (
          <TouchableOpacity
            key={slot}
            onPress={() => setFormData({ ...formData, selectedTime: slot })}
style={[
  styles.timeSlot,
  formData.selectedTime === slot && styles.timeSlotSelected,
]}
          >
            <Text style={selectedTime === slot ? styles.timeSelectedText : styles.timeText}>
              {slot}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      </View>

      {/* Appointment Summary */}
      {/* <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Appointment Summary</Text>
        <Text>Doctor: <Text style={styles.summaryValue}></Text></Text>
        <Text>Patient: <Text style={styles.summaryValue}>John Doe</Text></Text>
        <Text>Department: <Text style={styles.summaryValue}>Cardiology</Text></Text>
        <Text>Date & Time: <Text style={styles.summaryValue}>Dec 15, 10:30 AM</Text></Text>
      </View> */}

      {/* Payment Section */}

       <View  style={styles.patientsContainer}>

       
      <Text style={styles.sectionTitle}>Payment</Text>
       <TextInput
          placeholder="Consultation Fee"
          style={styles.inputFlex}
          keyboardType="numeric"
          value={formData.fee}
          onChangeText={(text) => setFormData({ ...formData, fee: text })}
        />

      {['UPI Payment', 'Cash Payment', 'Debit Card', 'Credit Card'].map((method) => (
        <TouchableOpacity
          key={method}
          style={styles.paymentOption}
          onPress={() => setPaymentMethod(method)}
        >
          <RadioButton
            value={method}
            status={paymentMethod === method ? 'checked' : 'unchecked'}
            onPress={() => setPaymentMethod(method)}
          />
          <Text>{method}</Text>
        </TouchableOpacity>
      ))}

      {/* Action Buttons */}
      <View style={styles.container}>
      {/* Form Inputs (not shown here for brevity) */}

      <TouchableOpacity style={styles.payNowButton} onPress={handleCreateAppointment}>
        <Text style={styles.payNowText}>Pay Now ₹500</Text>
      </TouchableOpacity>
    </View>

      <TouchableOpacity style={styles.confirmButton}>
        <Text style={styles.confirmText}>Confirm Appointment</Text>
      </TouchableOpacity>
</View>

    </ScrollView>
  );
};

export default AddAppointment;

const styles = StyleSheet.create({
  container: {  backgroundColor: '#F0FDF4', paddingTop: 5, paddingHorizontal: 20, marginBottom:50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },

  searchRow: {
  flexDirection: 'row',
  marginBottom: 20,
  gap: 10,
  alignItems: 'center',
},

inputContainer: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingHorizontal: 10,
},

searchIcon: {
  marginRight: 6,
},

input: {
  flex: 1,
  paddingVertical: 8,
  color: '#000',
},

patientsContainer: {
  borderRadius: 12,
  opacity: 1,
  padding:5,
   borderWidth: 1,
    borderColor: '#ccc',
  backgroundColor: '#fff',
  marginBottom:20 // optional, for visibility
},


 
  inputFlex: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10,
    flex: 1, marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#2563EB'
,
    borderRadius: 8, padding: 10,
  },
  searchButtonText: { color: '#fff', fontWeight: '600' },
  sectionTitle: {
    fontSize: 16, fontWeight: '600', marginVertical: 10, color: '#333',
  },
  inputWrapper: {
  flex: 1,
},
  row: {
    flexDirection: 'row', marginBottom: 10,
  },
  label: { marginBottom: 5, color: 'black' },
  radioRow: {
    flexDirection: 'row', marginBottom: 16,
  },
  radioItem: {
    flexDirection: 'row', alignItems: 'center', marginRight: 16,
  },
  timeSlotContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 10,
  },
  timeSlot: {
    borderWidth: 1, borderColor: '#ccc', padding: 10,
    borderRadius: 8,
  },
  timeSlotSelected: {
    backgroundColor: '#0a84ff', borderColor: '#0a84ff',
  },
  timeText: { color: '#333' },
  timeSelectedText: { color: '#fff', fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#f1f5f9', padding: 16,
    borderRadius: 10, marginVertical: 12,
  },
  summaryTitle: {
    fontSize: 14, fontWeight: '600', marginBottom: 8,
  },
  summaryValue: { fontWeight: '500', color: '#111' },
  feeLabel: {
    fontSize: 15, fontWeight: '500', marginVertical: 10,
  },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
  },
  payNowButton: {
    backgroundColor: '#28a745', padding: 14,
    alignItems: 'center', borderRadius: 8, 
  },
  payNowText: { color: '#fff', fontWeight: '600' },
  confirmButton: {
    backgroundColor: '#ccc', padding: 14,
    alignItems: 'center', borderRadius: 8, marginTop: 10,
  },
  confirmText: { color: '#fff', fontWeight: '600' },
  backButton: {
    padding: width * 0.02,
  },
  
  addButton: {
    backgroundColor: '#0a84ff',
    padding: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
    pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginVertical: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
});
// Removed unused moment function as date parsing is handled inline.


