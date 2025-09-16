import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import moment from 'moment';

const PreviousPrescription = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { prescriptions, patientName } = route.params || {};

  const renderMedications = (medications) => (
    <View style={styles.medicationsContainer}>
      <Text style={styles.sectionTitle}>Medications</Text>
      {medications.map((med, index) => (
        <View key={index} style={styles.medicationItem}>
          <View style={styles.medicationRow}>
            <Text style={styles.medicationLabel}>Name:</Text>
            <Text style={styles.medicationValue}>{med.medName || 'N/A'}</Text>
          </View>
          <View style={styles.medicationDetails}>
            <View style={styles.medicationDetail}>
              <Text style={styles.medicationLabel}>Type:</Text>
              <Text style={styles.medicationValue}>{med.medicineType || 'N/A'}</Text>
            </View>
            <View style={styles.medicationDetail}>
              <Text style={styles.medicationLabel}>Dosage:</Text>
              <Text style={styles.medicationValue}>{med.dosage || 'N/A'}</Text>
            </View>
            <View style={styles.medicationDetail}>
              <Text style={styles.medicationLabel}>Duration:</Text>
              <Text style={styles.medicationValue}>{med.duration || 'N/A'} days</Text>
            </View>
          </View>
          <View style={styles.medicationDetails}>
            <View style={styles.medicationDetail}>
              <Text style={styles.medicationLabel}>Frequency:</Text>
              <Text style={styles.medicationValue}>{med.frequency || 'N/A'}</Text>
            </View>
            <View style={styles.medicationDetail}>
              <Text style={styles.medicationLabel}>Timings:</Text>
              <Text style={styles.medicationValue}>
                {med.timings ? med.timings.join(', ') : 'N/A'}
              </Text>
            </View>
            <View style={styles.medicationDetail}>
              <Text style={styles.medicationLabel}>Quantity:</Text>
              <Text style={styles.medicationValue}>{med.quantity || 'N/A'}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderTests = (tests) => (
    <View style={styles.testsContainer}>
      <Text style={styles.sectionTitle}>Recommended Tests</Text>
      {tests.map((test, index) => (
        <View key={index} style={styles.testItem}>
          <Text style={styles.testText}>• {test.testName || 'N/A'}</Text>
        </View>
      ))}
    </View>
  );

  const renderPrescription = ({ item: prescription }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitleText}>Prescription ID: {prescription.prescriptionId}</Text>
        <Text style={styles.cardSubtitle}>
          Date: {moment(prescription.createdAt).format('Do MMMM YYYY, h:mm a')}
        </Text>
      </View>
      <Text style={styles.tag}>Appointment: {prescription.appointmentId}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{prescription.patientInfo.patientName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Age:</Text>
          <Text style={styles.infoValue}>{prescription.patientInfo.age}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Gender:</Text>
          <Text style={styles.infoValue}>{prescription.patientInfo.gender}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mobile:</Text>
          <Text style={styles.infoValue}>{prescription.patientInfo.mobileNumber}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chief Complaint</Text>
        <Text style={styles.sectionContent}>{prescription.patientInfo.chiefComplaint || 'N/A'}</Text>

        <Text style={styles.sectionTitle}>Past Medical History</Text>
        <Text style={styles.sectionContent}>{prescription.patientInfo.pastMedicalHistory || 'N/A'}</Text>

        <Text style={styles.sectionTitle}>Family Medical History</Text>
        <Text style={styles.sectionContent}>{prescription.patientInfo.familyMedicalHistory || 'N/A'}</Text>

        <Text style={styles.sectionTitle}>Physical Examination</Text>
        <Text style={styles.sectionContent}>{prescription.patientInfo.physicalExamination || 'N/A'}</Text>
      </View>

      {prescription.vitals && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vitals</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BP:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.bp || 'N/A'} mmHg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pulse:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.pulseRate || 'N/A'} bpm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Temp:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.temperature || 'N/A'}°F</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SpO2:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.spo2 || 'N/A'}%</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Respiratory Rate:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.respiratoryRate || 'N/A'} breaths/min</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.height || 'N/A'} cm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.weight || 'N/A'} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BMI:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.bmi || 'N/A'} kg/m²</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnosis</Text>
        <Text style={styles.sectionContent}>{prescription.diagnosis.diagnosisNote || 'N/A'}</Text>
      </View>

      {prescription.diagnosis?.selectedTests?.length > 0 && (
        renderTests(prescription.diagnosis.selectedTests)
      )}

      {prescription.diagnosis?.medications?.length > 0 && (
        renderMedications(prescription.diagnosis.medications)
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advice</Text>
        <Text style={styles.sectionContent}>{prescription.advice.advice || 'N/A'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Note</Text>
        <Text style={styles.sectionContent}>{prescription.advice.PrescribeMedNotes || 'N/A'}</Text>
      </View>

      {prescription.advice.followUpDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Up Date</Text>
          <Text style={styles.sectionContent}>
            {moment(prescription.advice.followUpDate).format('Do MMMM YYYY')}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrowleft" size={24} color="#2563EB" />
          <Text style={styles.backText}>Back to Appointments</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Previous Prescriptions for {patientName}</Text>

        {prescriptions?.length > 0 ? (
          <FlatList
            data={prescriptions}
            renderItem={renderPrescription}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>No previous prescriptions found for this patient.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  backText: {
    marginLeft: 12,
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  cardTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  medicationsContainer: {
    marginBottom: 20,
  },
  medicationItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  medicationRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  medicationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  medicationDetail: {
    width: '48%',
    flexDirection: 'row',
    marginBottom: 6,
  },
  medicationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    width: 80,
  },
  medicationValue: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  testsContainer: {
    marginBottom: 20,
  },
  testItem: {
    marginBottom: 6,
  },
  testText: {
    fontSize: 14,
    color: '#4B5563',
  },
  noDataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noDataText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
  },
});

export default PreviousPrescription;