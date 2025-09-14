import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import moment from 'moment';

interface Patient {
  id: string;
  appointmentId: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other' ;
  age: string;
  phone: string;
  lastVisit: string;
  appointmentType: string;
  status: string;
  department: string;
  appointmentStatus: string;
  appointmentReason: string;
  appointmentTime: string;
  appointmentCount: number;
  allAppointments: any[];
  ePrescription: any | null;
  avatar: string;
}

interface PrescriptionData {
  medicines: Array<{
    id?: string;
    medName: string;
    quantity: string;
    dosage: string;
    duration: string;
    frequency: string;
  }>;
  tests: Array<{
    id?: string;
    name: string;
    labTestID: string;
    status: string;
  }>;
}

const MyPatients: React.FC = () => {
  const currentUserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentUserDetails?.role === 'doctor' ? currentUserDetails?.userId : currentUserDetails?.createdBy;
  const hasFetchedPatients = useRef(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'id' | 'department'>('all');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<
    'all' | 'new-walkin' | 'new-homecare' | 'new-patient-walkthrough' | 'followup-walkin' | 'followup-video' | 'followup-homecare'
  >('all');
  const [isPrescriptionModalVisible, setIsPrescriptionModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>({ medicines: [], tests: [] });
  const [ePrescriptionData, setEPrescriptionData] = useState<any | null>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    pageSize: 5,
    total: 0,
  });

  const options = [
    { label: 'All', value: 'all' },
    { label: 'New Walkin', value: 'new-walkin' },
    { label: 'New HomeCare', value: 'new-homecare' },
    { label: 'New Patient Walkthrough', value: 'new-patient-walkthrough' },
    { label: 'Followup Walkin', value: 'followup-walkin' },
    { label: 'Followup Video', value: 'followup-video' },
    { label: 'Followup Homecare', value: 'followup-homecare' },
  ];

  const calculateAge = (dob: string): string => {
    if (!dob) return '';
    return moment().diff(moment(dob, 'DD-MM-YYYY'), 'years').toString();
  };

  const fetchPatients = async (page: number = 1, limit: number = 5) => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return;
      }

      const queryParams = new URLSearchParams({
        doctorId: String(doctorId),
        ...(searchText && { searchText: String(searchText) }),
        ...(selectedStatus !== 'all' && { appointmentType: String(selectedStatus) }),
        page: String(page),
        limit: String(limit),
      });



      const res = await AuthFetch(`appointment/getAppointmentsByDoctorID/patients?${queryParams.toString()}`, token);

      if (res.status === 'success' && res.data?.data) {
        const { appointments, pagination: apiPagination } = res.data.data;
        const formattedPatients = appointments.map((appointment: any) => ({
          id: appointment.userId || appointment._id || '',
          appointmentId: appointment.appointmentId || '',
          name: appointment.patientName || '',
          gender: appointment.patientDetails?.gender || '',
          age: appointment.patientDetails?.dob
            ? calculateAge(appointment.patientDetails.dob)
            : appointment.patientDetails?.age || '',
          phone: appointment.patientDetails?.mobile || '',
          lastVisit: appointment.appointmentDate
            ? moment(appointment.appointmentDate).format('DD MMMM YYYY')
            : '',
          appointmentType: appointment.appointmentType || '',
          status:
            appointment.appointmentType === 'new-walkin' ||
            appointment.appointmentType === 'New-Walkin'
              ? 'New Patient'
              : 'Follow-up',
          department: appointment.appointmentDepartment || '',
          appointmentStatus: appointment.appointmentStatus || '',
          appointmentReason: appointment.appointmentReason || '',
          appointmentTime: appointment.appointmentTime || '',
          appointmentCount: 1,
          allAppointments: [appointment],
          ePrescription: appointment.ePrescription || null,
          avatar: 'https://i.pravatar.cc/150?img=12',
        }));

        setPatients(formattedPatients);
        setFilteredPatients(formattedPatients);
        setPagination((prev) => {
          const newPagination = {
            pageSize: apiPagination.pageSize || limit,
            total: apiPagination.totalItems || formattedPatients.length,
          };
          if (prev.pageSize === newPagination.pageSize && prev.total === newPagination.total) {
            return prev;
          }
          return newPagination;
        });
        setCurrentPage(page); // Ensure currentPage is set to the fetched page
      } else {
        setPatients([]);
        setFilteredPatients([]);
        setPagination({ pageSize: limit, total: 0 });
        setCurrentPage(1); // Reset to page 1 on empty data
      }
    } catch (error) {
      setPatients([]);
      setFilteredPatients([]);
      setPagination({ pageSize: limit, total: 0 });
      setCurrentPage(1); // Reset to page 1 on error
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptionDetails = useCallback(
    async (patientId: string) => {
      setPrescriptionLoading(true);
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          return;
        }

        const response = await AuthFetch(`pharmacy/getPatientPrescriptionDetails/${patientId}`, token);
        if (response.status === 'success' && response.data?.success) {
          setPrescriptionData({
            medicines: response.data.data.medicines?.map((med: any) => ({
              id: med.id || undefined,
              medName: String(med.medName || ''),
              quantity: String(med.quantity || ''),
              dosage: String(med.dosage || ''),
              duration: String(med.duration || ''),
              frequency: String(med.frequency || ''),
            })) || [],
            tests: response.data.data.tests?.map((test: any) => ({
              id: test.id || undefined,
              name: String(test.testName || ''),
              labTestID: String(test.labTestID || ''),
              status: String(test.status || ''),
            })) || [],
          });
        } else {
          throw new Error('Failed to fetch prescription details');
        }
      } catch (error) {
        setPrescriptionData({ medicines: [], tests: [] });
      } finally {
        setPrescriptionLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    
      hasFetchedPatients.current = true;
      fetchPatients(1, pagination.pageSize);
    
  }, [currentUserDetails, doctorId, pagination.pageSize, selectedStatus]);

  useEffect(() => {
    const filtered = patients.filter((patient) => {
      const searchLower = searchText.toLowerCase();
      if (searchField === 'all') {
        return (
          patient.name.toLowerCase().includes(searchLower) ||
          patient.id.toLowerCase().includes(searchLower) ||
          patient.department.toLowerCase().includes(searchLower) ||
          patient.phone.includes(searchLower)
        );
      } else if (searchField === 'name') {
        return patient.name.toLowerCase().includes(searchLower);
      } else if (searchField === 'id') {
        return patient.id.toLowerCase().includes(searchLower);
      } else if (searchField === 'department') {
        return patient.department.toLowerCase().includes(searchLower);
      }
      return true;
    });
    setFilteredPatients(filtered);
    setPagination((prev) => ({ ...prev, total: filtered.length }));
    // Only reset currentPage if the filter reduces the total pages below currentPage
    if (filtered.length > 0 && currentPage > Math.ceil(filtered.length / pagination.pageSize)) {
      setCurrentPage(1);
    }
  }, [searchText, searchField, patients, pagination.pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.pageSize) && !loading) {
      setCurrentPage(newPage);
      fetchPatients(newPage, pagination.pageSize);
    }
  };

  const handleViewPrescription = (patient: Patient) => {
    setSelectedPatient(patient);
    setPrescriptionData({ medicines: [], tests: [] });
    setEPrescriptionData(patient.ePrescription || null);
    fetchPrescriptionDetails(patient.id);
    setIsPrescriptionModalVisible(true);
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'New Patient':
        return { container: styles.newTag, text: styles.newText };
      case 'Follow-up':
        return { container: styles.followUpTag, text: styles.followUpText };
      default:
        return { container: styles.defaultTag, text: styles.defaultText };
    }
  };

  const shouldDisplayValue = (value: any): boolean => {
    return value != null && value !== '' && value !== '' && value !== 'undefined';
  };

  const renderPatientItem = ({ item }: { item: Patient }) => {
    const { container, text } = getStatusStyles(item.status);
    return (
      <View style={styles.card}>
        {/* <View style={}> */}
                     <View style={styles.placeholderCircle}>
                  <Text style={styles.placeholderText}>{item.name[0].toUpperCase() || ""}</Text>
                </View>
          {/* {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.name[0]?.toUpperCase() || 'N'}</Text>
          )} */}
        {/* </View> */}
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.id}>ID: {item.id}</Text>
          <Text style={styles.id}>{item.appointmentType}</Text>

          <Text style={styles.details}>
            {item.gender}, {item.age} years
          </Text>
          <Text style={styles.phone}>{item.phone}</Text>
          <Text style={styles.lastVisit}>Last Visit: {item.lastVisit}</Text>
        </View>
        <View style={[styles.statusTag, container]}>
          <Text style={[styles.statusText, text]}>{item.status}</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleViewPrescription(item)}
        >
          <Icon name="eye" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    );
  };

  const handleFilterSelect = (value: typeof selectedStatus) => {
    setSelectedStatus(value);
    setDropdownVisible(false);
    setCurrentPage(1);
    // Fetch immediately with the new status
    // fetchPatients(1, pagination.pageSize, value);
  };

  return (
    <View style={styles.container}>
      {/* <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
      </View> */}

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder={`Search by ${searchField === 'all' ? 'Patient ID, Name' : searchField}`}
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity onPress={() => setDropdownVisible((prev) => !prev)}>
          <Icon name="filter-variant" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {dropdownVisible && (
        <View style={styles.dropdown}>
          {options.map((option) => (
<TouchableOpacity
  key={option.value}
  onPress={() => handleFilterSelect(option.value as typeof selectedStatus)}
  // onPress={() => {
  //   setSelectedStatus(option.value);
  //   setDropdownVisible(false);
  //   setCurrentPage(1); // Reset to first page on filter change
  //   fetchPatients(1, pagination.pageSize); // Fetch patients with new filter
  // }}
  style={[
    styles.dropdownOption,
    selectedStatus === option.value && styles.dropdownOptionSelected, // Highlight when active
  ]}
>
  <Text
    style={[
      styles.dropdownText,
      selectedStatus === option.value && styles.dropdownTextSelected, // Change text color
    ]}
  >
    {option.label}
  </Text>
</TouchableOpacity>

          ))}
          {/* <View style={styles.searchFieldDropdown}>
            <Text style={styles.dropdownText}>Search by:</Text>
            {['all', 'name', 'id', 'department'].map((field) => (
              <TouchableOpacity
                key={field}
                onPress={() => {
                  setSearchField(field as typeof searchField);
                  setSearchText('');
                  setDropdownVisible(false);
                  setCurrentPage(1); // Reset to first page
                  fetchPatients(1, pagination.pageSize); // Fetch patients with new search field
                }}
                style={styles.dropdownOption}
              >
                <Text style={styles.dropdownText}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View> */}
        </View>
      )}

      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.appointmentId}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{loading ? <View style={{display:'flex', justifyContent:'center'}}>
            <ActivityIndicator size="large" color="#007bff" />
                    <Text style={{color:'black'}}>Loading Patients...</Text> 
            </View>: 'No patients found.'}</Text>
          </View>
        }
        renderItem={renderPatientItem}
      />

      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={[
            styles.paginationButton,
            currentPage === 1 && styles.disabledButton,
          ]}
        >
          <Text style={[styles.paginationText, currentPage === 1 && styles.disabledText]}>
            Previous
          </Text>
        </TouchableOpacity>
        <Text style={styles.paginationInfo}>
          Page {currentPage} of {Math.ceil(pagination.total / pagination.pageSize) || 1}
        </Text>
        <TouchableOpacity
          onPress={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= Math.ceil(pagination.total / pagination.pageSize)}
          style={[
            styles.paginationButton,
            currentPage >= Math.ceil(pagination.total / pagination.pageSize) && styles.disabledButton,
          ]}
        >
          <Text
            style={[
              styles.paginationText,
              currentPage >= Math.ceil(pagination.total / pagination.pageSize) && styles.disabledText,
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isPrescriptionModalVisible}
        animationType="slide"
        onRequestClose={() => setIsPrescriptionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Patient Prescription Details</Text>
            <TouchableOpacity onPress={() => setIsPrescriptionModalVisible(false)}>
              <Icon name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
          </View>
          {selectedPatient && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.prescriptionSection}>
                <Text style={styles.sectionTitle}>Patient Information</Text>
                <View style={styles.infoGrid}>
                  <Text style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Patient ID: </Text>
                    <Text>{selectedPatient.id || ''}</Text>
                  </Text>
                  <Text style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Name: </Text>
                    <Text>{selectedPatient.name || ''}</Text>
                  </Text>
                  <Text style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Gender: </Text>
                    <Text>{selectedPatient.gender || ''}</Text>
                  </Text>
                  <Text style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Phone: </Text>
                    <Text>{selectedPatient.phone || ''}</Text>
                  </Text>
                  <Text style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Last Visit: </Text>
                    <Text>{selectedPatient.lastVisit || ''}</Text>
                  </Text>
                  <Text style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Department: </Text>
                    <Text>{selectedPatient.department || ''}</Text>
                  </Text>
                  <Text style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Status: </Text>
                    <Text>{selectedPatient.status || ''}</Text>
                  </Text>
                </View>
              </View>

              {ePrescriptionData && (
                <View style={styles.prescriptionSection}>
                  <Text style={styles.sectionTitle}>ePrescription Details</Text>
                  {ePrescriptionData.patientInfo && (
                    <View style={styles.subSection}>
                      <Text style={styles.subSectionTitle}>Patient Info</Text>
                      {shouldDisplayValue(ePrescriptionData.patientInfo.age) && (
                        <Text style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Age: </Text>
                          <Text>{String(ePrescriptionData.patientInfo.age)}</Text>
                        </Text>
                      )}
                      {shouldDisplayValue(ePrescriptionData.patientInfo.chiefComplaint) && (
                        <Text style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Chief Complaint: </Text>
                          <Text>{String(ePrescriptionData.patientInfo.chiefComplaint)}</Text>
                        </Text>
                      )}
                    </View>
                  )}

                  {ePrescriptionData.vitals && (
                    <View style={styles.subSection}>
                      <Text style={styles.subSectionTitle}>Vitals</Text>
                      <View style={styles.infoGrid}>
                        {shouldDisplayValue(ePrescriptionData.vitals.bp) && (
                          <Text style={styles.infoItem}>
                            <Text style={styles.infoLabel}>BP: </Text>
                            <Text>{String(ePrescriptionData.vitals.bp)}</Text>
                          </Text>
                        )}
                        {shouldDisplayValue(ePrescriptionData.vitals.pulseRate) && (
                          <Text style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Pulse Rate: </Text>
                            <Text>{String(ePrescriptionData.vitals.pulseRate)}</Text>
                          </Text>
                        )}
                        {shouldDisplayValue(ePrescriptionData.vitals.respiratoryRate) && (
                          <Text style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Respiratory Rate: </Text>
                            <Text>{String(ePrescriptionData.vitals.respiratoryRate)}</Text>
                          </Text>
                        )}
                        {shouldDisplayValue(ePrescriptionData.vitals.temperature) && (
                          <Text style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Temperature: </Text>
                            <Text>{String(ePrescriptionData.vitals.temperature)}</Text>
                          </Text>
                        )}
                        {shouldDisplayValue(ePrescriptionData.vitals.spo2) && (
                          <Text style={styles.infoItem}>
                            <Text style={styles.infoLabel}>SPO2: </Text>
                            <Text>{String(ePrescriptionData.vitals.spo2)}</Text>
                          </Text>
                        )}
                        {shouldDisplayValue(ePrescriptionData.vitals.height) && (
                          <Text style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Height: </Text>
                            <Text>{String(ePrescriptionData.vitals.height)}</Text>
                          </Text>
                        )}
                        {shouldDisplayValue(ePrescriptionData.vitals.weight) && (
                          <Text style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Weight: </Text>
                            <Text>{String(ePrescriptionData.vitals.weight)}</Text>
                          </Text>
                        )}
                        {shouldDisplayValue(ePrescriptionData.vitals.bmi) && (
                          <Text style={styles.infoItem}>
                            <Text style={styles.infoLabel}>BMI: </Text>
                            <Text>{String(ePrescriptionData.vitals.bmi)}</Text>
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {ePrescriptionData.diagnosis && shouldDisplayValue(ePrescriptionData.diagnosis.diagnosisNote) && (
                    <View style={styles.subSection}>
                      <Text style={styles.subSectionTitle}>Diagnosis</Text>
                      <Text style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Diagnosis Note: </Text>
                        <Text>{String(ePrescriptionData.diagnosis.diagnosisNote)}</Text>
                      </Text>
                    </View>
                  )}

                  {ePrescriptionData.advice && (
                    <View style={styles.subSection}>
                      <Text style={styles.subSectionTitle}>Advice</Text>
                      {shouldDisplayValue(ePrescriptionData.advice.followUpDate) && (
                        <Text style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Follow-up Date: </Text>
                          <Text>
                            {moment(ePrescriptionData.advice.followUpDate).format('DD MMMM YYYY')}
                          </Text>
                        </Text>
                      )}
                      {shouldDisplayValue(ePrescriptionData.advice.advice) && (
                        <Text style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Advice: </Text>
                          <Text>{String(ePrescriptionData.advice.advice)}</Text>
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.prescriptionSection}>
                <Text style={styles.sectionTitle}>Prescribed Medicines</Text>
                {prescriptionLoading ? (
                  <ActivityIndicator size="large" color="#007AFF" />
                ) : ePrescriptionData?.diagnosis?.medications?.length > 0 ? (
                  <View>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={styles.tableCellHeader}>Medicine Name</Text>
                      <Text style={styles.tableCellHeader}>Quantity</Text>
                      <Text style={styles.tableCellHeader}>Dosage</Text>
                      <Text style={styles.tableCellHeader}>Duration</Text>
                      <Text style={styles.tableCellHeader}>Frequency</Text>
                    </View>
                    {ePrescriptionData.diagnosis.medications.map((med: any, index: number) => (
                      <View key={med.medInventoryId || index} style={styles.tableRow}>
                        <Text style={styles.tableCell}>{String(med.medName || '')}</Text>
                        <Text style={styles.tableCell}>{String(med.quantity || '')}</Text>
                        <Text style={styles.tableCell}>{String(med.dosage || '')}</Text>
                        <Text style={styles.tableCell}>{String(med.duration || '')}</Text>
                        <Text style={styles.tableCell}>{String(med.frequency || '')}</Text>
                      </View>
                    ))}
                  </View>
                ) : prescriptionData.medicines.length > 0 ? (
                  <View>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={styles.tableCellHeader}>Medicine Name</Text>
                      <Text style={styles.tableCellHeader}>Quantity</Text>
                      <Text style={styles.tableCellHeader}>Dosage</Text>
                      <Text style={styles.tableCellHeader}>Duration</Text>
                      <Text style={styles.tableCellHeader}>Frequency</Text>
                    </View>
                    {prescriptionData.medicines.map((med, index) => (
                      <View key={med.id || index} style={styles.tableRow}>
                        <Text style={styles.tableCell}>{String(med.medName || '')}</Text>
                        <Text style={styles.tableCell}>{String(med.quantity || '')}</Text>
                        <Text style={styles.tableCell}>{String(med.dosage || '')}</Text>
                        <Text style={styles.tableCell}>{String(med.duration || '')}</Text>
                        <Text style={styles.tableCell}>{String(med.frequency || '')}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataMessage}>No medicines prescribed for this patient.</Text>
                )}
              </View>

              <View style={styles.prescriptionSection}>
                <Text style={styles.sectionTitle}>Prescribed Tests</Text>
                {prescriptionLoading ? (
                  <ActivityIndicator size="large" color="#007AFF" />
                ) : ePrescriptionData?.diagnosis?.selectedTests?.length > 0 ? (
                  <View>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={styles.tableCellHeader}>Test Name</Text>
                      <Text style={styles.tableCellHeader}>Lab Test ID</Text>
                      <Text style={styles.tableCellHeader}>Status</Text>
                    </View>
                    {ePrescriptionData.diagnosis.selectedTests.map((test: any, index: number) => (
                      <View key={test.testInventoryId || test.testName || index} style={styles.tableRow}>
                        <Text style={styles.tableCell}>{String(test.testName || '')}</Text>
                        <Text style={styles.tableCell}>{String(test.testInventoryId || '')}</Text>
                        <Text style={styles.tableCell}>{String(test.status || 'Prescribed')}</Text>
                      </View>
                    ))}
                  </View>
                ) : prescriptionData.tests.length > 0 ? (
                  <View>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={styles.tableCellHeader}>Test Name</Text>
                      <Text style={styles.tableCellHeader}>Lab Test ID</Text>
                      <Text style={styles.tableCellHeader}>Status</Text>
                    </View>
                    {prescriptionData.tests.map((test, index) => (
                      <View key={test.id || index} style={styles.tableRow}>
                        <Text style={styles.tableCell}>{String(test.name || '')}</Text>
                        <Text style={styles.tableCell}>{String(test.labTestID || '')}</Text>
                        <Text style={styles.tableCell}>{String(test.status || '')}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataMessage}>No tests prescribed for this patient.</Text>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
    placeholderCircle: {
    width: 50, height: 50, borderRadius: 30, backgroundColor: '#1e3a5f',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  placeholderText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1E293B',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    position: 'relative',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: '#1F2937',
    fontSize: 20,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  id: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  details: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
  },
  phone: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
    marginTop: 2,
  },
  lastVisit: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusTag: {
    position: 'absolute',
    top: 10,
    right: 40,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  newTag: {
    backgroundColor: '#DCFCE7',
  },
  followUpTag: {
    backgroundColor: '#FEF3C7',
  },
  defaultTag: {
    backgroundColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  newText: {
    color: '#15803D',
  },
  followUpText: {
    color: '#B45309',
  },
  defaultText: {
    color: '#374151',
  },
  actionButton: {
    position: 'absolute',
    top: 10,
    right: 12,
    padding: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    zIndex: 999,
    width: 200,
    paddingVertical: 8,
  },
  dropdownOption: {

    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

   dropdownOptionSelected: {
    backgroundColor: '#007bff', // Blue background
  },
  // dropdownText: {
  //   fontSize: 16,
  //   color: '#000',
  // },
  dropdownTextSelected: {
    color: '#fff', // White text for selected option
    fontWeight: '600',
  },
  dropdownText: {
    fontSize: 14,
    color: '#1E293B',
  },
  searchFieldDropdown: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    marginBottom: 40,
  },
  paginationButton: {
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
  },
  paginationText: {
    color: '#fff',
    fontSize: 14,
  },
  disabledText: {
    color: '#9ca3af',
  },
  paginationInfo: {
    alignSelf: 'center',
    fontSize: 16,
    color: '#1E293B',
    marginHorizontal: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalContent: {
    flex: 1,
  },
  prescriptionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  subSection: {
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '500',
    color: '#6B7280',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  noDataMessage: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MyPatients;
