import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';
import { AuthPost, AuthFetch, UploadFiles } from '../../auth/auth';

import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import dayjs from 'dayjs';

const PrescriptionPreview = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientDetails, formData } = route.params;


  const currentuserDetails =  useSelector((state: any) => state.currentUser);
      const doctorId = currentuserDetails.role==="doctor"? currentuserDetails.userId : currentuserDetails.createdBy
  console.log(formData, "complete prescription details")

  function transformEprescriptionData(formData: { doctorInfo: any; patientInfo: any; vitals: any; diagnosis: any; advice: any; }) {
    const { doctorInfo, patientInfo, vitals, diagnosis, advice } = formData;
    const appointmentId = patientDetails?.id;

    return {
      appointmentId: appointmentId,
      userId: patientInfo.patientId,
      doctorId: doctorInfo.doctorId,
      addressId: doctorInfo.selectedClinicId,
      patientInfo: {
        patientName: patientInfo.patientName || "Unknown",
        age: patientInfo.age || 0,
        gender: patientInfo.gender || "Other",
        mobileNumber: patientInfo.mobileNumber || "0000000000",
        chiefComplaint: patientInfo.chiefComplaint,
        pastMedicalHistory: patientInfo.pastMedicalHistory || null,
        familyMedicalHistory: patientInfo.familyMedicalHistory || null,
        physicalExamination: patientInfo.physicalExamination || null,
      },
      vitals: {
        bp: `${vitals?.bpSystolic}/${vitals?.bpDiastolic}` || null,
        pulseRate: vitals.pulseRate || null,
        respiratoryRate: vitals.respiratoryRate || null,
        temperature: vitals.temperature || null,
        spo2: vitals.spo2 || null,
        height: vitals.height || null,
        weight: vitals.weight || null,
        bmi: vitals.bmi || null,
        investigationFindings: vitals.investigationFindings || null,
      },
      diagnosis: {
        diagnosisNote: diagnosis.diagnosisList || null,
        testsNote: diagnosis.testNotes || null,
        PrescribeMedNotes: diagnosis.medicationNotes || null,
        selectedTests: Array.isArray(diagnosis.selectedTests)
          ? diagnosis.selectedTests.map((test) => ({
              testName: test.testName,
              testInventoryId: test.testInventoryId,
            }))
          : [],
        medications: Array.isArray(diagnosis?.medications)
          ? diagnosis?.medications?.map((med) => ({
              medInventoryId: med.medInventoryId,
              medName: med.medName,
              quantity: med.quantity,
              medicineType: med.medicineType,
              dosage: med.dosage,
              duration: med.duration,
              timings: med.timings,
              frequency: med.frequency,
            }))
          : [],
      },
      advice: {
        advice: advice.advice || null,
        followUpDate: advice.followUpDate || null,
      },
      createdBy: currentuserDetails.userId || doctorInfo.doctorId,
      updatedBy: currentuserDetails.userId ||doctorInfo.doctorId,
    };
  }

 const generatePDFContent = (data: any) => {
  const vitals = data?.vitals || {};
  const patient = data.patientInfo || {};

  const medRows =
    data?.diagnosis?.medications?.map(
      (med: any, i: number) =>
        `<tr><td>${i + 1}</td><td>${med.medName}</td><td>${med.dosage}</td><td>${med.medicineType}</td><td>${med.duration} days</td><td>${med.frequency}</td><td>${med.quantity}</td><td>${med.timings?.join(', ')}</td></tr>`
    ).join('') || '';

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h2 { text-align: center; margin-bottom: 0; }
          h4 { margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
          th { background: #eee; }
        </style>
      </head>
      <body>
        <h2>Prescription</h2>
        <p><strong>Patient:</strong> ${patient.patientName || ''} (${patient.gender || ''}, Age ${patient.age || ''})</p>

        <h4>Vitals</h4>
        <p><strong>BP:</strong> ${vitals.bp || '-'} | <strong>Pulse:</strong> ${vitals.pulse || '-'} | <strong>SpO2:</strong> ${vitals.spo2 || '-'}</p>
        <p><strong>Temperature:</strong> ${vitals.temperature || '-'} | <strong>Height:</strong> ${vitals.height || '-'} | <strong>Weight:</strong> ${vitals.weight || '-'}</p>

        <h4>Diagnosis</h4>
        <p>${data?.diagnosis?.diagnosisList || '-'}</p>

        <h4>Tests</h4>
        <p>${(data?.diagnosis?.selectedTests?.map((t: any) => t.testName).join(', ') || 'None')}</p>

        <h4>Medications</h4>
        <table>
          <tr>
            <th>#</th>
            <th>Medicine</th>
            <th>Dosage</th>
            <th>Type</th>
            <th>Duration</th>
            <th>Frequency</th>
            <th>Quantity</th>
            <th>Timings</th>
          </tr>
          ${medRows}
        </table>

        <h4>Advice</h4>
        <p>${data?.advice?.advice || '-'}</p>

        <h4>Follow-up</h4>
        <p><strong>Date:</strong> ${data?.advice?.followUpDate || '-'} | <strong>Note:</strong> ${data?.advice?.advice || '-'}</p>
      </body>
    </html>
  `;
};


const downloadPDF = async () => {
  try {
    // Request permission on Android < 13
    if (Platform.OS === 'android' && Platform.Version < 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Permission Required',
          'Go to Settings > App > Permissions and enable Storage to save the PDF.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Cannot save PDF without storage permission.');
        return;
      }
    }

    // Generate HTML from formData
    const html = generatePDFContent(formData);

    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const fileName = `Prescription_${timestamp}`;
    const pdf = await RNHTMLtoPDF.convert({
      html,
      fileName,
      base64: false,
    });

    const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}.pdf`;
    await RNFS.moveFile(pdf.filePath!, downloadPath);

    Alert.alert('Success', `Prescription saved in Downloads as ${fileName}.pdf`);
    console.log('PDF saved at:', downloadPath);
  } catch (err) {
    console.error('Download error:', err);
    Alert.alert('Error', 'Failed to generate and save PDF.');
  }
};



  const handlePrescriptionAction = async (type: string, pdfBlob?: Blob) => {

    console.log(type)
    try {
      const formattedData = transformEprescriptionData(formData);

      console.log(formattedData, 'data to be sent for prescription saving');
const token = await AsyncStorage.getItem('authToken');

      const response = await AuthPost('pharmacy/addPrescription', formattedData, token);

      console.log(response, 
        "responseof detailed page"
      )

      if (response?.status === 'success') {
        Toast.show({ type: 'success', text1: 'Prescription successfully added' });
        console.log('Prescription Response:', response);

        if (type === 'download') {
          console.log("pdf maker")
           await downloadPDF();          
        } else if (type === 'save') {
           navigation.navigate('DoctorDashboard' )
        }else if (type==="share"){
           const prescriptionId = response?.data?.prescriptionId;
          if (!prescriptionId) {
            console.error("Prescription ID is missing");
             Toast.show({ type: 'error', text1: 'Failed to upload attachment: Prescription ID missing' });
            
            return;
          }

            

           const html = generatePDFContent(formData);

    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const fileName = `Prescription_${timestamp}`;
    const pdf = await RNHTMLtoPDF.convert({
      html,
      fileName,
      base64: false,
    });
          console.log()

          const uploadFormData  = new FormData();
          uploadFormData.append("file", {
  uri: Platform.OS === 'android' ? `file://${pdf.filePath}` : pdf.filePath,
  type: 'application/pdf',
  name: 'e-prescription.pdf',
});
          // uploadFormData .append("file", pdf, "e-prescription.pdf");
          uploadFormData .append("prescriptionId", prescriptionId);
          uploadFormData .append("appointmentId", patientDetails?.id || "");
          uploadFormData .append("patientId", patientDetails?.patientId || "");
          uploadFormData .append("mobileNumber", formData.patientInfo?.mobileNumber || "");

          console.log("Form Data for Upload:", uploadFormData);
          // for (const [key, value] of uploadFormData.entries()) {
          //   console.log(`${key}:`, value);
          // }



         const uploadResponse = await UploadFiles(
  "pharmacy/addattachprescription",
  uploadFormData,
  token,

);


          console.log("Upload Response:", uploadResponse);

          if (uploadResponse?.status === 200) {
               Toast.show({ type: 'success', text1: 'Attachment uploaded successfully' });
            const message = `Here's my medical prescription from ${formData.doctorInfo?.clinicName || "Clinic"}\n` +
              `Patient: ${formData.patientInfo?.patientName || "N/A"}\n` +
              `Doctor: ${formData.doctorInfo?.doctorName || "N/A"}\n` +
              `Date: ${formData.doctorInfo?.appointmentDate || "N/A"}`;
            const url = "https://wa.me/?text=" + encodeURIComponent(message);
            window.open(url, "_blank");
          } else {
          Toast.show({ type: 'error', text1: uploadResponse?.data?.message || "Failed to upload attachment" });
          }
        }
      } else {
        Toast.show({ type: 'error', text1: response?.data?.message || 'Failed to add prescription' });
      }
    } catch (error) {
      console.error('Error in handlePrescriptionAction:', error);
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to add prescription' });
    }
  };
  const [error, setError] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState()


  useEffect(()=>{
 const fetchClinics = async () => {
      if (!doctorId) {
        console.error("No doctorId available. User:", currentuserDetails);
        setError("No doctor ID available");
       
        return;
      }

      try {
        console.log("Fetching clinics for doctorId:", doctorId);
      const token = await AsyncStorage.getItem('authToken');

        const response = await AuthFetch(`users/getClinicAddress?doctorId=${doctorId}`,token);


        if ( response.data?.status === "success") {
          const allClinics = response.data.data || [];
          console.log(allClinics)
          const activeClinics = allClinics.filter((clinic) => clinic.addressId === formData.
doctorInfo
.selectedClinicId
);
        
          setSelectedClinic(activeClinics[0]);
        } else {
          setError("Failed to fetch clinics");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } 
    };
    fetchClinics()
  },[])

        console.log("API Response:", selectedClinic);


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>

        <View style={styles.row}>
        <Text style={styles.headerText}>{selectedClinic?.clinicName
}</Text>
<View >
<Text style={styles.headerText}>📍 {selectedClinic?.address
}</Text>
                    <Text style={styles.headerText}>📞{selectedClinic?.mobile
}</Text>
</View>
        </View>
         
      </View>

      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <Text>Phone: +91 12345 67890</Text>
        <Text>Email: info@vydhq.com</Text>
        <Text>Website: www.vydhq.com</Text>
      </View> */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dr. {formData?.doctorInfo?.doctorName}</Text>
        <Text>
{formData?.doctorInfo?.specialization}
</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Details</Text>
        <Text>Name: {formData?.patientInfo?.patientName}</Text>
        <Text>Age: {formData?.patientInfo?.age} Years</Text>
        <Text>Gender: {formData?.patientInfo?.gender} </Text>
        <Text>Mobile: {formData?.patientInfo?.mobileNumber}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient History</Text>

        <Text>Chief Complaint: {formData.patientInfo.
chiefComplaint}</Text>
<Text>Past History: {formData.patientInfo.
pastMedicalHistory
}</Text>
<Text>Family History: {formData.patientInfo.
familyMedicalHistory}</Text>
<Text>Examination: {formData.patientInfo.
physicalExamination}</Text>

      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vitals</Text>
         <View style={styles.row}>
 <Text>BP: {formData.vitals.bpDiastolic
}/{formData.vitals.bpSystolic
}</Text>
        <Text>Pulse: {formData.vitals.pulseRate}</Text>
         <Text>Temp:  {formData.vitals.temperature}</Text>
         </View>
        <View style={styles.row}>
<Text>RR
:  {formData.vitals.respiratoryRate
}</Text>
<Text>Spo2
:  {formData.vitals.spo2
}</Text>
<Text>BMI
:  {formData.vitals.bmi
}</Text>

        </View>
       
        

      </View>



      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tests</Text>
         {formData?.diagnosis?.selectedTests?.map((test: string, index: number) => (
          <Text key={index}>{test.testName}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescribed Medications</Text>
        {formData?.diagnosis?.medications?.map((med: any, index: number) => (
          <View key={index} style={styles.medItem}>
            <Text>Medicine #{index + 1}</Text>
            <View style={styles.row}>
 <Text>Name: {med.
medName}</Text>
            <Text>Type: {med.medicineType}</Text>
            <Text>Dosage: {med.dosage}</Text>
            </View>
            <View style={styles.row}>
 <Text>Duration: {med.
duration
}</Text>
            <Text>Frequency: {med.
frequency
}</Text>
            
            </View>
            <Text>Timing: {med.
timings?.join(', ')}</Text>

           
  
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advice</Text>
        <Text>{formData.advice.advice}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Follow-Ups</Text>
        <Text>Date:{formData.advice.followUpDate} </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handlePrescriptionAction('download')}
        >
          <Text style={styles.downloadText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handlePrescriptionAction('share')}
        >
          <Text style={styles.downloadText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => handlePrescriptionAction('save')}
        >
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PrescriptionPreview;


const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F0FDF4',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor:'#2563eb',
    color:'white'
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  medItem: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  downloadButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  downloadText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
  },
   row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});


