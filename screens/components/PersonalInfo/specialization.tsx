import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Dimensions, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { pick, types } from '@react-native-documents/picker';
import AsyncStorage  from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';

interface SpecializationDetailsProps {
  route: { params: { userId: string } };
}

type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
};

const { width, height } = Dimensions.get('window');

const SpecializationDetails = ({ route }: SpecializationDetailsProps) => {
  const userId = useSelector((state: any) => state.currentUserID);

  // const { userId } = route.params;
  console.log('Received userId:', userId);

  const [formData, setFormData] = useState({
    specialization: '',
    subSpecialization: '',
    yearsExperience: '',
    degrees: null as { uri: string; type: string; name: string } | null,
    certifications: null as { uri: string; type: string; name: string } | null,
  });

  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation<NavigationProp>();

  const validateForm = () => {
    if (!formData.specialization) {
      Alert.alert('Error', 'Please select a specialization.');
      return false;
    }
    if (!formData.yearsExperience || isNaN(Number(formData.yearsExperience))) {
      Alert.alert('Error', 'Please enter a valid number for years of experience.');
      return false;
    }
    if (!formData.degrees) {
      Alert.alert('Error', 'Please upload a degree certificate.');
      return false;
    }
    if (!formData.certifications) {
      Alert.alert('Error', 'Please upload a specialization certificate.');
      return false;
    }
    return true;
  };

  const handleFileUpload = async (field: 'degrees' | 'certifications') => {
    try {
      const [result] = await pick({
        mode: 'open',
        type: [types.allFiles],
      });
      setFormData({ ...formData, [field]: result });
      // Alert.alert('Success', `File "${result.name}" selected for ${field}.`);
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancel')) {
        console.log('File selection cancelled');
      } else {
        Alert.alert('Error', 'Failed to pick file.');
        console.error('File picker error:', err);
      }
    }
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
      const response = await axios.post(
        'http://192.168.1.42:3000/users/updateSpecialization',
        formDataObj,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('API response:', response.data);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Specialization details updated successfully!',
        position: 'top',
        visibilityTime: 3000,
      });
      console.log('API response:', 100);

    

           setIsLoading(false);

      navigation.navigate('Practice');
    } catch (err) {
      console.error('API error:', err);
      Alert.alert('Error', 'Failed to update specialization details.');
    } 
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isLoading}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Specialization Details</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Specialization(s)</Text>
          <View style={styles.input}>
            <Picker
              selectedValue={formData.specialization}
              onValueChange={(itemValue) => setFormData({ ...formData, specialization: itemValue })}
              style={styles.picker}
              enabled={!isLoading}
            >
              <Picker.Item label="Select or add specialization" value="" />
              <Picker.Item label="Cardiology" value="Cardiology" />
              <Picker.Item label="Neurology" value="Neurology" />
              <Picker.Item label="Orthopedics" value="Orthopedics" />
              <Picker.Item label="Dermatologist" value="Dermatologist" />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Years of Experience</Text>
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Degrees</Text>
          <TouchableOpacity
            onPress={() => handleFileUpload('degrees')}
            style={styles.uploadContainer}
            disabled={isLoading}
          >
            <View style={styles.uploadField}>
              <Icon name="upload" size={width * 0.05} color="#00796B" style={styles.uploadIcon} />
              <Text style={styles.uploadText}>
                {formData.degrees ? formData.degrees.name : 'Upload Degree Certificate(s)'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Certifications</Text>
          <TouchableOpacity
            onPress={() => handleFileUpload('certifications')}
            style={styles.uploadContainer}
            disabled={isLoading}
          >
            <View style={styles.uploadField}>
              <Icon name="upload" size={width * 0.05} color="#00796B" style={styles.uploadIcon} />
              <Text style={styles.uploadText}>
                {formData.certifications ? formData.certifications.name : 'Upload Certificate(s)'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.nextButton, isLoading && styles.disabledButton]}
        onPress={handleNext}
        disabled={isLoading}
      >
        <Text style={styles.nextText}>{isLoading ? 'Submitting...' : 'Next'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00796B',
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
    marginRight: width * 0.06, // Offset to center title
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
  nextButton: {
    backgroundColor: '#00796B',
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
  disabledButton: {
    backgroundColor: '#B0BEC5',
  },
  nextText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
});

export default SpecializationDetails;