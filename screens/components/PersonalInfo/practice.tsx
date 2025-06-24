import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Address {
  id: number;
  address: string;
  startTime: string;
  endTime: string;
}

const { width, height } = Dimensions.get('window');

const PracticeScreen = () => {
  const navigation = useNavigation<any>();
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
    if (period?.toLowerCase() === 'pm' && hours !== 12) hours += 12;
    if (period?.toLowerCase() === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const handleNext = () => {
    setTimeout(() => {
      
      navigation.navigate('ConsultationPreferences');
    }, 3000);
    
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
    // setTimeout(() => {
      
    //   navigation.navigate('ConsultationPreferences');
    // }, 3000);

  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice</Text>
      </View>

      {/* Form Content */}
      <ScrollView style={styles.formContainer}>
        <Text style={styles.label}>Clinic/Hospital Affiliation</Text>
        <View style={styles.searchContainer}>
          <Icon name="map-marker" size={width * 0.05} color="#00796B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or select..."
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
                    <Icon name="clock-outline" size={width * 0.045} color="#00796B" style={styles.clockIcon} />
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
                    <Icon name="clock-outline" size={width * 0.045} color="#00796B" style={styles.clockIcon} />
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

        {/* Spacer to ensure content is not hidden by the Next button */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00796B',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    padding: width * 0.02,
  },
  headerTitle: {
    flex: 1,
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginRight: width * 0.06,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.03,
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#333',
    marginBottom: height * 0.01,
    marginTop: height * 0.015,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    height: height * 0.06,
    marginBottom: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginHorizontal: width * 0.03,
  },
  searchInput: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#333',
    paddingHorizontal: width * 0.03,
  },
  addressSection: {
    marginTop: height * 0.02,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: height * 0.015,
  },
  addressContainer: {
    marginBottom: height * 0.02,
    backgroundColor: '#fff',
    padding: width * 0.04,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  input: {
    height: height * 0.06,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: width * 0.03,
    color: '#333',
    backgroundColor: '#fff',
    fontSize: width * 0.04,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: height * 0.01,
  },
  timeButton: {
    height: height * 0.06,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    flex: 1,
    marginRight: width * 0.02,
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.03,
  },
  clockIcon: {
    marginRight: width * 0.02,
  },
  timeText: {
    color: '#333',
    fontSize: width * 0.04,
  },
  removeButton: {
    position: 'absolute',
    top: height * 0.01,
    right: width * 0.02,
  },
  removeText: {
    color: '#D32F2F',
    fontSize: width * 0.05,
    fontWeight: 'bold',
  },
  addButton: {
    padding: width * 0.02,
  },
  addButtonText: {
    color: '#00796B',
    fontSize: width * 0.04,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#00796B',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: width * 0.05,
    marginBottom: height * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  spacer: {
    height: height * 0.1,
  },
});

export default PracticeScreen;