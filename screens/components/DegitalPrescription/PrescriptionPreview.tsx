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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import dayjs from 'dayjs';
import Toast from 'react-native-toast-message';
import { AuthPost, AuthFetch, UploadFiles } from '../../auth/auth';

const PrescriptionPreview = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { patientDetails, formData } = route.params;

  const currentuserDetails = useSelector((state) => state.currentUser);
  const doctorId = currentuserDetails.role === "doctor" ? currentuserDetails.userId : currentuserDetails.createdBy;

  const [error, setError] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);

  function transformEprescriptionData(formData) {
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
        PrescribeMedNotes: advice.medicationNotes || null,
      },
      createdBy: currentuserDetails.userId || doctorInfo.doctorId,
      updatedBy: currentuserDetails.userId || doctorInfo.doctordId,
    };
  }

  const generatePDFContent = (data) => {
    const vitals = data?.vitals || {};
    const patient = data.patientInfo || {};
    const doctorInfo = data.doctorInfo || {};

    // Fix: Access BP values correctly
    const bpValue = data?.vitals?.bp || 
                   (data?.vitals?.bpSystolic && data?.vitals?.bpDiastolic 
                    ? `${data.vitals.bpSystolic}/${data.vitals.bpDiastolic}` 
                    : 'Not provided');
    
    // Fix: Access follow-up date correctly
    const followUpDate = data?.advice?.followUpDate || 'Not provided';

    const medRows = data?.diagnosis?.medications?.map(
      (med, i) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${med.medicineType || 'Not provided'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${med.medName || 'Not provided'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${med.dosage || 'As directed'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${med.frequency || 'Not provided'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${med.timings?.join(', ') || 'Not provided'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${med.notes || 'Not provided'}</td>
        </tr>
      `
    ).join('') || '';

    const diagnosisTags = data?.diagnosis?.diagnosisList
      ? data.diagnosis.diagnosisList.split(',').map(d => `<span style="background: #e5e7eb; padding: 4px 8px; border-radius: 12px; margin-right: 8px; text-transform: uppercase;">${d.trim()}</span>`).join('')
      : 'Not provided';

    const adviceItems = data?.advice?.advice
      ? data.advice.advice.split('\n').map(item => item.trim() ? `<li style="margin-bottom: 4px;"><span style="margin-right: 8px;">•</span>${item}</li>` : '').join('')
      : '';

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #fff; color: #1f2937; font-size: 14px; }
            .prescription-container { max-width: 800px; margin: 0 auto; }
            .prescription-header { text-align: center; margin-bottom: 20px; }
            .clinic-info { font-size: 18px; font-weight: bold; text-transform: capitalize; }
            .contact-info { font-size: 13px; color: #6b7280; margin-top: 8px; }
            .doctor-patient-container { display: flex; justify-content: space-between; margin-bottom: 16px; }
            .doctor-info, .patient-info { flex: 1; }
            .patient-info { text-align: right; }
            .prescription-section { margin-bottom: 20px; }
            .section-header { font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; }
            .history-row { display: flex; flex-wrap: wrap; gap: 16px; }
            .detail-item { flex: 1 1 45%; }
            .detail-label { font-weight: 600; color: #6b7280; }
            .detail-value { margin-top: 4px; }
            .vitals-container { display: flex; flex-wrap: wrap; gap: 8px; }
            .vital-item { display: flex; gap: 4px; }
            .vital-label { font-weight: 600; color: #6b7280; }
            .vital-value { color: #1f2937; }
            .vital-separator { color: #d1d5db; }
            .investigation-row { display: flex; flex-wrap: wrap; gap: 8px; }
            .investigation-item { background: #e5e7eb; padding: 4px 8px; border-radius: 12px; }
            .diagnosis-row { display: flex; flex-wrap: wrap; gap: 8px; }
            .medication-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            .table-header { background: #f3f4f6; font-weight: 600; padding: 8px; border: 1px solid #e5e7eb; text-align: left; }
            .table-cell { padding: 8px; border: 1px solid #e5e7eb; text-align: left; }
            .notes-display { margin-top: 8px; }
            .notes-label { font-weight: 600; color: #6b7280; }
            .notes-content { margin-top: 4px; }
            .advice-list { list-style: none; padding: 0; }
            .advice-item { display: flex; margin-bottom: 4px; }
            .follow-up-container { margin-top: 8px; }
            .follow-up-date { font-size: 14px; }
            .signature { margin-top: 20px; text-align: right; }
            .prescription-footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="prescription-container">
            <div class="prescription-header">
              <div class="clinic-info">${selectedClinic?.clinicName || 'Clinic Name'}</div>
              <div class="contact-info">
                <div>📍 ${selectedClinic?.address || 'Address not provided'}</div>
                <div>📞 ${selectedClinic?.mobile || 'Contact not provided'}</div>
              </div>
            </div>

            <div class="doctor-patient-container">
              <div class="doctor-info">
                <div style="font-size: 18px; font-weight: bold;">DR. ${doctorInfo.doctorName || 'Unknown Doctor'}</div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 6px;">
                  ${doctorInfo.qualifications || 'Qualifications not provided'} | ${doctorInfo.specialization || 'Specialist'}
                </div>
                <div style="font-size: 13px; color: #6c757d;">
                  Medical Registration No: ${doctorInfo.medicalRegistrationNumber || 'Not provided'}
                </div>
              </div>
              <div class="patient-info">
                <div style="font-size: 12px; margin-bottom: 4px;">${patient.patientName || 'Unknown Patient'}</div>
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
                  ${patient.age || 'Age not provided'} Years | ${patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Gender not provided'}
                </div>
                <div style="font-size: 12px; color: #6c757d;">${patient.mobileNumber || 'Contact not provided'}</div>
              </div>
            </div>

            <div class="prescription-section">
              <div class="section-header">📋 PATIENT HISTORY</div>
              <div class="history-row">
                <div class="detail-item">
                  <div class="detail-label">Chief Complaint:</div>
                  <div class="detail-value">${patient.chiefComplaint || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Past History:</div>
                  <div class="detail-value">${patient.pastMedicalHistory || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Family History:</div>
                  <div class="detail-value">${patient.familyMedicalHistory || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Examination:</div>
                  <div class="detail-value">${patient.physicalExamination || 'Not provided'}</div>
                </div>
              </div>
            </div>

            <div class="prescription-section">
              <div class="section-header">🩺 VITALS</div>
              <div class="vitals-container">
                <div class="vital-item"><span class="vital-label">BP:</span><span class="vital-value">${bpValue} mmHg</span></div>
                <div class="vital-separator">|</div>
                <div class="vital-item"><span class="vital-label">Pulse:</span><span class="vital-value">${vitals.pulseRate || 'Not provided'} BPM</span></div>
                <div class="vital-separator">|</div>
                <div class="vital-item"><span class="vital-label">Temp:</span><span class="vital-value">${vitals.temperature || 'Not provided'}°F</span></div>
                <div class="vital-separator">|</div>
                <div class="vital-item"><span class="vital-label">SpO2:</span><span class="vital-value">${vitals.spo2 || 'Not provided'}%</span></div>
                <div class="vital-separator">|</div>
                <div class="vital-item"><span class="vital-label">RR:</span><span class="vital-value">${vitals.respiratoryRate || 'Not provided'} breaths/min</span></div>
                <div class="vital-separator">|</div>
                <div class="vital-item"><span class="vital-label">Height:</span><span class="vital-value">${vitals.height || 'Not provided'} cm</span></div>
                <div class="vital-separator">|</div>
                <div class="vital-item"><span class="vital-label">Weight:</span><span class="vital-value">${vitals.weight || 'Not provided'} kg</span></div>
                <div class="vital-separator">|</div>
                <div class="vital-item"><span class="vital-label">BMI:</span><span class="vital-value">${vitals.bmi || 'Not provided'}</span></div>
              </div>
            </div>

            ${data?.diagnosis?.selectedTests?.length > 0 ? `
              <div class="prescription-section">
                <div class="section-header">🔬 TESTS</div>
                <div class="investigation-row">
                  ${data.diagnosis.selectedTests.map(test => `<div class="investigation-item">${test.testName || test}</div>`).join('')}
                </div>
                ${data.diagnosis?.testNotes ? `
                  <div class="notes-display">
                    <div class="notes-label">Test Findings:</div>
                    <div class="notes-content">${data.diagnosis.testNotes}</div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            ${data?.diagnosis?.diagnosisList ? `
              <div class="prescription-section">
                <div class="section-header">🩺 DIAGNOSIS</div>
                <div class="diagnosis-row">${diagnosisTags}</div>
              </div>
            ` : ''}

            ${(data?.diagnosis?.medications?.length > 0 || data?.advice?.medicationNotes) ? `
              <div class="prescription-section">
                <div class="section-header">💊 MEDICATION</div>
                ${data.diagnosis?.medications?.length > 0 ? `
                  <table class="medication-table">
                    <thead>
                      <tr>
                        <th class="table-header">Type</th>
                        <th class="table-header">Medicine Name</th>
                        <th class="table-header">Dosage</th>
                        <th class="table-header">Frequency</th>
                        <th class="table-header">Timings</th>
                        <th class="table-header">Notes</th>
                      </tr>
                    </thead>
                    <tbody>${medRows}</tbody>
                  </table>
                ` : ''}
                ${data.advice?.medicationNotes ? `
                  <div class="notes-display">
                    <div class="notes-label">General Notes:</div>
                    <div class="notes-content">${data.advice.medicationNotes}</div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            ${data?.advice?.advice ? `
              <div class="prescription-section">
                <div class="section-header">💡 ADVICE</div>
                <ul class="advice-list">${adviceItems}</ul>
              </div>
            ` : ''}

            ${followUpDate !== 'Not provided' ? `
              <div class="prescription-section">
                <div class="section-header">📅 FOLLOW-UP</div>
                <div class="follow-up-container">
                  <div class="follow-up-date">Next Visit: ${dayjs(followUpDate).format('DD MMM YYYY')}</div>
                </div>
              </div>
            ` : ''}

            <div class="signature">
              ${selectedClinic?.digitalSignature ? `
                <img src="${selectedClinic.digitalSignature}" alt="Digital Signature" style="max-width: 150px; max-height: 48px;" />
              ` : `
                <div style="height: 48px;"></div>
                <div style="font-weight: bold;">DR. ${doctorInfo.doctorName || 'Unknown Doctor'}</div>
              `}
              <div style="font-size: 12px; margin-top: 4px;">✔ Digitally Signed</div>
            </div>

            <div class="prescription-footer">
              This prescription is computer generated and does not require physical signature
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const downloadPDF = async () => {
    try {
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

      const html = generatePDFContent(formData);
      const timestamp = dayjs().format('YYYYMMDD_HHmmss');
      const fileName = `Prescription_${timestamp}`;
      const pdf = await RNHTMLtoPDF.convert({
        html,
        fileName,
        base64: false,
      });

      const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}.pdf`;
      await RNFS.moveFile(pdf.filePath, downloadPath);

      Alert.alert('Success', `Prescription saved in Downloads as ${fileName}.pdf`);
      console.log('PDF saved at:', downloadPath);
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'Failed to generate and save PDF.');
    }
  };

  const handlePrescriptionAction = async (type) => {
    try {
      const formattedData = transformEprescriptionData(formData);
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthPost('pharmacy/addPrescription', formattedData, token);

      if (response?.status === 'success') {
        if (type === 'download') {
          Toast.show({ type: 'success', text1: 'Prescription successfully added' });
          await downloadPDF();
        } else if (type === 'save') {
          Toast.show({ type: 'success', text1: 'Saved successfully' });
          navigation.navigate('DoctorDashboard');
        } else if (type === 'share') {
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

          const uploadFormData = new FormData();
          uploadFormData.append("file", {
            uri: Platform.OS === 'android' ? `file://${pdf.filePath}` : pdf.filePath,
            type: 'application/pdf',
            name: 'e-prescription.pdf',
          });
          uploadFormData.append("prescriptionId", prescriptionId);
          uploadFormData.append("appointmentId", patientDetails?.id || "");
          uploadFormData.append("patientId", patientDetails?.patientId || "");
          uploadFormData.append("mobileNumber", formData.patientInfo?.mobileNumber || "");

          const uploadResponse = await UploadFiles(
            "pharmacy/addattachprescription",
            uploadFormData,
            token
          );

          if (uploadResponse?.status === 200) {
            Toast.show({ type: 'success', text1: 'Shared successfully' });
            const message = `Here's my medical prescription from ${selectedClinic?.clinicName || "Clinic"}\n` +
              `Patient: ${formData.patientInfo?.patientName || "N/A"}\n` +
              `Doctor: ${formData.doctorInfo?.doctorName || "N/A"}\n` +
              `Date: ${formData.doctorInfo?.appointmentDate ? dayjs(formData.doctorInfo.appointmentDate).format('DD MMM YYYY') : "N/A"}`;
            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            Linking.openURL(url).catch(err => {
              console.error('Failed to open WhatsApp:', err);
              Toast.show({ type: 'error', text1: 'Failed to open WhatsApp' });
            });
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

  useEffect(() => {
    const fetchClinics = async () => {
      if (!doctorId) {
        console.error("No doctorId available. User:", currentuserDetails);
        setError("No doctor ID available");
        return;
      }

      try {
        console.log("Fetching clinics for doctorId:", doctorId);
        const token = await AsyncStorage.getItem('authToken');
        const response = await AuthFetch(`users/getClinicAddress?doctorId=${doctorId}`, token);

        if (response.data?.status === "success") {
          const allClinics = response.data.data || [];
          const activeClinics = allClinics.filter((clinic) => clinic.addressId === formData.doctorInfo.selectedClinicId);
          setSelectedClinic(activeClinics[0]);
        } else {
          setError("Failed to fetch clinics");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      }
    };
    fetchClinics();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.row}>
          <Text style={styles.headerText}>{selectedClinic?.clinicName}</Text>
          <View>
            <Text style={styles.headerText}>📍 {selectedClinic?.address}</Text>
            <Text style={styles.headerText}>📞 {selectedClinic?.mobile}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dr. {formData?.doctorInfo?.doctorName}</Text>

        <Text>
          {formData?.doctorInfo?.qualifications || 'Qualifications not provided'} | {formData?.doctorInfo?.specialization || 'Specialist'}
        </Text>
        <Text>Medical Registration No: {formData?.doctorInfo?.medicalRegistrationNumber || 'Not provided'}</Text>

      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Details</Text>

        <Text style={{ color: 'black' }}>Name: {formData?.patientInfo?.patientName}</Text>
        <Text style={{ color: 'black' }}>Age: {formData?.patientInfo?.age} Years</Text>
        <Text style={{ color: 'black' }}>Gender: {formData?.patientInfo?.gender} </Text>
        <Text style={{ color: 'black' }}>Mobile: {formData?.patientInfo?.mobileNumber}</Text>

      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient History</Text>


        <Text style={{ color: 'black' }}>Chief Complaint: {formData.patientInfo.
chiefComplaint}</Text>
<Text style={{ color: 'black' }}>Past History: {formData.patientInfo.
pastMedicalHistory
}</Text>
<Text style={{ color: 'black' }}>Family History: {formData.patientInfo.
familyMedicalHistory}</Text>
<Text style={{ color: 'black' }}>Examination: {formData.patientInfo.
physicalExamination}</Text>

      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vitals</Text>

         <View style={styles.row}>
 <Text style={{ color: 'black' }}>BP: {formData.vitals.bpSystolic
}/{formData.vitals.bpDiastolic
}</Text>
        <Text style={{ color: 'black' }}>Pulse: {formData.vitals.pulseRate}</Text>
         <Text style={{ color: 'black' }}>Temp:  {formData.vitals.temperature}</Text>
         </View>
        <View style={styles.row}>
<Text style={{ color: 'black' }}>RR
:  {formData.vitals.respiratoryRate
}</Text>
<Text style={{ color: 'black' }}>Spo2
:  {formData.vitals.spo2
}</Text>
<Text style={{ color: 'black' }}>BMI
:  {formData.vitals.bmi
}</Text>

        </View>
      </View>

      <View style={styles.section}>

        <Text  style={styles.sectionTitle}>Tests</Text>
         {formData?.diagnosis?.selectedTests?.map((test: string, index: number) => (
          <Text style={{ color: 'black' }} key={index}>{test.testName}</Text>

        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescribed Medications</Text>
        {formData?.diagnosis?.medications?.map((med, index) => (
          <View key={index} style={styles.medItem}>
            <Text style={{ color: 'black' }}>Medicine #{index + 1}</Text>
            <View style={styles.row}>

              <Text style={{ color: 'black' }}>Name: {med.medName}</Text>
            <Text style={{ color: 'black' }}>Type: {med.medicineType}</Text>
            <Text style={{ color: 'black' }}>Dosage: {med.dosage}</Text>
            </View>
            <View style={styles.row}>
 <Text style={{ color: 'black' }}>Duration: {med.
duration
}</Text>
            <Text style={{ color: 'black' }}>Frequency: {med.
frequency
}</Text>
            
            </View>
            <Text style={{ color: 'black' }}>Timing: {med.
timings?.join(', ')}</Text>

           
  

          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Notes</Text>
        <Text>{formData.advice.medicationNotes}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advice</Text>
        <Text style={{ color: 'black' }}>{formData.advice.advice}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Follow-Ups</Text>

        <Text style={{ color: 'black' }}>Date:{formData.advice.followUpDate} </Text>

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
    backgroundColor: '#2563eb',
    color: 'white',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    color: '#fff',
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
    color: '#0A2342',
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