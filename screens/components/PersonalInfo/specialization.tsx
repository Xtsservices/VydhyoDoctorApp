import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { pick, types } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import ProgressBar from '../progressBar/progressBar';
import { UploadFiles } from '../../auth/auth';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';


type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
};

const { width, height } = Dimensions.get('window');

const SpecializationDetails = () => {
  const userId = useSelector((state: any) => state.currentUserID);

  const [formData, setFormData] = useState({
    degree: '',
    specialization: '',
    yearsExperience: '',
    // services: '',
    bio: '',
    degrees: null as { uri: string; type: string; name: string } | null,
    certifications: null as { uri: string; type: string; name: string } | null,
  });

  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation<NavigationProp>();

  const validateForm = () => {
    if (!formData.degree) {
      Alert.alert('Error', 'Please select a degree.');
      return false;
    }
    if (!formData.specialization) {
      Alert.alert('Error', 'Please enter a specialization.');
      return false;
    }
    if (!formData.yearsExperience || isNaN(Number(formData.yearsExperience))) {
      Alert.alert('Error', 'Please enter a valid number for years of experience.');
      return false;
    }
    return true;
  };

  const handleFileUpload = async (field: 'degrees' | 'certifications') => {
Alert.alert(
    'Upload PAN Card',
    'Choose an option',
    [
      {
        text: 'Camera',
        onPress: async () => {
          try {
            const result = await launchCamera({
              mediaType: 'photo',
              includeBase64: false,
            });
            console.log('Camera result:', result);

            if (result.assets && result.assets.length > 0) {
              const asset = result.assets[0];


               setFormData({ ...formData, [field]: result })
              // setPancardUploaded(true);
            } else {
              Alert.alert('No image selected from camera');
            }
          } catch (error) {
            Alert.alert('Error', 'Camera access failed.');
            console.error('Camera error:', error);
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          try {
            const result = await launchImageLibrary({
              mediaType: 'photo',
              includeBase64: false,
            });

            if (result.assets && result.assets.length > 0) {
              const asset = result.assets[0];

             setFormData({ ...formData, [field]: result })
              // setPancardUploaded(true);
            } else {
              Alert.alert('No image selected from gallery');
            }
          } catch (error) {
            Alert.alert('Error', 'Gallery access failed.');
            console.error('Gallery error:', error);
          }
        },
      },
      {
        text: 'Upload PDF',
        onPress: async () => {
          try {
            const [result] = await pick({
              type: [types.pdf, types.images],
            });

            if (result) {
              setFormData({ ...formData, [field]: result });
            } else {
              Alert.alert('Error', 'Invalid file selected. Please try again.');
            }
          } catch (error) {
            Alert.alert('Error', 'PDF selection failed.');
            console.error('PDF error:', error);
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ],
    { cancelable: true }
  );

  // try {
  //   const [result] = await pick({
  //     mode: 'open',
  //     type: [types.allFiles],
  //     });
  //     setFormData({ ...formData, [field]: result });
  //   } catch (err) {
  //     if (err instanceof Error && err.message.includes('cancel')) {
  //       console.log('File selection cancelled');
  //     } else {
  //       Alert.alert('Error', 'Failed to pick file.');
  //       console.error('File picker error:', err);
  //     }
  //   }
  };

  const handleNext = async () => {
    if (!validateForm()) return;

    const token = await AsyncStorage.getItem('authToken');

    try {
      setIsLoading(true);

      const formDataObj = new FormData();
      formDataObj.append('id', userId);
      formDataObj.append('name', formData.specialization);
      formDataObj.append('experience', formData.yearsExperience);
      formDataObj.append('degree', formData.degree);
      // formDataObj.append('services', formData.services);
      formDataObj.append('bio', formData.bio);

      if (formData.degrees) {
        formDataObj.append('drgreeCertificate', {
          uri: Platform.OS === 'android' ? formData.degrees.uri : formData.degrees.uri.replace('file://', ''),
          type: formData.degrees.type || 'application/pdf',
          name: formData.degrees.name || 'degree.pdf',
        } as any);
      }

      if (formData.certifications) {
        formDataObj.append('specializationCertificate', {
          uri: Platform.OS === 'android' ? formData.certifications.uri : formData.certifications.uri.replace('file://', ''),
          type: formData.certifications.type || 'application/pdf',
          name: formData.certifications.name || 'certification.pdf',
        } as any);
      }

      console.log('Form data to be sent:', formDataObj);

      const response = await UploadFiles('users/updateSpecialization', formDataObj, token);
      console.log('API response:', response);
    if (response.status === 'success') {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Specialization details updated successfully!',
        position: 'top',
        visibilityTime: 3000,
      });
      navigation.navigate('Practice');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'message' in response && response.message ? response.message.message : 'Failed to update specialization details.',
        position: 'top',
        visibilityTime: 4000,
      });
    }

      setIsLoading(false);
      navigation.navigate('Practice');
    } catch (err) {
      setIsLoading(false);
      console.error('API error:', err);
      Alert.alert('Error', 'Failed to update specialization details.');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  console.log('Current form data:', formData);

  

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
       
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isLoading}>
              <Icon name="arrow-left" size={width * 0.06} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Specialization Details</Text>
          </View>

          <ProgressBar currentStep={getCurrentStepIndex('Specialization')} totalSteps={TOTAL_STEPS} />
 <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Form Content */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Degree*</Text>
              <TextInput
                style={styles.input}
                value={formData.degree}
                onChangeText={(itemValue) => setFormData({ ...formData, degree: itemValue })}
                placeholder="Degree"
                placeholderTextColor="#999"
                editable={!isLoading}
              />
              {/* <View style={styles.input}>
                <Picker
                  selectedValue={formData.degree}
                  onValueChange={(itemValue) => setFormData({ ...formData, degree: itemValue })}
                  style={styles.picker}
                  enabled={!isLoading}
                >
                  <Picker.Item label="Select degree" value="" />
                  <Picker.Item label="MBBS" value="MBBS" />
                  <Picker.Item label="MD" value="MD" />
                  <Picker.Item label="FAAP" value="FAAP" />
                  <Picker.Item label="FACC" value="FACC" />
                </Picker>
              </View> */}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specialization(s)*</Text>
              <TextInput
                style={styles.input}
                value={formData.specialization}
                onChangeText={(text) => setFormData({ ...formData, specialization: text })}
                placeholder="e.g. Cardiology, Neurology"
                placeholderTextColor="#999"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Years of Experience *</Text>
              <TextInput
                style={styles.input}
                value={formData.yearsExperience}
                onChangeText={(text) => setFormData({ ...formData, yearsExperience: text })}
                keyboardType="numeric"
                placeholder="e.g. 5"
                placeholderTextColor="#999"
                editable={!isLoading}
              />
            </View>

            {/* <View style={styles.inputGroup}>
              <Text style={styles.label}>Services Provided*</Text>
              <TextInput
                style={styles.input}
                value={formData.services}
                onChangeText={(text) => setFormData({ ...formData, services: text })}
                placeholder="e.g. Consultations, Diagnostics, Surgeries"
                placeholderTextColor="#999"
                editable={!isLoading}
              />
            </View> */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio/Profile Info</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={(text) => setFormData({ ...formData, bio: text })}
                placeholder="Enter your professional bio"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Degree Certificate(s) (Optional)</Text>
              <TouchableOpacity
                onPress={() => handleFileUpload('degrees')}
                style={styles.uploadContainer}
                disabled={isLoading}
              >
                <View style={styles.uploadField}>
                  <Icon name="upload" size={width * 0.05} color="#00203F" style={styles.uploadIcon} />
                  <Text style={styles.uploadText}>
                    {formData.degrees ? 'uploaded Successfully' : 'Upload Degree Certificate(s)'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specialization Certificate(s) (Optional)</Text>
              <TouchableOpacity
                onPress={() => handleFileUpload('certifications')}
                style={styles.uploadContainer}
                disabled={isLoading}
              >
                <View style={styles.uploadField}>
                  <Icon name="upload" size={width * 0.05} color="#00203F" style={styles.uploadIcon} />
                  <Text style={styles.uploadText}>
                    {formData.certifications ? 'uploaded Successfully' : 'Upload Certificate(s)'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Next Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.disabledButton]}
            onPress={handleNext}
            disabled={isLoading}
          >
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {isLoading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DCFCE7',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: height * 0.1, // Extra padding to ensure content is not cut off
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
  inputGroup: {
    marginBottom: height * 0.025,
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#333',
    marginBottom: height * 0.01,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: width * 0.03,
    backgroundColor: '#fff',
    fontSize: width * 0.04,
    height: height * 0.06,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textArea: {
    height: height * 0.15,
    textAlignVertical: 'top',
    paddingVertical: height * 0.015,
  },
  picker: {
    height: height * 0.06,
    color: '#333',
  },
  uploadContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
    height: height * 0.1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.03,
    height: '100%',
  },
  uploadText: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#666',
    marginHorizontal: width * 0.02,
  },
  uploadIcon: {
    marginHorizontal: width * 0.02,
  },
  buttonContainer: {
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.02,
    backgroundColor: '#DCFCE7',
  },
  nextButton: {
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#B0BEC5',
  },
  nextText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
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
});

export default SpecializationDetails;