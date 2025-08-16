import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { AuthPost, AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';


const PatientDetails = () => {
const navigation = useNavigation<any>();
         const route = useRoute();
  const { patientDetails, formData:InitialFormData } = route.params;
  const [formData, setFormData] = useState(InitialFormData)
  console.log(formData,patientDetails.id, "complete form data"
  )

     const currentuserDetails =  useSelector((state: any) => state.currentUser);
      const doctorId = currentuserDetails.role==="doctor"? currentuserDetails.userId : currentuserDetails.createdBy

useEffect(() => {
  const fetchUserProfile = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');

      if (storedToken) {
        const profileResponse = await AuthFetch(`users/getUser?userId=${patientDetails.patientId}`, storedToken);

        console.log('Profile:', profileResponse);
        if (profileResponse.data.status === 'success'){
            const patientFormDetails = profileResponse.data.data
setFormData((prev) => ({
  ...prev,
  patientInfo: {
    ...prev.patientInfo,
    appointmentId:patientDetails.id,
    patientName: patientFormDetails.firstname, // for example
     patientId: patientDetails.patientId,
      age: patientFormDetails.age,
      gender: patientFormDetails.gender,
      mobileNumber: patientFormDetails.mobile,
      
  },
}));
        }

        // Do something with profileResponse
      } else {
        console.warn('No auth token found');
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  fetchUserProfile();
}, []);

 console.log(formData, "selected form data")

  return (
     <KeyboardAvoidingView style={styles.keyboardAvoidingContainer}
                           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                           keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
    <ScrollView contentContainerStyle={styles.container}>
        
            
        
      {/* Patient Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Patient Details</Text>

        <Text style={styles.input}>{formData.patientInfo.patientName}</Text>

        <Text style={styles.label}>Gender</Text>
       <View style={styles.radioGroup}>
  {['Male', 'Female', 'Other'].map((g) => {
    const isSelected = formData.patientInfo.gender === g;

    return (
      <TouchableOpacity
        key={g}
        style={[
          styles.radioOption,
          !isSelected && styles.disabledOption, // optional: show visually disabled
        ]}
        onPress={() => {
          if (isSelected) return; // prevent change
        }}
        disabled={!isSelected} // disable if not selected
      >
        <View style={styles.radioCircle}>
          {isSelected && <View style={styles.selectedCircle} />}
        </View>
        <Text style={{ color: '#000' }}>{g}</Text>
      </TouchableOpacity>
    );
  })}
</View>


        <Text  style={styles.input}>{formData.patientInfo.age}</Text>
        <Text style={styles.input} > {formData.patientInfo.mobileNumber}</Text>
      </View>

      {/* Patient History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📘 Patient History</Text>
        <Text style={styles.subtitle}>Complete medical history documentation</Text>

       <TextInput
  placeholder="Chief Complaint"
  style={styles.textArea}
  multiline
  value={formData.patientInfo.chiefComplaint}
  onChangeText={(text) =>
    setFormData((prev) => ({
      ...prev,
      patientInfo: {
        ...prev.patientInfo,
        chiefComplaint: text,
      },
    }))
  }
      placeholderTextColor="#9CA3AF"

/>

<TextInput
  placeholder="Past Medical History"
  style={styles.textArea}
  multiline
  value={formData.patientInfo.pastMedicalHistory}
  onChangeText={(text) =>
    setFormData((prev) => ({
      ...prev,
      patientInfo: {
        ...prev.patientInfo,
        pastMedicalHistory: text,
      },
    }))
  }
      placeholderTextColor="#9CA3AF"

/>

<TextInput
  placeholder="Family Medical History"
  style={styles.textArea}
  multiline
  value={formData.patientInfo.familyMedicalHistory}
  onChangeText={(text) =>
    setFormData((prev) => ({
      ...prev,
      patientInfo: {
        ...prev.patientInfo,
        familyMedicalHistory: text,
      },
    }))
  }
      placeholderTextColor="#9CA3AF"
/>

<TextInput
  placeholder="Physical Examination"
  style={styles.textArea}
  multiline
  value={formData.patientInfo.physicalExamination}
  onChangeText={(text) =>
    setFormData((prev) => ({
      ...prev,
      patientInfo: {
        ...prev.patientInfo,
        physicalExamination: text,
      },
    }))
  }
      placeholderTextColor="#9CA3AF"

/>

      </View>

      {/* Bottom Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton}  onPress={() => navigation.navigate('Vitals', {
     patientDetails,
     formData
 
  })} >
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
      
    </ScrollView>
     </KeyboardAvoidingView>
  );
};

export default PatientDetails;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F0FDF4',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
    color:'#0A2342',
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  label: {
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    color:'black'
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    color:'black',
  },
  radioGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    color: '#000',
  },
  radioCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  selectedCircle: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelText: {
    color: '#000',
    fontWeight: '500',
  },
  nextText: {
    color: '#fff',
    fontWeight: '600',
  },
   keyboardAvoidingContainer: {
    flex: 1,
  },
});
