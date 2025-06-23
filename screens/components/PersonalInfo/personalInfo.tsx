import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';
import { PersonalInfo } from '../../utility/formTypes';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { UploadFiles } from '../../auth/auth';
import axios from 'axios';

// Placeholder image for profile photo
const PLACEHOLDER_IMAGE = require('../../assets/img.png'); // Replace with your asset path

const { width } = Dimensions.get('window');

const PersonalInfoScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    medicalRegNumber: '',
    email: '',
    gender: '',
    dateOfBirth: undefined as Date | undefined,
    spokenLanguages: [] as string[],
    profilePhoto: PLACEHOLDER_IMAGE,
    appLanguage: 'en', // Default to 'en' and will be disabled
    relationship: 'self',
    bloodGroup: 'O+',
    maritalStatus: 'single',
  });
  const [newLanguage, setNewLanguage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    medicalRegNumber: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    spokenLanguages: '',
    appLanguage: '',
    relationship: '',
    bloodGroup: '',
    maritalStatus: '',
  });
  const navigation = useNavigation<any>(); // Adjust type as needed for your navigation prop

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, dateOfBirth: selectedDate }));
      setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    }
  };

  const handleAddLanguage = () => {
    if (
      newLanguage.trim() &&
      !formData.spokenLanguages.includes(newLanguage.trim())
    ) {
      setFormData(prev => ({
        ...prev,
        spokenLanguages: [...prev.spokenLanguages, newLanguage.trim()],
      }));
      setNewLanguage('');
      setErrors(prev => ({ ...prev, spokenLanguages: '' }));
    }
  };

  const handleRemoveLanguage = (languageToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      spokenLanguages: prev.spokenLanguages.filter(
        lang => lang !== languageToRemove,
      ),
    }));
    if (formData.spokenLanguages.length === 1) {
      setErrors(prev => ({
        ...prev,
        spokenLanguages: 'At least one language is required',
      }));
    }
  };

  const handleImagePick = () => {
    launchImageLibrary(
      { mediaType: 'photo' },
      (response: import('react-native-image-picker').ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.log('Image picker error: ', response.errorMessage);
        } else if (
          response.assets &&
          response.assets[0] &&
          typeof response.assets[0].uri === 'string'
        ) {
          setFormData(prev => ({
            ...prev,
            profilePhoto: { uri: response.assets![0].uri! },
          }));
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Photo uploaded successfully',
            position: 'top',
            visibilityTime: 3000,
          });
        }
      },
    );
  };

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      medicalRegNumber: '',
      email: '',
      gender: '',
      dateOfBirth: '',
      spokenLanguages: '',
      appLanguage: '',
      relationship: '',
      bloodGroup: '',
      maritalStatus: '',
    };

    if (!formData.firstName.trim())
      newErrors.firstName = 'First Name is required';
    else if (formData.firstName.trim().length < 3)
      newErrors.firstName = 'First Name must be at least 3 letters';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last Name is required';
    else if (formData.lastName.trim().length < 3)
      newErrors.lastName = 'Last Name must be at least 3 letters';
    if (!formData.medicalRegNumber.trim())
      newErrors.medicalRegNumber = 'Medical Registration Number is required';
    else if (!/^[0-9]{10}$/.test(formData.medicalRegNumber))
      newErrors.medicalRegNumber = 'Must be exactly 10 digits';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = 'Date of Birth is required';
    if (formData.spokenLanguages.length === 0)
      newErrors.spokenLanguages = 'At least one language is required';
    if (!formData.appLanguage)
      newErrors.appLanguage = 'App Language is required';
    if (!formData.relationship)
      newErrors.relationship = 'Relationship is required';
    if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood Group is required';
    if (!formData.maritalStatus)
      newErrors.maritalStatus = 'Marital Status is required';
    setErrors(newErrors);

    return Object.values(newErrors).every(error => !error);
  };

  const handleNext = async () => {
    if (validateForm()) {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Authentication token not found',
            position: 'top',
            visibilityTime: 3000,
          });
          return;
        }

        const body = {
          firstname: formData.firstName,
          lastname: formData.lastName,
          email: formData.email,
          appLanguage: formData.appLanguage,
          relationship: formData.relationship,
          medicalRegistrationNumber: formData.medicalRegNumber,
          gender: formData.gender,
          DOB: formData.dateOfBirth
            ? `${formData.dateOfBirth.getDate().toString().padStart(2, '0')}-${(
                formData.dateOfBirth.getMonth() + 1
              )
                .toString()
                .padStart(2, '0')}-${formData.dateOfBirth.getFullYear()}`
            : '',

          bloodgroup: formData.bloodGroup,
          maritalStatus: formData.maritalStatus,

          spokenLanguage: formData.spokenLanguages,
        };

        console.log('Form data to send:', token);
        console.log('Form data to send:', body);

        const response = await axios.put(
          'http://216.10.251.239:3000/users/updateUser',
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
          },
        );
        console.log('Response from updateUser:', response);

        if (response.status === 200) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Profile updated successfully',
            position: 'top',
            visibilityTime: 3000,
          });
          const userId = response.data.data.userId;
          dispatch({type: 'currentUserID', payload: userId});
         navigation.navigate('Specialization', { userId });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2:
              response.data && response.data.message
                ? response.data.message
                : 'Failed to update profile',
            position: 'top',
            visibilityTime: 3000,
          });
        }
      } catch (error) {
        console.error('Error updating profile:', error);

        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Network error. Please try again.',
          position: 'top',
          visibilityTime: 3000,
        });
        console.error('Error updating profile:', error);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.stepTitle}>Step 1 – Personal Info</Text>

      <View style={styles.photoContainer}>
        <TouchableOpacity onPress={handleImagePick}>
          <View style={styles.profilePhotoWrapper}>
            <Image source={formData.profilePhoto} style={styles.profilePhoto} />
            <Icon
              name="camera"
              size={20}
              color="#1E90FF"
              style={styles.cameraIcon}
            />
          </View>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>First Name</Text>
      <TextInput
        style={styles.input}
        value={formData.firstName}
        onChangeText={text => {
          setFormData(prev => ({ ...prev, firstName: text }));
          setErrors(prev => ({ ...prev, firstName: '' }));
        }}
        placeholder="Enter first name"
        placeholderTextColor="#999"
      />
      {errors.firstName ? (
        <Text style={styles.errorText}>{errors.firstName}</Text>
      ) : null}

      <Text style={styles.label}>Last Name</Text>
      <TextInput
        style={styles.input}
        value={formData.lastName}
        onChangeText={text => {
          setFormData(prev => ({ ...prev, lastName: text }));
          setErrors(prev => ({ ...prev, lastName: '' }));
        }}
        placeholder="Enter last name"
        placeholderTextColor="#999"
      />
      {errors.lastName ? (
        <Text style={styles.errorText}>{errors.lastName}</Text>
      ) : null}

      <Text style={styles.label}>Medical Registration Number</Text>
      <TextInput
        style={styles.input}
        value={formData.medicalRegNumber}
        onChangeText={text => {
          setFormData(prev => ({ ...prev, medicalRegNumber: text }));
          setErrors(prev => ({ ...prev, medicalRegNumber: '' }));
        }}
        placeholder="Enter registration number"
        placeholderTextColor="#999"
        keyboardType="numeric"
        maxLength={10}
      />
      {errors.medicalRegNumber ? (
        <Text style={styles.errorText}>{errors.medicalRegNumber}</Text>
      ) : null}

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={formData.email}
        onChangeText={text => {
          setFormData(prev => ({ ...prev, email: text }));
          setErrors(prev => ({ ...prev, email: '' }));
        }}
        placeholder="Enter email"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email ? (
        <Text style={styles.errorText}>{errors.email}</Text>
      ) : null}

      <Text style={styles.label}>Gender</Text>
      <View style={styles.input}>
        <Picker
          selectedValue={formData.gender}
          onValueChange={itemValue => {
            setFormData(prev => ({ ...prev, gender: itemValue as string }));
            setErrors(prev => ({ ...prev, gender: '' }));
          }}
          style={styles.picker}
          dropdownIconColor="#000"
        >
          <Picker.Item label="Select gender" value="" />
          <Picker.Item label="Male" value="male" />
          <Picker.Item label="Female" value="female" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>
      {errors.gender ? (
        <Text style={styles.errorText}>{errors.gender}</Text>
      ) : null}

      <Text style={styles.label}>Date of Birth</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.input}
      >
        <Text style={styles.dateText}>
          {formData.dateOfBirth
            ? formData.dateOfBirth.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
              })
            : 'mm/dd/yyyy'}
        </Text>
        <Icon
          name="calendar"
          size={20}
          color="#000"
          style={styles.calendarIcon}
        />
      </TouchableOpacity>
      {errors.dateOfBirth ? (
        <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
      ) : null}

      {showDatePicker && (
        <DateTimePicker
          value={formData.dateOfBirth || new Date()} // Ensure a valid date is provided
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'} // Use 'inline' for iOS, 'default' for Android
          onChange={handleDateChange}
          minimumDate={new Date(1900, 0, 1)} // Optional: Set a minimum date
          maximumDate={new Date()} // Optional: Set maximum to today
        />
      )}

      <Text style={styles.label}>App Language</Text>
      <View style={styles.input}>
        <Picker
          selectedValue={formData.appLanguage}
          onValueChange={itemValue => {
            setFormData(prev => ({
              ...prev,
              appLanguage: itemValue as string,
            }));
            setErrors(prev => ({ ...prev, appLanguage: '' }));
          }}
          style={styles.picker}
          dropdownIconColor="#000"
          enabled={false} // Disabled to keep it as 'en' by default
        >
          <Picker.Item label="English" value="en" />
        </Picker>
      </View>
      {errors.appLanguage ? (
        <Text style={styles.errorText}>{errors.appLanguage}</Text>
      ) : null}

      <Text style={styles.label}>Relationship</Text>
      <View style={styles.input}>
        <Picker
          selectedValue={formData.relationship}
          onValueChange={itemValue => {
            setFormData(prev => ({
              ...prev,
              relationship: itemValue as string,
            }));
            setErrors(prev => ({ ...prev, relationship: '' }));
          }}
          style={styles.picker}
          dropdownIconColor="#000"
        >
          <Picker.Item label="Select relationship" value="" />
          <Picker.Item label="Self" value="self" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>
      {errors.relationship ? (
        <Text style={styles.errorText}>{errors.relationship}</Text>
      ) : null}

      <Text style={styles.label}>Blood Group</Text>
      <View style={styles.input}>
        <Picker
          selectedValue={formData.bloodGroup}
          onValueChange={itemValue => {
            setFormData(prev => ({ ...prev, bloodGroup: itemValue as string }));
            setErrors(prev => ({ ...prev, bloodGroup: '' }));
          }}
          style={styles.picker}
          dropdownIconColor="#000"
        >
          <Picker.Item label="Select blood group" value="" />
          <Picker.Item label="O+" value="O+" />
          <Picker.Item label="O-" value="O-" />
          <Picker.Item label="A+" value="A+" />
          <Picker.Item label="A-" value="A-" />
          <Picker.Item label="B+" value="B+" />
          <Picker.Item label="B-" value="B-" />
          <Picker.Item label="AB+" value="AB+" />
          <Picker.Item label="AB-" value="AB-" />
        </Picker>
      </View>
      {errors.bloodGroup ? (
        <Text style={styles.errorText}>{errors.bloodGroup}</Text>
      ) : null}

      <Text style={styles.label}>Marital Status</Text>
      <View style={styles.input}>
        <Picker
          selectedValue={formData.maritalStatus}
          onValueChange={itemValue => {
            setFormData(prev => ({
              ...prev,
              maritalStatus: itemValue as string,
            }));
            setErrors(prev => ({ ...prev, maritalStatus: '' }));
          }}
          style={styles.picker}
          dropdownIconColor="#000"
        >
          <Picker.Item label="Select marital status" value="" />
          <Picker.Item label="Single" value="single" />
          <Picker.Item label="Married" value="married" />
          <Picker.Item label="Divorced" value="divorced" />
          <Picker.Item label="Widowed" value="widowed" />
        </Picker>
      </View>
      {errors.maritalStatus ? (
        <Text style={styles.errorText}>{errors.maritalStatus}</Text>
      ) : null}

      <Text style={styles.label}>Languages Spoken</Text>
      <View style={styles.languagesContainer}>
        {formData.spokenLanguages.map((lang, index) => (
          <View key={index} style={styles.languageChip}>
            <Text style={styles.languageText}>{lang}</Text>
            <TouchableOpacity
              onPress={() => handleRemoveLanguage(lang)}
              style={styles.removeButton}
            >
              <Text style={styles.removeText}>x</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TextInput
        style={[styles.input, styles.addLanguageInput]}
        value={newLanguage}
        onChangeText={setNewLanguage}
        onSubmitEditing={handleAddLanguage}
        placeholder="Add a language..."
        placeholderTextColor="#999"
      />
      {errors.spokenLanguages ? (
        <Text style={styles.errorText}>{errors.spokenLanguages}</Text>
      ) : null}

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>Next →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhotoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    padding: 2,
  },
  changePhotoText: {
    color: '#1E90FF',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 5,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 10,
    color: '#000',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 50,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    alignItems: 'center',
  },
  picker: {
    height: 50,
    color: '#333',
    flex: 1,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  calendarIcon: {
    marginLeft: 10,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  languageChip: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    marginLeft: 5,
  },
  removeText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addLanguageInput: {
    marginTop: 10,
  },
  nextButton: {
    backgroundColor: '#001F3F',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 80,
  },
  nextText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 5,
  },
});

export default PersonalInfoScreen;
