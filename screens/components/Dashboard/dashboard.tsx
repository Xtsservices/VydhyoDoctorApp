import React, { useState, useEffect, useRef, useCallback, memo,useMemo } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthFetch } from '../../auth/auth';
import moment from 'moment';
import dayjs from 'dayjs';
import { PieChart } from 'react-native-chart-kit';
import Toast from 'react-native-toast-message';

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
interface Clinic { addressId: string; clinicName: string; address: string; status: string; }
interface Slot { _id: string; addressId: string; date: string; slots: { _id: string; time: string; status?: string }[]; }
interface PatientAppointmentsProps { date: Date; doctorId: string; onDateChange: (date: Date) => void; }

/* ---------- Helpers to match web chips ---------- */
const getStatusColors = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'scheduled') return { bg: '#e8f5e8', fg: '#16A34A' };
  if (s === 'completed') return { bg: '#e3f2fd', fg: '#2563EB' };
  if (s === 'rescheduled') return { bg: '#fff3e0', fg: '#F59E0B' };
  if (s === 'canceled' || s === 'cancelled') return { bg: '#ffebee', fg: '#EF4444' };
  return { bg: '#F3F4F6', fg: '#374151' };
};
const getTypeInfo = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t === 'new-walkin' || t === 'home-visit' || t === 'new') return { label: 'New', bg: '#DBEAFE', fg: '#1E40AF' };
  if (t === 'follow-up' || t === 'followup') return { label: 'Follow-up', bg: '#e8f5e8', fg: '#16A34A' };
  return { label: type || 'N/A', bg: '#F3F4F6', fg: '#374151' };
};
const fmtYYYYMMDD = (d: Date | string) => moment(d).format('YYYY-MM-DD');
const fmtNice = (d?: string) => (d ? moment(d).format('MMM D, YYYY') : '—');

/** Robust formatter → "6 Sep 2025 11:45AM" */
// Assumes moment is available. If you use moment-timezone and want to force IST,
// you can set: moment.tz.setDefault('Asia/Kolkata');

const formatApptDateTime = (dateStr?: string, timeStr?: string) => {
  const j = (a?: string, b?: string) => [a, b].filter(Boolean).join(' ');
  const s = (x?: string) => (x || '').trim();
  const D = s(dateStr), T = s(timeStr), TN = T ? T.toUpperCase().replace(/\s+/g, '') : '';
  const hasTime = !!TN || /(\d{1,2}:\d{2})|\b[AP]M\b/i.test(D);
  const OUT = hasTime ? 'D MMM YYYY h:mmA' : 'D MMM YYYY';
  const ISOZ = (x: string) => /T\d{2}:\d{2}|Z$|[+-]\d{2}:?\d{2}$/.test(x);
  const FDT = [
    'DD-MMM-YYYY h:mmA','D-MMM-YYYY h:mmA','DD-MMM-YYYY h:mm A','D-MMM-YYYY h:mm A',
    'YYYY-MM-DD HH:mm','YYYY-MM-DD h:mmA','YYYY-MM-DD h:mm A',
    'DD/MM/YYYY h:mmA','D/M/YYYY h:mmA','DD/MM/YYYY h:mm A','D/M/YYYY h:mm A',
    'h:mmA','h:mm A','HH:mm'
  ];
  const FD = ['DD-MMM-YYYY','D-MMM-YYYY','YYYY-MM-DD','DD/MM/YYYY','D/M/YYYY'];
  const C = j(D, TN);

  if (C && ISOZ(C)) { const z = moment.parseZone(C); if (z.isValid()) return z.local().format(OUT); }

  let m = hasTime ? moment(C, FDT, true) : moment(D, FD, true);
  if (!m.isValid() && hasTime) m = moment(D, FDT, true);
  if (!m.isValid() && !D && TN) m = moment(TN, ['h:mmA','h:mm A','HH:mm'], true);
  if (m.isValid()) return m.format(OUT);

  if (!hasTime && /^\d{4}-\d{2}-\d{2}$/.test(D)) return moment(D, 'YYYY-MM-DD', true).format(OUT);

  const m2 = moment(j(D, T), hasTime ? FDT : FD, false);
  return m2.isValid() ? m2.format(OUT) : j(D, T).trim();
};



/* ---------- Patient Appointments (with chips) ---------- */
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

      if (response?.data?.status === 'success') {
        setAppointments(response.data.data?.appointments || []);
      } else if (response?.status === 'success' && 'data' in response && response.data) {
        setAppointments((response.data as any).data?.appointments || []);
      } else {
        const storedData = await AsyncStorage.getItem('appointments');
        const fallbackData = storedData ? JSON.parse(storedData) : { totalAppointments: [] };
        setAppointments(fallbackData?.totalAppointments || []);
      }
    } catch (error) {
      const storedData = await AsyncStorage.getItem('appointments');
      const fallbackData = storedData ? JSON.parse(storedData) : { totalAppointments: [] };
      setAppointments(fallbackData?.totalAppointments || []);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => { getAppointments(date); }, [date, getAppointments]);

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    onDateChange(selectedDate);
  }, [onDateChange]);

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setShowPicker(true)}>
        <Text style={styles.title}>Patient Appointments</Text>
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

          {appointments.slice(0, viewAll ? appointments.length : 5).map((item, index) => {
            const typeInfo = getTypeInfo(item.appointmentType);
            const statusInfo = getStatusColors(item.appointmentStatus);
            return (
              <View key={index} style={styles.tableRow}>
                <View style={styles.nameColumn}>
                  <Text style={styles.nameText}>{item.patientName || 'Unknown'}</Text>
                  {/* unified date+time: "6 Sep 2025 11:45AM" */}
                  <Text style={styles.datetimeText}>
                    {formatApptDateTime(item.appointmentDate, item.appointmentTime)}
                  </Text>
                </View>

                <View style={[styles.nameColumn]}>
                  <Text style={[styles.pillText, { color: typeInfo.fg }]}>{typeInfo.label}</Text>
                </View>

                <View style={[styles.pill, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.pillText, { color: statusInfo.fg }]}>
                    {item.appointmentStatus
                      ? `${item.appointmentStatus[0].toUpperCase()}${item.appointmentStatus.slice(1)}`
                      : 'Unknown'}
                  </Text>
                </View>
              </View>
            );
          })}
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

/* ---------- Main Dashboard ---------- */
const DoctorDashboard = () => {
  const navigation = useNavigation<any>();
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', phone: '', specialization: '', practice: '', consultationPreferences: '', bank: '', accountNumber: '',
  });

  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);

  // Revenue Summary (RN chart-kit shape)
  const [revenueSummaryData, setRevenueSummaryData] = useState([
    { name: 'Appointment', population: 0, color: '#4285f4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Lab', population: 0, color: '#34a853', legendFontColor: '#7F7F7F', legendFontSize: 15 },
    { name: 'Pharmacy', population: 0, color: '#fbbc04', legendFontColor: '#7F7F7F', legendFontSize: 15 },
  ]);

  // Parity: totals + percentage changes (already present)
  const [dashboardData, setDashboardData] = useState({
    appointmentCounts: { today: 0, newAppointments: 0, followUp: 0 },
    percentageChanges: { today: 0, newAppointments: 0, followUp: 0 },
  });

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [currentClinicIndex, setCurrentClinicIndex] = useState(0);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [nextAvailableSlot, setNextAvailableSlot] = useState<Slot[]>([]);

  const [reviews, setReviews] = useState<Array<{
    id: string;
    patientName: string;
    date?: string;
    rating: number;
    review: string;
    avatar?: string;
  }>>([]);

  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails?.role === 'doctor' ? currentuserDetails?.userId : currentuserDetails?.createdBy;

  /* ---------- Revenue Summary RANGE (new) ---------- */
  const today = fmtYYYYMMDD(new Date());
  const [revenueStartDate, setRevenueStartDate] = useState<string>(today);
  const [revenueEndDate, setRevenueEndDate] = useState<string>(today);
  const [whichRangePicker, setWhichRangePicker] = useState<'start' | 'end' | null>(null);


  // right above your return(...)
const pieState = useMemo(() => {
  const total = revenueSummaryData.reduce((s, d) => s + (Number(d.population) || 0), 0);
  if (total <= 0) {
    // show equal thirds visually, but don't lie with absolute numbers
    const equalData = revenueSummaryData.map(d => ({ ...d, _display: 1 }));
    return { data: equalData, accessor: '_display', absolute: false }; // show 33% labels
  }
  return { data: revenueSummaryData, accessor: 'population', absolute: true }; // your current behavior
}, [revenueSummaryData]);


  const getRevenueData = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('finance/getTodayRevenuebyDoctorId', storedToken);
      const rev = response?.data?.data || (response?.data || {}).data || {};
      setTodayRevenue(rev.todayRevenue || 0);
      setMonthRevenue(rev.monthRevenue || 0);
    } catch (error) {
      console.error('Fetch revenue error:', error);
    }
  }, []);

  // Old endpoint kept for fallback; primary will be range-aware below
  const getRevenueSummaryThisMonth = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('finance/getDoctorRevenueSummaryThismonth', storedToken);
      if (response?.data?.status === 'success') {
        const data = response.data.data;
        setRevenueSummaryData([
          { name: 'Appointment', population: data.appointment || 0, color: '#4285f4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
          { name: 'Lab', population: data.lab || 0, color: '#34a853', legendFontColor: '#7F7F7F', legendFontSize: 15 },
          { name: 'Pharmacy', population: data.pharmacy || 0, color: '#fbbc04', legendFontColor: '#7F7F7F', legendFontSize: 15 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching revenue summary (month):', error);
    }
  }, []);

  // NEW: range-aware summary (same API shape used by web)
  const getRevenueSummaryRange = useCallback(async (start?: string, end?: string) => {
    try {
      if (!start || !end) {
        setRevenueSummaryData([
          { name: 'Appointment', population: 0, color: '#4285f4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
          { name: 'Lab', population: 0, color: '#34a853', legendFontColor: '#7F7F7F', legendFontSize: 15 },
          { name: 'Pharmacy', population: 0, color: '#fbbc04', legendFontColor: '#7F7F7F', legendFontSize: 15 },
        ]);
        return;
      }
      const storedToken = await AsyncStorage.getItem('authToken');
      const url = `finance/getDoctorRevenueSummaryThismonth?startDate=${start}&endDate=${end}`;
      const response = await AuthFetch(url, storedToken);

      if (response?.data?.status === 'success') {
        const data = response.data.data;
        setRevenueSummaryData([
          { name: 'Appointment', population: data?.appointment || 0, color: '#4285f4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
          { name: 'Lab', population: data?.lab || 0, color: '#34a853', legendFontColor: '#7F7F7F', legendFontSize: 15 },
          { name: 'Pharmacy', population: data?.pharmacy || 0, color: '#fbbc04', legendFontColor: '#7F7F7F', legendFontSize: 15 },
        ]);
      } else {
        setRevenueSummaryData([
          { name: 'Appointment', population: 0, color: '#4285f4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
          { name: 'Lab', population: 0, color: '#34a853', legendFontColor: '#7F7F7F', legendFontSize: 15 },
          { name: 'Pharmacy', population: 0, color: '#fbbc04', legendFontColor: '#7F7F7F', legendFontSize: 15 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching revenue summary (range):', error);
      setRevenueSummaryData([
        { name: 'Appointment', population: 0, color: '#4285f4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Lab', population: 0, color: '#34a853', legendFontColor: '#7F7F7F', legendFontSize: 15 },
        { name: 'Pharmacy', population: 0, color: '#fbbc04', legendFontColor: '#7F7F7F', legendFontSize: 15 },
      ]);
    }
  }, []);

  const getTodayAppointmentCount = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`appointment/getTodayAppointmentCount?doctorId=${doctorId}`, storedToken);
      const ok = response?.data?.status === 'success';
      const dat = ok ? response.data.data : {};
      setDashboardData({
        appointmentCounts: {
          today: dat?.totalAppointments?.today || 0,
          newAppointments: dat?.newAppointments?.today || 0,
          followUp: dat?.followupAppointments?.today || 0,
        },
        percentageChanges: {
          today: dat?.totalAppointments?.percentageChange || 0,
          newAppointments: dat?.newAppointments?.percentageChange || 0,
          followUp: dat?.followupAppointments?.percentageChange || 0,
        },
      });
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
      const formattedPhone = rawMobile.length === 10 ? `+91 ${rawMobile.slice(0, 3)} ${rawMobile.slice(3, 6)} ${rawMobile.slice(6, 10)}` : '';
      const maskAccountNumber = (accountNumber: string) => accountNumber ? `${'*'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}` : '';

      setFormData({
        name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim(),
        email: userData.email || '',
        phone: formattedPhone,
        specialization: userData.specialization?.name || '',
        practice: userData.addresses?.length > 0 ? userData.addresses[0] : '',
        consultationPreferences: userData.consultationModeFee?.length > 0 ? userData.consultationModeFee.map((m: any) => m.type).join(', ') : '',
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
      if (response?.data?.status === 'success') {
        const activeClinics = (response.data.data || []).filter((clinic: Clinic) => clinic.status === 'Active');
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
      if (response?.data?.status === 'success') {
        const slotsData: Slot[] = response.data.data || [];
        const todayStr = moment().format('YYYY-MM-DD');
        const tomorrowStr = moment().add(1, 'day').format('YYYY-MM-DD');
        setAvailableSlots(slotsData.filter((s) => s.date === todayStr));
        setNextAvailableSlot(slotsData.filter((s) => s.date === tomorrowStr));
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  }, [doctorId, clinics]);

  /** NEW: Dynamic feedback loader */
  const fetchReviews = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const response = await AuthFetch(`users/getFeedbackByDoctorId/${doctorId}`, token);

      // Normalize a couple of possible shapes
      const ok = response?.data?.status === 'success' || response?.status === 'success';
      const doctorData =
        ok && response?.data?.doctor
          ? response.data.doctor
          : (response?.data?.data && response.data.data.doctor) ? response.data.data.doctor : null;

      const fbArr = (doctorData?.feedback || []).map((f: any, idx: number) => ({
        id: f.feedbackId || f.id || String(idx),
        patientName: f.patientName || 'Unknown User',
        date: f.date || f.createdAt,
        rating: typeof f.rating === 'number' ? f.rating : Number(f.rating || 0),
        review: f.comment || f.review || 'No review provided',
        avatar: f.avatar || undefined,
      }));

      setReviews(fbArr);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  }, [doctorId]);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUserData(),
          getRevenueData(),
          getTodayAppointmentCount(),
          fetchClinics(),
          fetchReviews(),
        ]);
        // Initialize range summary to "today - today"
        await getRevenueSummaryRange(revenueStartDate, revenueEndDate);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [fetchUserData, getRevenueData, getTodayAppointmentCount, fetchClinics, getRevenueSummaryRange, fetchReviews]);

  useEffect(() => { fetchAvailableSlots(); }, [fetchAvailableSlots]);

  /* ---------- Handlers ---------- */
  const handleDateChange = useCallback((newDate: Date) => { setDate(newDate); }, []);

  const handleRangePicked = useCallback((kind: 'start' | 'end') => (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') { setWhichRangePicker(null); return; }
    const iso = fmtYYYYMMDD(selectedDate || new Date());
    if (kind === 'start') {
      setRevenueStartDate(iso);
      if (revenueEndDate && moment(iso).isAfter(revenueEndDate)) {
        Toast.show({ type: 'error', text1: 'Invalid range', text2: 'Start date cannot be after end date', position: 'top' });
      } else if (revenueEndDate) {
        getRevenueSummaryRange(iso, revenueEndDate);
      }
    } else {
      setRevenueEndDate(iso);
      if (revenueStartDate && moment(iso).isBefore(revenueStartDate)) {
        Toast.show({ type: 'error', text1: 'Invalid range', text2: 'End date cannot be before start date', position: 'top' });
      } else if (revenueStartDate) {
        getRevenueSummaryRange(revenueStartDate, iso);
      }
    }
    setWhichRangePicker(null);
  }, [revenueStartDate, revenueEndDate, getRevenueSummaryRange]);

  const clearRange = useCallback(() => {
    setRevenueStartDate(today);
    setRevenueEndDate(today);
    getRevenueSummaryRange(today, today);
  }, [getRevenueSummaryRange]);

  /* ---------- Render ---------- */
  const currentClinic = clinics[currentClinicIndex];
  const selectedClinicToday = availableSlots.find((each) => each.addressId === currentClinic?.addressId);
  const selectedClinicTomorrow = nextAvailableSlot.find((each) => each.addressId === currentClinic?.addressId);
  const formatSlotTime = (time: string) => moment(time, 'HH:mm').format('hh:mm A');

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  const isSmallDevice = width < 360;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Sidebar')}>
            <Ionicons style={styles.title} size={28} name="menu" color="#000000"/>
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {(() => { const hour = new Date().getHours(); if (hour < 12) return 'Good Morning,'; if (hour < 17) return 'Good Afternoon,'; return 'Good Evening,'; })()}
            {'\n'}{currentuserDetails?.role === 'doctor' && 'Dr. '}{formData?.name}
          </Text>
          <View style={styles.rightIcons} />
        </View>

        {/* Add Appointment */}
        <View style={[styles.appointmentButton, { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }]}>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddAppointment')}>
            <Text style={styles.addButtonText}>+ Add Appointment</Text>
          </TouchableOpacity>
        </View>

        {/* Counters & Revenue totals */}
        <View style={styles.container}>
          <View style={styles.appointmentsCard}>
            <View style={styles.centered}>
              <Text style={styles.mainNumber}>{dashboardData.appointmentCounts.today}</Text>
              {/* FIX: always visible on small devices / large font scales */}
              <Text
style={[styles.subText, isSmallDevice && { fontSize: 14 }]}
numberOfLines={2}
adjustsFontSizeToFit={true}
allowFontScaling={false}
              >
                Today's Appointments
              </Text>
            </View>
            <View style={styles.gridRow}>
              <View style={styles.newCard}>
                <View style={styles.trendBadge}><Text style={styles.trendBadgeText}>{dashboardData.percentageChanges.newAppointments}↑</Text></View>
                <Text style={styles.newNumber}>{dashboardData.appointmentCounts.newAppointments}</Text>
                <Text style={styles.newLabel}>New Appointments</Text>
              </View>
              <View style={styles.followUpCard}>
                <View style={styles.trendBadge}><Text style={styles.trendBadgeText}>{dashboardData.percentageChanges.followUp}↑</Text></View>
                <Text style={styles.followUpNumber}>{dashboardData.appointmentCounts.followUp}</Text>
                <Text style={styles.followUpLabel}>Follow-ups</Text>
              </View>
            </View>
          </View>
{currentuserDetails?.role === "doctor" && 
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
          </View>}
        </View>

        {/* Patient Appointments (with date) */}
        <PatientAppointments date={date} doctorId={doctorId} onDateChange={handleDateChange} />

        {/* Clinic Availability */}
        <View style={styles.card}>
          <Text style={styles.title}>Clinic Availability</Text>
          <View style={styles.clinicNavContainer}>
            <TouchableOpacity onPress={() => setCurrentClinicIndex((p) => (p > 0 ? p - 1 : clinics.length - 1))}>
              <AntDesign name="left" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>{currentClinic?.clinicName || 'N/A'}</Text>
            </View>
            <TouchableOpacity onPress={() => setCurrentClinicIndex((p) => (p < clinics.length - 1 ? p + 1 : 0))}>
              <AntDesign name="right" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Available Slots (Today):</Text>
          <ScrollView horizontal contentContainerStyle={styles.slotContainer}>
            {selectedClinicToday ? (
              selectedClinicToday.slots
                .filter((s) => (s as any).status ? (s as any).status === 'available' : true)
                .slice(0, 5)
                .map((slot) => (
                  <View key={slot._id} style={styles.slot}>
                    <Text style={styles.slotText}>{formatSlotTime(slot.time)}</Text>
                  </View>
                ))
            ) : (<Text style={styles.unavailableText}>No slots available</Text>)}
          </ScrollView>

          <Text style={styles.sectionLabel}>Next Available Slots (Tomorrow):</Text>
          <ScrollView horizontal contentContainerStyle={styles.slotContainer}>
            {selectedClinicTomorrow ? (
              selectedClinicTomorrow.slots
                .filter((s) => (s as any).status ? (s as any).status === 'available' : true)
                .slice(0, 5)
                .map((slot) => (
                  <View key={slot._id} style={styles.slot}>
                    <Text style={styles.slotText}>{formatSlotTime(slot.time)}</Text>
                  </View>
                ))
            ) : (<Text style={styles.unavailableText}>No slots available</Text>)}
          </ScrollView>
        </View>

        {/* Revenue Summary (with date range like web) */}
        {currentuserDetails?.role === 'doctor' && 
        <View style={[styles.card, { alignItems: 'flex-start', paddingLeft: 0 }]}>
          <View style={{ paddingHorizontal: 16, width: '100%' }}>
            <Text style={styles.title}>Revenue Summary</Text>

            {/* Range controls */}
            <View style={styles.rangeRow}>
              <Ionicons name="calendar" size={18} color="#1977f3" style={{ marginRight: 8 }} />

              <TouchableOpacity style={styles.rangeBtn} onPress={() => setWhichRangePicker('start')}>
                <Text style={styles.rangeBtnLabel}>Start</Text>
                <Text style={styles.rangeBtnValue}>{fmtNice(revenueStartDate)}</Text>
              </TouchableOpacity>

              <Text style={{ marginHorizontal: 6, color: '#6b7280' }}>—</Text>

              <TouchableOpacity style={styles.rangeBtn} onPress={() => setWhichRangePicker('end')}>
                <Text style={styles.rangeBtnLabel}>End</Text>
                <Text style={styles.rangeBtnValue}>{fmtNice(revenueEndDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.clearBtn} onPress={clearRange}>
                <Ionicons name="refresh" size={16} color="#6b7280" />
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Native pickers (open one at a time) */}
          {whichRangePicker === 'start' && (
            <DateTimePicker
              value={moment(revenueStartDate, 'YYYY-MM-DD').toDate()}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={handleRangePicked('start')}
            />
          )}
          {whichRangePicker === 'end' && (
            <DateTimePicker
              value={moment(revenueEndDate, 'YYYY-MM-DD').toDate()}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={handleRangePicked('end')}
            />
          )}

          {/* Pie */}
          
         <PieChart
  data={pieState.data}
  width={screenWidth - 30}
  height={200}
  chartConfig={{ color: () => `rgba(0, 0, 0, 1)`, decimalPlaces: 0 }}
  accessor={pieState.accessor}
  backgroundColor={'transparent'}
  paddingLeft={'0'}
  hasLegend={true}
  absolute={pieState.absolute}
  style={{ alignSelf: 'flex-start', marginLeft: 6, paddingRight: 10 }}
/>


        </View>}

        {/* Patient Feedback (dynamic) */}
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Patient Feedback</Text>
            {/* <View style={styles.navButtons}>
              <TouchableOpacity><AntDesign name="left" size={16} color="#bfbfbf" /></TouchableOpacity>
              <TouchableOpacity><AntDesign name="right" size={16} color="#bfbfbf" /></TouchableOpacity>
            </View> */}
          </View>
          <ScrollView style={{ maxHeight: 220 }}>
            {reviews.length === 0 ? (
              <Text style={{ color: '#6c757d' }}>No reviews yet.</Text>
            ) : (
              reviews.slice(0, 10).map((fb, i) => {
                const daysAgo = fb.date ? moment(fb.date).fromNow() : '';
                return (
                  <View key={fb.id || i} style={styles.feedbackItem}>
                    <View style={styles.avatarRow}>
                      <Image source={fb.avatar ? { uri: fb.avatar } : PLACEHOLDER_IMAGE} style={styles.avatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{fb.patientName}</Text>
                        <View style={styles.ratingRow}>
                          {[...Array(Math.max(0, Math.min(5, fb.rating || 0)))].map((_, j) => (
                            <AntDesign key={j} name="star" size={14} color="#fbbf24" />
                          ))}
                        </View>
                      </View>
                    </View>
                    <Text style={styles.comment}>"{fb.review}"</Text>
                    {!!daysAgo && <Text style={styles.dateText}>{daysAgo}</Text>}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#F0FDF4' },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 ,marginTop: 20},
  headerText: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  appointmentButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 0, margin: 10, borderRadius: 10 },
  appointmentsCard: { backgroundColor: '#16a8a0', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 10, shadowColor: '#20d0c4', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8, minHeight: 130 },
  centered: { alignItems: 'center', marginBottom: 10, width: '100%' },
  mainNumber: { fontSize: 30, fontWeight: 'bold', color: '#fff' },
  subText: { fontSize: 16, color: '#fff', marginTop: 5, textAlign: 'center', lineHeight: 20 },
  gridRow: { flexDirection: 'row', gap: 5, justifyContent: 'space-between' },
  newCard: { backgroundColor: '#F0FDF4', flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 8, position: 'relative' },
  trendBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendBadgeText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  newNumber: { fontSize: 16, fontWeight: 'bold', color: '#16A34A' },
  newLabel: { color: '#16A34A', marginTop: 4 },
  followUpCard: { backgroundColor: '#EFF6FF', flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 8, position: 'relative' },
  followUpNumber: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
  followUpLabel: { color: '#2563EB' },
  revenueCard: { marginTop: 10 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between' },
  revenueBoxPurple: { flex: 1, backgroundColor: '#FAF5FF', padding: 16, borderRadius: 8, marginRight: 8 },
  revenueBoxOrange: { flex: 1, backgroundColor: '#FFF7ED', padding: 16, borderRadius: 8, marginLeft: 8 },
  revenueSubLabel: { fontSize: 12, color: '#9333EA', marginBottom: 4 },
  revenueSubLabelOrange: { fontSize: 12, color: '#EA580C', marginBottom: 4 },
  revenueAmountPurple: { fontSize: 28, fontWeight: '700', color: '#9333EA' },
  revenueAmountOrange: { fontSize: 24, fontWeight: '700', color: '#EA580C' },

  addButton: { backgroundColor: '#007bff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  card: { backgroundColor: '#F9FBFC', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, color: 'black' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '600', color: 'black' },

  datePicker: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  dateText: { fontSize: 14, color: '#333' },

  table: { marginTop: 10, borderTopWidth: 1, borderColor: '#ccc' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 10,  },
  headerCell: { flex: 1, fontWeight: 'bold', color: '#333' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  nameColumn: { flex: 1 },
  nameText: { fontWeight: '600', fontSize: 14, color: '#0A2342' },
  datetimeText: { color: '#777', fontSize: 12 },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },

  viewAllButton: { marginTop: 12, alignSelf: 'flex-end' },
  viewAllText: { color: '#16a8a0', fontWeight: '600' },

  clinicNavContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  clinicInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  clinicName: { fontSize: 16, fontWeight: '600', color: '#0A2342' },
  sectionLabel: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 8, color:'black' },
  slotContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  slot: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f0f8f0', borderRadius: 15, borderWidth: 1, borderColor: '#1b5e20' },
  slotText: { fontSize: 12, fontWeight: '600', color: '#1b5e20' },
  unavailableText: { fontSize: 14, color: '#6c757d', fontWeight: '500', marginBottom: 12 },

  navButtons: { flexDirection: 'row', gap: 8 },
  feedbackItem: { marginBottom: 8 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3f4f6' },
  name: { fontWeight: '600', fontSize: 14 },
  ratingRow: { flexDirection: 'row', marginTop: 4, gap: 2 },
  comment: { fontSize: 14, color: '#6c757d', fontStyle: 'italic', marginBottom: 8 },

  /* Range row styles (web parity) */
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 6 },
  rangeBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, minWidth: 140 },
  rangeBtnLabel: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  rangeBtnValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, marginLeft: 'auto' },
  clearText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
});

export default DoctorDashboard;
 