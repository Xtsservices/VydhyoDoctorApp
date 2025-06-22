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

// Placeholder image for profile photo
const PLACEHOLDER_IMAGE = require('../../assets/img.png'); // Replace with your asset path

const { width } = Dimensions.get('window');

const PersonalInfoScreen: React.FC = () => {
  const [formData, setFormData] = useState<PersonalInfo>({
    fullName: '',
    medicalRegNumber: '',
    email: '',
    gender: '',
    dateOfBirth: undefined as Date | undefined,
    languages: [] as string[],
    profilePhoto: PLACEHOLDER_IMAGE,
  });
  const [newLanguage, setNewLanguage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({
    fullName: '',
    medicalRegNumber: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    languages: '',
  });
const navigation = useNavigation<any>(); // Adjust type as needed for your navigation prop

  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData((prev) => ({ ...prev, dateOfBirth: selectedDate }));
      setErrors((prev) => ({ ...prev, dateOfBirth: '' }));
    }
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData((prev) => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()],
      }));
      setNewLanguage('');
      setErrors((prev) => ({ ...prev, languages: '' }));
    }
  };

  const handleRemoveLanguage = (languageToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((lang) => lang !== languageToRemove),
    }));
    if (formData.languages.length === 1) {
      setErrors((prev) => ({ ...prev, languages: 'At least one language is required' }));
    }
  };

  const handleImagePick = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response: import('react-native-image-picker').ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('Image picker error: ', response.errorMessage);
      } else if (response.assets && response.assets[0] && typeof response.assets[0].uri === 'string') {
        setFormData((prev) => ({ ...prev, profilePhoto: { uri: response.assets![0].uri! } }));
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Photo uploaded successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    });
  };

  const validateForm = () => {
    const newErrors = {
      fullName: '',
      medicalRegNumber: '',
      email: '',
      gender: '',
      dateOfBirth: '',
      languages: '',
    };

    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    else if (formData.fullName.trim().length < 3) newErrors.fullName = 'Full Name must be at least 3 letters';
    if (!formData.medicalRegNumber.trim()) newErrors.medicalRegNumber = 'Medical Registration Number is required';
    else if (!/^[0-9]{10}$/.test(formData.medicalRegNumber))
      newErrors.medicalRegNumber = 'Must be exactly 10 digits';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required';
    if (formData.languages.length === 0) newErrors.languages = 'At least one language is required';

    setErrors(newErrors);

    return Object.values(newErrors).every((error) => !error);
  };

  const handleNext = () => {
    // if (validateForm()) {
    //   Toast.show({
    //     type: 'success',
    //     text1: 'Success',
    //     text2: 'Proceeding to next step',
    //     position: 'top',
    //     visibilityTime: 3000,
    //   });
    //   console.log('Form Data:', formData); // For debugging
    // }
    navigation.navigate('Specialization')
  };

 
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.stepTitle}>Step 1 – Personal Info</Text>

      <View style={styles.photoContainer}>
        <TouchableOpacity onPress={handleImagePick}>
          <View style={styles.profilePhotoWrapper}>
            <Image source={formData.profilePhoto} style={styles.profilePhoto} />
            <Icon name="camera" size={20} color="#1E90FF" style={styles.cameraIcon} />
          </View>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={formData.fullName}
        onChangeText={(text) => {
          setFormData((prev) => ({ ...prev, fullName: text }));
          setErrors((prev) => ({ ...prev, fullName: '' }));
        }}
        placeholder="Enter your full name"
        placeholderTextColor="#999"
      />
      {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}

      <Text style={styles.label}>Medical Registration Number</Text>
      <TextInput
        style={styles.input}
        value={formData.medicalRegNumber}
        onChangeText={(text) => {
          setFormData((prev) => ({ ...prev, medicalRegNumber: text }));
          setErrors((prev) => ({ ...prev, medicalRegNumber: '' }));
        }}
        placeholder="Enter registration number"
        placeholderTextColor="#999"
        keyboardType="numeric"
         maxLength={10}
      />
      {errors.medicalRegNumber ? <Text style={styles.errorText}>{errors.medicalRegNumber}</Text> : null}

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={formData.email}
        onChangeText={(text) => {
          setFormData((prev) => ({ ...prev, email: text }));
          setErrors((prev) => ({ ...prev, email: '' }));
        }}
        placeholder="Enter email"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

      <Text style={styles.label}>Gender</Text>
      <View style={styles.input}>
        <Picker
          selectedValue={formData.gender}
          onValueChange={(itemValue) => {
            setFormData((prev) => ({ ...prev, gender: itemValue as string }));
            setErrors((prev) => ({ ...prev, gender: '' }));
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
      {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}

      <Text style={styles.label}>Date of Birth</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text style={styles.dateText}>
          {formData.dateOfBirth
            ? formData.dateOfBirth.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
            : 'mm/dd/yyyy'}
        </Text>
        <Icon name="calendar" size={20} color="#000" style={styles.calendarIcon} />
      </TouchableOpacity>
      {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}

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

      <Text style={styles.label}>Languages Spoken</Text>
      <View style={styles.languagesContainer}>
        {formData.languages.map((lang, index) => (
          <View key={index} style={styles.languageChip} >
            <Text style={styles.languageText}>{lang}</Text>
            <TouchableOpacity onPress={() => handleRemoveLanguage(lang)} style={styles.removeButton}>
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
      {errors.languages ? <Text style={styles.errorText}>{errors.languages}</Text> : null}

      <TouchableOpacity style={styles.nextButton} onPress={handleNext} >
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