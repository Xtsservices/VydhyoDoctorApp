import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';

const AvailabilityScreen = () => {
  const [selectedClinic, setSelectedClinic] = useState('Clinic Availability');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedDay, setSelectedDay] = useState<string>('Mon');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [duration, setDuration] = useState('15 mins');

  const [generatedSlots, setGeneratedSlots] = useState<string[]>([]);

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const durations = ['15 mins', '30 mins', '45 mins', '60 mins'];
  const times = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM',
  ];

  const generateTimeSlots = () => {
    setGeneratedSlots(times); // Replace with dynamic generation logic if needed
  };

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
            <Picker.Item label="Clinic Availability" value="Clinic Availability" />
            <Picker.Item label="Teleconsultation" value="Teleconsultation" />
          </Picker>
        </View>
      </View>

      {/* Date Picker */}
      <View style={styles.row}>
        <Text style={styles.label}>Select Available Slots</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{dayjs(selectedDate).format('DD/MM/YYYY')}</Text>
          <Icon name="calendar-today" size={20} color="#000" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Weekdays */}
      <View style={styles.weekdayContainer}>
        {weekdays.map((day) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.weekdayButton,
              selectedDay === day && styles.weekdayButtonSelected,
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

      {/* Time Inputs */}
      <View style={styles.timeRow}>
        <View style={styles.timeBox}>
          <Text style={styles.label}>Start Time</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={startTime}
              onValueChange={(val) => setStartTime(val)}
              style={styles.picker}
            >
              {times.map((time) => (
                <Picker.Item key={time} label={time} value={time} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.timeBox}>
          <Text style={styles.label}>End Time</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={endTime}
              onValueChange={(val) => setEndTime(val)}
              style={styles.picker}
            >
              {times.map((time) => (
                <Picker.Item key={time} label={time} value={time} />
              ))}
            </Picker>
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
        <TouchableOpacity style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete All</Text>
        </TouchableOpacity>
      </View>

      {/* Generated Time Slots */}
      <Text style={styles.generatedLabel}>Generated Time Slots</Text>
      <View style={styles.slotGrid}>
        {generatedSlots.map((slot, index) => (
          <View key={index} style={styles.slotBubble}>
            <Text>{slot}</Text>
          </View>
        ))}
      </View>

      {/* Unavailable Slots Placeholder */}
      <Text style={styles.generatedLabel}>Select Unavailable Slots</Text>
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
    marginBottom: 8,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  slotBubble: {
    backgroundColor: '#CFFAFE',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
  },
});
