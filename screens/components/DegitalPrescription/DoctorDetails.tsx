import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { AuthPost, AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';



const DoctorDetails = () => {
     const route = useRoute()
  const { patientDetails } = route.params;
  const navigation = useNavigation<any>();



     const currentuserDetails =  useSelector((state: any) => state.currentUser);
      const doctorId = currentuserDetails.role==="doctor"? currentuserDetails.userId : currentuserDetails.createdBy


 const [formData, setFormData] = useState({
    doctorInfo: {
      doctorId: doctorId || "",
      doctorName: currentuserDetails
        ? `${currentuserDetails.firstname || ""} ${currentuserDetails.lastname || ""}`.trim()
        : "",
      qualifications: currentuserDetails?.specialization?.degree || "",
      specialization: currentuserDetails?.specialization?.name || "",
      medicalRegistrationNumber: currentuserDetails?.medicalRegistrationNumber || "",
      selectedClinicId: "",
      clinicAddress: "",
      contactNumber: "",
      appointmentDate: "",
      appointmentStartTime: "",
      appointmentEndTime: "",
    },
    patientInfo: {
      patientId: "",
      patientName: "",
      age: "",
      gender: "",
      mobileNumber: "",
      chiefComplaint: "",
      pastMedicalHistory: "",
      familyMedicalHistory: "",
      physicalExamination: "",
        appointmentId: "",
    },
    vitals: {},
    diagnosis: {},
    advice: {},
  });

  const[doctorData, setDoctorData] = useState({})
  const [allClinics, setAllClinics] = useState({})




     const fetchPrescription = async () => {
    if (!patientDetails?.id) {
      
      return;
    }
    try {
         const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`pharmacy/getEPrescriptionByAppointmentId/${patientDetails.id}`, token);

      if (response?.data?.success && response?.data?.data) {
        const prescription2 = response?.data?.data;
        const prescription = response?.data?.data[0];       
        setFormData({
          doctorInfo: {
            ...formData.doctorInfo,
            doctorId: prescription.doctorId || doctorId,
            selectedClinicId: prescription.addressId || "",
            appointmentDate: patientDetails.appointmentDate || "",
            appointmentStartTime: patientDetails.appointmentTime || "",
          },
          patientInfo: {
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
            bp: prescription.vitals?.bp || "",
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
              id: Date.now() + Math.random(), // Add unique ID for UI rendering
              timings: typeof med.timings === "string" ? med.timings.split(", ") : med.timings,
            })) || [],
            testNotes: prescription.diagnosis?.testsNote || "",
            medicationNotes: prescription.diagnosis?.PrescribeMedNotes || "",
          },
          advice: {
            advice: prescription.advice?.advice || "",
            followUpDate: prescription.advice?.followUpDate || "",
          },
        });
      }
    } catch (error) {
    }
  };



const fetchDoctorData = async () => {
      try {
const token = await AsyncStorage.getItem('authToken');
        const response = await AuthFetch(`users/getUser?userId=${doctorId}`, token);
        const userData = response.data?.data;
        if (response.data.status==='success') {

         
            setDoctorData(userData);
  const allClinics = (userData?.addresses?.filter(address => 
    address.type === "Clinic" && address.status === "Active" && address.addressId === patientDetails.addressId
  ) || []);

     setFormData((prevFormData) => ({
  ...prevFormData,
  doctorInfo: {
    ...prevFormData.doctorInfo,
    appointmentDate: patientDetails?.date,
    appointmentStartTime: patientDetails?.appointmentTime,
    appointmentEndTime: "",
    clinicAddress: allClinics[0]?.address || "",
    contactNumber: allClinics[0]?.mobile ||"",
    doctorId: patientDetails?.doctorId|| "",
    doctorName: `${userData?.firstname} ${userData?.lastname}` ||"",
    medicalRegistrationNumber: "",
    qualifications: userData?.specialization?.degree|| "",
    selectedClinicId: allClinics[0]?.addressId ||"",
    specialization: userData?.specialization?.name ||"",
  },
}));

  setAllClinics(allClinics[0])
        }
      } catch (error) {
       
      } 
    };
  useEffect(() => {
    if(currentuserDetails){
fetchDoctorData()
    //   fetchPrescription()
    }
  },[currentuserDetails])
  useEffect(()=>{

  } ,[])
useEffect(() => {
    if(currentuserDetails){

      fetchPrescription()
    }
  },[currentuserDetails])



  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Doctor Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Icon name="person" size={16} color="#3B82F6" /> Doctor Information
        </Text>
        <Text style={styles.input}>{doctorData?.firstname} {doctorData?.lastname}</Text>
        <Text style={styles.input}>{doctorData?.specialization?.degree}</Text>

        
        <Text style={styles.input}>{doctorData?.specialization?.name}</Text>
        <Text style={styles.input}>{allClinics?.clinicName}</Text>
      </View>

      {/* Clinic Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Icon name="local-hospital" size={16} color="#3B82F6" /> Clinic Address
        </Text>
        <Text style={styles.input}>{allClinics?.address}</Text>
      </View>

      {/* Location Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Icon name="location-pin" size={16} color="#3B82F6" /> Location Details
        </Text>
        <Text style={styles.input}>{allClinics?.city}</Text>
        <Text style={styles.input}>{allClinics?.pincode}</Text>
      </View>

      {/* Contact & Report Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Icon name="call" size={16} color="#3B82F6" /> Contact Info & Report Schedule
        </Text>
         <Text style={styles.input}>{allClinics.mobile}</Text>

       
        <Text style={styles.input}>{patientDetails.date}</Text>
         <Text style={styles.input}>{patientDetails.appointmentTime}</Text>

      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton}  onPress={() => navigation.navigate('PatientDetails', {
     patientDetails,
     formData
 
  })}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default DoctorDetails;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F0FDF4',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color:'black'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  inputWithIcon: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  inputText: {
    fontSize: 14,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom:30
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    backgroundColor: '#ddd',
    borderRadius: 6,
    alignItems: 'center',
  },
  nextButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
