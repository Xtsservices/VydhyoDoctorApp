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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
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
import { AuthFetch, AuthPut, UpdateFiles } from '../../auth/auth';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';

const languageOptions = [
  { label: 'Telugu', value: 'Telugu' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'English', value: 'English' },
  { label: 'Urdu', value: 'Urdu' },
];

const { width, height } = Dimensions.get('window');

const PersonalInfoScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();

  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    medicalRegNumber: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    spokenLanguages: [] as string[],
    profilePhoto: null as any,
    appLanguage: 'en',
    relationship: 'self',
    bloodGroup: '',
    maritalStatus: 'single',
    yearsExperience: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [profileImage, setProfileImage] = useState<any>(null); // For storing the selected image
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [tempSelectedLangs, setTempSelectedLangs] = useState<string[]>([]);

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
    yearsExperience: '',
  });

  const getMinDate = () => {
    const today = new Date();
    const minDate = new Date(today.setFullYear(today.getFullYear() - 20));
    return minDate;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, dateOfBirth: selectedDate as any }));
      setErrors(prev => ({ ...prev, dateOfBirth: '' as any }));
    }
  };

  const handleImagePick = () => {
    launchImageLibrary(
      { mediaType: 'photo' },
      (response: import('react-native-image-picker').ImagePickerResponse) => {
        if (response.didCancel) {
          // user cancelled
        } else if (response.errorCode) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: response.errorMessage || 'Failed to pick image',
            position: 'top',
            visibilityTime: 3000,
          });
        } else if (
          response.assets &&
          response.assets[0] &&
          typeof response.assets[0].uri === 'string'
        ) {
          const selectedImage = response.assets[0];
          setProfileImage({
            uri: selectedImage.uri,
            type: selectedImage.type || 'image/jpeg',
            name: selectedImage.fileName || `profile_${Date.now()}.jpg`,
          });

          // Also update the formData for display
          setFormData(prev => ({
            ...prev,
            profilePhoto: { uri: selectedImage.uri },
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

  // --- Validation ---
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

    // yearsExperience is OPTIONAL
    if (formData.yearsExperience && isNaN(Number(formData.yearsExperience))) {
      newErrors.yearsExperience =
        'Please enter a valid number for years of experience.';
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
      return;
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
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('firstname', formData.firstName);
      formDataToSend.append('lastname', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('appLanguage', formData.appLanguage);
      formDataToSend.append('relationship', formData.relationship);
      formDataToSend.append('medicalRegistrationNumber', formData.medicalRegNumber);
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('bloodgroup', formData.bloodGroup);
      formDataToSend.append('maritalStatus', formData.maritalStatus);
      formDataToSend.append('spokenLanguage', JSON.stringify(formData.spokenLanguages));
      if (profileImage) {
        formDataToSend.append('profilePic', profileImage);
      }
      const response = await UpdateFiles('users/updateUser', formDataToSend, token);

      if ((response as any)?.status === 'success') {
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
            'message' in (response as any) &&
            (response as any).message &&
            typeof (response as any).message === 'object' &&
            'message' in (response as any).message
              ? (response as any).message.message
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

  const handleBack = () => {
    navigation.goBack();
  };

  const fetchUserData = async () => {
    setLoadingUser(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      AsyncStorage.setItem('stepNo', '7');
      const response = await AuthFetch('users/getUser', token);

      if (response?.data?.status !== 'success') {
        throw new Error(response?.data?.message || 'Failed to fetch user data');
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
        profilePhoto: userData?.profilePhoto ? { uri: userData.profilePhoto } : null,
        appLanguage: userData?.appLanguage || 'en',
        relationship: userData?.relationship || 'self',
        bloodGroup: userData?.bloodGroup || '',
        maritalStatus: userData?.maritalStatus || 'single',
        yearsExperience: userData?.yearsExperience || '',
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'An error occurred while fetching user data');
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // ===== Language Modal Logic =====
  const openLanguageModal = () => {
    setTempSelectedLangs(formData.spokenLanguages); // start from current
    setShowLanguageModal(true);
  };

  const toggleTempLang = (value: string) => {
    setTempSelectedLangs(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
    );
  };

  const applyLanguages = () => {
    setFormData(prev => ({ ...prev, spokenLanguages: tempSelectedLangs }));
    setErrors(prev => ({
      ...prev,
      spokenLanguages:
        tempSelectedLangs.length === 0 ? 'At least one language is required' : '',
    }));
    setShowLanguageModal(false);
  };

  const renderLanguageItem = ({ item }: { item: { label: string; value: string } }) => {
    const selected = tempSelectedLangs.includes(item.value);
    return (
      <TouchableOpacity
        style={styles.langRow}
        onPress={() => toggleTempLang(item.value)}
        accessibilityLabel={`Select ${item.label}`}
      >
        <Text style={styles.langRowText}>{item.label}</Text>
        {selected ? <Icon name="check" size={18} color="#00796B" /> : null}
      </TouchableOpacity>
    );
  };

  // Helper: show selected summary
  const selectedLangSummary =
    formData.spokenLanguages.length > 0
      ? formData.spokenLanguages.join(', ')
      : 'Select languages';

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
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

        <ProgressBar
          currentStep={getCurrentStepIndex('PersonalInfo')}
          totalSteps={TOTAL_STEPS}
        />

        {/* Form Content */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView style={{ flex: 1 }}>
            <ScrollView style={styles.formContainer}>
              {/* Profile Photo Upload - Improved UI */}
              <View style={styles.profilePhotoContainer}>
                <View style={styles.profileWrapper}>
                  {formData.profilePhoto && formData.profilePhoto.uri ? (
                    <Image
                      source={formData.profilePhoto}
                      style={styles.profilePhoto}
                      resizeMode="cover"
                      accessibilityLabel="Profile photo"
                    />
                  ) : (
                    // neutral placeholder (no default image)
                    <View style={[styles.profilePhoto, styles.placeholderAvatar]}>
                      <Icon name="user-o" size={width * 0.12} color="#9E9E9E" />
                    </View>
                  )}

                  {/* Small circular camera button overlapping bottom-right */}
                  <TouchableOpacity
                    style={styles.fabCamera}
                    onPress={handleImagePick}
                    accessibilityLabel="Edit profile photo"
                    accessibilityHint="Opens image library to choose a profile photo"
                    activeOpacity={0.8}
                  >
                    <Icon name="camera" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Optional short helper text below the avatar */}
                <Text style={styles.photoHintText}>
                  Tap the camera to change profile photo
                </Text>
              </View>

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

              {/* ===== Languages Spoken (POP-OUT) ===== */}
              <Text style={styles.label}>Languages Spoken*</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={openLanguageModal}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.selectedTextStyle,
                    formData.spokenLanguages.length === 0 && styles.placeholderStyle,
                  ]}
                  numberOfLines={1}
                >
                  {selectedLangSummary}
                </Text>
                <Icon name="chevron-right" size={16} color="#666" />
              </TouchableOpacity>
              {errors.spokenLanguages ? (
                <Text style={styles.errorText}>{errors.spokenLanguages}</Text>
              ) : null}

              {/* Spacer */}
              <View style={styles.spacer} />
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>

        {/* ===== Language Selection Modal (centered, no search) ===== */}
        <Modal
          visible={showLanguageModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalOverlayCentered}>
            <View style={styles.modalCardCentered}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Languages</Text>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <Icon name="times" size={20} color="#333" />
                </TouchableOpacity>
              </View>

              {/* List without search */}
              <FlatList
                data={languageOptions}
                keyExtractor={(item) => item.value}
                renderItem={renderLanguageItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                style={{ flexGrow: 0, maxHeight: height * 0.45, marginTop: 8 }}
                keyboardShouldPersistTaps="handled"
              />

              {/* Selected chips (optional visual feedback) */}
              <View style={styles.selectedChipsWrap}>
                {tempSelectedLangs.map(v => (
                  <View key={v} style={styles.selectedChip}>
                    <Text style={styles.selectedChipText}>{v}</Text>
                    <TouchableOpacity
                      onPress={() => toggleTempLang(v)}
                      style={styles.selectedChipRemove}
                      accessibilityLabel={`Remove ${v}`}
                    >
                      <Icon name="times" size={12} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setShowLanguageModal(false)}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.applyBtn]}
                  onPress={applyLanguages}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  // wrapper to position fab
  profileWrapper: {
    width: width * 0.32,
    height: width * 0.32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhoto: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: width * 0.15,
    borderWidth: 3,
    borderColor: '#00203F',
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderAvatar: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  // small floating camera FAB
  fabCamera: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: (width * 0.11) / 2,
    backgroundColor: '#00796B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  photoHintText: {
    marginTop: 8,
    fontSize: width * 0.032,
    color: '#666',
  },
  photoUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00203F',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.04,
    borderRadius: 8,
    marginTop: height * 0.01,
  },
  photoUploadText: {
    color: '#fff',
    marginLeft: width * 0.02,
    fontSize: width * 0.035,
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
    justifyContent: 'space-between',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderText: {
    color: '#fff',
    fontSize: width * 0.04,
    marginTop: height * 0.02,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.02,
    paddingBottom: height * 0.03,
  },
  // ===== Centered modal styles (new) =====
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCardCentered: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '92%',
    maxHeight: height * 0.75,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.02,
    paddingBottom: height * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: height * 0.015,
  },
  modalTitle: {
    fontSize: width * 0.045,
    fontWeight: '600',
    color: '#222',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  langRowText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#EEE',
  },
  selectedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChipText: {
    color: '#00203F',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedChipRemove: {
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    marginLeft: 10,
  },
  cancelBtn: {
    backgroundColor: '#fff',
  },
  applyBtn: {
    backgroundColor: '#00796B',
    borderColor: '#00796B',
  },
  modalBtnText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedTextStyle: {
    color: '#00203F',
    fontSize: width * 0.035,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  placeholderStyle: {
    color: '#999',
  },
});

export default PersonalInfoScreen;
