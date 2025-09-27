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
  Share,
  ActivityIndicator
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
      appointmentId: appointmentId || patientDetails.appointmentId,
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
    const formattedTime = appointmentTime
      ? (() => {
        try {
          // Ensure the time is in a valid format (e.g., HH:mm or HH:mm:ss)
          const timeParts = appointmentTime.split(':');
          const validTime = timeParts.length >= 2
            ? `${timeParts[0]}:${timeParts[1]}${timeParts[2] ? `:${timeParts[2]}` : ':00'}`
            : appointmentTime;
          return new Date(`2000-01-01T${validTime}`)
            .toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
            .replace(' AM', ' AM')
            .replace(' PM', ' PM');
        } catch (e) {
          return 'Time not provided';
        }
      })()
      : null;
    return `...`; // unchanged PDF generation body for brevity
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
      return { filePath: downloadPath, fileName: `${fileName}.pdf` };
    } catch (err) {
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
      const formattedTime = formData.doctorInfo?.appointmentStartTime
        ? (() => {
          try {
            const timeParts = formData.doctorInfo.appointmentStartTime.split(':');
            const validTime = timeParts.length >= 2
              ? `${timeParts[0]}:${timeParts[1]}${timeParts[2] ? `:${timeParts[2]}` : ':00'}`
              : formData.doctorInfo.appointmentStartTime;
            return new Date(`2000-01-01T${validTime}`)
              .toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
              .replace(' AM', ' AM')
              .replace(' PM', ' PM');
          } catch (e) {
            return 'Time not provided';
          }
        })()
        : 'N/A';
      const message = `Here's my medical prescription from ${selectedClinic?.clinicName || "Clinic"}\n` +
        `Patient: ${formData.patientInfo?.patientName || "N/A"}\n` +
        `Doctor: ${formData.doctorInfo?.doctorName || "N/A"}\n` +
        `Date: ${formData.doctorInfo?.appointmentDate ? dayjs(formData.doctorInfo.appointmentDate).format('DD MMM YYYY') : "N/A"}\n` +
        `Time: ${formattedTime}`;
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
          // Alert.alert('success', successMessage)
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
                `Date: ${formData?.doctorInfo?.appointmentDate ? dayjs(formData.doctorInfo.appointmentDate).format('DD MMM YYYY') : 'N/A'}` +
                `${formData.doctorInfo?.appointmentStartTime ? `\nTime: ${new Date(`2000-01-01T${formData.doctorInfo.appointmentStartTime}`)
                  .toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })
                  .replace('AM', ' AM')
                  .replace('PM', ' PM')}` : ''}`;
              const schemeUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
              const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
              const canOpen = await Linking.canOpenURL(schemeUrl);
              await Linking.openURL(canOpen ? schemeUrl : webUrl);
            } else {
              const apiMsg =
                uploadResponse?.data?.message ||
                uploadResponse?.data?.error ||
                'Failed to upload attachment';
              Toast.show({ type: 'success', text1: apiMsg });
            }
          } catch (uploadErr) {
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
        Alert.alert("Error", response?.message?.errors[0])
        // Toast.show({ type: 'error', text1: response?.data?.message || 'Failed to add prescription' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || 'Failed to add prescription' });
    } finally {
      setIsSaving(false);
      setIsSharing(false);
    }
  };

  useEffect(() => {
    const fetchClinics = async () => {
      if (!doctorId) {
        setError("No doctor ID available");
        return;
      }

      try {
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
        setError(err.message);
      }
    };
    fetchClinics();
  }, [doctorId]);

  const monthShortLower = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatDDMonYYYYLower = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      // fallback: return as-is if parsing fails
      return String(val);
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mon = monthShortLower[d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd}-${mon}-${yyyy}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Replace your entire header section with this code */}
      <View style={[
        styles.header,
        !selectedClinic?.headerImage && styles.headerNoImage,
        selectedClinic?.headerImage && styles.headerWithImageBackground
      ]}>
        {selectedClinic?.headerImage ? (
          <Image
            source={{ uri: selectedClinic.headerImage }}
            style={styles.headerImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.headerContent}>
            <Text style={styles.headerClinicName}>
              {selectedClinic?.clinicName || 'Clinic Name'}
            </Text>
            <View style={styles.headerContactInfo}>
              <Text style={styles.headerContactText}>
                📍 {selectedClinic?.address || 'Address not provided'}
              </Text>
              <Text style={styles.headerContactText}>
                📞 {selectedClinic?.mobile || 'Contact not provided'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {(formData.doctorInfo?.appointmentDate || formData.doctorInfo?.appointmentStartTime) && (
        <View
          style={[
            styles.appointmentSection,
            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
          ]}
        >
          {formData.doctorInfo?.appointmentStartTime ? (
            <Text style={styles.appointmentText}>
              Time: {`${formData.doctorInfo.appointmentStartTime}`}
            </Text>
          ) : <View />}

          {patientDetails?.appointmentDate && (
            <Text style={styles.appointmentText}>
              Date: {formatDDMonYYYYLower(patientDetails.appointmentDate)}
            </Text>
          )}
        </View>
      )}


      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dr. {formData?.doctorInfo?.doctorName}</Text>
        <Text style={{ color: "black" }}>
          {formData?.doctorInfo?.qualifications || 'Qualifications not provided'} | {formData?.doctorInfo?.specialization || 'Specialist'}
        </Text>
        <Text style={{ color: "black" }}>Medical Registration No: {formData?.doctorInfo?.medicalRegistrationNumber || 'Not provided'}</Text>
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
            <Text style={[styles.sectionTitle]}>Patient History</Text>
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

            {/* NEW: use a single wrapping row and consistent "vitalCard" boxes for alignment */}
            <View style={styles.vitalsRow}>
              {(formData.vitals.bpSystolic || formData.vitals.bpDiastolic) && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>BP</Text>
                  <Text style={styles.vitalValue}>{formData.vitals.bpSystolic}/{formData.vitals.bpDiastolic} mmHg</Text>
                </View>
              )}

              {formData.vitals.pulseRate && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Pulse</Text>
                  <Text style={styles.vitalValue}>{formData.vitals.pulseRate} bpm</Text>
                </View>
              )}

              {formData.vitals.temperature && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Temp</Text>
                  <Text style={styles.vitalValue}>{formData.vitals.temperature} °F</Text>
                </View>
              )}

              {formData.vitals.respiratoryRate && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>RR</Text>
                  <Text style={styles.vitalValue}>{formData.vitals.respiratoryRate} /min</Text>
                </View>
              )}

              {formData.vitals.spo2 && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>SpO2</Text>
                  <Text style={styles.vitalValue}>{formData.vitals.spo2} %</Text>
                </View>
              )}

              {formData.vitals.height && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Height</Text>
                  <Text style={styles.vitalValue}>{formData.vitals.height} cm</Text>
                </View>
              )}

              {formData.vitals.weight && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Weight</Text>
                  <Text style={styles.vitalValue}>{formData.vitals.weight} kg</Text>
                </View>
              )}

              {formData.vitals.bmi && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>BMI</Text>
                  <Text style={styles.vitalValue}>{formData.vitals.bmi}</Text>
                </View>
              )}

            </View>

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
              <Text style={{ color: 'black' }}>{formData.advice.medicationNotes}</Text>
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
            <Text style={{ fontWeight: 'bold', color: 'black' }}>
              DR. {formData?.doctorInfo?.doctorName || 'Unknown Doctor'}
            </Text>
          </View>
        )}
        <Text style={{ fontSize: 12, marginTop: 4, color: 'black' }}>
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
            {isSharing ? <ActivityIndicator size="small" color="#007bff" /> : 'Share via WhatsApp'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || isSharing) && styles.disabledButton]}
          onPress={() => handlePrescriptionAction('save')}
          disabled={isSaving || isSharing}
        >
          <Text style={styles.saveText}>
            {isSaving ? <ActivityIndicator size="small" color="#007bff" /> : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.homeButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DoctorDashboard')}
      >
        <Text style={styles.homeButtonText}>Go To Dashboard</Text>
      </TouchableOpacity>
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
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    justifyContent: 'center',
  },
  homeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  homeButton: {
    backgroundColor: '#000000ff',
    paddingVertical: 10,
    marginBottom: 28,
    borderRadius: 8,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerClinicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerContactInfo: {
    alignItems: 'center',
  },
  headerContactText: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerImage: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
  },
  headerNoImage: {
    backgroundColor: '#007bff',
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
    justifyContent: 'flex-end',   // <- push children to right
    alignItems: 'center',         // <- vertical centering
  },
  appointmentText: {
    color: '#0c4a6e',
    fontWeight: '500',
    textAlign: 'right',           // <- ensure text is right aligned
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
    color: 'black'
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
    gap: 8,
  },
  downloadButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14, // Increased for better touch targets
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center', // Centers content vertically
    alignItems: 'center', // Centers content horizontally
    minHeight: 48, // Ensures consistent height
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14, // Increased for better touch targets
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center', // Centers content vertically
    alignItems: 'center', // Centers content horizontally
    minHeight: 48, // Ensures consistent height
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  downloadText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false, // Removes extra font padding
    textAlignVertical: 'center', // Ensures vertical centering on Android
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false, // Removes extra font padding
    textAlignVertical: 'center', // Ensures vertical centering on Android
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },

  /* ======== NEW STYLES FOR VITALS ALIGNMENT ======== */
  vitalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  vitalCard: {
    minWidth: 120,
    maxWidth: '48%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  vitalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  vitalValue: {
    marginTop: 4,
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },

});
