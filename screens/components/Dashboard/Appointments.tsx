import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Key, ReactNode, useEffect, useMemo, useState } from 'react';
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
  appointmentDate: string;
  appointmentType: string;
  patientName: string;
  id: string;
  phone: string;
  clinic: string;
  type: string;
  date: string;           // DISPLAY (DD-MMM-YYYY)
  rawDate: string;        // YYYY-MM-DD
  status: string;         // scheduled/completed/rescheduled/cancelled
  statusColor: string;
  typeIcon: string;
  avatar?: string;
  appointmentTime: string;   // raw HH:mm from API
  displayTime: string;       // DISPLAY h:mm A
  addressId: string;
  appointmentDepartment?: string;
}

const STATUS_COLORS = {
  scheduled: { bg: '#e8f5e8', fg: '#16A34A', label: 'Scheduled' },
  completed: { bg: '#e3f2fd', fg: '#2563EB', label: 'Completed' },
  rescheduled: { bg: '#fff3e0', fg: '#F59E0B', label: 'Rescheduled' },
  cancelled: { bg: '#ffebee', fg: '#EF4444', label: 'Cancelled' },
  canceled: { bg: '#ffebee', fg: '#EF4444', label: 'Cancelled' },
};

const formatWebDate = (d: string) =>
  moment(d).isValid() ? moment(d).format('DD-MMM-YYYY') : d;

const format12h = (t?: string) =>
  t ? moment(t, ['HH:mm', 'H:mm']).format('h:mm A') : 'N/A';

// safely parse “appointment moment”; if invalid → null
const parseApptMoment = (rawDate?: string, rawTime?: string) => {
  if (!rawDate || !rawTime) return null;
  const m = moment(`${rawDate} ${rawTime}`, 'YYYY-MM-DD HH:mm', true);
  return m.isValid() ? m : null;
};

const AppointmentsScreen = () => {
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId =
    currentuserDetails?.role === 'doctor'
      ? currentuserDetails?.userId
      : currentuserDetails?.createdBy;

  const navigation = useNavigation<any>();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Action sheet (menu) + action modal
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<Appointment | null>(null);

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'Cancel' | 'Reschedule' | 'Mark as Completed' | ''>('');

  // Reschedule / Cancel shared fields
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ time: string }[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Cards counts
  const [totalAppointmentsCount, setTotalAppointmentsCount] = useState(0);
  const [scheduledAppointmentsCount, setScheduledAppointmentsCount] = useState(0);
  const [completedAppointmentsCount, setCompletedAppointmentsCount] = useState(0);
  const [cancledAppointmentsCount, setCancledAppointmentsCount] = useState(0);

  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  // Date range for CARDS (like web)
  const thisMonthStart = moment().startOf('month').format('YYYY-MM-DD');
  const thisMonthEnd = moment().endOf('month').format('YYYY-MM-DD');
  const [startDate, setStartDate] = useState<string>(thisMonthStart);
  const [endDate, setEndDate] = useState<string>(thisMonthEnd);
  const [whichRangePicker, setWhichRangePicker] = useState<'start' | 'end' | null>(null);

  // Previous prescriptions presence (for disabling)
  const [hasPrescriptions, setHasPrescriptions] = useState<Record<string, boolean>>({});

  const fetchAppointments = async (page = 1, limit = 5) => {
    try {
      const queryParams = new URLSearchParams({
        doctorId: String(doctorId ?? ''),
        ...(search ? { searchText: String(search) } : {}),
        ...(selectedType && selectedType !== 'all' ? { status: String(selectedType) } : {}),
        page: String(page),
        limit: String(limit),
      });

      const token = await AsyncStorage.getItem('authToken');
      const res = await AuthFetch(
        `appointment/getAppointmentsByDoctorID/appointment?${queryParams.toString()}`,
        token
      );

      const { appointments: apiAppointments = [], pagination: serverPg = {} } =
        res?.data?.data || {};

      const formatted: Appointment[] = apiAppointments.map((appt: any) => {
        const rawDate = appt.appointmentDate
          ? moment(appt.appointmentDate).format('YYYY-MM-DD')
          : '';
        const status = String(appt.appointmentStatus || '').toLowerCase();

        return {
          label: appt.patientName || '',
          value: appt.appointmentId || '',
          _id: appt._id || appt.appointmentId || '',
          appointmentDate: appt.appointmentDate || '',
          appointmentType: appt.appointmentType || '',
          appointmentDepartment: appt.appointmentDepartment,
          patientName: appt.patientName || '',
          patientId: appt.userId || '',
          id: appt.appointmentId || '',
          doctorId: appt.doctorId || '',
          phone: appt.phone || '',
          clinic: appt.clinicName || 'Unknown Clinic',
          type: appt.appointmentType || 'General',
          rawDate,
          date: rawDate ? formatWebDate(rawDate) : 'Unknown Date',
          status,
          statusColor: '',
          typeIcon: 'General',
          avatar: 'https://i.pravatar.cc/150?img=12',
          appointmentTime: appt.appointmentTime || '',
          displayTime: format12h(appt.appointmentTime),
          addressId: appt.addressId,
        };
      });

      setPagination({
        current: serverPg.currentPage || page,
        pageSize: serverPg.pageSize || limit,
        total: serverPg.totalItems || formatted.length,
      });

      setAppointments(formatted);

      // Precompute flags for "View Previous Prescription"
      try {
        const token2 = await AsyncStorage.getItem('authToken');
        const pairs = await Promise.all(
          formatted.map(async (a) => {
            if (!a.patientId) return [a.id, false] as const;
            try {
              const resp = await AuthFetch(
                `pharmacy/getEPrescriptionByPatientId/${a.patientId}`,
                token2
              );
              // Support both success shapes
              const ok =
                resp?.data?.success === true ||
                resp?.data?.status === 'success';
              const arr =
                resp?.data?.data && Array.isArray(resp.data.data)
                  ? resp.data.data
                  : [];
              return [a.id, ok && arr.length > 0] as const;
            } catch {
              return [a.id, false] as const;
            }
          })
        );
        const map: Record<string, boolean> = {};
        pairs.forEach(([id, val]) => (map[id] = val));
        setHasPrescriptions(map);
      } catch {
        // ignore
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch appointments');
    }
  };

  useEffect(() => {
    if (currentuserDetails && doctorId) {
      fetchAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentuserDetails && doctorId) {
      fetchAppointments(pagination.current, pagination.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedType]);

  const getAppointmentsCount = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const s = startDate || thisMonthStart;
      const e = endDate || thisMonthEnd;
      const response = await AuthFetch(
        `appointment/getAppointmentsCountByDoctorID?doctorId=${doctorId}&startDate=${s}&endDate=${e}`,
        token
      );

      const ok = response?.data?.status === 'success';
      const count = ok ? response?.data?.data : null;
      if (count) {
        setTotalAppointmentsCount(count.total ?? 0);
        setScheduledAppointmentsCount(count.scheduled ?? 0);
        setCompletedAppointmentsCount(count.completed ?? 0);
        setCancledAppointmentsCount(count.cancelled ?? 0);
      } else {
        Alert.alert('Failed to fetch appointments count');
      }
    } catch (error) {
      Alert.alert('Failed to fetch appointments count');
    }
  };

  useEffect(() => {
    if (currentuserDetails && doctorId) {
      getAppointmentsCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchTimeSlots = async (date: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const response = await AuthFetch(
        `appointment/getSlotsByDoctorIdAndDate?doctorId=${doctorId}&date=${formattedDate}&addressId=${selectedClinicId}`,
        token
      );

      if (response?.data?.status === 'success') {
        const today = moment().format('YYYY-MM-DD');
        const available = (response.data.data.slots || [])
          .filter((slot: any) => slot?.status === 'available')
          .filter((slot: any) => {
            if (formattedDate === today) {
              const slotDateTime = moment(`${formattedDate} ${slot.time}`, 'YYYY-MM-DD HH:mm');
              return slotDateTime.isAfter(moment());
            }
            return true;
          })
          .map((slot: any) => ({ time: slot.time }));

        setAvailableTimeSlots(available);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response?.data?.message?.message || 'Failed to fetch timeslots',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message?.message || 'Error fetching timeslots',
      });
    }
  };

  useEffect(() => {
    if (newDate && selectedClinicId) {
      fetchTimeSlots(newDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newDate, selectedClinicId]);

  // --- Utilities ---
  const fetchAndOpenPrevPrescriptions = async (patientId: string, patientName: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`pharmacy/getEPrescriptionByPatientId/${patientId}`, token);
      const ok =
        response?.data?.success === true ||
        response?.data?.status === 'success';
      const list =
        response?.data?.data && Array.isArray(response.data.data)
          ? response?.data?.data
          : [];

      if (ok && list.length > 0) {
        navigation.navigate('PreviousPrescription', {
          prescriptions: list,
          patientName,
        });
      } else {
        Toast.show({ type: 'info', text1: 'No previous prescriptions found' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error opening prescriptions' });
    }
  };

  const handleStatusChange = async (
    id: string,
    status: 'Cancel' | 'Reschedule' | 'Mark as Completed' | 'Prescription' | 'View Previous Prescription',
    _id: string,
    patientName: string,
    patientId: string
  ) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      if (status === 'Prescription') {
        setActionModalVisible(false);
        navigation.navigate('PatientDetails', { patientDetails });
        return;
      }

      if (status === 'View Previous Prescription') {
        setActionModalVisible(false);
        await fetchAndOpenPrevPrescriptions(patientId, patientName);
        return;
      }

      // Remaining: Cancel / Reschedule / Complete
      if (status === 'Cancel') {
        if (!reason.trim()) {
          Toast.show({ type: 'error', text1: 'Enter a reason for cancellation' });
          return;
        }
        const response = await AuthPost(
          'appointment/cancelAppointment',
          { appointmentId: id, reason },
          token
        );
        if (response?.data?.status === 'success') {
          Toast.show({ type: 'success', text1: 'Appointment cancelled' });
          fetchAppointments(pagination.current, pagination.pageSize);
          getAppointmentsCount();
        } else {
          Alert.alert('Error', response?.data?.message?.message || 'Failed to cancel appointment');
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
        if (response?.data?.status === 'success') {
          Toast.show({ type: 'success', text1: 'Appointment rescheduled' });
          fetchAppointments(pagination.current, pagination.pageSize);
          getAppointmentsCount();
        } else {
          Alert.alert('Error', response?.data?.message?.message || 'Failed to reschedule');
        }
      } else if (status === 'Mark as Completed') {
        const response = await AuthPost(
          'appointment/completeAppointment',
          { appointmentId: id, reason },
          token
        );
        if (response?.data?.status === 'success') {
          Toast.show({ type: 'success', text1: 'Appointment marked completed' });
          fetchAppointments(pagination.current, pagination.pageSize);
          getAppointmentsCount();
        } else {
          Alert.alert('Error', response?.data?.message || 'Failed to complete appointment');
        }
      }
    } catch {
      Alert.alert('Error', 'An error occurred while processing the request');
    } finally {
      // Reset action modal state
      setActionModalVisible(false);
      setSelectedAction('');
      setNewDate('');
      setNewTime('');
      setReason('');
      setAvailableTimeSlots([]);
    }
  };

  const handleMenuPress = (appt: Appointment) => {
    // Reset any stale action modal before opening the menu to avoid “double popup”
    setActionModalVisible(false);
    setSelectedAction('');
    setReason('');
    setNewDate('');
    setNewTime('');
    setAvailableTimeSlots([]);

    setSelectedAppointmentId(appt.id);
    setPatientDetails(appt);
    setSelectedClinicId(appt.addressId || '');
    setActionMenuVisible(true);
  };

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.max(1, Math.ceil((pagination.total || 1) / (pagination.pageSize || 1)));
    const next = Math.min(Math.max(1, newPage), totalPages);
    fetchAppointments(next, pagination.pageSize);
    setPagination((prev) => ({ ...prev, current: next }));
  };

  // ----- DATE RANGE (cards) handlers -----
  const handleRangePicked = (kind: 'start' | 'end') => (
    event: any,
    selected?: Date
  ) => {
    if (event?.type === 'dismissed') {
      setWhichRangePicker(null);
      return;
    }
    const iso = moment(selected || new Date()).format('YYYY-MM-DD');
    if (kind === 'start') {
      setStartDate(iso);
      if (endDate && moment(iso).isAfter(endDate)) {
        Toast.show({ type: 'error', text1: 'Invalid range', text2: 'Start date cannot be after end date' });
      }
    } else {
      setEndDate(iso);
      if (startDate && moment(iso).isAfter(endDate)) {
        Toast.show({ type: 'error', text1: 'Invalid range', text2: 'End date cannot be before start date' });
      }
    }
    setWhichRangePicker(null);
  };

  const clearRange = () => {
    setStartDate(thisMonthStart);
    setEndDate(thisMonthEnd);
  };

  const formattedRangeLabel = useMemo(() => {
    const s = startDate ? moment(startDate).format('MMM D, YYYY') : '—';
    const e = endDate ? moment(endDate).format('MMM D, YYYY') : '—';
    return `${s} - ${e}`;
  }, [startDate, endDate]);

  // ----- Action menu: compute disables like web -----
  const computeDisables = (appt?: Appointment) => {
    if (!appt) {
      return {
        disablePrescription: true,
        disableViewPrev: true,
        disableComplete: true,
        disableReschedule: true,
        disableCancel: true,
      };
    }

    const status = (appt.status || '').toLowerCase();
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled' || status === 'canceled';
    const isPhysio = (appt.appointmentDepartment || '').toLowerCase() === 'physiotherapist';

    const m = parseApptMoment(appt.rawDate, appt.appointmentTime);
    const disabledByTime = !m ? true : moment().isBefore(m.clone().subtract(1, 'hour'));

    const disablePrescription = isCompleted || isCancelled || disabledByTime || isPhysio;
    const disableComplete = isCompleted || isCancelled || disabledByTime;
    const disableReschedule = isCompleted || isCancelled;
    const disableCancel = isCompleted || isCancelled;

    const hasPrev = !!hasPrescriptions[appt.id]; // FIX: correct boolean
    const disableViewPrev = !hasPrev || isPhysio;

    return {
      disablePrescription,
      disableViewPrev,
      disableComplete,
      disableReschedule,
      disableCancel,
    };
  };

  const renderAppointmentCard = ({ item: appt }: { item: Appointment }) => {
    const statusKey = (appt.status || '').toLowerCase() as keyof typeof STATUS_COLORS;
    const statusSty = STATUS_COLORS[statusKey] || { bg: '#F3F4F6', fg: '#374151', label: appt.status || 'Unknown' };

    return (
      <View style={styles.apptCard}>
        <View style={styles.row}>
           <View style={styles.placeholderCircle}>
        <Text style={styles.placeholderText}>{appt.patientName[0] || ""}</Text>
      </View>
          {/* <Image source={{ uri: appt.avatar }} style={styles.avatar} /> */}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{appt.patientName}</Text>
            <Text style={styles.phone}>{appt.phone}</Text>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={() => handleMenuPress(appt)}>
            <Text style={styles.menuButtonText}>⋯</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.id}>ID: {appt.id}</Text>

        <View style={styles.row}>
          <View style={[styles.tag, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.tagText, { color: '#3B82F6' }]}>
              {appt.type || 'General'}
            </Text>
          </View>

          <Text style={styles.date}>
            {appt.date} {appt.displayTime}
          </Text>

          <View style={[styles.status, { backgroundColor: statusSty.bg }]}>
            <Text style={{ fontSize: 12, color: statusSty.fg }}>{statusSty.label}</Text>
          </View>
        </View>

        {/* Action modal for this item */}
        <Modal
          visible={actionModalVisible && selectedAppointmentId === appt.id}
          transparent
          animationType="fade"
          onRequestClose={() => setActionModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActionModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{selectedAction || 'Action'}</Text>

              {/* Body for the specific action ONLY (no duplicate action list) */}
              {selectedAction === 'Cancel' && (
                <>
                  <Text style={styles.label}>Reason for cancellation</Text>
                  <TextInput
                    placeholder="Enter reason"
                    style={styles.input}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    placeholderTextColor={'gray'}
                  />
                </>
              )}

              {selectedAction === 'Reschedule' && (
                <>
                  <Text style={styles.name}>Patient: {appt.patientName}</Text>
                  <Text style={styles.name}>Current Date: {formatWebDate(appt.rawDate)}</Text>
                  <Text style={styles.name}>Current Time: {format12h(appt.appointmentTime)}</Text>

                  <Text style={styles.label}>Select New Date:</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                    <Text style={styles.datePickerText}>
                      {newDate ? moment(newDate).format('DD-MMM-YYYY') : 'Choose a date'}
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
                          const iso = moment(selectedDate).format('YYYY-MM-DD');
                          setNewDate(iso);
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
                          onValueChange={(val) => setNewTime(String(val))}
                          style={styles.input}
                        >
                          <Picker.Item label="Select a time" value="" />
                          {availableTimeSlots.map((slot) => (
                            <Picker.Item
                              key={slot.time}
                              value={slot.time}                           // keep HH:mm value
                              label={format12h(slot.time)}                // show h:mm A
                            />
                          ))}
                        </Picker>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.infoText}>No available time slots for the selected date</Text>
                  )}

                  <Text style={styles.label}>Reason (optional)</Text>
                  <TextInput
                    placeholder="Enter reason"
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

              {/* Confirm/Close */}
              {selectedAction ? (
                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setActionModalVisible(false);
                      setSelectedAction('');
                      setNewDate('');
                      setNewTime('');
                      setReason('');
                      setAvailableTimeSlots([]);
                    }}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={() => {
                      if (selectedAppointmentId) {
                        handleStatusChange(
                          selectedAppointmentId,
                          selectedAction,
                          appt._id,
                          appt.patientName ?? '',
                          appt.patientId ?? ''
                        );
                      }
                    }}
                  >
                    <Text style={styles.buttonText}>Confirm</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F0FDF4' }}>
      <View style={styles.container}>
        {/* Date Range for CARDS (web parity) */}
        <View style={styles.rangeWrap}>
          <Text style={styles.rangeHint}>{formattedRangeLabel}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#1977f3', marginRight: 8 }}>📅</Text>
            <TouchableOpacity style={styles.rangeBtn} onPress={() => setWhichRangePicker('start')}>
              <Text style={styles.rangeBtnLabel}>Start</Text>
              <Text style={styles.rangeBtnValue}>{moment(startDate).format('MMM D, YYYY')}</Text>
            </TouchableOpacity>
            <Text style={{ marginHorizontal: 6, color: '#6b7280' }}>—</Text>
            <TouchableOpacity style={styles.rangeBtn} onPress={() => setWhichRangePicker('end')}>
              <Text style={styles.rangeBtnLabel}>End</Text>
              <Text style={styles.rangeBtnValue}>{moment(endDate).format('MMM D, YYYY')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearBtn} onPress={clearRange}>
              <Text style={styles.clearText}>X</Text>
            </TouchableOpacity>
          </View>

          {whichRangePicker === 'start' && (
            <DateTimePicker
              value={moment(startDate, 'YYYY-MM-DD').toDate()}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={handleRangePicked('start')}
            />
          )}
          {whichRangePicker === 'end' && (
            <DateTimePicker
              value={moment(endDate, 'YYYY-MM-DD').toDate()}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={handleRangePicked('end')}
            />
          )}
        </View>

        {/* Summary cards */}
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

        {/* Search + Filter */}
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search by Appointment ID or Patient Name"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity style={styles.filterButton} onPress={() => setDropdownVisible(true)}>
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Status filter modal */}
        <Modal
          visible={dropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
            <View style={styles.dropdown}>
              {['all', 'scheduled', 'completed', 'cancelled'].map((status) => (
                <Pressable
                  key={status}
                  style={styles.option}
                  onPress={() => {
                    setSelectedType(status);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={{ color: '#000' }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        {/* Action sheet (menu) */}
        <Modal
          visible={actionMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActionMenuVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setActionMenuVisible(false)}>
            <View style={styles.dropdown}>
              {(() => {
                const appt = patientDetails || undefined;
                const dis = computeDisables(appt);

                const MenuItem = ({
                  label,
                  disabled,
                  onPress,
                }: {
                  label: string;
                  disabled?: boolean;
                  onPress: () => void;
                }) => (
                  <Pressable
                    key={label}
                    style={[styles.option, disabled ? { opacity: 0.4 } : null]}
                    onPress={() => {
                      if (disabled) return;
                      onPress();
                    }}
                  >
                    <Text style={{ color: '#000' }}>{label}</Text>
                  </Pressable>
                );

                if (!appt) {
                  return <Text style={{ padding: 10, color: '#000' }}>No appointment selected</Text>;
                }

                return (
                  <>
                    {/* Navigate immediately for these two */}
                    <MenuItem
                      label="Prescription"
                      disabled={dis.disablePrescription}
                      onPress={() => {
                        setActionMenuVisible(false);
                        handleStatusChange(appt.id, 'Prescription', appt._id, appt.patientName, appt.patientId);
                      }}
                    />
                    <MenuItem
                      label="View Previous Prescription"
                      disabled={dis.disableViewPrev}
                      onPress={() => {
                        setActionMenuVisible(false);
                        handleStatusChange(appt.id, 'View Previous Prescription', appt._id, appt.patientName, appt.patientId);
                      }}
                    />

                    {/* Open a single action modal for the rest */}
                    <MenuItem
                      label="Mark as Completed"
                      disabled={dis.disableComplete}
                      onPress={() => {
                        setActionMenuVisible(false);
                        setSelectedAction('Mark as Completed');
                        setActionModalVisible(true);
                      }}
                    />
                    <MenuItem
                      label="Reschedule"
                      disabled={dis.disableReschedule}
                      onPress={() => {
                        setActionMenuVisible(false);
                        setSelectedAction('Reschedule');
                        setActionModalVisible(true);
                      }}
                    />
                    <MenuItem
                      label="Cancel"
                      disabled={dis.disableCancel}
                      onPress={() => {
                        setActionMenuVisible(false);
                        setSelectedAction('Cancel');
                        setActionModalVisible(true);
                      }}
                    />
                  </>
                );
              })()}
            </View>
          </Pressable>
        </Modal>

        {/* List */}
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentCard}
          contentContainerStyle={{ paddingBottom: 10 }}
        />

        {/* Pagination */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10, marginBottom: 40 }}>
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
            Page {pagination.current} of {Math.max(1, Math.ceil((pagination.total || 1) / (pagination.pageSize || 1)))}
          </Text>

          <TouchableOpacity
            onPress={() => handlePageChange(pagination.current + 1)}
            disabled={pagination.current >= Math.ceil((pagination.total || 1) / (pagination.pageSize || 1))}
            style={{
              padding: 10,
              marginHorizontal: 5,
              backgroundColor:
                pagination.current >= Math.ceil((pagination.total || 1) / (pagination.pageSize || 1))
                  ? '#e5e7eb'
                  : '#3b82f6',
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                color:
                  pagination.current >= Math.ceil((pagination.total || 1) / (pagination.pageSize || 1))
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
    paddingTop: 10,
  },
   placeholderCircle: {
    width: 50, height: 50, borderRadius: 30, backgroundColor: '#1e3a5f',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  placeholderText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  rangeWrap: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  rangeBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 100,
    marginRight: 4,
  },
  rangeBtnLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  rangeBtnValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  clearBtn: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EEF2FF' },
  clearText: { color: '#4F46E5', fontWeight: '600' },
  rangeHint: { marginTop: 6, color: '#6b7280', fontSize: 12 },

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
  cardTitle: { fontSize: 22, fontWeight: 'bold' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  searchInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: 'black',
  },
  filterButton: {
    width: 60,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: { color: '#fff', fontWeight: 'bold' },

  apptCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 14,
    borderRadius: 12,
    shadowColor: '#000',
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between', marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  phone: { fontSize: 12, color: '#6B7280' },
  id: { fontSize: 12, color: '#6B7280', marginBottom: 2 },

  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  tagText: { fontSize: 12, color: '#3B82F6' },

  date: { fontSize: 12, color: '#4B5563', flex: 1, textAlign: 'center' },

  status: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },

  menuButton: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 5 },
  menuButtonText: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16, color: '#333' },
  label: { fontSize: 16, fontWeight: '500', color: '#444', marginTop: 10, marginBottom: 6 },
  datePickerButton: { padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5, marginTop: 8 },
  datePickerText: { color: '#333' },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginTop: 8, marginBottom: 12 },
  infoText: { fontSize: 16, color: '#555', marginBottom: 20, textAlign: 'center' },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  confirmButton: { backgroundColor: '#10B981' },
  cancelButton: { backgroundColor: '#EF4444' },
  buttonText: { color: '#fff', fontWeight: 'bold' },

  dropdown: { width: '80%', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 15, elevation: 5 },
  option: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
