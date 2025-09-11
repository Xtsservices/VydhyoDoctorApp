import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Platform,
  Modal, ActivityIndicator
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
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails.role === "doctor" ? currentuserDetails.userId : currentuserDetails.createdBy
  console.log(currentuserDetails.consultationModeFee[0]?.fee, "currentuserDetails")// Make sure your Redux state has currentUser with firstname and lastname
  const [gender, setGender] = useState('Male');
  const [selectedTime, setSelectedTime] = useState('10:30 AM');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [searchMobile, setSearchMobile] = useState('');
  const navigation = useNavigation<any>();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const validateAge = (age: string): boolean => {
    if (!age) return false;
    // Valid formats: 6m, 2y, 15d, 1y 2m, 3m 15d, etc.
    return /^(\d+[myd])(\s\d+[myd])*$/i.test(age.replace(/\s+/g, ' ').trim());
  };
  const [noSlotsModalVisible, setNoSlotsModalVisible] = useState(false);
  const calculateAgeFromDOB = (dob: string): string => {
    if (!dob) return "";

    const dobDate = moment(dob, "DD-MM-YYYY").toDate();
    const today = new Date();

    // Calculate years, months and days
    let years = today.getFullYear() - dobDate.getFullYear();
    let months = today.getMonth() - dobDate.getMonth();
    let days = today.getDate() - dobDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      // Get days in the previous month
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    let ageText = "";

    if (years > 0) {
      ageText += `${years}y `;
    }

    if (months > 0) {
      ageText += `${months}m `;
    }

    if (days > 0 || ageText === "") {
      ageText += `${days}d`;
    }

    return ageText.trim();
  };
  const [fieldsDisabled, setFieldsDisabled] = useState(false);
  const [timeSlots, setTimeSlots] = useState([])
  const [patientformData, setpatientFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
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
    department: currentuserDetails?.specialization?.name || '',
    appointmentDate: '',
    selectedTime: '',
    paymentMethod: 'UPI Payment',
    visitReason: '',
    fee: currentuserDetails?.consultationModeFee?.[0]?.fee?.toString() || '', // Add this line
    clinicName: '',
    clinicAddressId: ''
  });
  const [patientId, setPatientId] = useState<string>('');
  const [userData, setUserDate] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showappointmentDatePicker, setShowappointmentDatePicker] = useState(false)
  const [activeclinicsData, setActiveclinicsData] = useState<any[]>([])
  const [patientNames, setPatientNames] = useState<any[]>([]);
  const [isPatientSelectModalVisible, setPatientSelectModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [message, setMessage] = useState('')
  const [isPatientAdded, setIsPatientAdded] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    // Clear any previous errors for this field
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

    let validatedValue = value;

    if (field === "firstName" || field === "lastName") {
      const onlyAlphabets = value.replace(/[^A-Za-z ]/g, "");
      setpatientFormData((prev) => ({ ...prev, [field]: onlyAlphabets }));
      return;
    }

    if (field === "mobile") {
      let digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length === 1 && !/^[6-9]/.test(digitsOnly)) {
        return;
      }
      if (digitsOnly.length > 10) {
        digitsOnly = digitsOnly.slice(0, 10);
      }
      validatedValue = digitsOnly;
    }

    if (field === "age") {
      // Allow numbers followed by 'm', 'y', or 'd' (months, years, days)
      validatedValue = value.replace(/[^0-9myd]/gi, "");

      // Limit length to prevent very long inputs
      if (validatedValue.length > 5) {
        validatedValue = validatedValue.slice(0, 5);
      }
    }

    // Update the state
    setpatientFormData((prev) => {
      const newData = { ...prev, [field]: validatedValue };

      // If date of birth is changed, automatically update the age field
      if (field === "dob") {
        if (validatedValue) {
          const calculatedAge = calculateAgeFromDOB(validatedValue);
          if (calculatedAge) {
            newData.age = calculatedAge;
          }
        } else {
          // Clear age if date of birth is cleared
          newData.age = "";
        }
      }

      // If age is changed and follows the pattern (e.g., "2m"), calculate date of birth
      if (field === "age" && validatedValue && /^\d+[myd]$/i.test(validatedValue)) {
        const today = new Date();
        const ageValue = parseInt(validatedValue);
        const ageUnit = validatedValue.slice(-1).toLowerCase();

        let calculatedDOB = new Date();

        if (ageUnit === 'y') {
          // Years
          calculatedDOB.setFullYear(today.getFullYear() - ageValue);
        } else if (ageUnit === 'm') {
          // Months
          calculatedDOB.setMonth(today.getMonth() - ageValue);
        } else if (ageUnit === 'd') {
          // Days
          calculatedDOB.setDate(today.getDate() - ageValue);
        }

        // Format as DD-MM-YYYY
        const day = String(calculatedDOB.getDate()).padStart(2, '0');
        const month = String(calculatedDOB.getMonth() + 1).padStart(2, '0');
        const year = calculatedDOB.getFullYear();

        newData.dob = `${day}-${month}-${year}`;
      }

      return newData;
    });
  };

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
  const fetchUserProfile = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');

      if (storedToken) {
        const profileResponse = await AuthFetch(`users/getUser?userId=${doctorId}`, storedToken);

        console.log('Profile:123', profileResponse);
        if (profileResponse.data.status === 'success') {
          const doctorDetails = profileResponse.data.data
          setFormData((prev) => ({
            ...prev,
            department: doctorDetails?.specialization?.name
            ,
          }));
        }

        // Do something with profileResponse
      } else {
        console.warn('No auth token found');
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  useEffect(() => {

    if (currentuserDetails.role !== 'doctor') {
      fetchUserProfile()
    }
    if (formData.appointmentDate && formData.clinicAddressId && doctorId) {
      console.log("patient")
      fetchTimeSlots(formData.appointmentDate, formData.clinicAddressId);
    } else {
      setTimeSlots([]);
      // setPatientData((prev) => ({ ...prev, selectedTimeSlot: "" }));
    }
  }, [formData.appointmentDate, formData.clinicAddressId, fetchTimeSlots]);

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = `${selectedDate.getDate().toString().padStart(2, '0')}-${(selectedDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${selectedDate.getFullYear()}`;
      handleInputChange("dob", formattedDate);
    }
  };
  const handleSearch = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`doctor/searchUser?mobile=${searchMobile}`, token);
      console.log(response, "selected patient details")
      if (response?.status === "success") {
        const patients = response.data.data;
        console.log(patients, "selectedPatientDetails")

        if (patients.length > 0) {
          if (patients.length === 1) {
            prefillPatientDetails(patients[0]);
            setFieldsDisabled(true);
            Alert.alert('Patient Found', 'Patient details have been filled.');
          } else {
            setPatientNames(patients); // store patients for modal
            setPatientSelectModalVisible(true); // open modal
          }
        } else if (patients) {
          prefillPatientDetails(patients);
          setFieldsDisabled(true);
          Alert.alert('Patient Found', 'Patient details have been filled.');
        } else {
          Alert.alert('Not Found', 'Patient does not exist. Please add patient.');
          setFieldsDisabled(false);
        }
      } else {
        Alert.alert(response?.message?.message || "no User found PLease add patient")
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const [patientCreated, setPatientCreated] = useState(false);

const isAddPatientDisabled =
  patientCreated || !patientformData.age || !validateAge(patientformData.age);

  const prefillPatientDetails = (patient: any) => {
    console.log(patient, "selectedpatient")
    setpatientFormData({
      firstName: patient?.firstname,
      lastName: patient?.lastname,
      dob: patient?.DOB,
      age: patient?.age || '', // optionally calculate
      gender: patient?.gender,
      mobile: patient?.mobile,
    });
    setPatientCreated(true)
    setPatientId(patient.userId)
  };


  const handleAddPatient = async () => {
    // Validate age format
    if (patientformData.age && !validateAge(patientformData.age)) {
      setFieldErrors({ age: "Invalid age format. Use format like 6m, 2y, or 15d" });
      return;
    }

    console.log('Adding patient with data:', patientformData);

 if (!patientformData.age) {
    setFieldErrors({ age: "Age is required. Use formats like 6m, 2y, or 15d" });
    return;
  }
  // Validate age format
  if (patientformData.age && !validateAge(patientformData.age)) {
    setFieldErrors({ age: "Invalid age format. Use format like 6m, 2y, or 15d" });
    return;
  }

    try {
      const token = await AsyncStorage.getItem('authToken');
      const payload = {
        firstname: patientformData.firstName,
        lastname: patientformData.lastName,
        gender: patientformData.gender,
        DOB: patientformData.dob || '',
        mobile: patientformData.mobile,
        age: patientformData.age || calculateAge(patientformData.dob) || "0"
      };

      console.log(payload, 'payload details')
      const response = await AuthPost('doctor/createPatient', payload, token);
      console.log(response, 'patient response')
      if (response?.status === 'success') {
        const data = response?.data
        setIsPatientAdded(true)

        setPatientId(data?.data?.userId || '');
        console.log('Add patient response:', data);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Patient Added Successfully',
          position: 'top',
          visibilityTime: 3000,
        });
setPatientCreated(true)
        setpatientFormData({
          firstName: data.data?.firstname || '',
          lastName: data.data?.lastname || '',
          gender: data.data?.gender,
          dob: data.data?.DOB || '',
          age: data.data?.age || '',
          mobile: data.data?.mobile || '',
        });
      }else{
        console.log("123")
        Alert.alert("Error", response?.message?.message)
      }

    } catch (error) {
      console.error('Add patient error:', error);
      Alert.alert('Error', 'Failed to add patient');
    }
  };

  const handleCreateAppointment = async () => {
    setIsProcessingPayment(true); // Start loading

    try {
      const token = await AsyncStorage.getItem('authToken');

      console.log(patientformData, patientId, formData, "selectedPatientForm Data")

      if (!token) {
        Alert.alert('Authentication Error', 'Please login again.');
        setIsProcessingPayment(false); // Stop loading on error
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
        addressId: patientData.clinicAddressId,
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
        appSource: "walkIn"
      };

      console.log('Final appointment payload:', appointmentRequest);

      const response = await AuthPost('appointment/createAppointment', appointmentRequest, token);

      console.log('Create appointment response:', response);

      if (response.status === 'success') {
        Alert.alert('Success', 'Appointment created successfully!');
        navigation.navigate('DoctorDashboard'); // Optional: navigate back
      } else {
        Alert.alert(response?.message?.message || 'Error', 'Please fill all fields');
        Toast.show({
          type: 'error',
          text1: 'error',
          text2: response?.message?.message || "Please fill all fields",
          position: 'top',
          visibilityTime: 3000,
        });
      }

    } catch (error: any) {
      console.error('Create appointment error:', error);
      Toast.show({
        type: 'error',
        text1: 'error',
        text2: error.response?.data?.message || "Please fill all fields",
        position: 'top',
        visibilityTime: 3000,
      });
      Alert.alert('Error', error.response?.data?.message || 'Failed to create appointment');
    } finally {
      setIsProcessingPayment(false); // Stop loading in all cases
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

        if (response.status === "success") {
          let clinics: any[] = [];
          if ('data' in response && Array.isArray(response.data?.data)) {
            clinics = response.data.data;
          }
          if (clinics.length > 0) {
            const activeClinics = clinics.filter((clinic: { status: string; }) => clinic.status === "Active");
            setActiveclinicsData(activeClinics);
          } else {
            Toast.show({
              type: 'error',
              text1: 'error',
              text2: 'No Clinics Found',
              position: 'top',
              visibilityTime: 3000,
            });
          }
        }

      } catch (error) {
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

      console.log(selectedDate, clinicId, doctorId, token, "requiredData for fetching slots");

      const response = await AuthFetch(
        `appointment/getSlotsByDoctorIdAndDate?doctorId=${doctorId}&date=${formattedDate}&addressId=${clinicId}`,
        token
      );

      console.log(response, "selectedTimeSlots");

      if (response?.status === "success" && response?.data?.data?.slots) {
        const availableSlots = response.data.data.slots
          .filter((slot: { status: string }) => slot.status === "available")
          .map((slot: { time: any }) => {
            // Store the original time in HH:mm format for the value
            const originalTime = slot.time;

            // Format the time from 24-hour to 12-hour format for display
            const [hours, minutes] = slot.time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12; // Convert to 12-hour format
            const displayTime = `${hour12}:${minutes} ${ampm}`;

            return {
              display: displayTime,    // For display (e.g., "3:00 PM")
              value: originalTime      // For value (e.g., "15:00")
            };
          })
          .filter((timeObj: any) => {
            const slotMoment = moment(`${formattedDate} ${timeObj.value}`, "YYYY-MM-DD HH:mm");
            return slotMoment.isAfter(moment());
          });

        console.log(availableSlots);

        if (availableSlots.length === 0) {
          // Show the modal when no slots are available
          setNoSlotsModalVisible(true);
        }

        setTimeSlots(availableSlots);
      } else if (response.status === "success") {
        setTimeSlots([]);
        // Show the modal when no slots are found
        setNoSlotsModalVisible(true);
      } else if (response.status === 'error') {
        console.log("no slots found");
        setMessage(`*${response?.message?.message}` || "*No slots Found");
        // Show the modal when there's an error indicating no slots
        setNoSlotsModalVisible(true);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      // Show the modal when there's an error
      setNoSlotsModalVisible(true);
      setTimeSlots([]);
    }
  }, []);


  const calculateAge = useCallback((dob: string): string => {
    if (!dob) return "";
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

  console.log(formData, "complete form data")

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
            maxLength={10}
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
      {/* No Slots Available Modal */}
<Modal
  visible={noSlotsModalVisible}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setNoSlotsModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      {/* Close button in top right corner */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => setNoSlotsModalVisible(false)}
      >
        <Ionicons name="close" size={24} color="#6B7280" />
      </TouchableOpacity>
      
      <View style={styles.modalHeader}>
        <Ionicons name="warning" size={24} color="#f59e0b" style={{ marginBottom: 10 }} />
        <Text style={styles.modalTitle}>No Slots Available</Text>
      </View>
      
      <Text style={styles.modalMessage}>
        There are no available time slots for the selected clinic on the selected date.
        Please choose a different date or clinic.
      </Text>
      
      {/* Single action button */}
      <TouchableOpacity
        style={styles.singleActionButton}
        onPress={() => {
          setNoSlotsModalVisible(false);
          navigation.navigate('Availability');
        }}
      >
        <Text style={styles.singleActionButtonText}>Go to Availability Settings</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

      <Modal
        visible={isPatientSelectModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPatientSelectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {patientNames.map((patient: any) => (
                <TouchableOpacity
                  key={patient._id}
                  style={styles.patientOption}

                  onPress={() => {
                    prefillPatientDetails(patient);
                    setFieldsDisabled(true);
                    setPatientSelectModalVisible(false);
                  }}
                >
                  <Text style={styles.patientText}>{patient.firstname} {patient.lastname} </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPatientSelectModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


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

      <View style={styles.patientsContainer}>
        <Text style={styles.sectionTitle}>Patient Information</Text>


        <View style={styles.row}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>First Name*</Text>
            <TextInput
              placeholder="First Name"
              style={styles.inputFlex}
              value={patientformData.firstName}
              onChangeText={(text) => handleInputChange("firstName", text)}
              editable={!isPatientAdded}
              placeholderTextColor="#9CA3AF"

            />
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              placeholder="Last Name"
              style={styles.inputFlex}
              value={patientformData.lastName}
              onChangeText={(text) => handleInputChange("lastName", text)}
              editable={!isPatientAdded}
              placeholderTextColor="#9CA3AF"

            />
          </View>
        </View>


        <View style={styles.row}>
          {/* Date of Birth Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Date of Birth*</Text>
            <TouchableOpacity
              style={styles.inputFlex}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: patientformData.dob ? '#000' : '#9CA3AF' }}>
                {patientformData.dob || 'DD-MM-YYYY'}
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
            <Text style={styles.label}>Age*</Text>
            <TextInput
              placeholder="e.g., 2y, 6m, 15d"
              style={styles.inputFlex}
              placeholderTextColor="#9CA3AF"
              value={patientformData.age}
              onChangeText={(text) => handleInputChange("age", text)}
              editable={!patientformData.dob}
              maxLength={5}
            />
            {fieldErrors.age && <Text style={styles.errorText}>{fieldErrors.age}</Text>}
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
            onChangeText={(text) => handleInputChange("mobile", text)}
            editable={!isPatientAdded}
            onBlur={() => validateMobile(patientformData.mobile)}
            placeholderTextColor="#9CA3AF"
          />
          {mobileError && <Text style={styles.errorText}>{mobileError}</Text>}
        </View>

        <Text style={styles.label}>Gender*</Text>
        <View style={styles.radioRow}>
          {['Male', 'Female', 'Other'].map((option) => (
            <View key={option} style={styles.radioItem}>
              <RadioButton
                value={option}
                status={patientformData.gender === option ? 'checked' : 'unchecked'}
                onPress={() => setpatientFormData({ ...patientformData, gender: option })}
              />
              <Text style={styles.radioText}>{option}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
  style={[styles.addButton, isAddPatientDisabled && styles.disabledButton]}
  onPress={handleAddPatient}
  disabled={isAddPatientDisabled}
>
  <Text style={styles.addButtonText}>Add Patient</Text>
</TouchableOpacity>

      </View>

      <View style={styles.patientsContainer}>


        <Text style={styles.sectionTitle}>Appointment Information</Text>
        <Text style={styles.inputColor}>Appointment Type *</Text>
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
        <Text style={styles.label}>Department *</Text>
        <View style={styles.pickerContainer} >
          <TextInput
            style={styles.input}
            value={formData?.department || currentuserDetails?.
              specialization?.name || ""}
              accessibilityState={{ disabled: true }}
          // onChangeText={(text) => setFormData({ ...formData, department: text })}
          />

        </View>

        <Text style={styles.label}>Appointment Date *</Text>

        <View style={styles.pickerContainer}>
          <TouchableOpacity style={styles.input} onPress={() => setShowappointmentDatePicker(true)}>
            <Text style={{ color: patientformData.dob ? '#000' : '#000', marginLeft: 5 }}>
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

        <Text style={styles.label}>Clinic Name *</Text>

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

        <Text style={styles.label}>Available Slots *</Text>
        <View style={styles.timeSlotContainer}>
          {timeSlots.length > 0 ? (
            timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot.value} // Use the value as key
                onPress={() => setFormData({ ...formData, selectedTime: slot.value })}
                style={[
                  styles.timeSlot,
                  formData.selectedTime === slot.value && styles.timeSlotSelected,
                ]}
              >
                <Text
                  style={
                    formData.selectedTime === slot.value
                      ? styles.timeSelectedText
                      : styles.timeText
                  }
                >
                  {slot.display} {/* Display the formatted time */}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.errorMessage}>{message}</Text>
          )}
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

      <View style={styles.patientsContainer}>


        <Text style={styles.sectionTitle}>Payment</Text>
        <TextInput
          placeholder="Consultation Fee"
          placeholderTextColor="#9CA3AF"
          style={styles.inputFlex}
          keyboardType="numeric"
          value={formData.fee || currentuserDetails.consultationModeFee[0]?.fee || ""}
          onChangeText={(text) => setFormData({ ...formData, fee: text })}
        />
        {/* Action Buttons */}
        {/* Action Buttons */}
        <View style={styles.container}>
          <TouchableOpacity
            style={[styles.payNowButton, isProcessingPayment && styles.disabledButton]}
            onPress={handleCreateAppointment}
            disabled={isProcessingPayment}
          >
            {isProcessingPayment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.payNowText, styles.inputColor]}>Pay Now</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  );
};

export default AddAppointment;

const styles = StyleSheet.create({
  container: { backgroundColor: '#F0FDF4', paddingTop: 5, paddingHorizontal: 20, marginBottom: 50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,

  },
  inputColor: {
    color: '#0c0c0cff'
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },

  searchRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc', // Gray out when disabled
    opacity: 0.7,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 16,
    marginLeft: 20,
    gap: 10,           // Add this for spacing between slots
    rowGap: 10,        // Add this for vertical spacing between rows
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#1f2937',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#374151',
    lineHeight: 22,
  },
  closeButton: {
  position: 'absolute',
  top: 15,
  right: 15,
  zIndex: 1,
},
singleActionButton: {
  backgroundColor: '#2563EB',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 20,
  width: '100%',
},
singleActionButtonText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 16,
},
  modalButtonContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  marginTop: 15,
},
modalSecondaryButton: {
  backgroundColor: '#6B7280',
  flex: 1,
  marginRight: 10,
},
modalPrimaryButton: {
  backgroundColor: '#2563EB',
  flex: 1,
},
modalPrimaryButtonText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 14,
},
modalButton: {
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
},
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
  errorMessage: {
    color: 'red'
  },

  searchIcon: {
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: '80%',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  patientOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  patientText: {
    color: 'black'
  },

  cancelButton: {
    marginTop: 15,
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  input: {
    flex: 1,
    paddingVertical: 8,
    color: '#000',
  },

  patientsContainer: {
    borderRadius: 12,
    opacity: 1,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginBottom: 20 // optional, for visibility
  },



  inputFlex: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10,
    flex: 1, marginRight: 10,
    color: 'black'
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
    flexDirection: 'row',
    flexWrap: 'wrap', // Allows wrapping to next line on very small screens or large fonts
    marginBottom: 16,
    justifyContent: 'flex-start', // Align left, no forced spacing constraints
    paddingHorizontal: 5, // Optional: Light padding for edge breathing room
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30, // Adjustable spacing between items (increase if needed for your design)
    marginBottom: 8, // Space if items wrap to next line
    flexShrink: 0, // Prevent shrinking to avoid text clipping
  },
  radioText: {
    color: '#000',
    fontSize: 16,
    marginLeft: 8, // Space between radio button and text
  },
  timeSlot: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    minWidth: 100, // Add minimum width
    alignItems: 'center', // Center content horizontally
    justifyContent: 'center', // Center content vertically
  },
  timeSlotSelected: {
    backgroundColor: '#0a84ff', borderColor: '#0bc148ff',
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
    flexDirection: 'row', alignItems: 'center', marginBottom: 6, color: 'black'
  },
  paymentMethodText: {
    color: 'black',
    fontWeight: '500',
  },
  payNowButton: {
    backgroundColor: '#28a745', padding: 14,
    alignItems: 'center', borderRadius: 8,
    marginTop: 20,
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
    color: 'black'
  },
});
// Removed unused moment function as date parsing is handled inline.


