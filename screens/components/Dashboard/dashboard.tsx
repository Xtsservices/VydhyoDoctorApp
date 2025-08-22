import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Footer from './Footer';
import Sidebar from './sidebar';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthFetch } from '../../auth/auth';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import dayjs from 'dayjs';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { PieChart } from 'react-native-chart-kit';
import Toast from 'react-native-toast-message';

const StethoscopeIcon = require('../../assets/doc.png');
const today_image = require('../../assets/Frame.png');
const total = require('../../assets/i.png');
const PLACEHOLDER_IMAGE = require('../../assets/img.png');
const { width } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;

interface FormData {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  practice: string;
  consultationPreferences: string;
  bank: string;
  accountNumber: string;
}

interface Clinic {
  addressId: string;
  clinicName: string;
  address: string;
  status: string;
}

interface Slot {
  _id: string;
  addressId: string;
  date: string;
  slots: { _id: string; time: string }[];
}

interface PatientAppointmentsProps {
  date: Date;
  doctorId: string;
  onDateChange: (date: Date) => void;
}

// Sub-component for Patient Appointments
const PatientAppointments = memo(({ date, doctorId, onDateChange }: PatientAppointmentsProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const getAppointments = useCallback(async (selectedDate: Date) => {
    setLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const response = await AuthFetch(
        `appointment/getAppointmentsByDoctorID/dashboardAppointment?date=${formattedDate}&doctorId=${doctorId}&limit=6`,
        storedToken
      );

      if (response.status === 'success' && 'data' in response && response.data) {
        setAppointments(response.data.data?.appointments || []);
      } else {
        console.warn('Server responded with error, falling back to local appointments...');
        const storedData = await AsyncStorage.getItem('appointments');
        const fallbackData = storedData ? JSON.parse(storedData) : { totalAppointments: [] };
        setAppointments(fallbackData?.totalAppointments || []);
      }
    } catch (error) {
      console.error('Fetch appointments error:', error);
      const storedData = await AsyncStorage.getItem('appointments');
      const fallbackData = storedData ? JSON.parse(storedData) : { totalAppointments: [] };
      setAppointments(fallbackData?.totalAppointments || []);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    getAppointments(date);
  }, [date, getAppointments]);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowPicker(false);
      if (event.type === 'dismissed' || !selectedDate) return;
      onDateChange(selectedDate);
    },
    [onDateChange]
  );

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setShowPicker(true)}>
        <Text style={styles.title}>Patient Appointments</Text>
        <Ionicons name="chevron-down" size={20} color="#555" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.datePicker} onPress={() => setShowPicker(true)}>
        <Ionicons name="calendar" size={20} color="#333" />
        <Text style={styles.dateText}>{date.toDateString()}</Text>
      </TouchableOpacity>
      {showPicker && <DateTimePicker value={date} mode="date" display="default" onChange={handleDateChange} />}
      {loading ? (
        <ActivityIndicator size="small" color="#007bff" />
      ) : appointments.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerCell}>Name</Text>
            <Text style={styles.headerCell}>Type</Text>
            <Text style={styles.headerCell}>Status</Text>
          </View>
          {appointments.slice(0, viewAll ? appointments.length : 5).map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.nameColumn}>
                <Text style={styles.nameText}>{item.patientName}</Text>
                <Text style={styles.datetimeText}>{dayjs(item.appointmentDate).format('YYYY-MM-DD')}</Text>
                <Text style={styles.datetimeText}>{item.appointmentTime}</Text>
              </View>
              <Text style={styles.cell}>{item.appointmentType}</Text>
              <Text style={styles.cell}>{item.appointmentStatus}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>No appointments on this date.</Text>
      )}
      {appointments.length > 5 && !viewAll && (
        <TouchableOpacity style={styles.viewAllButton} onPress={() => setViewAll(true)}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const DoctorDashboard = () => {
  const navigation = useNavigation<any>();
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    practice: '',
    consultationPreferences: '',
    bank: '',
    accountNumber: '',
  });
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [revenueSummaryData, setRevenueSummaryData] = useState([
    { name: 'Appointment', population: 0, color: '#4285f4', legendFontColor: '#7F7F7F', legendFontSize: 15 },
    { name: 'Lab', population: 0, color: '#34a853', legendFontColor: '#7F7F7F', legendFontSize: 15 },
    { name: 'Pharmacy', population: 0, color: '#fbbc04', legendFontColor: '#7F7F7F', legendFontSize: 15 },
  ]);
  const [dashboardData, setDashboardData] = useState({
    appointmentCounts: { today: 0, newAppointments: 0, followUp: 0 },
    percentageChanges: { today: 0, newAppointments: 0, followUp: 0 },
  });
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [currentClinicIndex, setCurrentClinicIndex] = useState(0);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [nextAvailableSlot, setNextAvailableSlot] = useState<Slot[]>([]);

  const slideAnim = useRef(new Animated.Value(width)).current;
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails?.role === 'doctor' ? currentuserDetails?.userId : currentuserDetails?.createdBy;

  const getRevenueData = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('finance/getTodayRevenuebyDoctorId', storedToken);
      const revenue = response && 'data' in response && response.data && 'data' in response.data ? response.data.data : {};
      setTodayRevenue(revenue.todayRevenue || 0);
      setMonthRevenue(revenue.monthRevenue || 0);
    } catch (error) {
      console.error('Fetch revenue error:', error);
    }
  }, []);

  const getRevenueSummary = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('finance/getDoctorRevenueSummaryThismonth', storedToken);
      if (response.data.status === 'success') {
        const data = response.data.data;
        setRevenueSummaryData([
          { name: 'Appointment', population: data.appointment || 0, color: '#4285f4', legendFontColor: '#7F7F7F', legendFontSize: 15 },
          { name: 'Lab', population: data.lab || 0, color: '#34a853', legendFontColor: '#7F7F7F', legendFontSize: 15 },
          { name: 'Pharmacy', population: data.pharmacy || 0, color: '#fbbc04', legendFontColor: '#7F7F7F', legendFontSize: 15 },
        ]);
      } else {
        console.error('Revenue summary API response status is not success:', response.data);
      }
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
    }
  }, []);

  const getTodayAppointmentCount = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`appointment/getTodayAppointmentCount?doctorId=${doctorId}`, storedToken);
      if (response?.data?.status === 'success') {
        setDashboardData({
          appointmentCounts: {
            today: response?.data?.data?.totalAppointments?.today || 0,
            newAppointments: response?.data?.data?.newAppointments?.today || 0,
            followUp: response?.data?.data?.followupAppointments?.today || 0,
          },
          percentageChanges: {
            today: response?.data?.data?.totalAppointments?.percentageChange || 0,
            newAppointments: response?.data?.data?.newAppointments?.percentageChange || 0,
            followUp: response?.data?.data?.followupAppointments?.percentageChange || 0,
          },
        });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: response?.data?.message || 'Failed to fetch appointment count', position: 'top' });
      }
    } catch (error) {
      console.error("Error fetching today's appointment count:", error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch appointment count', position: 'top' });
    }
  }, [doctorId]);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found');
      await AsyncStorage.setItem('stepNo', '7');
      const response = await AuthFetch('users/getUser', token);
      if (response.data.status !== 'success') throw new Error(response.data.message || 'Failed to fetch user data');

      const userData = response.data.data;
      const rawMobile = userData.mobile || '';
      const formattedPhone =
        rawMobile.length === 10
          ? `+91 ${rawMobile.slice(0, 3)} ${rawMobile.slice(3, 6)} ${rawMobile.slice(6, 10)}`
          : '';
      const maskAccountNumber = (accountNumber: string) =>
        accountNumber ? `${'*'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}` : '';

      setFormData({
        name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim(),
        email: userData.email || '',
        phone: formattedPhone,
        specialization: userData.specialization?.name || '',
        practice: userData.addresses?.length > 0 ? userData.addresses[0] : '',
        consultationPreferences: userData.consultationModeFee?.length > 0 ? userData.consultationModeFee.map((mode: any) => mode.type).join(', ') : '',
        bank: userData.bankDetails?.bankName || '',
        accountNumber: maskAccountNumber(userData.bankDetails?.accountNumber || ''),
      });
    } catch (error: any) {
      console.error('Error fetching user data:', error.message);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to fetch user data', position: 'top' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClinics = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`users/getClinicAddress?doctorId=${doctorId}`, token);
      if (response.data.status === 'success') {
        const activeClinics = response.data.data.filter((clinic: Clinic) => clinic.status === 'Active');
        setClinics(activeClinics || []);
      }
    } catch (err) {
      console.error('Error fetching clinics:', err);
    }
  }, [doctorId]);

  const fetchAvailableSlots = useCallback(async () => {
    if (!doctorId || clinics.length === 0) return;
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`appointment/getNextAvailableSlotsByDoctor?doctorId=${doctorId}`, token);
      console.log(response , "slots response")
      if (response.data.status === 'success') {
        const slotsData: Slot[] = response.data.data;
        const today = moment().format('YYYY-MM-DD');
        const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
        setAvailableSlots(slotsData.filter((s) => s.date === today));
        setNextAvailableSlot(slotsData.filter((s) => s.date === tomorrow));
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  }, [doctorId, clinics]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchUserData(), getRevenueData(), getRevenueSummary(), getTodayAppointmentCount(), fetchClinics()]);
      } catch (error) {
        console.error('Error during initial data fetch:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [fetchUserData, getRevenueData, getRevenueSummary, getTodayAppointmentCount, fetchClinics]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handlePreviousClinic = () => setCurrentClinicIndex((prev) => (prev > 0 ? prev - 1 : clinics.length - 1));
  const handleNextClinic = () => setCurrentClinicIndex((prev) => (prev < clinics.length - 1 ? prev + 1 : 0));
  const formatSlotTime = (time: string) => moment(time, 'HH:mm').format('hh:mm A');

  const feedback = [
    { name: 'Rani', avatar: 'https://i.pravatar.cc/150?img=12', rating: 4, comment: 'Very helpful and polite doctor.', daysAgo: 3 },
    { name: 'Kiran', avatar: 'https://i.pravatar.cc/150?img=10', rating: 5, comment: 'Excellent service and guidance.', daysAgo: 1 },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? feedback.length - 1 : prev - 1));
  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % feedback.length);

  const currentClinic = clinics[currentClinicIndex];
  const selectedClinic = availableSlots.find((each) => each.addressId === currentClinic?.addressId);
  const selectedClinicTomorrowSlots = nextAvailableSlot.find((each) => each.addressId === currentClinic?.addressId);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Sidebar')}>
            <Ionicons style={styles.title} size={28} name="menu" />
          </TouchableOpacity>
          <Text style={styles.headerText}>
            Good Morning,{"\n"}Dr. {formData.name}
          </Text>
          <View style={styles.rightIcons}>
            <Image source={PLACEHOLDER_IMAGE} style={{ width: 30, height: 30, marginLeft: 10 }} />
          </View>
        </View>
        <View style={[styles.appointmentButton, { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }]}>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddAppointment')}>
            <Text style={styles.addButtonText}>+ Add Appointment</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          <View style={styles.appointmentsCard}>
            <View style={styles.centered}>
              < Text style={styles.mainNumber}>{dashboardData.appointmentCounts.today}</Text>
              <Text style={styles.subText}>Today's Appointments</Text>
            </View>
            <View style={styles.gridRow}>
              <View style={styles.newCard}>
                <View style={styles.trendBadge}>
                  <Text style={styles.trendBadgeText}>{dashboardData.percentageChanges.newAppointments}↑</Text>
                </View>
                <Text style={styles.newNumber}>{dashboardData.appointmentCounts.newAppointments}</Text>
                <Text style={styles.newLabel}>New Appointments</Text>
              </View>
              <View style={styles.followUpCard}>
                <View style={styles.trendBadge}>
                  <Text style={styles.trendBadgeText}>{dashboardData.percentageChanges.followUp}↑</Text>
                </View>
                <Text style={styles.followUpNumber}>{dashboardData.appointmentCounts.followUp}</Text>
                <Text style={styles.followUpLabel}>Follow-ups</Text>
              </View>
            </View>
          </View>

          <View style={styles.revenueCard}>
            <View style={styles.revenueRow}>
              <View style={styles.revenueBoxPurple}>
                <Text style={styles.revenueAmountPurple}>₹{todayRevenue}</Text>
                <Text style={styles.revenueSubLabel}>Today's Revenue</Text>
              </View>
              <View style={styles.revenueBoxOrange}>
                <Text style={styles.revenueAmountOrange}>₹{monthRevenue}</Text>
                <Text style={styles.revenueSubLabelOrange}>This Month</Text>
              </View>
            </View>
          </View>
        </View>

        <PatientAppointments date={date} doctorId={doctorId} onDateChange={handleDateChange} />

        <View style={styles.card}>
          <Text style={styles.title}>Clinic Availability</Text>
          <View style={styles.clinicNavContainer}>
            <TouchableOpacity onPress={handlePreviousClinic}>
              <AntDesign name="left" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>{currentClinic?.clinicName || 'N/A'}</Text>
            </View>
            <TouchableOpacity onPress={handleNextClinic}>
              <AntDesign name="right" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>Available Slots (Today):</Text>
          <ScrollView horizontal contentContainerStyle={styles.slotContainer}>
            {selectedClinic ? (
              selectedClinic.slots.map((slot) => (
                <View key={slot._id} style={styles.slot}>
                  <Text style={styles.slotText}>{formatSlotTime(slot.time)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.unavailableText}>No slots available</Text>
            )}
          </ScrollView>
          <Text style={styles.sectionLabel}>Next Available Slots (Tomorrow):</Text>
          <ScrollView horizontal contentContainerStyle={styles.slotContainer}>
            {selectedClinicTomorrowSlots ? (
              selectedClinicTomorrowSlots.slots.map((slot) => (
                <View key={slot._id} style={styles.slot}>
                  <Text style={styles.slotText}>{formatSlotTime(slot.time)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.unavailableText}>No slots available</Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Revenue Summary</Text>
          <PieChart
            data={revenueSummaryData}
            width={screenWidth}
            height={200}
            chartConfig={{ color: () => `rgba(0, 0, 0, 1)`, decimalPlaces: 0 }}
            accessor={'population'}
            backgroundColor={'transparent'}
            paddingLeft={'15'}
            hasLegend={true}
            absolute
          />
        </View>

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Patient Feedback</Text>
            <View style={styles.navButtons}>
              <TouchableOpacity onPress={handlePrev}>
                <AntDesign name="left" size={16} color="#bfbfbf" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext}>
                <AntDesign name="right" size={16} color="#bfbfbf" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={{ maxHeight: 200 }}>
            {feedback.slice(currentIndex, currentIndex + 1).map((feedback, index) => (
              <View key={index} style={styles.feedbackItem}>
                <View style={styles.avatarRow}>
                  <Image source={{ uri: feedback.avatar }} style={styles.avatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{feedback.name}</Text>
                    <View style={styles.ratingRow}>
                      {[...Array(feedback.rating)].map((_, i) => (
                        <AntDesign key={i} name="star" size={14} color="#fbbf24" />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.comment}>"{feedback.comment}"</Text>
                <Text style={styles.dateText}>{feedback.daysAgo} days ago</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      {/* <Footer /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#F0FDF4' },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  headerText: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  appointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 0,
    margin: 10,
    borderRadius: 10,
  },
  appointmentsCard: {
    backgroundColor: '#16a8a0',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#20d0c4',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  centered: { alignItems: 'center', marginBottom: 10 },
  mainNumber: { fontSize: 30, fontWeight: 'bold', color: '#fff' },
  subText: { fontSize: 16, color: '#fff', marginTop: 5 },
  gridRow: { flexDirection: 'row', gap: 5, justifyContent: 'space-between' },
  newCard: {
    backgroundColor: '#F0FDF4',
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    position: 'relative',
  },
  trendBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendBadgeText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  newNumber: { fontSize: 16, fontWeight: 'bold', color: '#16A34A' },
  newLabel: { color: '#16A34A', marginTop: 4 },
  followUpCard: {
    backgroundColor: '#EFF6FF',
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    position: 'relative',
  },
  followUpNumber: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
  followUpLabel: { color: '#2563EB' },
  revenueCard: { marginTop: 10 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between' },
  revenueBoxPurple: {
    flex: 1,
    backgroundColor: '#FAF5FF',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  revenueBoxOrange: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  revenueSubLabel: { fontSize: 12, color: '#9333EA', marginBottom: 4 },
  revenueSubLabelOrange: { fontSize: 12, color: '#EA580C', marginBottom: 4 },
  revenueAmountPurple: { fontSize: 28, fontWeight: '700', color: '#9333EA' },
  revenueAmountOrange: { fontSize: 24, fontWeight: '700', color: '#EA580C' },
  addButton: { backgroundColor: '#007bff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  card: {
    backgroundColor: '#F9FBFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    color: 'black',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '600', color: 'black' },
  datePicker: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  dateText: { fontSize: 14, color: '#333' },
  table: { marginTop: 10, borderTopWidth: 1, borderColor: '#ccc' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 10 },
  headerCell: { flex: 1, fontWeight: 'bold', color: '#333' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'flex-start' },
  nameColumn: { flex: 1 },
  nameText: { fontWeight: '600', fontSize: 14, color: '#0A2342' },
  datetimeText: { color: '#777', fontSize: 12 },
  cell: { flex: 1, fontSize: 13, color: '#555' },
  viewAllButton: { marginTop: 12, alignSelf: 'flex-end' },
  viewAllText: { color: '#16a8a0', fontWeight: '600' },
  clinicNavContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  clinicInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  clinicName: { fontSize: 16, fontWeight: '600', color: '#0A2342' },
  sectionLabel: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 8, color:'black' },
  slotContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  slot: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f0f8f0', borderRadius: 15, borderWidth: 1, borderColor: '#1b5e20' },
  slotText: { fontSize: 12, fontWeight: '600', color: '#1b5e20', fontFamily: 'Poppins' },
  unavailableText: { fontSize: 14, color: '#6c757d', fontWeight: '500', marginBottom: 12, fontFamily: 'Poppins' },
  navButtons: { flexDirection: 'row', gap: 8 },
  feedbackItem: { marginBottom: 8 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3f4f6' },
  name: { fontWeight: '600', fontSize: 14 },
  ratingRow: { flexDirection: 'row', marginTop: 4, gap: 2 },
  comment: { fontSize: 14, color: '#6c757d', fontStyle: 'italic', fontFamily: 'Poppins', marginBottom: 8 },
});

export default DoctorDashboard;