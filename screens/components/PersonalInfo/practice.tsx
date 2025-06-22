import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Address {
  id: number;
  address: string;
  startTime: string;
  endTime: string;
}

const PracticeScreen = () => {
  const navigation = useNavigation();
  const [affiliation, setAffiliation] = useState<string | null>(null);
  const [opdAddresses, setOpdAddresses] = useState<Address[]>([
    { id: 1, address: '', startTime: '', endTime: '' },
  ]);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null);

  const handleAddAddress = () => {
    setOpdAddresses([...opdAddresses, { id: opdAddresses.length + 1, address: '', startTime: '', endTime: '' }]);
  };

  const handleRemoveAddress = (id: number) => {
    setOpdAddresses(opdAddresses.filter((addr) => addr.id !== id));
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined, type: 'startTime' | 'endTime', index: number) => {
    const currentTime = selectedTime || new Date();
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    const updatedAddresses = [...opdAddresses];
    updatedAddresses[index][type] = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOpdAddresses(updatedAddresses);
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
    if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const handleNext = () => {
    if (!affiliation) {
      Alert.alert('Error', 'Please select a Clinic/Hospital Affiliation');
      return;
    }

    const hasInvalidAddress = opdAddresses.some(
      (addr) => !addr.address || !addr.startTime || !addr.endTime
    );
    if (hasInvalidAddress) {
      Alert.alert('Error', 'Please fill all OPD Address fields and times');
      return;
    }

    const hasInvalidTime = opdAddresses.some((addr) => {
      const startMinutes = parseTimeToMinutes(addr.startTime);
      const endMinutes = parseTimeToMinutes(addr.endTime);
      return startMinutes >= endMinutes || startMinutes === -1 || endMinutes === -1;
    });
    if (hasInvalidTime) {
      Alert.alert('Error', 'End time must be after Start time');
      return;
    }

    navigation.navigate('ConsultationPreferences' as never); // Replace with your next screen
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
     
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Icon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      <Text style={styles.title}>Step 3 - Practice</Text>
 <Text style={styles.label}>Clinic/Hospital Affiliation</Text>
      <View style={styles.searchContainer}>
        <Icon name="map-marker" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search or select.."
          placeholderTextColor="#999"
          value={affiliation || ''}
          onChangeText={(text) => setAffiliation(text)}
        />
      </View>

      <View style={styles.addressSection}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>OPD Address(es)</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddAddress}>
            <Text style={styles.addButtonText}>+ Add Location</Text>
          </TouchableOpacity>
        </View>

        {opdAddresses.map((addr, index) => (
          <View key={addr.id} style={styles.addressContainer}>
            <TextInput
              style={styles.input}
              placeholder="OPD Address"
              placeholderTextColor="#999"
              value={addr.address}
              onChangeText={(text) => {
                const updatedAddresses = [...opdAddresses];
                updatedAddresses[index].address = text;
                setOpdAddresses(updatedAddresses);
              }}
            />
            <View style={styles.timeContainer}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setSelectedAddressIndex(index);
                  setShowStartTimePicker(true);
                }}
              >
                <View style={styles.timeButtonContent}>
                  <Icon name="clock-outline" size={18} color="#333" style={styles.clockIcon} />
                  <Text style={styles.timeText}>Start Time: {addr.startTime || 'Select'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setSelectedAddressIndex(index);
                  setShowEndTimePicker(true);
                }}
              >
                <View style={styles.timeButtonContent}>
                  <Icon name="clock-outline" size={18} color="#333" style={styles.clockIcon} />
                  <Text style={styles.timeText}>End Time: {addr.endTime || 'Select'}</Text>
                </View>
              </TouchableOpacity>
            </View>
            {showStartTimePicker && selectedAddressIndex === index && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => handleTimeChange(event, selectedTime, 'startTime', index)}
              />
            )}
            {showEndTimePicker && selectedAddressIndex === index && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => handleTimeChange(event, selectedTime, 'endTime', index)}
              />
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveAddress(addr.id)}
              disabled={opdAddresses.length === 1}
            >
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e6ffe6', padding: 20 },
  contentContainer: { paddingBottom: 20 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: 'black', textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 5, color: '#000', fontWeight: '500' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  searchIcon: {
    padding: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    color: '#000',
  },
  addressSection: { marginTop: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addressContainer: { marginBottom: 15, position: 'relative', backgroundColor: '#fff', padding: 15, borderRadius: 15 },
  input: { height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, color: '#000', backgroundColor: '#fff' },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  timeButton: { height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, padding: 10, flex: 1, marginRight: 5, justifyContent: 'center' },
  removeButton: { position: 'absolute', top: 0, right: 0 },
  removeText: { color: '#ccc', fontSize: 18, padding: 5 },
  addButton: { marginVertical: 0 },
  addButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
  nextButton: { backgroundColor: '#00203f', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  nextButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  timeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    marginRight: 5,
  },
  timeText: {
    color: '#333333',
  },
});

export default PracticeScreen;