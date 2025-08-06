import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Key, ReactNode, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import moment from 'moment';
import { AuthPost, AuthFetch } from '../../auth/auth';


interface Appointment {
  doctorId: string;
  patientId: string;
  label: ReactNode;
  value: Key | null | undefined;
  _id: string;
  appointmentDate: ReactNode;
  appointmentType: ReactNode;
  patientName: ReactNode;
  id: string;
  phone: string;
  clinic: string;
  type: string;
  date: string;
  status: 'Upcoming' | 'Completed';
  statusColor: string;
  typeIcon: string;
  avatar?: string;
  appointmentTime: string;
  addressId: string;
}

const AppointmentsScreen = () => {
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails.role === "doctor" ? currentuserDetails.userId : currentuserDetails.createdBy;
  const navigation = useNavigation<any>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [scheduledAppointments, setScheduledAppointments] = useState<Appointment[]>([]);
  const [rescheduledAppointments, setRescheduledAppointments] = useState<Appointment[]>([]);
  const [cancelledAppointments, setCancelledAppointments] = useState<Appointment[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [totalAppointments, setTotalAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<Appointment | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [selected_Id, setSelected_Id] = useState('');
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [medicineQty, setMedicineQty] = useState('');
  const [medicines, setMedicines] = useState<{ medName: string; quantity: string }[]>([]);
  const [testName, setTestName] = useState('');
  const [testQty, setTestQty] = useState('');
  const [tests, setTests] = useState<{ testName: string }[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
    const [totalAppointmentsCount, setTotalAppointmentsCount] = useState(0);
  const [scheduledAppointmentsCount, setScheduledAppointmentsCount] =
    useState(0);
  const [completedAppointmentsCount, setCompletedAppointmentsCount] =
    useState(0);
  const [cancledAppointmentsCount, setCancledAppointmentsCount] = useState(0);
   const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  const fetchAppointments = async (page = 1, limit = 5) => {
console.log("render", selectedType)
const queryParams = new URLSearchParams({
  doctorId: String(doctorId),
  ...(search ? { searchText: String(search) } : {}),
  ...(selectedType && selectedType !== "all" ? { status: String(selectedType) } : {}),
  page: String(page),
  limit: String(limit),
});
      console.log("Fetching appointments with params:", queryParams.toString()); // Debug log
      const token = await AsyncStorage.getItem('authToken');
    try {
       const res = await AuthFetch(
        `appointment/getAppointmentsByDoctorID/appointment?${queryParams.toString()}`, token
      );

      console.log(res.data.data, "reponse of appointments" )

       const { appointments, pagination } = res.data.data;
       console.log(appointments, "component 123")
      
      const formattedAppointments = appointments
        .map((appt: any) => ({
          label: appt.patientName || '',
          value: appt.appointmentId || '',
          _id: appt._id || appt.appointmentId || '',
          appointmentDate: appt.appointmentDate || '',
          appointmentType: appt.appointmentType || '',
          patientName: appt.patientName || '',
          patientId: appt.userId || "",
          id: appt.appointmentId || '',
          doctorId: appt.doctorId || '',
          phone: appt.phone || '',
          clinic: appt.clinicName || 'Unknown Clinic',
          type: appt.appointmentType || 'General',
          date: appt.appointmentDate ? appt.appointmentDate.slice(0, 10) : 'Unknown Date',
          status: appt.appointmentStatus || '',
          statusColor: appt.appointmentStatus === 'Completed' ? '#E0E7FF' : '#D1FAE5',
          typeIcon: 'General',
          avatar: "https://i.pravatar.cc/150?img=12",
          appointmentTime: appt.appointmentTime,
          addressId: appt.addressId,
        }));

         setPagination({
          current: pagination.currentPage,
          pageSize: pagination.pageSize,
          total: pagination.totalItems,
        });

      setAppointments(formattedAppointments);
      // setAllAppointments(formattedAppointments);
      // setTotalAppointments(appointments);
      // setScheduledAppointments(appointments.filter((appt: any) => appt.appointmentStatus === 'scheduled'));
      // setRescheduledAppointments(appointments.filter((appt: any) => appt.appointmentStatus === 'rescheduled'));
      // setCancelledAppointments(appointments.filter((appt: any) => appt.appointmentStatus === 'cancelled'));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch appointments');
    }
  };

    useEffect(() => {
    if (currentuserDetails && doctorId) {
      console.log("initial")
      fetchAppointments();
    }
  }, [currentuserDetails, doctorId, search, selectedType]);

   const getAppointmentsCount = async () => {
    try {
       const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(
        `appointment/getAppointmentsCountByDoctorID?doctorId=${doctorId}`, token
      );

      console.log(response, "response of count data");

      if (response.status === 'success') {
        const count = response?.data?.data;

        setTotalAppointmentsCount(count.total);
        setScheduledAppointmentsCount(count.scheduled);
        setCompletedAppointmentsCount(count.completed);
        setCancledAppointmentsCount(count.cancelled);
      } else {
        Alert.alert('Failed to fetch appointments count');
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
        Alert.alert('Failed to fetch appointments count');

    } 
  };

  useEffect(() => {
    if (currentuserDetails && doctorId) {
      getAppointmentsCount();
    }
  }, [currentuserDetails, doctorId]);

  useEffect(() => {
    fetchAppointments();
  }, []);


  const fetchTimeSlots = async (date: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const formattedDate = moment(date).format("YYYY-MM-DD");
      const response = await AuthFetch(
        `appointment/getSlotsByDoctorIdAndDate?doctorId=${doctorId}&date=${formattedDate}&addressId=${selectedClinicId}`,
        token
      );

      console.log(response, "response of slots ")

      if (response?.data?.status === "success") {
        const today = moment().format("YYYY-MM-DD");
        const availableSlots = response.data.data.slots
          .filter((slot: any) => slot?.status === "available")
          .filter((slot: any) => {
            if (formattedDate === today) {
              const slotDateTime = moment(`${formattedDate} ${slot.time}`, "YYYY-MM-DD HH:mm");
              return slotDateTime.isAfter(moment());
            }
            return true;
          })
          .map((slot: any) => slot.time);

          console.log(availableSlots, "available slots")
        
        setAvailableTimeSlots(availableSlots);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response?.data?.message?.message || "Failed to fetch timeslots",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message?.message || "Error fetching timeslots",
      });
    }
  };

  useEffect(() => {
    if (newDate && selectedClinicId) {
      fetchTimeSlots(newDate);
    }
  }, [newDate, selectedClinicId]);

  const handleStatusChange = async (id: string, status: string, _id: string, patientName: string, patientId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const body = { appointmentId: id, reason };

      if (status === 'Cancel') {
        const response = await AuthPost('appointment/cancelAppointment', body, token);
        if (response?.data?.status === 'success') {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Appointment cancelled successfully',
            position: 'top',
            visibilityTime: 3000,
          });
          fetchAppointments();
        } else {
          Alert.alert('Error', response?.data?.message || 'Failed to cancel appointment');
        }
      } else if (status === 'Reschedule') {
        if (!newDate || !newTime) {
          Alert.alert('Error', 'Please select a date and time for rescheduling');
          return;
        }
        const rescheduleData = {
          appointmentId: id,
          newDate: moment(newDate).format('YYYY-MM-DD'),
          newTime,
          reason,
        };
        const response = await AuthPost('appointment/rescheduleAppointment', rescheduleData, token);
        console.log(response, "response of reschedule appointment")
        if (response?.data?.status === 'success') {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Successfully rescheduled appointment',
            position: 'top',
            visibilityTime: 3000,
          });
          fetchAppointments();
        } else {
          Alert.alert('Error', response?.data?.message || 'Failed to reschedule appointment');
        }
      } else if (status === 'Mark as Completed') {
        const response = await AuthPost('appointment/completeAppointment', body, token);
        if (response?.data?.status === 'success') {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Successfully appointment completed',
            position: 'top',
            visibilityTime: 3000,
          });
          fetchAppointments();
        } else {
          Alert.alert('Error', response?.data?.message || 'Failed to complete appointment');
        }
      } else if (status === 'Prescription') {
        const body = { patientId, medicines, tests, doctorId };
        const response = await AuthPost('pharmacy/addPrescription', body, token);
        if (response?.status === 'success') {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Prescription added successfully',
            position: 'top',
            visibilityTime: 3000,
          });
          fetchAppointments();
        } else {
          Alert.alert('Error', response?.data?.message || 'Failed to add prescription');
        }
      }
    } catch (err) {
      console.error('Update Failed:', err);
      Alert.alert('Error', 'An error occurred while processing the request');
    } finally {
      setActionModalVisible(false);
      setMedicineName('');
      setMedicineQty('');
      setTestName('');
      setTestQty('');
      setMedicines([]);
      setTests([]);
      setNewDate('');
      setNewTime('');
      setReason('');
      setAvailableTimeSlots([]);
    }
  };

  const handleMenuPress = (appt: Appointment) => {
    setSelectedAppointmentId(appt.id);
    setPatientDetails(appt);
    setSelectedName(String(appt.patientName ?? ''));
    setSelected_Id(appt._id);
    setSelectedClinicId(appt.addressId);
    setActionMenuVisible(true);
  };

  const handlePageChange = (newPage: number) => {
  fetchAppointments(newPage, pagination.pageSize);
  setPagination((prev) => ({ ...prev, current: newPage }));
};


  const renderAppointmentCard = ({ item: appt }: { item: Appointment }) => (
    <View style={styles.apptCard}>
      <View style={styles.row}>
        <Image source={{ uri: appt.avatar }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{appt.patientName}</Text>
          <Text style={styles.phone}>{appt.phone}</Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleMenuPress(appt)}
        >
          <Text style={styles.menuButtonText}>...</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.id}>ID: {appt.id}</Text>
      <View style={styles.row}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{appt.type}</Text>
        </View>
        <Text style={styles.date}>{appt.date}</Text>
        <View style={[styles.status, { backgroundColor: appt.status === 'Upcoming' ? '#DCFCE7' : '#E0E7FF' }]}>
          <Text style={{ fontSize: 12, color: appt.status === 'Upcoming' ? '#16A34A' : '#4338CA' }}>
            {appt.status}
          </Text>
        </View>
      </View>


{/* Pagination Controls */}



      <Modal
        visible={actionModalVisible && selectedAppointmentId === appt.id}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{selectedAction}</Text>

            {selectedAction === 'Cancel' && (
              <TextInput
                placeholder="Enter reason for cancellation"
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                multiline
              />
            )}

            {selectedAction === 'Reschedule' && (
              <>
                <Text style={styles.name}>Patient: {appt.patientName}</Text>
                <Text style={styles.name}>Current Date: {moment(appt.appointmentDate).format('DD-MM-YYYY')}</Text>
                <Text style={styles.name}>Current Time: {appt.appointmentTime}</Text>
                <Text style={styles.label}>Select New Date:</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerText}>
                    {newDate ? moment(newDate).format('DD-MM-YYYY') : 'Choose a date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={newDate ? new Date(newDate) : new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (event.type === 'set' && selectedDate) {
                        setNewDate(selectedDate.toISOString());
                      }
                    }}
                  />
                )}
                {availableTimeSlots.length > 0 ? (
                  <>
                    <Text style={styles.label}>Select New Time:</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={newTime}
                        onValueChange={(itemValue) => setNewTime(itemValue)}
                        style={styles.input}
                      >
                        <Picker.Item label="Select a time" value="" />
                        {availableTimeSlots.map((slot) => (
                          <Picker.Item key={slot} label={slot} value={slot} />
                        ))}
                      </Picker>
                    </View>
                  </>
                ) : (
                  <Text style={styles.infoText}>No available time slots for the selected date</Text>
                )}
                <TextInput
                  placeholder="Enter reason for rescheduling"
                  style={styles.input}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
              </>
            )}

            {selectedAction === 'Mark as Completed' && (
              <Text style={styles.infoText}>
                Are you sure you want to mark this appointment as completed?
              </Text>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  if (selectedAppointmentId) {
                    handleStatusChange(
                      selectedAppointmentId,
                      selectedAction,
                      selected_Id,
                      selectedName ?? '',
                      appt.patientId ?? ''
                    );
                  }
                }}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setActionModalVisible(false);
                  setMedicineName('');
                  setMedicineQty('');
                  setTestName('');
                  setTestQty('');
                  setMedicines([]);
                  setTests([]);
                  setNewDate('');
                  setNewTime('');
                  setReason('');
                  setAvailableTimeSlots([]);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F0FDF4' }}>
      <View style={styles.container}>
        <Text style={styles.header}>Appointments</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.summaryContainer}>
            <View style={[styles.card, { borderColor: '#FBBF24' }]}>
              <Text style={[styles.cardTitle, { color: '#FBBF24' }]}>{totalAppointmentsCount}</Text>
              <Text style={{ color: '#FBBF24' }}>Total Appointments</Text>
            </View>
            <View style={[styles.card, { borderColor: '#10B981' }]}>
              <Text style={[styles.cardTitle, { color: '#10B981' }]}>{scheduledAppointmentsCount}</Text>
              <Text style={{ color: '#10B981' }}>Upcoming</Text>
            </View>
            <View style={[styles.card, { borderColor: '#6366F1' }]}>
              <Text style={[styles.cardTitle, { color: '#6366F1' }]}>{completedAppointmentsCount}</Text>
              <Text style={{ color: '#6366F1' }}>Completed</Text>
            </View>
            <View style={[styles.card, { borderColor: 'red' }]}>
              <Text style={[styles.cardTitle, { color: 'red' }]}>{cancledAppointmentsCount}</Text>
              <Text style={{ color: 'red' }}>Cancelled</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search by Appointment ID or Patient Name"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setDropdownVisible(true)}
          >
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={dropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.dropdown}>
              {['all','scheduled', 'cancelled'].map((status) => (
                <Pressable
                  key={status}
                  style={styles.option}
                  onPress={() => {
                    setSelectedType(status);
                    setDropdownVisible(false);
                  }}
                >
                  <Text>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

       <Modal
  visible={actionMenuVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setActionMenuVisible(false)}
>
  <Pressable
    style={styles.modalOverlay}
    onPress={() => setActionMenuVisible(false)}
  >
    <View style={styles.dropdown}>
      {['Prescription', 'Mark as Completed', 'Reschedule', 'Cancel'].map((status) => (
        <Pressable
          key={status}
          style={styles.option}
          onPress={() => {
            setSelectedAction(status);
            setActionMenuVisible(false);
            if (status === 'Prescription') {
              navigation.navigate('DoctorDetails', { patientDetails });
            } else {
              setActionModalVisible(true);
            }
          }}
        >
          <Text>{status}</Text>
        </Pressable>
      ))}
    </View>
  </Pressable>
</Modal>


        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentCard}
          contentContainerStyle={{ paddingBottom: 10 }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 , marginBottom:40}}>
  <TouchableOpacity
    onPress={() => handlePageChange(pagination.current - 1)}
    disabled={pagination.current === 1}
    style={{
      padding: 10,
      marginHorizontal: 5,
      backgroundColor: pagination.current === 1 ? '#e5e7eb' : '#3b82f6',
      borderRadius: 6,
    }}
  >
    <Text style={{ color: pagination.current === 1 ? '#9ca3af' : '#fff' }}>Previous</Text>
  </TouchableOpacity>

  <Text style={{ alignSelf: 'center', fontSize: 16, marginHorizontal: 10 }}>
    Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
  </Text>

  <TouchableOpacity
    onPress={() => handlePageChange(pagination.current + 1)}
    disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
    style={{
      padding: 10,
      marginHorizontal: 5,
      backgroundColor:
        pagination.current >= Math.ceil(pagination.total / pagination.pageSize)
          ? '#e5e7eb'
          : '#3b82f6',
      borderRadius: 6,
    }}
  >
    <Text
      style={{
        color:
          pagination.current >= Math.ceil(pagination.total / pagination.pageSize)
            ? '#9ca3af'
            : '#fff',
      }}
    >
      Next
    </Text>
  </TouchableOpacity>
</View>
      </View>
    </ScrollView>
  );
};

export default AppointmentsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom:10
  },
  searchInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  filterButton: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  apptCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 14,
    borderRadius: 12,
    shadowColor: '#000',
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  // name: {
  //   fontSize: 16,
  //   fontWeight: '600',
  // },
  phone: {
    fontSize: 12,
    color: '#6B7280',
  },
  id: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  date: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
    textAlign: 'center',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  menuButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  // modalOverlay: {
  //   flex: 1,
  //   backgroundColor: 'rgba(0,0,0,0.4)',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // modalContainer: {
  //   backgroundColor: '#fff',
  //   width: '85%',
  //   borderRadius: 12,
  //   padding: 20,
  //   elevation: 10,
  // },
  // modalTitle: {
  //   fontSize: 18,
  //   fontWeight: 'bold',
  //   marginBottom: 15,
  //   textAlign: 'center',
  //   color: '#333',
  // },
  // input: {
  //   borderColor: '#ccc',
  //   borderWidth: 1,
  //   borderRadius: 8,
  //   padding: 10,
  //   marginBottom: 12,
  //   fontSize: 16,
  //   color: '#333',
  // },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // label: {
  //   marginTop: 10,
  //   fontWeight: 'bold',
  // },
  datePickerButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginTop: 8,
  },
  datePickerText: {
    color: '#333',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginTop: 8,
    marginBottom: 12,
  },
   modalOverlay: {
    
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    // width: '90%',
    // backgroundColor: '#fff',
    // borderRadius: 12,
    // padding: 20,
    // maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
  },
  name: {
    fontSize: 16,
    color: '#555',
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
    marginTop: 10,
    marginBottom: 6,
  },
  // datePickerButton: {
  //   borderWidth: 1,
  //   borderColor: '#ccc',
  //   borderRadius: 8,
  //   padding: 10,
  //   marginBottom: 12,
  //   backgroundColor: '#f5f5f5',
  // },
  // datePickerText: {
  //   fontSize: 16,
  //   color: '#333',
  // },
  // pickerWrapper: {
  //   borderWidth: 1,
  //   borderColor: '#ccc',
  //   borderRadius: 8,
  //   marginBottom: 12,
  // },
  // infoText: {
  //   fontSize: 15,
  //   color: '#666',
  //   marginVertical: 10,
  //   textAlign: 'center',
  // },
  // modalButtons: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   marginTop: 15,
  // },
  // modalButton: {
  //   flex: 1,
  //   paddingVertical: 10,
  //   borderRadius: 8,
  //   alignItems: 'center',
  //   marginHorizontal: 5,
  // },
  // confirmButton: {
  //   backgroundColor: '#4CAF50',
  // },
  // cancelButton: {
  //   backgroundColor: '#f44336',
  // },
  // buttonText: {
  //   color: '#fff',
  //   fontWeight: 'bold',
  //   fontSize: 16,
  // },
  modal:{
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  dropdown: {
  width: '80%',
  backgroundColor: '#fff',
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 15,
  elevation: 5,
},
option: {
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
});