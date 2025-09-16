import React, { useEffect, useState, useCallback } from 'react';
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
  ActivityIndicator,
  Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';
import { PersonalInfo } from '../../utility/formTypes';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
    yearsExperience: '',
  });
  const [newLanguage, setNewLanguage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
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
        } else if (response.errorCode) {
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
    yearsExperience: '',
  };

  // yearsExperience is OPTIONAL: only error if provided and not a number
  if (formData.yearsExperience && isNaN(Number(formData.yearsExperience))) {
    newErrors.yearsExperience = 'Please enter a valid number for years of experience.';
  }

  const fn = formData.firstName.trim();
  if (!fn) newErrors.firstName = 'First Name is required';
  else if (!/^[A-Za-z]{3,}$/.test(fn))
    newErrors.firstName = 'First Name must be letters only (min 3)';

  const ln = formData.lastName.trim();
  if (!ln) newErrors.lastName = 'Last Name is required';
  else if (!/^[A-Za-z]{3,}$/.test(ln))
    newErrors.lastName = 'Last Name must be letters only (min 3)';

  if (!formData.medicalRegNumber.trim())
    newErrors.medicalRegNumber = 'Medical Registration Number is required';
  else if (!/^\d{4,7}$/.test(formData.medicalRegNumber))
    newErrors.medicalRegNumber = 'Must be exactly 4 to 7 digits';

  if (!formData.email.trim()) newErrors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
    newErrors.email = 'Please enter a valid email address';

  if (!formData.gender) newErrors.gender = 'Gender is required';

  if (formData.spokenLanguages.length === 0)
    newErrors.spokenLanguages = 'At least one language is required';

  if (!formData.appLanguage) newErrors.appLanguage = 'App Language is required';
  if (!formData.relationship) newErrors.relationship = 'Relationship is required';
  if (!formData.maritalStatus) newErrors.maritalStatus = 'Marital Status is required';

  setErrors(newErrors);
  return Object.values(newErrors).every(err => !err);
};


 
  const handleNext = async () => {
  const isValid = validateForm();
  if (!isValid) {
    Toast.show({
      type: 'error',
      text1: 'Please fix the highlighted fields',
      position: 'top',
      visibilityTime: 2500,
    });
    return; // stop if invalid
  }

  setLoading(true);
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
      bloodgroup: formData.bloodGroup,
      maritalStatus: formData.maritalStatus,
      spokenLanguage: formData.spokenLanguages,
    };

    const response = await AuthPut('users/updateUser', body, token);

    if (response?.status === 'success') {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully',
        position: 'top',
        visibilityTime: 3000,
      });
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
    }
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Network error. Please try again.',
      position: 'top',
      visibilityTime: 3000,
    });
  } finally {
    setLoading(false);
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
 setLoadingUser(true);
 
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
      if (response?.data?.status !== 'success') {
        throw new Error(response?.data?.message || 'Failed to fetch user data');
        return
      }
      const userData = response?.data?.data;
 
      setFormData({
        firstName: userData?.firstname || '',
        lastName: userData?.lastname || '',
        medicalRegNumber: userData?.medicalRegistrationNumber || '',
        email: userData?.email || '',
        gender: userData?.gender || '',
        dateOfBirth: userData?.dateOfBirth || '',
        spokenLanguages: userData?.spokenLanguage || [],
 
        profilePhoto: userData?.profilePhoto || PLACEHOLDER_IMAGE,
        appLanguage: userData?.appLanguage || 'en',
        relationship: userData?.relationship || 'self',
        bloodGroup: userData?.bloodGroup || '',
        maritalStatus: userData?.maritalStatus || 'single',
 
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'An error occurred while fetching user data');
 
    } finally {
      setLoadingUser(false);
    }
 
 
  }


 
  useEffect(() => {
    fetchUserData();
  }, []);
 
  return (
    <ScrollView>
      <View style={styles.container}>
 
        {(loading || loadingUser) && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#00203F" />
            <Text style={styles.loaderText}>
              {loadingUser ? 'Loading practice details...' : 'Processing...'}
            </Text>
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
          >
            <ScrollView style={styles.formContainer}>
 
              <Text style={styles.label}>First Name*</Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={text => {
                 const lettersOnly = text.replace(/[^A-Za-z]/g, '');
                  setFormData(prev => ({ ...prev, firstName: lettersOnly }));
                  setErrors(prev => ({ ...prev, firstName: '' }));
                }}
                placeholder="Enter first name"
                placeholderTextColor="#999"
              />
              {errors.firstName ? (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              ) : null}
 
              <Text style={styles.label}>Last Name*</Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={text => {
                  const lettersOnly = text.replace(/[^A-Za-z]/g, '');
                  setFormData(prev => ({ ...prev, lastName: lettersOnly }));
                  setErrors(prev => ({ ...prev, lastName: '' }));
                }}
                placeholder="Enter last name"
                placeholderTextColor="#999"
              />
              {errors.lastName ? (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              ) : null}
 
              <Text style={styles.label}>Medical Registration Number*</Text>
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
 
              <Text style={styles.label}>Email*</Text>
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
 
              <Text style={styles.label}>Gender*</Text>
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
 
 
              <Text style={styles.label}>Languages Spoken*</Text>
 
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
    height: height,
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
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.02,
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
    fontSize: width * 0.035,
    fontWeight: '500',
    color: '#333',
    marginBottom: height * 0.005,
    marginTop: height * 0.01,    
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
    height: height * 0.0,
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
    marginTop: 5,
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