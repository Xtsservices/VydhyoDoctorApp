import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';


  interface SpecializationDetailsProps {
    route: { params: { userId: string } };
  }

  const SpecializationDetails = ({ route }: SpecializationDetailsProps) => {
  const { userId } = route.params;
  console.log('Received userId:', userId);
  const [formData, setFormData] = useState({ 
    specialization: '', subSpecialization: '', yearsExperience: '', degrees: '', certifications: '' });

  const navigation = useNavigation();

  const validateForm = () => {
    return true;
  };

  const handleNext = () => {
   if (validateForm()) {
      const formDataObj = new FormData();
      formDataObj.append('specialization', formData.specialization);
      formDataObj.append('subSpecialization', formData.subSpecialization);
      formDataObj.append('yearsExperience', formData.yearsExperience);

      // Append degrees file if selected
    //   if (formData.degrees) {
    //     formDataObj.append('degrees', {
    //       uri: formData.degrees.uri,
    //       type: formData.degrees.type,
    //       name: formData.degrees.name,
    //     });
    //   }

    //   // Append certifications file if selected
    //   if (formData.certifications) {
    //     formDataObj.append('certifications', {
    //       uri: formData.certifications.uri,
    //       type: formData.certifications.type,
    //       name: formData.certifications.name,
    //     });
    //   }

      // Uncomment and replace 'NextScreen' with your actual screen name
      // navigation.navigate('NextScreen', { formData: formDataObj });
      Alert.alert('Success', 'Form data prepared for submission!');
    }
    navigation.navigate('Practice' as never);
  };
  

  const handleFileUpload = async (field: string) => {
    // try {
    //   const result = await DocumentPicker.pick({
    //     type: [DocumentPicker.types.allFiles], // Allow all file types (PDF, images, etc.)
    //   });
    //   setFormData({ ...formData, [field]: result[0] }); // Store the file object
    // } catch (err) {
    //   if (DocumentPicker.isCancel(err)) {
    //     // User cancelled the picker
    //     console.log('File selection cancelled');
    //   } else {
    //     Alert.alert('Error', 'Failed to pick file.');
    //     console.error('File picker error:', err);
    //   }
    // }
  };


  const handleUploadPress = async () => {
    try {
      // Launch the Document Picker for PDF files
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],  // Allow PDF, audio, and video files
      copyToCacheDirectory: true,  // Keep the file in cache
      });
  
      // Log the response for debugging
      console.log("Document Picker Response:", res);
  
      // Check if the user canceled the selection
      if (res.canceled) {
        Alert.alert("Cancelled", "File selection was cancelled");
        return;
      }
  
      // Check if assets are available
      const { assets } = res;
  
      if (!assets || assets.length === 0) {
        Alert.alert("Error", "No file selected");
        return;
      }
  
      // Extract file details from the first asset
      const { uri, name, mimeType } = assets[0];
  
      // Log the file details
      console.log("File details:", { uri, name, mimeType });
  
      // Validate if the file URI is present
      if (!uri) {
        Alert.alert("Error", "No file selected");
        return;
      }
  
      
      // Perform the API call for file upload
     
    } catch (err) {
      Alert.alert("Error", "An error occurred: " + err.message);
      console.error("Upload Error:", err);
    }
  };

const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
         <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Icon name="arrow-left" size={15} color="#000" />
      </TouchableOpacity>
      <Text style={styles.title}>Step 2 - Specialization Details</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Specialization(s)</Text>
        <View style={styles.input}>
          <Picker
            selectedValue={formData.specialization}
            onValueChange={(itemValue) => setFormData({ ...formData, specialization: itemValue })}
            style={styles.picker}
          >
            <Picker.Item label="Select or add specializations" value="" />
            <Picker.Item label="Cardiology" value="Cardiology" />
            <Picker.Item label="Neurology" value="Neurology" />
            <Picker.Item label="Orthopedics" value="Orthopedics" />
          </Picker>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sub-specialization</Text>
        <TextInput
          style={[styles.input, {  backgroundColor: '#fff' }]}
          value={formData.subSpecialization}
          onChangeText={(text) => setFormData({ ...formData, subSpecialization: text })}
          placeholder="Enter sub-specialization"
          placeholderTextColor="#888"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Years of Experience</Text>
        <TextInput
          style={styles.input}
          value={formData.yearsExperience}
          onChangeText={(text) => setFormData({ ...formData, yearsExperience: text })}
          keyboardType="numeric"
          placeholder="e.g. 5"
          placeholderTextColor="#888"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Degrees</Text>
        <TouchableOpacity onPress={() => handleFileUpload('degrees')} style={styles.uploadContainer}>
          <View style={styles.uploadField}>
            <Icon name="upload" size={20} color="#888" style={styles.uploadIcon} />
            <Text style={styles.uploadText}>{formData.degrees || 'Upload Degree Certificate(s)'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Certifications</Text>
        <TouchableOpacity onPress={() => handleFileUpload('certifications')} style={styles.uploadContainer}>
          <View style={styles.uploadField}>
            <Icon name="upload" size={20} color="#888" style={styles.uploadIcon} />
            <Text style={styles.uploadText}>{formData.certifications || 'Upload Certificate(s)'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>Next →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#e0f7e0',
  },
   backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
    padding: 10,
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginBottom: 5,
  },
  inputGroup: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    width: '100%',
    height: 50,
    color: '#000',
  },
  picker: {
    height: 50,
    color: '#000',
    textAlign:'center',
  },
  uploadContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
    height: 100,
  },
  uploadField: {
    alignItems: 'center',
    padding: 10,
    height: '100%',
  },
  uploadText: {
    flex: 1,
    fontSize: 16,
    color: '#888',
    margin:10
  },
  uploadIcon: {
    marginLeft: 10,
    margin:10,
  },
  nextButton: {
    backgroundColor: '#00203f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  nextText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default SpecializationDetails;