import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import DropDownPicker from 'react-native-dropdown-picker';

const AddStaffScreen = () => {
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails.role === "doctor" ? currentuserDetails.userId : currentuserDetails.createdBy
  const userId = currentuserDetails.userId
  const navigation = useNavigation<any>();
  const [openRoleDropdown, setOpenRoleDropdown] = useState(false);
  const [roleItems, setRoleItems] = useState([
    { label: "Select Role", value: "" },
    { label: "Lab Assistant", value: "lab_assistant" },
    { label: "Pharmacy Assistant", value: "pharmacy_assistant" },
    { label: "Assistant", value: "assistant" },
    { label: "Receptionist", value: "receptionist" }
  ]);


  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    DOB: '',
    gender: 'Male',
    mobile: '',
    email: '',
    role: '',
    access: [] as string[],
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = `${selectedDate.getDate().toString().padStart(2, '0')}-${(selectedDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${selectedDate.getFullYear()}`;
      setForm({ ...form, DOB: formattedDate });
    }
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.DOB || !form.mobile || !form.email || !form.role) {
      Toast.show({
        type: 'error',
        text1: 'Alert',
        text2: 'Please fill all required fields',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }
    if (!form.access || form.access.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Alert',
        text2: 'Please select at least one access',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }
    setIsLoading(true);
    const staffData = {
      firstname: form.firstName,
      lastname: form.lastName,
      DOB: form.DOB,
      gender: form.gender,
      mobile: form.mobile,
      email: form.email,
      role: form.role,
      access: form.access, // If backend expects a string, use: access: form.access.join(',')
    };


    try {
      const token = await AsyncStorage.getItem('authToken');
      // Replace with actual token if available
      // const userId = await AsyncStorage.getItem('userId'); // Retrieve userId from storage or context
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        return;
      }

      const response = await AuthPost(`doctor/createReceptionist/${userId}`, staffData, token);
      if (response.status === 'success') {
        if ('data' in response) {
        } else {
        }
        // Handle success case
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Staff Added Successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setForm({
          firstName: '',
          lastName: '',
          DOB: '',
          gender: 'Male',
          mobile: '',
          email: '',
          role: '',
          access: [] as string[],
        });
        navigation.navigate('StaffManagement' as never); // Navigate to Staff Management screen
      } else if (response.status === 'error') {
        // Handle error case
        const message =
          (response && 'message' in response && response.message?.message) ||
          (response && 'message' in response && typeof response.message === 'string' && response.message) ||
          'Failed to create staff';
        Alert.alert('Error', message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      <Text style={styles.title}>Add New Staff Member</Text>
      <Text style={styles.subtitle}>Fill in the details below to add a new staff member</Text>

      <Text style={styles.label}>First Name*</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter first name"
        value={form.firstName}
        onChangeText={(text) => setForm({ ...form, firstName: text })}
        placeholderTextColor={'gray'}

      />

      <Text style={styles.label}>Last Name*</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter last name"
        value={form.lastName}
        placeholderTextColor={'gray'}

        onChangeText={(text) => setForm({ ...form, lastName: text })}
      />
      <Text style={styles.label}>Date of Birth*</Text>


      <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: form.DOB ? '#000' : '#9CA3AF' }}>
          {form.DOB || 'DD/MM/YYYY'}
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

      <Text style={styles.label}>Gender*</Text>
      <View style={styles.genderGroup}>
        {['Male', 'Female', 'Other'].map((g) => (
          <TouchableOpacity
            key={g}
            style={styles.radioButton}
            onPress={() => setForm({ ...form, gender: g })}
          >
            <View style={[styles.radioCircle, form.gender === g && styles.selectedRadio]} />
            <Text style={styles.radioText}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Mobile Number*</Text>

      <TextInput
        style={styles.input}
        placeholder="+91 XXXXX XXXXX"
        keyboardType="phone-pad"
        value={form.mobile}
        maxLength={10}
        onChangeText={(text) => setForm({ ...form, mobile: text })}
        placeholderTextColor={'gray'}

      />
      <Text style={styles.label}>Email*</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter email address"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(text) => setForm({ ...form, email: text })}
        placeholderTextColor={'gray'}

      />
      <Text style={styles.label}>Role*</Text>
      <DropDownPicker
        open={openRoleDropdown}
        value={form.role}
        items={roleItems}
        setOpen={setOpenRoleDropdown}
        setValue={(callback) => {
          setForm(prev => ({ ...prev, role: callback(prev.role) }));
        }}
        setItems={setRoleItems}
        placeholder="Select Role"
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownList}
        textStyle={{ color: '#000' }}
        zIndex={3000}
        zIndexInverse={1000}
      />
      <Text style={styles.label}>Access*</Text>
      {[

        { value: "my-patients", label: "My Patients" },
        { value: "appointments", label: "Appointments" },
        { value: "labs", label: "Labs" },
        { value: "dashboard", label: "Dashboard" },
        { value: "pharmacy", label: "Pharmacy" },
        { value: "availability", label: "Availability" },
        { value: "staff-management", label: "Staff Management" },
        { value: "clinic-management", label: "Clinic Management" },
        { value: "billing", label: "Billing" },
        { value: "reviews", label: "Reviews" },
        // { label: 'View Patients', value: 'viewPatients' },
        // { label: 'Pharmacy', value: 'pharmacy' },
        // { label: 'Availability', value: 'availability' },
        // { label: 'Dashboard', value: 'dashboard' },
        // { label: 'Labs', value: 'labs' },
        // { label: 'Appointments', value: 'appointments' },
        // { label: ' New Appointments', value: 'New appointments' },

      ].map((item) => (
        <TouchableOpacity
          key={item.value}
          style={styles.checkboxRow}
          onPress={() => {
            setForm((prev) => {
              const exists = prev.access.includes(item.value);
              return {
                ...prev,
                access: exists
                  ? prev.access.filter((val) => val !== item.value)
                  : [...prev.access, item.value],
              };
            });
          }}
        >
          <Ionicons
            name={form.access.includes(item.value) ? 'checkbox' : 'square-outline'}
            size={22}
            color={form.access.includes(item.value) ? '#10B981' : '#6B7280'}
          />
          <Text style={styles.checkboxLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}



      {/* <TextInput
        style={styles.input}
        placeholder="Enter access level (e.g., Full)"
        value={form.access}
        onChangeText={(text) => setForm({ ...form, access: text })}
      /> */}

      <TouchableOpacity
        style={[styles.addButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.addButtonText}>Add Staff</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddStaffScreen;



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: 'black'
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: '#18191bff',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    color: 'black'
  },
  genderGroup: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    marginRight: 6,
  },
  selectedRadio: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  radioText: {
    fontSize: 14,
    color: '#374151',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  addButton: {
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  dropdown: {
    borderColor: '#D1D5DB',
    marginBottom: 16,
    zIndex: 1000,
  },
  dropdownList: {
    borderColor: '#D1D5DB',
    zIndex: 1000,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#374151',
  },



});
