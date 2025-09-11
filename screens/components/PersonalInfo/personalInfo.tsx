import React, { useEffect, useState } from 'react';
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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
   ActivityIndicator
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
import { AuthFetch, AuthPut, UploadFiles } from '../../auth/auth';
import axios from 'axios';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';

import { MultiSelect } from 'react-native-element-dropdown';
import { useAsyncDebounce } from '../../utility/useAsyncDebounce';

const languageOptions = [
  { label: 'Telugu', value: 'Telugu' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'English', value: 'English' },
  { label: 'Urdu', value: 'Urdu' },
];

// Placeholder image for profile photo
const PLACEHOLDER_IMAGE = require('../../assets/img.png'); // Replace with your asset path

const { width, height } = Dimensions.get('window');


const PersonalInfoScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    medicalRegNumber: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    spokenLanguages: [] as string[],
    profilePhoto: PLACEHOLDER_IMAGE,
    appLanguage: 'en',
    relationship: 'self',
    bloodGroup: '',
    maritalStatus: 'single',
  });
  const [newLanguage, setNewLanguage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    medicalRegNumber: '',
    email: '',
    gender: '',
    spokenLanguages: '',
    appLanguage: '',
    relationship: '',
    maritalStatus: '',
  });
  const navigation = useNavigation<any>();

  //calcuate minimum date(20 years ago)
  const getMinDate = () => {
    const today = new Date();
    const minDate = new Date(today.setFullYear(today.getFullYear() - 20));
    return minDate;
  };


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
      spokenLanguages: '',
      appLanguage: '',
      relationship: '',
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
    else if (!/^\d{4,7}$/.test(formData.medicalRegNumber))
      newErrors.medicalRegNumber = 'Must be exactly 4 to 7 digits';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!formData.gender) newErrors.gender = 'Gender is required';
  if (!formData.dateOfBirth)
      newErrors.dateOfBirth = 'Date of Birth is required';
    else {
      const minDate = getMinDate();
      if (formData.dateOfBirth > minDate) {
        newErrors.dateOfBirth = 'You must be at least 25 years old';
      }
    }
    if (formData.spokenLanguages.length === 0)
      newErrors.spokenLanguages = 'At least one language is required';
    if (!formData.appLanguage)
      newErrors.appLanguage = 'App Language is required';
    if (!formData.relationship)
      newErrors.relationship = 'Relationship is required';
    // if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood Group is required';
    if (!formData.maritalStatus)
      newErrors.maritalStatus = 'Marital Status is required';
    setErrors(newErrors);

    return Object.values(newErrors).every(error => !error);
  };

  const handleNext = async () => {


    if (!validateForm()) {
       setLoading(true);
       console.log('Form data after validation:', formData);
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
            setLoading(false);
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
          bloodgroup: formData.bloodGroup,
          maritalStatus: formData.maritalStatus,
          spokenLanguage: formData.spokenLanguages,
        };

        console.log('Form data to be sent:', body);

        const response = await AuthPut('users/updateUser', body, token);

        console.log('Response from updateUser:', response);
        if (response?.status === 'success') {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Profile updated successfully',
            position: 'top',
            visibilityTime: 3000,
          });
         setLoading(false);
          console.log('Form data sent successfully:', body);
          await AsyncStorage.setItem('currentStep', 'Specialization');
          navigation.navigate('Specialization');
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2:
              'message' in response && response.message && typeof response.message === 'object' && 'message' in response.message
                ? response.message.message
                : 'Failed to update profile',
            position: 'top',
            visibilityTime: 3000,
          });
          console.log('Error response from updateUser:', response);
           setLoading(false);
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
         setLoading(false);
      }
    }
  };

  // const debouncedHandleNext = useAsyncDebounce(handleNext, 2000);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleLanguageChange = (selectedLanguages: string[]) => {
    setFormData(prev => ({
      ...prev,
      spokenLanguages: selectedLanguages,
    }));
    setErrors(prev => ({
      ...prev,
      spokenLanguages: selectedLanguages.length === 0 ? 'At least one language is required' : '',
    }));
  };
  const fetchUserData = async () => {
 
      setLoading(true);

      try {
        // Retrieve token from AsyncStorage
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }


        AsyncStorage.setItem('stepNo', '7');
  const response = await AuthFetch('users/getUser', token);
        // Make API call
        
       
        // Check if response status is success
        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Failed to fetch user data');
        }
        const userData = response.data.data;
console.log(userData, "userDetails")

        // Format phone number to match +XX XXX XXX XXXX
        setFormData({
          firstName:userData.firstname || '',
          lastName: userData.lastname || '',
          medicalRegNumber: userData.medicalRegistrationNumber || '',
          email: userData.email || '',
          gender: userData.gender || '',
          dateOfBirth: userData.dateOfBirth || '',
          spokenLanguages: userData?.spokenLanguage || [],
          
          profilePhoto: userData?.profilePhoto || PLACEHOLDER_IMAGE,
          appLanguage: userData?.appLanguage || 'en',
          relationship: userData?.relationship || 'self',
          bloodGroup: userData?.bloodGroup || '',
          maritalStatus: userData?.maritalStatus || 'single',

        });
      } catch (error: any) {
        // setLoading(false);

        console.error('Error fetching user data:', error.message);
      }finally {
        setLoading(false); // Stop loading regardless of success or failure
      }
    

  }

  useEffect(() => {
    fetchUserData();
   }, []);

   console.log(formData)

  return (
    <ScrollView>
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
        <Text style={styles.headerTitle}>Personal Info</Text>
      </View>

      <ProgressBar currentStep={getCurrentStepIndex('PersonalInfo')} totalSteps={TOTAL_STEPS} />

      {/* Form Content */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
<KeyboardAvoidingView
          style={{ flex: 1 }}
          // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          // keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
           <ScrollView style={styles.formContainer}>
        {/* <View style={styles.photoContainer}>
          <TouchableOpacity onPress={handleImagePick}>
            <View style={styles.profilePhotoWrapper}>
              <Image source={formData.profilePhoto} style={styles.profilePhoto} />
              <Icon
                name="camera"
                size={20}
                color="#00203F"
                style={styles.cameraIcon}
              />
            </View>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
          </TouchableOpacity>
        </View> */}

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
          maxLength={7}
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
            dropdownIconColor="#333"
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

        {/* <Text style={styles.label}>Date of Birth</Text>
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
            color="#00203F"
            style={styles.calendarIcon}
          />
        </TouchableOpacity>
        {errors.dateOfBirth ? (
          <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
        ) : null}

        {showDatePicker && (
          <DateTimePicker
            value={formData.dateOfBirth || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date(1900, 0, 1)}
            maximumDate={new Date()}
          />
        )} */}

        {/* <Text style={styles.label}>App Language</Text>
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
            dropdownIconColor="#333"
            enabled={false}
          >
            <Picker.Item label="English" value="en" />
          </Picker>
        </View>
        {errors.appLanguage ? (
          <Text style={styles.errorText}>{errors.appLanguage}</Text>
        ) : null} */}

        {/* <Text style={styles.label}>Relationship</Text>
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
            dropdownIconColor="#333"
          >
            <Picker.Item label="Select relationship" value="" />
            <Picker.Item label="Self" value="self" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>
        {errors.relationship ? (
          <Text style={styles.errorText}>{errors.relationship}</Text>
        ) : null} */}

        {/* <Text style={styles.label}>Blood Group</Text>
        <View style={styles.input}>
          <Picker
            selectedValue={formData.bloodGroup}
            onValueChange={itemValue => {
              setFormData(prev => ({ ...prev, bloodGroup: itemValue as string }));
              setErrors(prev => ({ ...prev, bloodGroup: '' }));
            }}
            style={styles.picker}
            dropdownIconColor="#333"
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
        ) : null} */}

        {/* <Text style={styles.label}>Marital Status</Text>
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
            dropdownIconColor="#333"
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
        ) : null} */}

        <Text style={styles.label}>Languages Spoken</Text>
        {/* <View style={styles.languagesContainer}>
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
        /> */}

        <MultiSelect
          style={styles.input}
          data={languageOptions}
          labelField="label"
          valueField="value"
          placeholder="Select languages"
          value={formData.spokenLanguages}
          onChange={handleLanguageChange}
          selectedStyle={styles.selectedStyle}
          selectedTextStyle={styles.selectedTextStyle}
          containerStyle={styles.multiSelectContainer}
          placeholderStyle={styles.placeholderStyle}
          itemTextStyle={styles.itemTextStyle}
          activeColor="#E0F2F1"
          renderSelectedItem={(item, unSelect) => (
            <View style={styles.selectedItemContainer}>
              <Text style={styles.selectedItemText}>{item.label}</Text>
              <TouchableOpacity onPress={() => unSelect && unSelect(item)} accessibilityLabel={`Remove ${item.label}`}>
                <Icon name="times" size={16} color="#D32F2F" style={styles.removeIcon} />
              </TouchableOpacity>
            </View>
          )}
          renderItem={(item, selected) => (
            <View style={styles.dropdownItemContainer}>
              <Text style={styles.dropdownItemText}>{item.label}</Text>
              {selected && <Icon name="check" size={16} color="#00796B" style={styles.dropdownTickIcon} />}
            </View>
          )}
        />
        {errors.spokenLanguages ? (
          <Text style={styles.errorText}>{errors.spokenLanguages}</Text>
        ) : null}

        {/* Spacer to ensure content is not hidden by the Next button */}
        <View style={styles.spacer} />
      </ScrollView>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
       
     

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DCFCE7',
  },
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
  backButton: {
    padding: width * 0.02,
  },
  headerTitle: {
    flex: 1,
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginRight: width * 0.06,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.03,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: height * 0.03,
  },
  profilePhotoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  changePhotoText: {
    color: '#00203F',
    fontSize: width * 0.04,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#333',
    marginBottom: height * 0.01,
    marginTop: height * 0.015,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: width * 0.03,
    height: height * 0.06,
    fontSize: width * 0.04,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  picker: {
    height: height * 0.06,
    color: '#333',
    flex: 1,
  },
  dateText: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#333',
  },
  calendarIcon: {
    marginLeft: width * 0.02,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: height * 0.01,
  },
  languageChip: {
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    paddingVertical: height * 0.005,
    paddingHorizontal: width * 0.03,
    marginRight: width * 0.02,
    marginBottom: height * 0.01,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    color: '#00203F',
    fontSize: width * 0.035,
    fontWeight: '500',
  },
  removeButton: {
    marginLeft: width * 0.02,
  },
  removeText: {
    color: '#00203F',
    fontSize: width * 0.035,
    fontWeight: 'bold',
  },
  addLanguageInput: {
    marginTop: height * 0.01,
  },
  multiSelectContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedStyle: {
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
  },
  selectedTextStyle: {
    color: '#00203F',
    fontSize: width * 0.035,
    fontWeight: '500',
  },
  placeholderStyle: {
    fontSize: width * 0.04,
    color: '#999',
  },
  itemTextStyle: {
    fontSize: width * 0.04,
    color: '#333',
  },
  nextButton: {
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: width * 0.05,
    marginBottom: height * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  nextText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: width * 0.035,
    marginTop: height * 0.005,
    marginBottom: height * 0.005,
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
  selectedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.005,
    marginRight: width * 0.02,
    marginBottom: height * 0.01,
    marginTop:5,
  },
  selectedItemText: {
    color: '#00203F',
    fontSize: width * 0.035,
    fontWeight: '500',
  },
  tickIcon: {
    marginLeft: width * 0.02,
  },
  dropdownItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.01,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#333',
  },
  dropdownTickIcon: {
    marginLeft: width * 0.02,
  },
  removeIcon: {
    marginLeft: width * 0.02,
  },
});

export default PersonalInfoScreen;