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
  Image,
  Share
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
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        bp: `${vitals?.bpSystolic || ''}/${vitals?.bpDiastolic || ''}` || null,
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
            testName: test.testName || test,
            testInventoryId: test.testInventoryId || null,
          }))
          : [],
        medications: Array.isArray(diagnosis?.medications)
          ? diagnosis?.medications?.map((med) => ({
            medInventoryId: med.medInventoryId || null,
            medName: med.medName || med.name || "Not specified",
            quantity: med.quantity || 0,
            medicineType: med.medicineType || "Not specified",
            dosage: med.dosage || med.dosagePattern || "As directed",
            duration: med.duration || "Not specified",
            timings: med.timings || [med.timing] || [],
            frequency: med.frequency || "Not specified",
            notes: med.notes || "Not specified",
          }))
          : [],
      },
      advice: {
        advice: advice.advice || null,
        followUpDate: advice.followUpDate || null,
        PrescribeMedNotes: advice.medicationNotes || null,
      },
      createdBy: currentuserDetails.userId || doctorInfo.doctorId,
      updatedBy: currentuserDetails.userId || doctorInfo.doctoId,
    };
  }

  // Fallback builder so addattachprescription never fails if selectedClinic hasn't loaded
  const buildSelectedClinicPayload = () => {
    if (selectedClinic) return selectedClinic;
    const di = formData?.doctorInfo || {};
    return {
      clinicName: di.clinicName || di.primaryClinicName || 'Clinic',
      address: di.clinicAddress || di.address || di.selectedClinicAddress || '',
      mobile: di.clinicPhone || di.mobile || '',
      headerImage: di.headerImage || di.clinicHeaderImage || null,
      digitalSignature: di.digitalSignature || null,
      addressId: di.selectedClinicId || di.addressId || null,
    };
  };

  const generatePDFContent = (data) => {
    const vitals = data?.vitals || {};
    const patient = data.patientInfo || {};
    const doctorInfo = data.doctorInfo || {};

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

    const appointmentDate = data.doctorInfo?.appointmentDate
      ? dayjs(data.doctorInfo.appointmentDate).format('DD MMM YYYY')
      : null;
    const appointmentTime = data.doctorInfo?.appointmentStartTime || null;

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
            .appointment-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 8px; background: #f8f9fa; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="prescription-container">
            ${selectedClinic?.headerImage ? `
              <div class="prescription-header">
                <img src="${selectedClinic.headerImage}" alt="Clinic Header" style="width: 100%; max-height: 120px; object-fit: contain; display: block; margin: 0 auto;" />
              </div>
            ` : `
              <div class="prescription-header">
                <div class="clinic-info">${selectedClinic?.clinicName || 'Clinic Name'}</div>
                <div class="contact-info">
                  <div>📍 ${selectedClinic?.address || 'Address not provided'}</div>
                  <div>📞 ${selectedClinic?.mobile || 'Contact not provided'}</div>
                </div>
              </div>
            `}
 
            ${(appointmentDate || appointmentTime) ? `
              <div class="appointment-info">
                ${appointmentDate ? `<div>📅 Date: ${appointmentDate}</div>` : ''}
                ${appointmentTime ? `<div>⏰ Time: ${appointmentTime}</div>` : ''}
              </div>
            ` : ''}
 
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
 
            ${(patient.chiefComplaint || patient.pastMedicalHistory || patient.familyMedicalHistory || patient.physicalExamination) ? `
              <div class="prescription-section">
                <div class="section-header">📋 PATIENT HISTORY</div>
                <div class="history-row">
                  ${patient.chiefComplaint ? `
                    <div class="detail-item">
                      <div class="detail-label">Chief Complaint:</div>
                      <div class="detail-value">${patient.chiefComplaint}</div>
                    </div>
                  ` : ''}
                  ${patient.pastMedicalHistory ? `
                    <div class="detail-item">
                      <div class="detail-label">Past History:</div>
                      <div class="detail-value">${patient.pastMedicalHistory}</div>
                    </div>
                  ` : ''}
                  ${patient.familyMedicalHistory ? `
                    <div class="detail-item">
                      <div class="detail-label">Family History:</div>
                      <div class="detail-value">${patient.familyMedicalHistory}</div>
                    </div>
                  ` : ''}
                  ${patient.physicalExamination ? `
                    <div class="detail-item">
                      <div class="detail-label">Examination:</div>
                      <div class="detail-value">${patient.physicalExamination}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
 
            ${(vitals.bp || vitals.pulseRate || vitals.temperature || vitals.spo2 || vitals.respiratoryRate || vitals.height || vitals.weight || vitals.bmi) ? `
              <div class="prescription-section">
                <div class="section-header">🩺 VITALS</div>
                <div class="vitals-container">
                  ${vitals.bp ? `
                    <div class="vital-item"><span class="vital-label">BP:</span><span class="vital-value">${vitals.bp} mmHg</span></div>
                    <div class="vital-separator">|</div>
                  ` : ''}
                  ${vitals.pulseRate ? `
                    <div class="vital-item"><span class="vital-label">Pulse:</span><span class="vital-value">${vitals.pulseRate} BPM</span></div>
                    <div class="vital-separator">|</div>
                  ` : ''}
                  ${vitals.temperature ? `
                    <div class="vital-item"><span class="vital-label">Temp:</span><span class="vital-value">${vitals.temperature}°F</span></div>
                    <div class="vital-separator">|</div>
                  ` : ''}
                  ${vitals.spo2 ? `
                    <div class="vital-item"><span class="vital-label">SpO2:</span><span class="vital-value">${vitals.spo2}%</span></div>
                    <div class="vital-separator">|</div>
                  ` : ''}
                  ${vitals.respiratoryRate ? `
                    <div class="vital-item"><span class="vital-label">RR:</span><span class="vital-value">${vitals.respiratoryRate} breaths/min</span></div>
                    <div class="vital-separator">|</div>
                  ` : ''}
                  ${vitals.height ? `
                    <div class="vital-item"><span class="vital-label">Height:</span><span class="vital-value">${vitals.height} cm</span></div>
                    <div class="vital-separator">|</div>
                  ` : ''}
                  ${vitals.weight ? `
                    <div class="vital-item"><span class="vital-label">Weight:</span><span class="vital-value">${vitals.weight} kg</span></div>
                    <div class="vital-separator">|</div>
                  ` : ''}
                  ${vitals.bmi ? `
                    <div class="vital-item"><span class="vital-label">BMI:</span><span class="vital-value">${vitals.bmi}</span></div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
 
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
${data?.advice?.followUpDate ? `
  <div class="prescription-section">
    <div class="section-header">📅 FOLLOW-UP</div>
    <div class="follow-up-container">
      <div class="follow-up-date">Next Visit: ${dayjs(data.advice.followUpDate).format('DD MMM YYYY')}</div>
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
      return { filePath: downloadPath, fileName: `${fileName}.pdf` };
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'Failed to generate and save PDF.');
      throw err;
    }
  };

  const shareViaWhatsApp = async (pdfPath, fileName) => {
    try {
      const patientNumber = formData.patientInfo?.mobileNumber;
      if (!patientNumber) {
        Toast.show({ type: 'error', text1: 'Patient mobile number not available' });
        return;
      }
      const cleanedNumber = patientNumber.replace(/\D/g, '');
      const message = `Here's my medical prescription from ${selectedClinic?.clinicName || "Clinic"}\n` +
        `Patient: ${formData.patientInfo?.patientName || "N/A"}\n` +
        `Doctor: ${formData.doctorInfo?.doctorName || "N/A"}\n` +
        `Date: ${formData.doctorInfo?.appointmentDate ? dayjs(formData.doctorInfo.appointmentDate).format('DD MMM YYYY') : "N/A"}`;

      let fileUri = pdfPath;
      if (Platform.OS === 'android') {
        fileUri = `file://${pdfPath}`;
      }

      const whatsappUrl = `whatsapp://send?phone=${cleanedNumber}&text=${encodeURIComponent(message)}`;
      Linking.canOpenURL(whatsappUrl).then(supported => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Share.share({
            title: 'Share Prescription',
            message: `${message}\n\n`,
            url: fileUri,
            type: 'application/pdf',
          });
        }
      });
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      Toast.show({ type: 'error', text1: 'Failed to share prescription' });
    }
  };

  const handlePrescriptionAction = async (type) => {
    try {

      if (type === 'whatsapp') setIsSharing(true);
      if (type === 'save') setIsSaving(true);

      const formattedData = transformEprescriptionData(formData, type);
      const token = await AsyncStorage.getItem('authToken');

      const response = await AuthPost('pharmacy/addPrescription', formattedData, token);

      const statusVal = response?.status ?? response?.data?.statusCode ?? response?.data?.status;
      const isOk = statusVal === 201 || statusVal === 200 || statusVal === 'success';

      if (isOk) {
        const warnings = response?.data?.data?.warnings ?? [];
        const hasWarnings = Array.isArray(warnings) && warnings.length > 0;

        if (!hasWarnings) {
          const successMessage = type === 'save'
            ? 'Prescription saved successfully'
            : 'Prescription successfully added';
          Toast.show({ type: 'success', text1: successMessage });
        }

        if (hasWarnings) {
          warnings.forEach(w => {
            if (w?.message) Toast.show({ type: 'info', text1: w.message });
          });
        }

        if (type === 'print') {
          return;
        }

        if (type === 'whatsapp' || type === 'share') {
          const prescriptionId = response?.data?.prescriptionId;
          if (!prescriptionId) {
            console.error('Prescription ID is missing');
            Toast.show({ type: 'error', text1: 'Failed to upload attachment: Prescription ID missing' });
            return;
          }

          // IMPORTANT: backend expects selectedClinic — include it or build fallback
          const payload = {
            formData: { ...formData, prescriptionId },
            selectedClinic: buildSelectedClinicPayload(),
          };

          try {
            const uploadResponse = await AuthPost('pharmacy/addattachprescription', payload, token);
            const uploadOk =
              uploadResponse?.status === 200 ||
              uploadResponse?.data?.status === 'success' ||
              uploadResponse?.data?.statusCode === 200;

            if (uploadOk) {
              Toast.show({ type: 'success', text1: 'Attachment uploaded successfully' });

              const message =
                `Here's my medical prescription from ${formData?.doctorInfo?.clinicName || 'Clinic'}\n` +
                `Patient: ${formData?.patientInfo?.patientName || 'N/A'}\n` +
                `Doctor: ${formData?.doctorInfo?.doctorName || 'N/A'}\n` +
                `Date: ${formData?.doctorInfo?.appointmentDate ? dayjs(formData.doctorInfo.appointmentDate).format('DD MMM YYYY') : 'N/A'}`;

              const schemeUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
              const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
              const canOpen = await Linking.canOpenURL(schemeUrl);
              await Linking.openURL(canOpen ? schemeUrl : webUrl);
            } else {
              const apiMsg =
                uploadResponse?.data?.message ||
                uploadResponse?.data?.error ||
                'Failed to upload attachment';
              Toast.show({ type: 'error', text1: apiMsg });
            }
          } catch (uploadErr) {
            console.error('Upload error:', uploadErr);
            Toast.show({ type: 'error', text1: 'Failed to upload attachment' });
          }
          return;
        }

        if (type === 'download') {
          await downloadPDF();
          return;
        }

        if (type === 'save') {
          setTimeout(() => {
            navigation.navigate('Appointments');
          }, 3000);
          return;
        }
      } else {
        Toast.show({ type: 'error', text1: response?.data?.message || 'Failed to add prescription' });
      }
    } catch (error) {
      console.error('Error in handlePrescriptionAction:', error);
      Toast.show({ type: 'error', text1: error?.response?.data?.message || 'Failed to add prescription' });
    } finally {
      setIsSaving(false);
      setIsSharing(false);
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
  }, [doctorId]);

  return (
<ScrollView contentContainerStyle={styles.container}>
      {/* Header with conditional background and padding */}
      <View style={[
        styles.header, 
        !selectedClinic?.headerImage && styles.headerNoImagePadding,
        selectedClinic?.headerImage && styles.headerWithImageBackground
      ]}>
        {selectedClinic?.headerImage && (
          <Image
            source={{ uri: selectedClinic.headerImage }}
            style={styles.headerImage}
            resizeMode="contain"
          />
        )}
        <View className="row" style={styles.row}>
          <Text style={[
            styles.headerText,
            selectedClinic?.headerImage && styles.headerTextWithImage
          ]}>
            {selectedClinic?.clinicName}
          </Text>
          <View>
            <Text style={[
              styles.headerText,
              selectedClinic?.headerImage && styles.headerTextWithImage
            ]}>
              📍 {selectedClinic?.address}
            </Text>
            <Text style={[
              styles.headerText,
              selectedClinic?.headerImage && styles.headerTextWithImage
            ]}>
              📞 {selectedClinic?.mobile}
            </Text>
          </View>
        </View>
      </View>
      
      {(formData.doctorInfo?.appointmentDate || formData.doctorInfo?.appointmentStartTime) && (
        <View style={styles.appointmentSection}>
          {formData.doctorInfo?.appointmentStartTime && (
            <Text style={styles.appointmentText}>
              Time: {formData.doctorInfo.appointmentStartTime}
            </Text>
          )}
        </View>
      )}

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

      {(formData.patientInfo?.chiefComplaint || formData.patientInfo?.pastMedicalHistory ||
        formData.patientInfo?.familyMedicalHistory || formData.patientInfo?.physicalExamination) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient History</Text>
            {formData.patientInfo.chiefComplaint && (
              <Text style={{ color: 'black' }}>Chief Complaint: {formData.patientInfo.chiefComplaint}</Text>
            )}
            {formData.patientInfo.pastMedicalHistory && (
              <Text style={{ color: 'black' }}>Past History: {formData.patientInfo.pastMedicalHistory}</Text>
            )}
            {formData.patientInfo.familyMedicalHistory && (
              <Text style={{ color: 'black' }}>Family History: {formData.patientInfo.familyMedicalHistory}</Text>
            )}
            {formData.patientInfo.physicalExamination && (
              <Text style={{ color: 'black' }}>Examination: {formData.patientInfo.physicalExamination}</Text>
            )}
          </View>
        )}

      {(formData.vitals?.bpSystolic || formData.vitals?.bpDiastolic || formData.vitals?.pulseRate ||
        formData.vitals?.temperature || formData.vitals?.spo2 || formData.vitals?.respiratoryRate ||
        formData.vitals?.height || formData.vitals?.weight || formData.vitals?.bmi) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vitals</Text>
            <View style={styles.row}>
              {(formData.vitals.bpSystolic || formData.vitals.bpDiastolic) && (
                <Text style={{ color: 'black' }}>BP: {formData.vitals.bpSystolic}/{formData.vitals.bpDiastolic}</Text>
              )}
              {formData.vitals.pulseRate && (
                <Text style={{ color: 'black' }}>Pulse: {formData.vitals.pulseRate}</Text>
              )}
              {formData.vitals.temperature && (
                <Text style={{ color: 'black' }}>Temp: {formData.vitals.temperature}</Text>
              )}
            </View>
            <View style={styles.row}>
              {formData.vitals.respiratoryRate && (
                <Text style={{ color: 'black' }}>RR: {formData.vitals.respiratoryRate}</Text>
              )}
              {formData.vitals.spo2 && (
                <Text style={{ color: 'black' }}>Spo2: {formData.vitals.spo2}</Text>
              )}
              {formData.vitals.bmi && (
                <Text style={{ color: 'black' }}>BMI: {formData.vitals.bmi}</Text>
              )}
            </View>
            {(formData.vitals.height || formData.vitals.weight) && (
              <View style={styles.row}>
                {formData.vitals.height && (
                  <Text style={{ color: 'black' }}>Height: {formData.vitals.height} cm</Text>
                )}
                {formData.vitals.weight && (
                  <Text style={{ color: 'black' }}>Weight: {formData.vitals.weight} kg</Text>
                )}
              </View>
            )}
          </View>
        )}

      {formData?.diagnosis?.selectedTests?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tests</Text>
          {formData.diagnosis.selectedTests.map((test, index) => (
            <Text style={{ color: 'black' }} key={index}>
              • {test.testName || test}
            </Text>
          ))}
          {formData.diagnosis?.testNotes && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: '600', color: '#6b7280' }}>Test Findings:</Text>
              <Text>{formData.diagnosis.testNotes}</Text>
            </View>
          )}
        </View>
      )}

      {formData.diagnosis?.diagnosisList && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <View style={styles.diagnosisContainer}>
            {formData.diagnosis.diagnosisList.split(',').map((diagnosis, index) => (
              diagnosis.trim() && (
                <View key={index} style={styles.diagnosisTag}>
                  <Text style={styles.diagnosisText}>{diagnosis.trim().toUpperCase()}</Text>
                </View>
              )
            ))}
          </View>
        </View>
      )}

      {(formData?.diagnosis?.medications?.length > 0 || formData.advice?.medicationNotes) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication</Text>
          {formData.diagnosis?.medications?.map((med, index) => (
            <View key={index} style={styles.medItem}>
              <Text style={{ color: 'black', fontWeight: '600' }}>Medicine #{index + 1}</Text>
              <View style={styles.row}>
                <Text style={{ color: 'black' }}>Name: {med.medName || med.name}</Text>
                <Text style={{ color: 'black' }}>Type: {med.medicineType}</Text>
              </View>
              <View style={styles.row}>
                <Text style={{ color: 'black' }}>Dosage: {med.dosage || med.dosagePattern}</Text>
                <Text style={{ color: 'black' }}>Frequency: {med.frequency}</Text>
              </View>
              <View style={styles.row}>
                <Text style={{ color: 'black' }}>Duration: {med.duration}</Text>
                <Text style={{ color: 'black' }}>Timing: {med.timings?.join(', ') || med.timing}</Text>
              </View>
              {med.notes && (
                <Text style={{ color: 'black' }}>Notes: {med.notes}</Text>
              )}
            </View>
          ))}
          {formData.advice?.medicationNotes && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: '600', color: '#6b7280' }}>General Notes:</Text>
              <Text>{formData.advice.medicationNotes}</Text>
            </View>
          )}
        </View>
      )}

      {formData.advice?.advice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advice</Text>
          {formData.advice.advice.split('\n').map((item, index) => (
            item.trim() && (
              <Text key={index} style={{ color: 'black', marginLeft: 8 }}>
                • {item}
              </Text>
            )
          ))}
        </View>
      )}

      {formData.advice?.followUpDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow-Up</Text>
          <Text style={{ color: 'black' }}>
            Date: {dayjs(formData.advice.followUpDate).format('DD MMM YYYY')}
          </Text>
        </View>
      )}

      <View style={styles.signatureSection}>
        {selectedClinic?.digitalSignature ? (
          <Image
            source={{ uri: selectedClinic.digitalSignature }}
            style={styles.signatureImage}
            resizeMode="contain"
          />
        ) : (
          <View>
            <View style={{ height: 48 }} />
            <Text style={{ fontWeight: 'bold', color:'black' }}>
              DR. {formData?.doctorInfo?.doctorName || 'Unknown Doctor'}
            </Text>
          </View>
        )}
        <Text style={{ fontSize: 12, marginTop: 4 }}>
          ✔ Digitally Signed
        </Text>
      </View>

      <Text style={styles.footerText}>
        This prescription is computer generated and does not require physical signature
      </Text>

      <View style={styles.buttonRow}>

        <TouchableOpacity
          style={[styles.downloadButton, (isSharing || isSaving) && styles.disabledButton]}
          onPress={() => handlePrescriptionAction('whatsapp')}
          disabled={isSharing || isSaving}
        >
          <Text style={styles.downloadText}>
            {isSharing ? 'Processing...' : 'Share via WhatsApp'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || isSharing) && styles.disabledButton]}
          onPress={() => handlePrescriptionAction('save')}
          disabled={isSaving || isSharing}
        >
          <Text style={styles.saveText}>
            {isSaving ? 'Processing...' : 'Save'}
          </Text>
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
    borderRadius: 10,
    justifyContent: 'center',
  },
   headerNoImagePadding: {
    padding: 16, 
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  appointmentSection: {
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appointmentText: {
    color: '#0c4a6e',
    fontWeight: '500',
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  diagnosisContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  diagnosisTag: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  diagnosisText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  signatureSection: {
    alignItems: 'flex-end',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  
  headerImage: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
  },
  signatureImage: {
    width: 150,
    height: 48,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  downloadButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  downloadText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
});
