import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
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
import { AntDesign } from "@expo/vector-icons"; // or use react-native-vector-icons/AntDesign

const AvailabilityScreen = () => {
  const currentuserDetails =  useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails.role==="doctor"? currentuserDetails.userId : currentuserDetails.createdBy
     
  const [clinics, setClinics] = useState([])
  const [selectedClinic, setSelectedClinic] = useState('Clinic Availability');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [duration, setDuration] = useState('15 mins');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  
  const [whichPicker, setWhichPicker] = useState<'from' | 'to' | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fullToShortMap = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayFullName = moment().format("dddd"); // e.g., "Monday"
const todayShortName = fullToShortMap[todayFullName as keyof typeof fullToShortMap]; // "Mon"
const startIndex = weekdays.indexOf(todayShortName);

const orderedDays = [
  ...weekdays.slice(startIndex),
  ...weekdays.slice(0, startIndex),
];
  const [selectedDay, setSelectedDay] = useState<string>(todayShortName);
  const [startTime, setStartTime] = useState("09");
  const [endTime, setEndTime] = useState("05");
  const [startPeriod, setStartPeriod] = useState("AM");
  const [endPeriod, setEndPeriod] = useState("PM");
  const [availableSlots, setAvailableSlots] = useState([])
  const [unAvailableSlots, setUnAvailableSlots] = useState([])
  const [unavailableStartTime, setUnavailableStartTime] = useState(9);
  const [unavailableStartPeriod, setUnavailableStartPeriod] = useState("AM");
  const [unavailableEndTime, setUnavailableEndTime] = useState(11);
  const [unavailableEndPeriod, setUnavailableEndPeriod] = useState("PM");


const adjustTime = (type: string, direction: string, section: string) => {
  console.log(type, direction, section)
    if (section === "available") {
      console.log("available")
      if (type === "start") {
        if (direction === "up") {
          setStartTime((prev) => {
            const prevNum = parseInt(prev, 10);
            const newNum = prevNum === 12 ? 1 : prevNum + 1;
            return newNum.toString().padStart(2, "0");
          });
        } else {
          setStartTime((prev) => {
            const prevNum = parseInt(prev, 10);
            const newNum = prevNum === 1 ? 12 : prevNum - 1;
            return newNum.toString().padStart(2, "0");
          });
        }
      } else {
        if (direction === "up") {
          setEndTime((prev) => {
            const prevNum = parseInt(prev, 10);
            const newNum = prevNum === 12 ? 1 : prevNum + 1;
            return newNum.toString().padStart(2, "0");
          });
        } else {
          setEndTime((prev) => {
            const prevNum = parseInt(prev, 10);
            const newNum = prevNum === 1 ? 12 : prevNum - 1;
            return newNum.toString().padStart(2, "0");
          });
        }
      }
    } else {
      console.log("unavailable")
      if (type === "start") {
        if (direction === "up") {
          setUnavailableStartTime((prev) => (prev === 12 ? 1 : prev + 1));
        } else {
          setUnavailableStartTime((prev) => (prev === 1 ? 12 : prev - 1));
        }
      } else {
        if (direction === "up") {
          setUnavailableEndTime((prev) => (prev === 12 ? 1 : prev + 1));
        } else {
          setUnavailableEndTime((prev) => (prev === 1 ? 12 : prev - 1));
        }
      }
    }
  };

  console.log()


  // const adjustTime = (
  //   type: "start" | "end",
  //   direction: "up" | "down",
  //   section
  // ) => {

    
  //   const current = type === "start" ? parseInt(startTime) : parseInt(endTime);
  //   let newVal = direction === "up" ? current + 1 : current - 1;
  //   if (newVal > 12) newVal = 1;
  //   if (newVal < 1) newVal = 12;
  //   const formatted = newVal.toString().padStart(2, "0");
  //   type === "start" ? setStartTime(formatted) : setEndTime(formatted);
  // };

  const convertTo24Hour = (hour: string, period: string): string => {
  let h = parseInt(hour);
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h < 12) h += 12;
  return h.toString().padStart(2, "0") + ":00";
};

const start24 = convertTo24Hour(startTime, startPeriod); // e.g., "08:00"
const end24 = convertTo24Hour(endTime, endPeriod);       // e.g., "18:00"

console.log("Start Time:", start24);
console.log("End Time:", end24);
console.log("selected Duration" , duration)

  const durations = ['5 mins','10 mins','15 mins', '30 mins', '45 mins', '60 mins'];
 

  console.log(startTime, endTime, "selected time slots")

    const fetchClinicsForDoctor = async (doctorId: any) => {
    try {

      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`users/getClinicAddress?doctorId=${doctorId}`, token);
      console.log(response, "doctor clinics")
      
      if ( response.status === "success") {
        const activeClinics = response?.data?.data
          .filter((address) => address.status === "Active")
          .map((address) => ({
            label: address.clinicName,
            value: address.addressId,
            addressData: address,
          }));
         

        setClinics(activeClinics.reverse());

        if (activeClinics.length > 0) {
          setSelectedClinic(activeClinics[0].value);
        } else {
          setSelectedClinic(null);
          message.warning("No active clinics available");
        }
      } else {
        throw new Error(response.data?.message || "Failed to fetch clinics");
      }
    } catch (error) {
      console.error("Error fetching clinics:", error);
      message.error("Failed to fetch clinic data");
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
        console.log(date, "selectedDate format" )
      const response = await AuthFetch(`appointment/getSlotsByDoctorIdAndDate?doctorId=${doctorId}&date=${date}&addressId=${selectedClinic}`,token);
console.log(response, "response of selected clinic slots")
if (response.status !== 'success'){
   setUnAvailableSlots([])
   setAvailableSlots([])
  Toast.show({
            type: 'error',
            text1: 'Error',
            text2: response?.message?.message || response?.data?.message || 'Failed to update clinic',
            position: 'top',
            visibilityTime: 3000,
          });

}else {
        const slotsData = response.data.data;
        let available = []
        let unavailable= [];

        if (slotsData?.slots && Array.isArray(slotsData.slots)) {
          slotsData.slots.forEach((slot) => {
            const timeStr = moment(slot.time, "HH:mm").format("hh:mm A");
            if (slot.status === "available") {
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
                reason: slot.reason || "Not available",
                originalTime: slot.time,
              });
            }
          });
        }

       
          setAvailableSlots(available)
         setUnAvailableSlots(unavailable)
        
      }
    }catch(err){
      console.log(err)
    }
    }
    useEffect(() => {
    const date = new Date().toISOString().split("T")[0];

    if (doctorId && selectedClinic) {
      if (fromDate !== null) {
        fetchSlotsForDate(dayjs(fromDate).format("YYYY-MM-DD"));
      } else {
        fetchSlotsForDate(date);
      }
    }
  }, [fromDate, doctorId, selectedClinic]);

  const generateTimeSlots = async () => {
    try {
      
      const getDateRangeArray = (fromDate, toDate) => {
  console.log(fromDate, toDate, "selected from and to dates");

  const dates = [];

  const start = moment(fromDate, "YYYY-MM-DD");
  const end = moment(toDate, "YYYY-MM-DD");

  if (end.isAfter(start)) {
     console.log(fromDate, toDate, "selected from and to dates");
    let currentDate = start.clone();
    while (currentDate.isSameOrBefore(end)) {
      dates.push(currentDate.format("YYYY-MM-DD"));
      currentDate.add(1, "days");
    }
  } else {
    // Only include fromDate if toDate is not after fromDate
    dates.push(start.format("YYYY-MM-DD"));
  }

  return dates;
};


      const startDate = dayjs(fromDate).format("YYYY-MM-DD");
      const endDate = dayjs(toDate).format("YYYY-MM-DD");

      let selectedDates = [];
      if (fromDate && endDate) {
        selectedDates = getDateRangeArray(startDate, endDate);
      } else {
        selectedDates = [startDate];
      }

      console.log(selectedDates)
    

      const payload = {
  doctorId: doctorId,
        dates: selectedDates,
        startTime:start24,
        endTime:end24,
        interval: parseInt(duration),
        isAvailable: true,
        addressId: selectedClinic,
      }
      console.log(payload, "payload to be sent")
const token = await AsyncStorage.getItem('authToken');
      const response = await AuthPost("appointment/createSlotsForDoctor", payload, token);

      console.log(response, "response")

      if (response?.data && response?.data?.status === "success") {
        fetchSlotsForDate(dayjs(fromDate).format("YYYY-MM-DD"));
        setToDate(new Date())
        Toast.show({
            type: 'success',
            text1: 'success',
            text2: response?.data?.message || 'Slots Added Successfully',
            position: 'top',
            visibilityTime: 3000,
          });
      } else {
         Toast.show({
            type: 'error',
            text1: 'error',
            text2: response?.data?.message || 'Please Retry',
            position: 'top',
            visibilityTime: 3000,
          });
      }
    } catch (error) {
      
       Toast.show({
            type: 'error',
            text1: 'error',
            text2: error.message || 'Please Retry',
            position: 'top',
            visibilityTime: 3000,
          });
     
    }
  };

const generateUnavailableTimeSlots = async () => {
  try {
    const startTime = moment(
      `${unavailableStartTime}:00 ${unavailableStartPeriod}`,
      "hh:mm A"
    ).format("HH:mm");

    const endTime = moment(
      `${unavailableEndTime}:00 ${unavailableEndPeriod}`,
      "hh:mm A"
    ).format("HH:mm");

    console.log(startTime, endTime, "Converted start and end time");

    const getUnavailableTimeSlots = (start: string, end: string, interval: number): string[] => {
      const slots: string[] = [];
      let current = moment(start, "HH:mm");
      const endMoment = moment(end, "HH:mm");
      while (current.isBefore(endMoment)) {
        slots.push(current.format("HH:mm"));
        current.add(interval, "minutes");
      }
      return slots;
    };

    const slotsToMarkUnavailable: string[] = getUnavailableTimeSlots(
      startTime,
      endTime,
      parseInt(duration)
    );

    const existingUnavailableTimes: string[] = unAvailableSlots.map(
      (slot: any) => slot.originalTime
    );

    const newSlotsToMark: string[] = slotsToMarkUnavailable.filter(
      (time) => !existingUnavailableTimes.includes(time)
    );

    if (newSlotsToMark.length === 0) {
      message.info("All selected slots are already marked as unavailable");
      return;
    }

    const overlappingAvailableSlots = availableSlots.filter((slot: any) =>
      newSlotsToMark.includes(slot.originalTime)
    );

    const newUnavailableSlots = [
      ...unAvailableSlots,
      ...newSlotsToMark
        .filter(
          (time) => !availableSlots.some((slot: any) => slot.originalTime === time)
        )
        .map((time) => ({
          time: moment(time, "HH:mm").format("hh:mm A"),
          available: false,
          id: `temp-${Date.now()}-${time}`,
          reason:  "Not available",
          originalTime: time,
        })),
    ];

    if (overlappingAvailableSlots.length > 0) {
      overlappingAvailableSlots.forEach((slot: any) => {
        newUnavailableSlots.push({
          ...slot,
          available: false,
          reason:  "Not available",
        });
      });
    }

    // Remove overlapping slots from available slots
    const updatedAvailableSlots = availableSlots.filter(
      (slot: any) => !newSlotsToMark.includes(slot.originalTime)
    );

   
      setAvailableSlots(updatedAvailableSlots)
      setUnAvailableSlots(newUnavailableSlots)
    

    // 🟢 API Call to update unavailable slots
    const payload = {
doctorId: doctorId,
      date: dayjs(fromDate).format("YYYY-MM-DD"),
      timeSlots: newUnavailableSlots.map((slot: any) => slot.originalTime),
      addressId: selectedClinic,
    }
    const token = await AsyncStorage.getItem('authToken');
    const response = await AuthPut("appointment/updateDoctorSlots", payload, token);

    console.log(response, "response of unavailable slots")

    if (response.data && response.data.status === "success") {
    } else {
      throw new Error(response.data?.message || "Failed to update slots");
    }

  } catch (error) {
    console.error("Error marking unavailable slots:", error);
  } 
};


  const toggleSlotSelection = (time: string) => {
  setSelectedSlots((prev) =>
    prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
  );
};

const handleDeleteSlots = async () => {

  const date = (dayjs(fromDate).format("YYYY-MM-DD"))
  console.log(selectedSlots, availableSlots)
  let payload = {}

  function convertTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' '); // e.g. ['09:15', 'AM']
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  }

  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}


  if (selectedSlots.length>0) {

  payload ={ doctorId: doctorId,
    addressId: selectedClinic,
    date: date, // format like '2024-07-22'
    slotTimes: selectedSlots.map(convertTo24Hour)
  }
  }else{
     payload ={ doctorId: doctorId,
    addressId: selectedClinic,
    date: date, // format like '2024-07-22'
    slotTimes: availableSlots.map((item) => convertTo24Hour(item.time))
  }
  }

  console.log(payload, "for deleting slots")

  try {
    const token = await AsyncStorage.getItem('authToken');
    const res = await authDelete(`appointment/deleteDoctorSlots?doctorId=${doctorId}&addressId=${selectedClinic}&date=${date}`, payload, token);
console.log(res, "deleteed slots ")
    if (res.status==="success"){
      fetchSlotsForDate(date)
      setSelectedSlots([])
      Toast.show({
            type: 'success',
            text1: 'success',
            text2: 'Please Retry',
            position: 'top',
            visibilityTime: 3000,
          });
    }else{
      Toast.show({
            type: 'error',
            text1: 'error',
            text2: 'Please Retry',
            position: 'top',
            visibilityTime: 3000,
          });
    }
  } catch (error) {
     Toast.show({
            type: 'error',
            text1: 'error',
            text2: error.message || 'Please Retry',
            position: 'top',
            visibilityTime: 3000,
          });
    console.error(err);
  }
};


  console.log(unAvailableSlots, "selectedClinic address")
  return (
    <ScrollView style={styles.container}>
      {/* <Text style={styles.header}>Available Timings</Text> */}

      {/* Clinic Availability Dropdown */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.label}>Clinic Availability</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedClinic}
            onValueChange={(value) => setSelectedClinic(value)}
            style={styles.picker}
          >
            
              <Picker.Item label="Select Clinic" value="" />
            
     {clinics?.length > 0 &&
  clinics.map((clinic: any) => {
    const name = clinic?.label || clinic?.addressData?.clinicName || "Unnamed Clinic";
    const id = clinic?.value || clinic?.addressData?.addressId;

    return (
      <Picker.Item
        key={id}
        label={name}
        value={id}
      />
    );
  })}
           
          </Picker>
        </View>
      </View>

      {/* Date Picker */}
    <View style={styles.row}>
      {/* From Date */}
      <Text style={styles.label}>Start:</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          setWhichPicker('from');
          setShowDatePicker(true);
        }}
      >
        <Text>{dayjs(fromDate).format('DD/MM/YYYY')}</Text>
        <Icon name="calendar-today" size={20} color="#000" style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      {/* To Date */}
      <Text style={styles.label}>End:</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          setWhichPicker('to');
          setShowDatePicker(true);
        }}
      >
        <Text>{dayjs(toDate).format('DD/MM/YYYY')}</Text>
        <Icon name="calendar-today" size={20} color="#000" style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      {/* Date Picker */}
      {showDatePicker && (
  <DateTimePicker
    value={whichPicker === 'from' ? fromDate : toDate}
    mode="date"
    display="default"
    minimumDate={
      whichPicker === 'from' 
        ? new Date() 
        : fromDate || new Date() // disable dates before fromDate in 'to' picker
    }
    // minimumDate={new Date()}
    onChange={(event, selected) => {
      setShowDatePicker(false);
      if (event.type === 'set' && selected) {
        if (whichPicker === 'from') {
          setFromDate(selected);
        } else if (whichPicker === 'to') {
          setToDate(selected);
        }
      }
      setWhichPicker(null);
    }}
  />
)}

    </View>
      {/* {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
           minimumDate={new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )} */}

      {/* Weekdays */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false}> 
   <View style={styles.weekdayContainer}>
      
    {orderedDays.map((day) => (
      <TouchableOpacity
        key={day}
        style={[
          styles.weekdayButton,
          selectedDay === day ? styles.primaryButton : styles.defaultButton,
        ]}
        onPress={() => setSelectedDay(day)}
      >
        <Text
          style={[
            styles.weekdayText,
            selectedDay === day && styles.weekdayTextSelected,
          ]}
        >
          {day}
        </Text>
      </TouchableOpacity>
    ))}
   
  </View>
   </ScrollView>

      {/* Time Inputs */}
      <View style={styles.timecontainer}>

     
      <View style={styles.timeRow}>
      {/* Start Time */}
      <View style={styles.timeBox}>
        <Text style={styles.label}>Start Time:</Text>
        <View style={styles.timeControl}>
          <Text style={styles.timeValue}>{startTime}</Text>
          <View style={styles.arrowGroup}>
          
            <TouchableOpacity
              onPress={() => adjustTime("start", "up", "available")}
              style={styles.arrowButton}
            >
              <Text style={styles.arrowButton}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => adjustTime("start", "down", "available")}
              style={styles.arrowButton}
            >
              <Text style={styles.arrowButton}>▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.periodButton,
              { backgroundColor: startPeriod === "PM" ? "#ffeaa7" : "#fff" },
            ]}
            onPress={() =>
              setStartPeriod((prev) => (prev === "AM" ? "PM" : "AM"))
            }
          >
            <Text>{startPeriod}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* End Time */}
      <View style={styles.timeBox}>
        <Text style={styles.label}>End Time:</Text>
        <View style={styles.timeControl}>
          <Text style={styles.timeValue}>{endTime}</Text>
          <View style={styles.arrowGroup}>
            <TouchableOpacity
              onPress={() => adjustTime("end", "up", "available")}
              style={styles.arrowButton}
            >
              <Text style={styles.arrowButton}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => adjustTime("end", "down", "available")}
              style={styles.arrowButton}
            >
               <Text style={styles.arrowButton}>▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.periodButton,
              { backgroundColor: endPeriod === "PM" ? "#ffeaa7" : "#fff" },
            ]}
            onPress={() =>
              setEndPeriod((prev) => (prev === "AM" ? "PM" : "AM"))
            }
          >
            <Text>{endPeriod}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>

      {/* Duration Picker */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.label}>Duration</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={duration}
            onValueChange={(val) => setDuration(val)}
            style={styles.picker}
          >
            {durations.map((d) => (
              <Picker.Item key={d} label={d} value={d} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={generateTimeSlots}
        >
          <Text style={styles.addButtonText}>Add Slots</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSlots}>
          <Text style={styles.deleteButtonText}>Delete All</Text>
        </TouchableOpacity>
      </View>
       </View>

      {/* Generated Time Slots */}
      <Text style={styles.generatedLabel}>Generated Time Slots</Text>
    <View style={styles.slotGrid}>
 {availableSlots.length === 0 ? (
  <Text style={styles.noSlotsText}>No available slots for this date</Text>
) : (
  <View style={styles.slotGrid}>
    {availableSlots.map((slot, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.slotBubble,
          selectedSlots.includes(slot.time) && styles.selectedSlotBubble,
        ]}
        onPress={() => toggleSlotSelection(slot.time)}
        onLongPress={() => {
          setSelectedSlots([slot.time]); // allow single long press for quick delete
          setShowDeleteConfirm(true);
        }}
      >
        <Text>{slot.time}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}

</View>

{showDeleteConfirm && (
  <Modal
    transparent
    animationType="fade"
    visible={showDeleteConfirm}
    onRequestClose={() => setShowDeleteConfirm(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.confirmModal}>
        <Text style={styles.modalText}>
          Are you sure you want to delete the selected slots?
        </Text>
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


      {/* Unavailable Slots Placeholder */}
      <Text style={styles.generatedLabel}>Select Unavailable Slots</Text>

 <View style={styles.timecontainer}>

     
      <View style={styles.timeRow}>
      {/* Start Time */}
      <View style={styles.timeBox}>
        <Text style={styles.label}>Start Time:</Text>
        <View style={styles.timeControl}>
          <Text style={styles.timeValue}>{unavailableStartTime}</Text>
          <View style={styles.arrowGroup}>
          
            <TouchableOpacity
              onPress={() => adjustTime("start", "up", "unavailable")}
              style={styles.arrowButton}
            >
              <Text style={styles.arrowButton}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => adjustTime("start", "down", "unavailable")}
              style={styles.arrowButton}
            >
              <Text style={styles.arrowButton}>▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.periodButton,
              { backgroundColor: unavailableStartPeriod === "PM" ? "#ffeaa7" : "#fff" },
            ]}
            onPress={() =>
              setUnavailableStartPeriod((prev) => (prev === "AM" ? "PM" : "AM"))
            }
          >
            <Text>{unavailableStartPeriod}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* End Time */}
      <View style={styles.timeBox}>
        <Text style={styles.label}>End Time:</Text>
        <View style={styles.timeControl}>
          <Text style={styles.timeValue}>{unavailableEndTime}</Text>
          <View style={styles.arrowGroup}>
            <TouchableOpacity
              onPress={() => adjustTime("end", "up", "unavailable")}
              style={styles.arrowButton}
            >
              <Text style={styles.arrowButton}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => adjustTime("end", "down", "unavailable")}
              style={styles.arrowButton}
            >
               <Text style={styles.arrowButton}>▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.periodButton,
              { backgroundColor: unavailableEndPeriod === "PM" ? "#ffeaa7" : "#fff" },
            ]}
            onPress={() =>
              setUnavailableEndPeriod((prev) => (prev === "AM" ? "PM" : "AM"))
            }
          >
            <Text>{unavailableEndPeriod}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>

      {/* Duration Picker */}
      {/* <View style={styles.dropdownContainer}>
        <Text style={styles.label}>Duration</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={duration}
            onValueChange={(val) => setDuration(val)}
            style={styles.picker}
          >
            {durations.map((d) => (
              <Picker.Item key={d} label={d} value={d} />
            ))}
          </Picker>
        </View>
      </View> */}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={generateUnavailableTimeSlots}
        >
          <Text style={styles.addButtonText}>Add Unavailable Slots</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSlots}>
          <Text style={styles.deleteButtonText}>Delete All</Text>
        </TouchableOpacity> */}
      </View>
       </View>
      <Text style={styles.generatedLabel}>Generated Unavailable Time Slots</Text>

          <View style={styles.slotGrid}>
 {unAvailableSlots.length === 0 ? (
  <Text style={styles.noSlotsText}>No available slots for this date</Text>
) : (
  <View style={styles.slotGrid}>
    {unAvailableSlots.map((slot, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.slotBubbleUnavailable,
          selectedSlots.includes(slot.time) && styles.selectedSlotBubble,
          
        ]}
        onPress={() => toggleSlotSelection(slot.time)}
        onLongPress={() => {
          setSelectedSlots([slot.time]); // allow single long press for quick delete
          setShowDeleteConfirm(true);
        }}
      >
        <Text>{slot.time}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}

</View>
      
    </ScrollView>
  );
};

export default AvailabilityScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFFFFA',
    padding: 16,
    // paddingBottom:200,
   
  },
  noSlotsText: {
  textAlign: "center",
  marginTop: 10,
  fontSize: 16,
  color: "red",
},

  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
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
    gap: 8
  },
  weekdayButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  weekdayButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  weekdayText: {
    color: '#000',
    fontWeight: '600',
  },
  weekdayTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  timeBox: {
    width: '48%',
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
  },
  slotGrid: {
    flexDirection: 'row',
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
  slotBubbleUnavailable:{
    borderColor: "#ff4d4f",
    borderWidth:1,
    backgroundColor: "#FEE2E2",
    color: "#ff4d4f",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
  },
  primaryButton: {
  backgroundColor: '#007bff', // Primary blue
},

defaultButton: {
  backgroundColor: '#f0f0f0', // Light grey
},
timecontainer:{
  backgroundColor: '#fff',
  padding:5,
  borderRadius:5,
  marginBottom:20
},



// timeRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     gap: 20,
//     padding: 10,
//   },
//   timeBox: {
//     flex: 1,
//   },
//   label: {
//     fontWeight: "bold",
//     marginBottom: 6,
//   },
  timeControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "bold",
    minWidth: 30,
    textAlign: "center",
  },
  arrowGroup: {
    marginLeft: 8,
    justifyContent: "center",
  },
  arrowButton: {
    width: 30,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 2,
  },
  periodButton: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    minWidth: 35,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
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

});


