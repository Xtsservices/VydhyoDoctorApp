import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { AuthPost, AuthFetch, AuthPut, authDelete } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import moment from 'moment';
import { AntDesign } from '@expo/vector-icons';

// Define interfaces for type safety
interface Clinic {
  label: string;
  value: string;
  addressData: {
    clinicName: string;
    addressId: string;
    status: string;
  };
}

interface Slot {
  time: string;
  available: boolean;
  id: string;
  originalTime: string;
  reason?: string;
}

interface UserDetails {
  role: string;
  userId: string;
  createdBy: string;
}

const AvailabilityScreen: React.FC = () => {
  const currentuserDetails = useSelector((state: any) => state.currentUser) as UserDetails;
  const doctorId = currentuserDetails.role === 'doctor' ? currentuserDetails.userId : currentuserDetails.createdBy;

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('Clinic Availability');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>('15 mins');
  const [fromDate, setFromDate] = useState<Date>(new Date()); // Initialize as Date
  const [toDate, setToDate] = useState<Date>(new Date()); // Initialize as Date
  const [whichPicker, setWhichPicker] = useState<'from' | 'to' | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<string>(moment().format('ddd')); // e.g., "Mon"
  const [startTime, setStartTime] = useState<string>('09');
  const [endTime, setEndTime] = useState<string>('05');
  const [startPeriod, setStartPeriod] = useState<string>('AM');
  const [endPeriod, setEndPeriod] = useState<string>('PM');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [unAvailableSlots, setUnAvailableSlots] = useState<Slot[]>([]);
  const [unavailableStartTime, setUnavailableStartTime] = useState<number>(9);
  const [unavailableStartPeriod, setUnavailableStartPeriod] = useState<string>('AM');
  const [unavailableEndTime, setUnavailableEndTime] = useState<number>(11);
  const [unavailableEndPeriod, setUnavailableEndPeriod] = useState<string>('PM');
  const [isAddingSlots, setIsAddingSlots] = useState<boolean>(false);
  const [isDeletingSlots, setIsDeletingSlots] = useState<boolean>(false);
  const [isClinicModalVisible, setIsClinicModalVisible] = useState<boolean>(false);
  const [isDurationModalVisible, setIsDurationModalVisible] = useState<boolean>(false);
  const fullToShortMap: { [key: string]: string } = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun',
  };

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayFullName = moment().format('dddd');
  const todayShortName = fullToShortMap[todayFullName];
  const startIndex = weekdays.indexOf(todayShortName);
  const orderedDays = [...weekdays.slice(startIndex), ...weekdays.slice(0, startIndex)];

  const adjustTime = (type: 'start' | 'end', direction: 'up' | 'down', section: 'available' | 'unavailable') => {
    if (section === 'available') {
      if (type === 'start') {
        setStartTime((prev) => {
          const prevNum = parseInt(prev, 10);
          const newNum = direction === 'up' ? (prevNum === 12 ? 1 : prevNum + 1) : (prevNum === 1 ? 12 : prevNum - 1);
          return newNum.toString().padStart(2, '0');
        });
      } else {
        setEndTime((prev) => {
          const prevNum = parseInt(prev, 10);
          const newNum = direction === 'up' ? (prevNum === 12 ? 1 : prevNum + 1) : (prevNum === 1 ? 12 : prevNum - 1);
          return newNum.toString().padStart(2, '0');
        });
      }
    } else {
      if (type === 'start') {
        setUnavailableStartTime((prev) => (direction === 'up' ? (prev === 12 ? 1 : prev + 1) : (prev === 1 ? 12 : prev - 1)));
      } else {
        setUnavailableEndTime((prev) => (direction === 'up' ? (prev === 12 ? 1 : prev + 1) : (prev === 1 ? 12 : prev - 1)));
      }
    }
  };

  const convertTo24Hour = (hour: string, period: string): string => {
    let h = parseInt(hour);
    if (period === 'AM' && h === 12) h = 0;
    else if (period === 'PM' && h < 12) h += 12;
    return h.toString().padStart(2, '0') + ':00';
  };

  const start24 = convertTo24Hour(startTime, startPeriod);
  const end24 = convertTo24Hour(endTime, endPeriod);

  // Check if end time is after start time
  const isEndTimeValid = () => {
    const startMinutes = moment(start24, 'HH:mm').minutes() + moment(start24, 'HH:mm').hours() * 60;
    const endMinutes = moment(end24, 'HH:mm').minutes() + moment(end24, 'HH:mm').hours() * 60;
    return endMinutes > startMinutes;
  };

  const durations = ['15 mins', '30 mins', '45 mins'];

  const fetchClinicsForDoctor = async (doctorId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`users/getClinicAddress?doctorId=${doctorId}`, token);
      if (response.status === 'success') {
        const activeClinics: Clinic[] = response?.data?.data
          .filter((address: any) => address.status === 'Active')
          .map((address: any) => ({
            label: address.clinicName,
            value: address.addressId,
            addressData: address,
          }));
        setClinics(activeClinics.reverse());
        if (activeClinics.length > 0) {
          setSelectedClinic(activeClinics[0].value);
        } else {
          setSelectedClinic('');
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'No active clinics available',
            position: 'top',
            visibilityTime: 3000,
          });
        }
      } else {
        throw new Error(response.data?.message || 'Failed to fetch clinics');
      }
    } catch (error: any) {
      console.error('Error fetching clinics:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch clinic data',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  useEffect(() => {
    if (doctorId) {
      fetchClinicsForDoctor(doctorId);
    }
  }, [doctorId]);

  const fetchSlotsForDate = async (date: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(
        `appointment/getSlotsByDoctorIdAndDate?doctorId=${doctorId}&date=${date}&addressId=${selectedClinic}`,
        token
      );
      if (response.status !== 'success') {
        setUnAvailableSlots([]);
        setAvailableSlots([]);
        // Toast.show({
        //   type: 'error',
        //   text1: 'Error',
        //   text2: response?.message?.message || response?.data?.message || 'Failed to update clinic',
        //   position: 'top',
        //   visibilityTime: 3000,
        // });
      } else {
        const slotsData = response.data.data;
        const available: Slot[] = [];
        const unavailable: Slot[] = [];
        if (slotsData?.slots && Array.isArray(slotsData.slots)) {
          slotsData.slots.forEach((slot: any) => {
            const timeStr = moment(slot.time, 'HH:mm').format('hh:mm A');
            if (slot.status === 'available') {
              available.push({
                time: timeStr,
                available: true,
                id: slot._id,
                originalTime: slot.time,
              });
            } else {
              unavailable.push({
                time: timeStr,
                available: false,
                id: slot._id,
                reason: slot.reason || 'Not available',
                originalTime: slot.time,
              });
            }
          });
        }
        setAvailableSlots(available);
        setUnAvailableSlots(unavailable);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0];
    if (doctorId && selectedClinic) {
      if (fromDate) {
        fetchSlotsForDate(dayjs(fromDate).format('YYYY-MM-DD'));
      } else {
        fetchSlotsForDate(date);
      }
    }
  }, [fromDate, doctorId, selectedClinic]);

  const generateTimeSlots = async () => {
    if (!isEndTimeValid()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'End time must be after start time',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setIsAddingSlots(true);
    try {
      const startDateObj = dayjs(fromDate);
      const endDateObj = dayjs(toDate);
      const daysDifference = endDateObj.diff(startDateObj, 'day');

      if (daysDifference > 6) { // 0-6 days = 1 week max (inclusive)
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Cannot add slots for more than 1 week at a time',
          position: 'top',
          visibilityTime: 3000,
        });
        setIsAddingSlots(false);
        return;
      }

      const getDateRangeArray = (fromDate: string, toDate: string): string[] => {
        const dates: string[] = [];
        const start = moment(fromDate, 'YYYY-MM-DD');
        const end = moment(toDate, 'YYYY-MM-DD');
        if (end.isAfter(start)) {
          let currentDate = start.clone();
          while (currentDate.isSameOrBefore(end)) {
            dates.push(currentDate.format('YYYY-MM-DD'));
            currentDate.add(1, 'days');
          }
        } else {
          dates.push(start.format('YYYY-MM-DD'));
        }
        return dates;
      };

      const startDate = dayjs(fromDate).format('YYYY-MM-DD');
      const endDate = dayjs(toDate).format('YYYY-MM-DD');
      const selectedDates = fromDate && endDate ? getDateRangeArray(startDate, endDate) : [startDate];

      const payload = {
        doctorId,
        dates: selectedDates,
        startTime: start24,
        endTime: end24,
        interval: parseInt(duration),
        isAvailable: true,
        addressId: selectedClinic,
      };
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthPost('appointment/createSlotsForDoctor', payload, token);

      if (response?.data && response?.data?.status === 'success') {
        // Always refresh the slots after a successful API call
        await fetchSlotsForDate(dayjs(fromDate).format('YYYY-MM-DD'));
        setToDate(new Date());

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Slots Added Successfully', // Use fixed text instead of response data
          position: 'top',
          visibilityTime: 3000,
        });

        // Check if these properties exist before accessing them
        const overlap = response?.data?.results?.[0]?.reason;
        const clinicname = response?.data?.results?.[0]?.overlaps?.[0]?.clinic;
        if (overlap && clinicname) {
          Alert.alert(overlap, `Clinic Name: ${clinicname}`)
        }
      } else {
        // Use a safe fallback message
        const errorMessage = response?.data?.message || response?.message || 'Please Retry';
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: errorMessage,
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error: any) {
      // Use a safe fallback message for catch block too
      const errorMessage = error?.message || 'Please Retry';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsAddingSlots(false);
    }
  };

  const generateUnavailableTimeSlots = async () => {
    try {
      const startTime = moment(`${unavailableStartTime}:00 ${unavailableStartPeriod}`, 'hh:mm A').format('HH:mm');
      const endTime = moment(`${unavailableEndTime}:00 ${unavailableEndPeriod}`, 'hh:mm A').format('HH:mm');

      const getUnavailableTimeSlots = (start: string, end: string, interval: number): string[] => {
        const slots: string[] = [];
        let current = moment(start, 'HH:mm');
        const endMoment = moment(end, 'HH:mm');
        while (current.isBefore(endMoment)) {
          slots.push(current.format('HH:mm'));
          current.add(interval, 'minutes');
        }
        return slots;
      };

      const slotsToMarkUnavailable: string[] = getUnavailableTimeSlots(startTime, endTime, parseInt(duration));
      const existingUnavailableTimes: string[] = unAvailableSlots.map((slot: Slot) => slot.originalTime);
      const newSlotsToMark: string[] = slotsToMarkUnavailable.filter((time) => !existingUnavailableTimes.includes(time));

      if (newSlotsToMark.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'Info',
          text2: 'All selected slots are already marked as unavailable',
          position: 'top',
          visibilityTime: 3000,
        });
        return;
      }

      const overlappingAvailableSlots = availableSlots.filter((slot: Slot) => newSlotsToMark.includes(slot.originalTime));
      const newUnavailableSlots: Slot[] = [
        ...unAvailableSlots,
        ...newSlotsToMark
          .filter((time) => !availableSlots.some((slot: Slot) => slot.originalTime === time))
          .map((time) => ({
            time: moment(time, 'HH:mm').format('hh:mm A'),
            available: false,
            id: `temp-${Date.now()}-${time}`,
            reason: 'Not available',
            originalTime: time,
          })),
      ];

      if (overlappingAvailableSlots.length > 0) {
        overlappingAvailableSlots.forEach((slot: Slot) => {
          newUnavailableSlots.push({
            ...slot,
            available: false,
            reason: 'Not available',
          });
        });
      }

      const updatedAvailableSlots = availableSlots.filter((slot: Slot) => !newSlotsToMark.includes(slot.originalTime));
      setAvailableSlots(updatedAvailableSlots);
      setUnAvailableSlots(newUnavailableSlots);

      const payload = {
        doctorId,
        date: dayjs(fromDate).format('YYYY-MM-DD'),
        timeSlots: newUnavailableSlots.map((slot: Slot) => slot.originalTime),
        addressId: selectedClinic,
      };
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthPut('appointment/updateDoctorSlots', payload, token);

      if (response.data && response.data.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Unavailable slots updated successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        throw new Error(response.data?.message || 'Failed to update slots');
      }
    } catch (error: any) {
      console.error('Error marking unavailable slots:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update unavailable slots',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const toggleSlotSelection = (time: string) => {
    setSelectedSlots((prev) => (prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]));
  };

  const handleDeleteSlots = async () => {
    setIsDeletingSlots(true);
    const date = dayjs(fromDate).format('YYYY-MM-DD');
    const convertTo24Hour = (time12h: string): string => {
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const payload = {
      doctorId,
      addressId: selectedClinic,
      date,
      slotTimes: selectedSlots.length > 0 ? selectedSlots.map(convertTo24Hour) : availableSlots.map((item: Slot) => convertTo24Hour(item.time)),
    };

    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await authDelete(
        `appointment/deleteDoctorSlots?doctorId=${doctorId}&addressId=${selectedClinic}&date=${date}`,
        payload,
        token
      );
      if (res.status === 'success') {
        fetchSlotsForDate(date);
        setSelectedSlots([]);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Slots deleted successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please Retry',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Please Retry',
        position: 'top',
        visibilityTime: 3000,
      });
      console.error(error);
    } finally {
      setIsDeletingSlots(false); // Stop loading regardless of success/error
    }
  };

  const handleDayClick = (day: string) => {
    setSelectedDay(day);
    const todayIndex = moment().isoWeekday(); // 1 (Monday) - 7 (Sunday)
    const selectedIndex = weekdays.indexOf(day) + 1; // 1-based to match isoWeekday
    let diff = selectedIndex - todayIndex;
    if (diff < 0) {
      diff += 7; // Move to next week if the selected day is before today
    }
    // Convert Moment object to Date object
    const date = moment().add(diff, 'days').toDate(); // Use .toDate() to ensure Date object
    setFromDate(date);
    // Also update toDate to be the same as fromDate
    setToDate(date);
  };

  // Convert "HH:mm" or "h:mm AM/PM" => minutes since midnight
  const slotStringToMinutes = (s) => {
    if (!s) return 0;
    const raw = s.trim().toUpperCase();
    const hasAMPM = /\bAM\b|\bPM\b/.test(raw);
    const cleaned = raw.replace(/\s?(AM|PM)\b/, '').trim();
    const [hStr, mStr = '0'] = cleaned.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;

    if (hasAMPM) {
      const isPM = /\bPM\b/.test(raw);
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0; // 12:xx AM -> 00:xx
    }
    return h * 60 + m;
  };

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  /**
   * Disable if:
   *  - selected date is strictly before today, OR
   *  - selected date is today AND slot time is <= current time
   */
  const isPastSlot = (slotTimeStr, fromDate) => {
    const now = new Date();
    const today0 = startOfDay(now).getTime();
    const sel0 = startOfDay(fromDate).getTime();

    if (sel0 < today0) return true;
    if (sel0 > today0) return false;               // future day – all enabled

    const slotMins = slotStringToMinutes(slotTimeStr);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return slotMins <= nowMins;                    // today: past or current minute
  };


  return (
    <ScrollView style={styles.container}>
      <View style={styles.dropdownContainer}>
        <Text style={styles.label}>Clinic Availability</Text>
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => setIsClinicModalVisible(true)}
        >
          <Text style={styles.selectionButtonText}>
            {selectedClinic ? clinics.find((c) => c.value === selectedClinic)?.label || 'Select Clinic' : 'Select Clinic'}
          </Text>
          <Icon name="arrow-drop-down" size={20} color="#333" />
        </TouchableOpacity>

        <Modal
          transparent
          animationType="fade"
          visible={isClinicModalVisible}
          onRequestClose={() => setIsClinicModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Clinic</Text>
              <ScrollView style={styles.modalScroll}>
                {clinics.length > 0 ? (
                  clinics.map((clinic) => (
                    <TouchableOpacity
                      key={clinic.value}
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedClinic(clinic.value);
                        setIsClinicModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{clinic.label}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noOptionsText}>No clinics available</Text>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsClinicModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Start:</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            setWhichPicker('from');
            setShowDatePicker(true);
          }}
        >
          <Text style={{ color: '#333' }}>{dayjs(fromDate).format('DD/MM/YYYY')}</Text>
          <Icon name="calendar-today" size={20} color="#000" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <Text style={styles.label}>End:</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            setWhichPicker('to');
            setShowDatePicker(true);
          }}
        >
          <Text style={{ color: '#333' }}>{dayjs(toDate).format('DD/MM/YYYY')}</Text>
          <Icon name="calendar-today" size={20} color="#000" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={whichPicker === 'from' ? fromDate : toDate}
            mode="date"
            display="default"
            minimumDate={whichPicker === 'from' ? new Date() : fromDate}
            onChange={(event, selected) => {
              setShowDatePicker(false);
              if (event.type === 'set' && selected) {
                if (whichPicker === 'from') {
                  setFromDate(selected);
                  // If toDate is before the new fromDate, update toDate to match fromDate
                  if (selected > toDate) {
                    setToDate(selected);
                  }
                } else if (whichPicker === 'to') {
                  // Ensure toDate is not before fromDate
                  if (selected >= fromDate) {
                    setToDate(selected);
                  } else {
                    Toast.show({
                      type: 'error',
                      text1: 'Error',
                      text2: 'End date cannot be before start date',
                      position: 'top',
                      visibilityTime: 3000,
                    });
                  }
                }
              }
              setWhichPicker(null);
            }}
          />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.weekdayContainer}>
          {orderedDays.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.weekdayButton, selectedDay === day ? styles.primaryButton : styles.defaultButton]}
              onPress={() => handleDayClick(day)}
            >
              <Text style={[styles.weekdayText, selectedDay === day && styles.weekdayTextSelected]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.timecontainer}>
        <View style={styles.timeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.label}>Start Time:</Text>
            <View style={styles.timeControl}>
              <Text style={styles.timeValue}>{startTime}</Text>
              <View style={styles.arrowGroup}>
                <TouchableOpacity onPress={() => adjustTime('start', 'up', 'available')} style={styles.arrowButton}>
                  <Text style={styles.arrowButton}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => adjustTime('start', 'down', 'available')} style={styles.arrowButton}>
                  <Text style={styles.arrowButton}>▼</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.periodButton, { backgroundColor: startPeriod === 'PM' ? '#ffeaa7' : '#fff' }]}
                onPress={() => setStartPeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'))}
              >
                <Text style={{ color: '#333' }}>{startPeriod}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.timeBox}>
            <Text style={styles.label}>End Time:</Text>
            <View style={styles.timeControl}>
              <Text style={[styles.timeValue, !isEndTimeValid() && styles.invalidTime]}>{endTime}</Text>
              <View style={styles.arrowGroup}>
                <TouchableOpacity onPress={() => adjustTime('end', 'up', 'available')} style={styles.arrowButton}>
                  <Text style={styles.arrowButton}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => adjustTime('end', 'down', 'available')} style={styles.arrowButton}>
                  <Text style={styles.arrowButton}>▼</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.periodButton, { backgroundColor: endPeriod === 'PM' ? '#ffeaa7' : '#fff' }]}
                onPress={() => setEndPeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'))}
              >
                <Text style={{ color: '#333' }}>{endPeriod}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!isEndTimeValid() && (
          <Text style={styles.errorText}>End time must be after start time</Text>
        )}

        <View style={styles.dropdownContainer}>
          <Text style={styles.label}>Duration</Text>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => setIsDurationModalVisible(true)}
          >
            <Text style={styles.selectionButtonText}>{duration || 'Select Duration'}</Text>
            <Icon name="arrow-drop-down" size={20} color="#333" />
          </TouchableOpacity>

          <Modal
            transparent
            animationType="fade"
            visible={isDurationModalVisible}
            onRequestClose={() => setIsDurationModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Duration</Text>
                <ScrollView style={styles.modalScroll}>
                  {durations.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={styles.modalItem}
                      onPress={() => {
                        setDuration(d);
                        setIsDurationModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setIsDurationModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.addButton, !isEndTimeValid() && styles.disabledButton]}
            onPress={generateTimeSlots}
            disabled={isAddingSlots || !isEndTimeValid()}
          >
            {isAddingSlots ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Add Slots</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              (isDeletingSlots || availableSlots.length === 0) && styles.disabledButton
            ]}
            onPress={handleDeleteSlots}
            disabled={isDeletingSlots || availableSlots.length === 0}
          >
            {isDeletingSlots ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete All</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.generatedLabel}>Generated Time Slots</Text>
      <View style={styles.slotGrid}>
        {availableSlots.length === 0 ? (
          <Text style={styles.noSlotsText}>No available slots for this date</Text>
        ) : (
          availableSlots.map((slot: Slot, index: number) => (
            <TouchableOpacity
              key={index}
              disabled={isPastSlot(slot.time, fromDate)}
              style={[
                styles.slotBubble,
                selectedSlots.includes(slot.time) && styles.selectedSlotBubble,
                isPastSlot(slot.time, fromDate) && styles.disabledSlotBubble,
              ]}
              onPress={() => {
                if (isPastSlot(slot.time, fromDate)) return;
                toggleSlotSelection(slot.time);
              }}
              onLongPress={() => {
                if (isPastSlot(slot.time, fromDate)) return;
                setSelectedSlots([slot.time]);
                setShowDeleteConfirm(true);
              }}
              accessibilityState={{ disabled: isPastSlot(slot.time, fromDate) }}
            >
              <Text
                style={[
                  { color: '#333' },
                  isPastSlot(slot.time, fromDate) && styles.disabledSlotText,
                ]}
              >
                {slot.time}
              </Text>
            </TouchableOpacity>

          ))
        )}
      </View>

      {showDeleteConfirm && (
        <Modal transparent animationType="fade" visible={showDeleteConfirm} onRequestClose={() => setShowDeleteConfirm(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.modalText}>Are you sure you want to delete the selected slots?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    handleDeleteSlots();
                    setShowDeleteConfirm(false);
                  }}
                >
                  <Text style={{ color: 'white' }}>OK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

export default AvailabilityScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFFFFA',
    padding: 16,
  },
  noSlotsText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: 'red',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
    color: ' #2e2c2cff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 50,
    backgroundColor: '#fff',
  },
  weekdayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectionButtonText: {
    color: '#333',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 200, // Adjust as needed
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalCloseButton: {
    marginTop: 10,
    backgroundColor: '#ccc',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  noOptionsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  weekdayButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  weekdayText: {
    color: '#000',
    fontWeight: '600',
  },
  weekdayTextSelected: {
    color: '#fff',
  },
  timecontainer: {
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 5,
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  timeBox: {
    width: '48%',
  },
  timeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
    color: '#333',
  },
  invalidTime: {
    color: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  arrowGroup: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  arrowButton: {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 2,
    color: '#333',
    paddingLeft: 2,
  },
  periodButton: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    minWidth: 35,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#F87171',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  generatedLabel: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  slotGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  slotBubble: {
    backgroundColor: '#cffedcff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
  },
  selectedSlotBubble: {
    backgroundColor: '#f44336',
    borderColor: '#d32f2f',
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: 'black'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  defaultButton: {
    backgroundColor: '#f0f0f0',
  },
  disabledSlotBubble: {
    opacity: 0.45,
  },
  disabledSlotText: {
    color: '#999',
  },
});