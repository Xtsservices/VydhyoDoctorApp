import { useEffect, useState } from 'react';
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
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { pick, types } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import ProgressBar from '../progressBar/progressBar';
import { AuthFetch, UploadFiles } from '../../auth/auth';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Picker } from '@react-native-picker/picker';

// Specialization options
const specializationOptions = [
  'Anatomy',
  'Ayurveda',
  'Biochemistry',
  'Breast and Endocrine Surgery',
  'Cardiology',
  'Cardiothoracic and Vascular Surgery',
  'Child Health',
  'Clinical Cardiology',
  'Clinical Immunology / Immunology and Immunopathology',
  'Clinical Nutrition',
  'Community Medicine',
  'Conservative Dentistry and Endodontics',
  'Critical Care / Critical Care Medicine',
  'Dermatology, Venereology & Leprosy',
  'Diabetology',
  'ENT / Otorhinolaryngology (ENT)',
  'Emergency Medicine',
  'Endocrine Surgery',
  'Endocrinology',
  'Family Medicine',
  'Forensic Medicine',
  'General Medicine',
  'General Surgery',
  'Geriatrics / Geriatric Medicine',
  'Gynaecologic Oncology',
  'Hand Surgery',
  'Health Administration / Hospital Administration',
  'Hematology',
  'Hepato-Pancreato-Biliary Surgery',
  'Hepatology',
  'Homeopathy',
  'Immunohematology & Blood Transfusion',
  'Industrial Health',
  'Infectious Diseases',
  'Internal Medicine',
  'Interventional Radiology',
  'Lifestyle Medicine (IBLM)',
  'Maternal & Fetal Medicine',
  'Medical Gastroenterology',
  'Medical Genetics',
  'Medical Oncology',
  'Microbiology',
  'Minimal Access Surgery and Robotic Surgery',
  'Neonatology',
  'Nephrology',
  'Neurology',
  'Neurosurgery',
  'Nuclear Medicine',
  'Obstetrics and Gynaecology',
  'Occupational Health',
  'Ophthalmology / Ophthalmic Medicine and Surgery',
  'Oral Medicine and Radiology',
  'Oral and Maxillofacial Surgery',
  'Orthodontics and Dentofacial Orthopedics',
  'Pain Medicine',
  'Palliative Medicine / Onco-Anesthesia and Palliative Medicine',
  'Pathology / Clinical Pathology / Oral Pathology and Microbiology',
  'Pediatric Cardiology',
  'Pediatric Gastroenterology',
  'Pediatric Nephrology',
  'Pediatric Neurology',
  'Pediatric Surgery',
  'Pediatrics',
  'Pedodontics and Preventive Dentistry',
  'Pharmacology / Clinical Pharmacology',
  'Physiology',
  'Physiotherapist',
  'Plastic & Reconstructive Surgery / Plastic Surgery',
  'Preventive Cardiology',
  'Prosthodontics and Crown & Bridge',
  'Psychiatry / Psychological Medicine',
  'Public Health / Public Health Dentistry',
  'Radiodiagnosis / Medical Radiodiagnosis / Radio Diagnosis',
  'Reproductive Medicine',
  'Respiratory Medicine / Pulmonary & Critical Care Medicine',
  'Rheumatology',
  'Sports Medicine',
  'Surgical Gastroenterology',
  'Surgical Oncology',
  'Trauma Surgery and Critical Care',
  'Tropical Medicine / Tropical Medicine and Health',
  'Tuberculosis and Chest Diseases',
  'Unani',
  'Urology',
  'Vascular Surgery',
  'Yoga and Naturopathy',
];


type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
};

const { width, height } = Dimensions.get('window');

const SpecializationDetails = () => {
  const userId = useSelector((state: any) => state.currentUserID);
  const [degrees, setDegrees] = useState<{ id: string; degreeName: string }[]>([]);
  const [formData, setFormData] = useState({
    degree: '',
    specialization: '',
    yearsExperience: '',
    bio: '',
    customDegree: '',
    degrees: null as { uri: string; type: string; name: string } | null,
    certifications: null as { uri: string; type: string; name: string } | null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [tempDegrees, setTempDegrees] = useState<string[]>(
    formData.degree ? formData.degree.split(',').map(deg => deg.trim()).filter(deg => deg) : []
  );

  const navigation = useNavigation<NavigationProp>();

  const handleDegreeChange = (itemValue: string) => {
    let newDegrees: string[];

    if (tempDegrees.includes(itemValue)) {
      // Remove degree if already selected
      newDegrees = tempDegrees.filter(deg => deg !== itemValue);
    } else {
      // Add degree to selection
      newDegrees = [...tempDegrees, itemValue].filter(deg => deg !== '');
    }

    setTempDegrees(newDegrees);
  };

  const handleConfirm = () => {
    // Replace "Others" with customDegree value if provided and non-empty, otherwise exclude it
    const finalDegrees = tempDegrees
      .map(deg => (deg === 'Others' && formData.customDegree?.trim() ? formData.customDegree.trim() : deg))
      .filter(deg => deg !== 'Others' && deg.trim() !== '')
      .join(', ');

    setFormData({
      ...formData,
      degree: finalDegrees,
      customDegree: tempDegrees.includes('Others') ? formData.customDegree : '',
    });
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempDegrees(formData.degree ? formData.degree.split(',').map(deg => deg.trim()).filter(deg => deg) : []);
    setModalVisible(false);
  };

  const renderDegreeItem = ({ item }: { item: { id: string; degreeName: string } }) => (
    <Pressable style={styles.checkboxContainer} onPress={() => handleDegreeChange(item.degreeName)}>
      <CheckBox
        value={tempDegrees.includes(item.degreeName)}
        onValueChange={() => handleDegreeChange(item.degreeName)}
        disabled={isLoading}
        tintColors={{ true: '#00203F', false: '#999' }}
      />
      <Text style={styles.checkboxLabel}>{item.degreeName}</Text>
    </Pressable>
  );

  const degreeList = [...degrees, { id: 'others', degreeName: 'Others' }];

  const validateForm = () => {
    if (!formData.degree) {
      Alert.alert('Error', 'Please select at least one degree.');
      return false;
    }
    if (tempDegrees.includes('Others') && !formData.customDegree?.trim()) {
      Alert.alert('Error', 'Please enter a custom degree for "Others".');
      return false;
    }
    if (!formData.specialization) {
      Alert.alert('Error', 'Please select a specialization.');
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
      'Upload File',
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
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setFormData({
                  ...formData,
                  [field]: {
                    uri: asset.uri,
                    type: asset.type || 'image/jpeg',
                    name: asset.fileName || 'file.jpg',
                  },
                });
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
                setFormData({
                  ...formData,
                  [field]: {
                    uri: asset.uri,
                    type: asset.type || 'image/jpeg',
                    name: asset.fileName || 'file.jpg',
                  },
                });
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
                setFormData({
                  ...formData,
                  [field]: {
                    uri: result.uri,
                    type: result.type || 'application/pdf',
                    name: result.name || 'file.pdf',
                  },
                });
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

      const response = await UploadFiles('users/updateSpecialization', formDataObj, token);
      console.log(response, "update form data");
      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Specialization details updated successfully!',
          position: 'top',
          visibilityTime: 3000,
        });
        await AsyncStorage.setItem('currentStep', 'Practice');
        navigation.navigate('Practice');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message?.message || 'Failed to update specialization details.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (err) {
      console.error('API error:', err);
      Alert.alert('Error', 'Failed to update specialization details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('PersonalInfo');
  };

  const fetchDegrees = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('catalogue/degree/getAllDegrees', token);
      console.log(response, "get all degrees");
      console.log(response, "get all degrees");
      const data = response?.data?.data || [];

      // Sort alphabetically by 'name'
      const sortedData = data.sort((a: { degreeName: string; }, b: { degreeName: any; }) =>
        a.degreeName.localeCompare(b.degreeName)
      );

      setDegrees(sortedData);
      // const data = response?.data?.data || [];
      // setDegrees(data);
    } catch (error) {
      console.error('Error fetching degrees:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch degrees.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const response = await AuthFetch('users/getUser', token);
        console.log(response);
        if (response.data.status === 'success') {
          const userData = response.data.data;
          console.log(userData?.specialization?.experience, "complete response");
          setFormData({
            degree: userData?.specialization?.degree || '',
            specialization: userData?.specialization?.name || '',
            yearsExperience:
              userData?.specialization?.experience !== undefined &&
                userData?.specialization?.experience !== null
                ? String(userData.specialization.experience)
                : '',
            // yearsExperience: String(userData?.specialization?.experience || '') ,
            bio: userData?.specialization?.bio || '',
            customDegree: userData?.specialization?.customDegree || '',
            degrees: userData?.specialization?.degrees && 'uploaded successfully' || null,
            certifications: userData?.specialization?.certifications && "uploaded successfully" || null,
          });
          setTempDegrees(userData?.specialization?.degree ? userData?.specialization?.degree.split(',').map((deg: string) => deg.trim()).filter((deg: string) => deg) : []);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchDegrees();
  }, []);

  console.log(formData, "setForm data");

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isLoading}>
            <Icon name="arrow-left" size={width * 0.06} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Specialization Details</Text>
        </View>

        <ProgressBar currentStep={getCurrentStepIndex('Specialization')} totalSteps={TOTAL_STEPS} />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Degree*</Text>
              <TouchableOpacity
                style={[styles.input, styles.dropdownButton]}
                onPress={() => !isLoading && setModalVisible(true)}
                disabled={isLoading}
              >

                <Text style={styles.dropdownText}>
                  {formData.degree || 'Select degrees'}
                </Text>

              </TouchableOpacity>
              <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCancel}
              >
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Degrees</Text>

                    {/* Replace FlatList with ScrollView for better control */}
                    <ScrollView
                      style={styles.listContainer}
                      keyboardShouldPersistTaps="handled"
                      bounces={false}
                    >
                      {degreeList.map((item) => (
                        <Pressable
                          key={item.id}
                          style={styles.checkboxContainer}
                          onPress={() => handleDegreeChange(item.degreeName)}
                        >
                          <CheckBox
                            value={tempDegrees.includes(item.degreeName)}
                            onValueChange={() => handleDegreeChange(item.degreeName)}
                            disabled={isLoading}
                            tintColors={{ true: '#00203F', false: '#999' }}
                          />
                          <Text style={styles.checkboxLabel}>{item.degreeName}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    {tempDegrees.includes('Others') && (
                      <TextInput
                        style={[styles.input, styles.textInput]}
                        value={formData.customDegree || ''}
                        onChangeText={(text) => setFormData({ ...formData, customDegree: text })}
                        placeholder="Enter custom degree"
                        placeholderTextColor="#999"
                        editable={!isLoading}
                      />
                    )}

                    <View style={styles.modalButtons}>
                      <TouchableOpacity style={styles.modalButton} onPress={handleCancel} disabled={isLoading}>
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalButton} onPress={handleConfirm} disabled={isLoading}>
                        <Text style={styles.modalButtonText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
              <Text style={styles.selectedText}>
                Selected: {formData.degree || 'None'}
                {tempDegrees.includes('Others') && formData.customDegree ? ` (${formData.customDegree})` : ''}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specialization(s)*</Text>
              <View style={styles.input}>
                <Picker
                  selectedValue={formData.specialization}
                  onValueChange={(itemValue) => setFormData({ ...formData, specialization: itemValue })}
                  style={styles.picker}
                  enabled={!isLoading}
                >
                  <Picker.Item label="Select specialization" value="" />
                  {specializationOptions.map((spec, index) => (
                    <Picker.Item key={index} label={spec} value={spec} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Years of Experience *</Text>
              <TextInput
                style={styles.input}
                value={formData?.yearsExperience}
                onChangeText={(text) => setFormData({ ...formData, yearsExperience: text })}
                keyboardType="numeric"
                placeholder="e.g. 5"
                placeholderTextColor="#999"
                editable={!isLoading}
                maxLength={2}
              />
            </View>

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
                    {formData.degrees ? 'Uploaded Successfully' : 'Upload Degree Certificate(s)'}
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
                    {formData.certifications ? 'Uploaded Successfully' : 'Upload Certificate(s)'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

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
    paddingBottom: height * 0.1,
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
  dropdownBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexWrap: 'wrap',       // allows wrapping text
    minHeight: 40,          // minimum height for small text
    justifyContent: 'center',
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
  listContainer: {
    maxHeight: 300,
    marginBottom: 10,
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
  dropdownButton: {
    padding: 10,
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: width * 0.04,
    color: '#333',
  },
  textInput: {
    marginTop: 10,
    padding: 10,
    fontSize: width * 0.04,
  },
  selectedText: {
    marginTop: 8,
    fontSize: width * 0.035,
    color: '#555',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 20,
  width: width * 0.9,
  maxHeight: '80%',
  justifyContent: 'flex-start',
},
  modalTitle: {
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  flatList: {
    maxHeight: 300,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxLabel: {
    fontSize: width * 0.04,
    color: '#333',
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 10,
    backgroundColor: '#00203F',
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
});

export default SpecializationDetails;