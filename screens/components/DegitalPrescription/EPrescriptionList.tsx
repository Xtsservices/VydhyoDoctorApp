import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/AntDesign';
import IconMore from 'react-native-vector-icons/Feather';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthFetch } from '../../auth/auth';

const { width } = Dimensions.get('window');

const EPrescriptionList = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.currentUser);
  const hasGetAppointments = useRef(false);

  const doctorId = user?.role === 'doctor' ? user?.userId : user?.createdBy;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalAppointmentsCount, setTotalAppointmentsCount] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    clinic: 'all',
    type: 'all',
    status: 'scheduled',
    selectedFilterDate: moment(),
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [hasPreviousPrescriptions, setHasPreviousPrescriptions] = useState(false);
  const convertTo12HourFormat = (time24) => {
    if (!time24) return '';

    const [hours, minutes] = time24.split(':');
    const hourInt = parseInt(hours, 10);

    const period = hourInt >= 12 ? 'PM' : 'AM';
    const hour12 = hourInt % 12 || 12; // Convert 0 to 12 for 12 AM

    return `${hour12}:${minutes} ${period}`;
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      scheduled: { color: '#10B981', backgroundColor: '#D1FAE5', text: 'Scheduled' },
      completed: { color: '#3B82F6', backgroundColor: '#DBEAFE', text: 'Completed' },
      rescheduled: { color: '#8B5CF6', backgroundColor: '#EDE9FE', text: 'Rescheduled' },
      canceled: { color: '#EF4444', backgroundColor: '#FEE2E2', text: 'Canceled' },
    };
    return statusConfig[status] || { color: '#6B7280', backgroundColor: '#F3F4F6', text: status };
  };

  const handleEPrescription = (appointment) => {
    const patientDetails = {
      doctorId: appointment.doctorId,
      patientId: appointment?.userId || appointment?.appointmentId,
      patientName: appointment.patientName,
      appointmentDate: appointment.appointmentDate,
      appointmentType: appointment.appointmentType,
      appointmentId: appointment?.appointmentId,
      phone: appointment.patientDetails?.mobile || 'N/A',
      clinic: appointment.clinicName || 'Unknown Clinic',
      type: appointment.appointmentType,
      date: appointment.appointmentDate ? appointment.appointmentDate.slice(0, 10) : 'Unknown Date',
      status: appointment.appointmentStatus,
      statusColor: appointment.appointmentStatus === 'Completed' ? '#E0E7FF' : '#D1FAE5',
      typeIcon: 'General',
      avatar: "https://i.pravatar.cc/150?img=12",
      appointmentTime: appointment.appointmentTime ? convertTo12HourFormat(appointment.appointmentTime) : '', addressId: appointment.addressId,
    };

    navigation.navigate('PatientDetails', { patientDetails });
    setMenuVisible(false);
  };

  const checkPreviousPrescriptions = async (patientId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;

      const response = await AuthFetch(
        `pharmacy/getEPrescriptionByPatientId/${patientId}`,
        token
      );

      return response.status === 'success' &&
        response.data.success &&
        response.data.data &&
        response.data.data.length > 0;
    } catch (error) {
      return false;
    }
  };

  const handleViewPreviousPrescriptions = async (appointment) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Authentication token not found. Please log in again.',
          position: 'top',
          visibilityTime: 3000,
        });
        dispatch({ type: 'currentUser', payload: null });
        dispatch({ type: 'currentUserID', payload: null });
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userId');
        navigation.navigate('Login');
        return;
      }

      const patientId = appointment.userId;
      if (!patientId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Patient ID not found',
          position: 'top',
          visibilityTime: 3000,
        });
        return;
      }

      const response = await AuthFetch(
        `pharmacy/getEPrescriptionByPatientId/${patientId}`,
        token
      );

      if (response.status === 'success' && response.data.success) {
        navigation.navigate('PreviousPrescription', {
          prescriptions: response.data.data,
          patientName: appointment.patientName,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.data?.message || 'Failed to fetch previous prescriptions',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Error fetching previous prescriptions',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
      setMenuVisible(false);
    }
  };

  const openMenu = async (appointment, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedAppointment(appointment);
    const hasPrescriptions = await checkPreviousPrescriptions(appointment.userId);
    setHasPreviousPrescriptions(hasPrescriptions);

    const modalWidth = 200;
    const xPos = pageX + modalWidth > width ? pageX - modalWidth : pageX - 50;

    setMenuPosition({
      x: Math.max(0, Math.min(xPos, width - modalWidth)),
      y: pageY + 10,
    });

    setMenuVisible(true);
  };

  const getAppointments = async (page = 1, limit = 5) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Authentication token not found. Please log in again.',
          position: 'top',
          visibilityTime: 3000,
        });
        dispatch({ type: 'currentUser', payload: null });
        dispatch({ type: 'currentUserID', payload: null });
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userId');
        navigation.navigate('Login');
        return;
      }

      const queryParams = new URLSearchParams({
        doctorId,
        status: 'scheduled',
        ...(searchText && { searchText: searchText.trim() }),
        ...(filters.clinic !== 'all' && { clinic: filters.clinic }),
        ...(filters.type !== 'all' && { appointmentType: filters.type }),
        ...(filters.selectedFilterDate && {
          date: filters.selectedFilterDate.format('YYYY-MM-DD'),
        }),
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await AuthFetch(
        `appointment/getAppointmentsByDoctorID/appointment?${queryParams.toString()}`,
        token
      );

      if (response.status === 'success') {
        const { appointments, pagination } = response.data.data;
        setAppointments(appointments);
        setPagination({
          current: pagination.currentPage,
          pageSize: pagination.pageSize,
          total: pagination.totalItems,
        });
      } else if (response.status === 'error' && response.message.includes('Unauthorized')) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Session expired. Please log in again.',
          position: 'top',
          visibilityTime: 3000,
        });
        dispatch({ type: 'currentUser', payload: null });
        dispatch({ type: 'currentUserID', payload: null });
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userId');
        navigation.navigate('Login');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to fetch appointments',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Error fetching appointments',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsCount = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Authentication token not found. Please log in again.',
          position: 'top',
          visibilityTime: 3000,
        });
        dispatch({ type: 'currentUser', payload: null });
        dispatch({ type: 'currentUserID', payload: null });
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userId');
        navigation.navigate('Login');
        return;
      }

      const queryParams = new URLSearchParams({
        doctorId,
        status: 'scheduled',
      });

      const response = await AuthFetch(
        `appointment/getAppointmentsCountByDoctorID?${queryParams.toString()}`,
        token
      );

      if (response.status === 'success') {
        const count = response?.data?.data;
        setTotalAppointmentsCount(count.total);
      } else if (response.status === 'error' && response.message.includes('Unauthorized')) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Session expired. Please log in again.',
          position: 'top',
          visibilityTime: 3000,
        });
        dispatch({ type: 'currentUser', payload: null });
        dispatch({ type: 'currentUserID', payload: null });
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userId');
        navigation.navigate('Login');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to fetch appointments count',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Error fetching appointments count',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && doctorId && !hasGetAppointments.current) {
      getAppointments();
      getAppointmentsCount();
      hasGetAppointments.current = true;
    }
  }, [user, doctorId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getAppointments();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFilters((prev) => ({
        ...prev,
        selectedFilterDate: moment(selectedDate),
      }));
    }
  };

  const renderActionMenu = () => (
    <Modal
      transparent={true}
      visible={menuVisible}
      onRequestClose={() => setMenuVisible(false)}
      animationType="fade"
    >
      <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.menuContainer, { left: menuPosition.x, top: menuPosition.y }]}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleEPrescription(selectedAppointment)}
        >
          <Icon name="edit" size={18} color="#007AFF" />
          <Text style={styles.menuItemText}>Create Prescription</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={[styles.menuItem, !hasPreviousPrescriptions && styles.disabledMenuItem]}
          onPress={() => hasPreviousPrescriptions && handleViewPreviousPrescriptions(selectedAppointment)}
          disabled={!hasPreviousPrescriptions}
        >
          <Icon name="file-text" size={18} color={hasPreviousPrescriptions ? "#007AFF" : "#999"} />
          <Text style={[styles.menuItemText, !hasPreviousPrescriptions && styles.disabledText]}>
            Previous Prescriptions
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const renderItem = ({ item }) => {
    const status = getStatusTag(item.appointmentStatus);
    return (
      <View style={styles.appointmentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.department}>{item.appointmentDepartment}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={(event) => openMenu(item, event)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconMore name="more-vertical" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{item.appointmentType}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusTag, { backgroundColor: status.backgroundColor }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {moment(item.appointmentDate).format('MMM DD, YYYY')}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {moment(item.appointmentTime, 'HH:mm').format('hh:mm A')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* <View style={styles.header}>
        <Text style={styles.subtitle}>
          Create and manage digital prescriptions for your patients
        </Text>
        {totalAppointmentsCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalAppointmentsCount} scheduled appointments</Text>
          </View>
        )}
      </View> */}

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search1" size={18} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Patient Name or Appointment ID"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <View style={styles.pickerContainer}>
            <Text style={styles.filterLabel}>Type</Text>
            <Picker
              selectedValue={filters.type}
              style={styles.picker}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <Picker.Item label="All Types" value="all" />
              <Picker.Item label="New Walk-in" value="new-walkin" />
              <Picker.Item label="New Home Care" value="new-homecare" />
              <Picker.Item label="Follow-up Walk-in" value="followup-walkin" />
              <Picker.Item label="Follow-up Video" value="followup-video" />
              <Picker.Item label="Follow-up Home Care" value="followup-homecare" />
            </Picker>
          </View>

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={16} color="#6B7280" />
            <Text style={styles.datePickerText}>
              {filters.selectedFilterDate
                ? filters.selectedFilterDate.format('MMM DD, YYYY')
                : 'Select Date'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={filters.selectedFilterDate.toDate()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
      </View>

      <FlatList
        data={appointments}
        renderItem={renderItem}
        keyExtractor={(item) => item.appointmentId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        onEndReached={() => {
          if (pagination.current * pagination.pageSize < pagination.total) {
            getAppointments(pagination.current + 1, pagination.pageSize);
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              {/* <Icon name="calendar" size={48} color="#D1D5DB" /> */}
              <Text style={styles.emptyTitle}>No appointments found</Text>
              <Text style={styles.emptySubtitle}>
                {searchText
                  ? 'Try adjusting your search or filters'
                  : 'Schedule appointments will appear here'}
              </Text>
            </View>
          ) : null
        }
      />

      {renderActionMenu()}
      <Toast position="top" visibilityTime={3000} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  countText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 5,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pickerContainer: {
    flex: 1,
    marginRight: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  picker: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    color: 'black'
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
  },
  datePickerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  department: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuButton: {
    padding: 4,
    borderRadius: 6,
  },
  cardBody: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  disabledMenuItem: {
    opacity: 0.5,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default EPrescriptionList;