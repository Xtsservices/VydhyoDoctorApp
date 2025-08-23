

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

  const medicationColumns = [
    { title: 'Medicine Name', dataIndex: 'medName' },
    { title: 'Type', dataIndex: 'medicineType' },
    { title: 'Dosage', dataIndex: 'dosage' },
    { title: 'Duration (days)', dataIndex: 'duration' },
    { title: 'Frequency', dataIndex: 'frequency' },
    { title: 'Timings', dataIndex: 'timings', render: (timings) => timings?.join(', ') },
    { title: 'Quantity', dataIndex: 'quantity' },
  ];

  const testColumns = [
    { title: 'Test Name', dataIndex: 'testName' },
  ];

  const renderTable = (data, columns) => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeaderRow}>
        {columns.map((col) => (
          <Text key={col.title} style={styles.tableHeaderCell}>{col.title}</Text>
        ))}
      </View>
      {data.map((item, index) => (
        <View key={index} style={styles.tableRow}>
          {columns.map((col) => (
            <Text key={col.title} style={styles.tableCell}>
              {col.render ? col.render(item[col.dataIndex]) : item[col.dataIndex]}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );

  const renderPrescription = ({ item: prescription }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitleText}>Prescription ID: {prescription.prescriptionId}</Text>
        <Text style={styles.cardSubtitle}>
          Date: {moment(prescription.createdAt).format('MMMM Do YYYY, h:mm a')}
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
      </View>

      {prescription.vitals && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vitals</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BP:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.bp || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pulse:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.pulseRate || 'N/A'}</Text>
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
            <Text style={styles.infoLabel}>Height:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.height || 'N/A'} cm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.weight || 'N/A'} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BMI:</Text>
            <Text style={styles.infoValue}>{prescription.vitals.bmi || 'N/A'}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnosis</Text>
        <Text style={styles.sectionContent}>{prescription.diagnosis.diagnosisNote || 'N/A'}</Text>
      </View>

      {prescription.diagnosis?.selectedTests?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Tests</Text>
          {renderTable(prescription.diagnosis.selectedTests, testColumns)}
        </View>
      )}

      {prescription.diagnosis?.medications?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medications</Text>
          {renderTable(prescription.diagnosis.medications, medicationColumns)}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advice</Text>
        <Text style={styles.sectionContent}>{prescription.advice.advice || 'N/A'}</Text>
      </View>

      {prescription.advice.followUpDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Up Date</Text>
          <Text style={styles.sectionContent}>
            {moment(prescription.advice.followUpDate).format('MMMM Do YYYY')}
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
            scrollEnabled={false} // Disable FlatList scrolling to let ScrollView handle it
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
    paddingBottom: 32, // Ensure content isn't cut off at the bottom
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
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 12,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
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