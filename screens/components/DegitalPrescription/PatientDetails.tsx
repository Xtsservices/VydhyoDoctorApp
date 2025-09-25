import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useSelector } from 'react-redux';
import { AuthPost, AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PatientDetails = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { patientDetails } = route.params;
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails.role === "doctor" ? currentuserDetails.userId : currentuserDetails.createdBy;

  const [formData, setFormData] = useState({
    doctorInfo: {
      doctorId: doctorId || "",
      doctorName: "",
      qualifications: "",
      specialization: "",
      medicalRegistrationNumber: "",
      selectedClinicId: patientDetails.addressId || "",
      clinicAddress: "",
      contactNumber: "",
      appointmentDate: patientDetails.date || "",
      appointmentStartTime: patientDetails.appointmentTime || "",
      appointmentEndTime: "",
    },
    patientInfo: {
      patientId: patientDetails.patientId || "",
      patientName: "",
      age: "",
      gender: "",
      mobileNumber: "",
      chiefComplaint: "",
      pastMedicalHistory: "",
      familyMedicalHistory: "",
      physicalExamination: "",
      appointmentId: patientDetails.id || "",
    },
    vitals: {},
    diagnosis: {},
    advice: {},
  });

  const [doctorData, setDoctorData] = useState({});
  const [allClinics, setAllClinics] = useState({});

  const fetchPrescription = async () => {
    const appointmentId = patientDetails?.appointmentId ||patientDetails?.id;
    if (!appointmentId) return;

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`pharmacy/getEPrescriptionByAppointmentId/${appointmentId}`, token);
      if (response?.data?.success && response.data.data) {
        const prescription = response.data.data[0];
        const bpParts = prescription.vitals?.bp?.split('/') || [];
        const bpSystolic = bpParts[0] || "";
        const bpDiastolic = bpParts[1] || "";
        setFormData((prev) => ({
          ...prev,
          doctorInfo: {
            ...prev.doctorInfo,
            doctorId: prescription.doctorId || doctorId,
            selectedClinicId: prescription.addressId || "",
            appointmentDate: patientDetails.date || "",
            appointmentStartTime: patientDetails.appointmentTime || "",
          },
          patientInfo: {
            ...prev.patientInfo,
            patientId: prescription.userId || patientDetails.patientId || "",
            patientName: prescription.patientInfo?.patientName || patientDetails.patientName || "",
            age: prescription.patientInfo?.age || patientDetails.age || "",
            gender: prescription.patientInfo?.gender || patientDetails.gender || "",
            mobileNumber: prescription.patientInfo?.mobileNumber || patientDetails.mobileNumber || "",
            chiefComplaint: prescription.patientInfo?.chiefComplaint || patientDetails.appointmentReason || "",
            pastMedicalHistory: prescription.patientInfo?.pastMedicalHistory || "",
            familyMedicalHistory: prescription.patientInfo?.familyMedicalHistory || "",
            physicalExamination: prescription.patientInfo?.physicalExamination || "",
            appointmentId: prescription.appointmentId || ""
          },
          vitals: {
            bpSystolic,
            bpDiastolic,
            pulseRate: prescription.vitals?.pulseRate || "",
            respiratoryRate: prescription.vitals?.respiratoryRate || "",
            temperature: prescription.vitals?.temperature || "",
            spo2: prescription.vitals?.spo2 || "",
            height: prescription.vitals?.height || "",
            weight: prescription.vitals?.weight || "",
            bmi: prescription.vitals?.bmi || "",
            investigationFindings: prescription.vitals?.investigationFindings || "",
          },
          diagnosis: {
            diagnosisList: prescription.diagnosis?.diagnosisNote || "",
            selectedTests: prescription.diagnosis?.selectedTests || [],
            medications: prescription.diagnosis?.medications?.map((med: any) => ({
              ...med,
              id: Date.now() + Math.random(),
              timings: typeof med.timings === "string" ? med.timings.split(", ") : med.timings,
            })) || [],
            testNotes: prescription.diagnosis?.testsNote || "",
          },
          advice: {
            medicationNotes: prescription.advice?.PrescribeMedNotes || "",
            advice: prescription.advice?.advice || "",
            followUpDate: prescription.advice?.followUpDate || "",
          },
        }));
      }
    } catch (error) {
    }
  };

  const fetchDoctorData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`users/getUser?userId=${doctorId}`, token);
      const userData = response.data?.data;
      if (response.data.status === 'success') {
        setDoctorData(userData);
        const allClinics = (userData?.addresses?.filter((address: any) => 
          address.type === "Clinic" && address.status === "Active" && address.addressId === patientDetails.addressId
        ) || [])[0] || {};
        setFormData((prevFormData) => ({
          ...prevFormData,
          doctorInfo: {
            ...prevFormData.doctorInfo,
            appointmentDate: patientDetails?.date,
            appointmentStartTime: patientDetails?.appointmentTime,
            appointmentEndTime: "",
            clinicAddress: allClinics?.address || "",
            contactNumber: allClinics?.mobile ||"",
            doctorId: patientDetails?.doctorId|| "",
            doctorName: `${userData?.firstname} ${userData?.lastname}` ||"",
            medicalRegistrationNumber: userData?.medicalRegistrationNumber || "",
            qualifications: userData?.specialization?.degree|| "",
            selectedClinicId: allClinics?.addressId ||"",
            specialization: userData?.specialization?.name ||"",
          },
        }));
        setAllClinics(allClinics);
      }
    } catch (error) {
    } 
  };

  const fetchUserProfile = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      if (storedToken) {
        const profileResponse = await AuthFetch(`users/getUser?userId=${patientDetails.patientId}`, storedToken);
        if (profileResponse.data.status === 'success'){
          const patientFormDetails = profileResponse.data.data;
          setFormData((prev) => ({
            ...prev,
            patientInfo: {
              ...prev.patientInfo,
              appointmentId: patientDetails?.appointmentId||  patientDetails?.id,
              patientName: patientFormDetails?.firstname,
              patientId: patientDetails?.patientId,
              age: patientFormDetails.age,
              gender: patientFormDetails.gender,
              mobileNumber: patientFormDetails.mobile,
            },
          }));
        }
      } else {
      }
    } catch (e) {
    }
  };

  const handleNextPress = () => {
    Keyboard.dismiss();
    setTimeout(() => {
      navigation.navigate('Vitals', { patientDetails, formData });
    }, 100);
  };

  const handleCancelPress = () => {
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (currentuserDetails) {
      fetchDoctorData();
      fetchPrescription();
      fetchUserProfile();
    }
  }, [currentuserDetails]);

  const keyboardVerticalOffset = Platform.select({ ios: 80, android: 80 }) as number;

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <ScrollView 
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 140 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👤 Patient Details</Text>
              <Text style={styles.input}>{formData.patientInfo.patientName || 'Not provided'}</Text>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.radioGroup}>
                {['Male', 'Female', 'Other'].map((g) => {
                  const isSelected = formData.patientInfo.gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.radioOption,
                        !isSelected && styles.disabledOption,
                      ]}
                      onPress={() => {
                        if (isSelected) return;
                      }}
                      disabled={!isSelected}
                    >
                      <View style={styles.radioCircle}>
                        {isSelected && <View style={styles.selectedCircle} />}
                      </View>
                      <Text style={{color:"black"}}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.input}>{formData.patientInfo.age || 'Not provided'}</Text>
              <Text style={styles.input}>{formData.patientInfo.mobileNumber || 'Not provided'}</Text>
            </View>


            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📘 Patient History</Text>
              <Text style={styles.subtitle}>Complete medical history documentation</Text>
              <TextInput
                placeholder="Chief Complaint"
                placeholderTextColor="#9CA3AF"
                style={styles.textArea}
                multiline
                value={formData.patientInfo.chiefComplaint || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientInfo: {
                      ...prev.patientInfo,
                      chiefComplaint: text,
                    },
                  }))
                }
                returnKeyType="done"
              />
              <TextInput
                placeholder="Past Medical History"
                placeholderTextColor="#9CA3AF"
                style={styles.textArea}
                multiline
                value={formData.patientInfo.pastMedicalHistory || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientInfo: {
                      ...prev.patientInfo,
                      pastMedicalHistory: text,
                    },
                  }))
                }
                returnKeyType="done"
              />
              <TextInput
                placeholder="Family Medical History"
                placeholderTextColor="#9CA3AF"
                style={styles.textArea}
                multiline
                value={formData.patientInfo.familyMedicalHistory || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientInfo: {
                      ...prev.patientInfo,
                      familyMedicalHistory: text,
                    },
                  }))
                }
                returnKeyType="done"
              />
              <TextInput
                placeholder="Physical Examination"
                placeholderTextColor="#9CA3AF"
                style={styles.textArea}
                multiline
                value={formData.patientInfo.physicalExamination || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientInfo: {
                      ...prev.patientInfo,
                      physicalExamination: text,
                    },
                  }))
                }
                returnKeyType="done"
              />
            </View>
            <View style={{ flex: 1 }} />
          </ScrollView>
          <View style={[styles.buttonContainer, { paddingBottom: Platform.OS === 'ios' ? 20 : 12 }]}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancelPress}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.nextButton} 
              onPress={handleNextPress}
            >
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default PatientDetails;

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  scrollContent: {
    padding: 16,
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
    color: 'black'
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
  disabledOption: {
    opacity: 0.5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#000',
    fontWeight: '500',
  },
  nextText: {
    color: '#fff',
    fontWeight: '600',
  },
});
