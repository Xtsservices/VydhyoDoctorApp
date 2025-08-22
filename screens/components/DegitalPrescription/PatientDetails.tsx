import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
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
    if (!patientDetails?.id) return;
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`pharmacy/getEPrescriptionByAppointmentId/${patientDetails.id}`, token);
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
            medications: prescription.diagnosis?.medications.map(med => ({
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
      console.error("Error fetching prescription:", error);
    }
  };

  const fetchDoctorData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`users/getUser?userId=${doctorId}`, token);
      const userData = response.data?.data;
      if (response.data.status === 'success') {
        setDoctorData(userData);
        const allClinics = (userData?.addresses?.filter(address => 
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
      console.error("Error fetching doctor data:", error);
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
              appointmentId: patientDetails.id,
              patientName: patientFormDetails.firstname,
              patientId: patientDetails.patientId,
              age: patientFormDetails.age,
              gender: patientFormDetails.gender,
              mobileNumber: patientFormDetails.mobile,
            },
          }));
        }
      } else {
        console.warn('No auth token found');
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  useEffect(() => {
    if (currentuserDetails) {
      fetchDoctorData();
      fetchPrescription();
      fetchUserProfile();
    }
  }, [currentuserDetails]);

  return (
    <KeyboardAvoidingView style={styles.keyboardAvoidingContainer}
                          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView contentContainerStyle={styles.container}>
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
                  <Text>{g}</Text>
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
          />
          <TextInput
            placeholder="Past Medical History"
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
          />
          <TextInput
            placeholder="Family Medical History"
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
          />
          <TextInput
            placeholder="Physical Examination"
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
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={() => navigation.navigate('Vitals', { patientDetails, formData })}>
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