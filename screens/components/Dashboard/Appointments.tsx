import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Key, ReactNode, use, useEffect, useState } from 'react';
import { AuthPost, AuthFetch } from '../../auth/auth';

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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';

interface Appointment {
  label: ReactNode;
  value: Key | null | undefined;
  _id: string;
  appointmentDate: ReactNode;
  appointmentType: ReactNode;
  patientName: ReactNode;
  id: string;
  name: string;
  phone: string;
  clinic: string;
  type: string;
  date: string;
  status: 'Upcoming' | 'Completed';
  statusColor: string;
  typeIcon: string;
  avatar?: string;
}



// Define the Patient interface


const AppointmentsScreen = () => {

  const [Appointments , setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [scheduledAppointments, setScheduledAppointments] = useState<Appointment[]>([]);
  const [rescheduledAppointments, setRescheduledAppointments] = useState<Appointment[]>([]);
  const [cancelledAppointments, setCancelledAppointments] = useState<Appointment[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [totalAppointments, setTotalAppointments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
    const userId = useSelector((state: any) => state.currentUserID);



const fetchAppointments = async () => {
     
      try {
        const token = await AsyncStorage.getItem('authToken');
        console.log('Auth Token:', token);
        const res = await AuthFetch(`appointment/getAppointmentsCountByDoctorID?doctorId=${userId}`, token);

        console.log('Response from API:', res);
  
        const data = res.data.data;
        console.log('Data fetched:', data);
        if (data && Array.isArray(data)) {
          const formattedAppointments = data.map((appt: any) => ({
            label: appt.patientName || '',
            value: appt.appointmentId || '',
            _id: appt._id || appt.appointmentId || '',
            appointmentDate: appt.appointmentDate || '',
            appointmentType: appt.appointmentType || '',
            patientName: appt.patientName || '',
            id: appt.appointmentId || '',
            name: appt.patientName || '',
            phone: appt.phone || '',
            clinic: appt.clinic || 'Unknown Clinic',
            type: appt.appointmentType || 'General',
            date: appt.appointmentDate || 'Unknown Date',
            status: appt.appointmentStatus || '',
            statusColor: appt.appointmentStatus === 'Completed' ? '#E0E7FF' : '#D1FAE5',
            typeIcon: 'video-outline',
            avatar: "https://i.pravatar.cc/150?img=12",
            patientId:appt.userId
          }));
          setAppointments(formattedAppointments);
          setAllAppointments(formattedAppointments);
        }



        setTotalAppointments(data);

        const scheduledAppointments = data.filter((appt: any) => appt.appointmentStatus === 'scheduled');
        setScheduledAppointments(scheduledAppointments);
        const RescheduledAppointments = data.filter((appt: any) => appt.appointmentStatus === 'rescheduled');
        setRescheduledAppointments(RescheduledAppointments);
        const CancelledAppointments = data.filter((appt: any) => appt.appointmentStatus === 'cancelled');
        setCancelledAppointments(CancelledAppointments);
        const CompletedAppointments = data.filter((appt: any) => appt.appointmentStatus === 'completed');
        setCompletedAppointments(CompletedAppointments);

  
        // Simulate fetching data from an API
        console.log('Fetched appointments:', Appointments);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };
  
    useEffect(() => {

      fetchAppointments();
    }, []);

    useEffect(() => {
      console.log('selectedType:', Appointments);

       let filtered = allAppointments;

  if (selectedType && selectedType !== '') {
    filtered = filtered.filter(
      (appt) =>
        appt.type.toLowerCase() === selectedType.toLowerCase()
    );
  }

  if (search.trim() !== '') {
    const keyword = search.toLowerCase();
    filtered = filtered.filter(
      (appt) =>
        appt.name.toLowerCase().includes(keyword) ||
        appt.id.toLowerCase().includes(keyword)
    );
  }

  setAppointments(filtered);

      if (selectedType !== null && selectedType !== '') {
        const filtered = allAppointments.filter((appt) => appt.status.toLowerCase() === selectedType.toLowerCase());
        console.log('Filtered Appointments:', filtered);
        setAppointments(filtered);
      } else {
        setAppointments(Appointments);
      }


    }, [selectedType, allAppointments,  search]);



    const handleStatusChange = async (id: string, status: string, _id: string) => {

const body = {
  appointmentId: id,
  reason:"jhfj"
}
      console.log('Changing status for appointment ID:', _id, 'to', status, body);
  try {
    const token = await AsyncStorage.getItem('authToken');

    if (status === 'Cancel') {
      console.log('Cancelling appointment with ID:', id);

      const response = await AuthPost('appointment/cancelAppointment', body, token);
if (!response || !('data' in response) || response.data.status === 'success') {

   Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Appointment cancelled successfully',
          position: 'top',
          visibilityTime: 3000,
        });
  fetchAppointments();
        return;
      }

console.log('Response from cancelAppointment:', response);
    }else if (status === 'Reschedule') {

      console.log('Rescheduling appointment with ID:', id);
      const response = await AuthPost('appointment/rescheduleAppointment', body, token);
      console.log('Response from rescheduleAppointment:', response);
      if (!response || !('data' in response) || response.data.status === 'success') {
        Toast.show({
          type: 'Success',
          text1: 'Success',
          text2: 'Successfully reschedule appointment',
          position: 'top',
          visibilityTime: 3000,
        });
        fetchAppointments();
        return;
      }
    }else if(status === 'Mark as Complete' ){
        const response = await AuthPost('appointment/completeAppointment', body, token);
    if (!response || !('data' in response) || response.data.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Successfully appointment completed',
          position: 'top',
          visibilityTime: 3000,
        });
        fetchAppointments();
        return;
      }


    }

  } catch (err) {
    console.error('Update Failed:', err);
  }
};


    

    const renderAppointmentCard = ({ item: appt }: { item: Appointment }) => {
      return (
        <View style={styles.apptCard}>
          <View style={styles.row}>
            <Image source={{ uri: appt.avatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{appt.name}</Text>
              <Text style={styles.phone}>{appt.phone}</Text>
            </View>
            <TouchableOpacity
  onPress={() => {
    setSelectedAppointmentId(appt.id);
    setActionMenuVisible(true);
  }}
>
  <Icon name="dots-vertical" size={20} color="#999" />
</TouchableOpacity>

          </View>

          <Text style={styles.id}>ID: {appt.id}</Text>
          <Text style={styles.clinic}>{appt.clinic}</Text>

          <View style={styles.row}>
            <View style={styles.tag}>
              <Icon name={appt.typeIcon} size={14} color="#3B82F6" />
              <Text style={styles.tagText}>{appt.type}</Text>
            </View>

            <Text style={styles.date}>{appt.date}</Text>
            <View
              style={[
                styles.status,
                {
                  backgroundColor:
                    appt.status === 'Upcoming' ? '#DCFCE7' : '#E0E7FF',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: appt.status === 'Upcoming' ? '#16A34A' : '#4338CA',
                }}
              >
                {appt.status}
              </Text>
            </View>
          </View>
          <Modal
  visible={actionMenuVisible}
  transparent
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
            if (selectedAppointmentId) {
              // ✅ Send to API
              handleStatusChange(selectedAppointmentId, status, appt._id);
            }
            setActionMenuVisible(false);
          }}
        >
          <Text>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
        </Pressable>
      ))}
    </View>
  </Pressable>
</Modal>

        </View>
      );
    }


  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F0FDF4' }}>

    <View style={styles.container}>
      <Text style={styles.header}>Appointments</Text>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}> 
      <View style={styles.summaryContainer}>
        <View style={[styles.card, { borderColor: '#FBBF24' }]}>
          <Text style={styles.cardTitle}>{totalAppointments.length}</Text>
          <Text>Total Appointments</Text>          
        </View>
        <View style={[styles.card, { borderColor: '#10B981' }]}>
          <Text style={styles.cardTitle}>{scheduledAppointments.length}</Text>
          <Text>Upcoming</Text>
        </View>
        <View style={[styles.card, { borderColor: '#6366F1' }]}>
          <Text style={styles.cardTitle}>{completedAppointments.length}</Text>
          <Text>Completed</Text>
        </View>
         <View style={[styles.card, { borderColor: '#6366F1' }]}>
          <Text style={styles.cardTitle}>{cancelledAppointments.length}</Text>
          <Text>Cancelled</Text>
        </View>
      </View>
      </ScrollView>

      {/* Search + Filter */}

       <View style={{ flex: 1, padding: 16 }}>
      {/* Search & Filter */}
      <View style={styles.searchContainer}>

      <TextInput
  placeholder="Search by Patient ID or Name"
  style={styles.searchInput}
  value={search}
  onChangeText={setSearch}
/>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setDropdownVisible(true)}
        >
          <Icon name="filter-variant" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Filter */}
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
            <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedType('scheduled');
                setDropdownVisible(false);

              }}
            >
              <Text>Scheduled</Text>
            </Pressable>
            <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedType('rescheduled');
                setDropdownVisible(false);
              }}
            >
              <Text>Rescheduled</Text>
            </Pressable>
            <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedType('cancelled');
                setDropdownVisible(false);
              }}
            >
              <Text>Cancelled</Text>
            </Pressable>
            <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedType('completed');
                setDropdownVisible(false);

              }}
            >
              <Text>Completed</Text>
            </Pressable>
          </View>
        
        </Pressable>
      </Modal>

      {/* Filtered List */}
      
    </View>
      
      {/* <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search by Patient ID or Name"
          style={styles.searchInput}
        />
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-variant" size={22} color="#fff" />
        </TouchableOpacity>
      </View> */}

      {/* Appointment Cards */}

       <FlatList
              data={Appointments}
              keyExtractor={(item) => item.id}
              renderItem={renderAppointmentCard}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
      
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
  cardSub: {
    fontSize: 12,
    color: 'green',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  phone: {
    fontSize: 12,
    color: '#6B7280',
  },
  id: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  clinic: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
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
  
  
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    paddingVertical: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  
});
