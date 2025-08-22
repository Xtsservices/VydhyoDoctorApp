import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';

const AdviceScreen = () => {
  const navigation = useNavigation<any>();
   const [showDatePicker, setShowDatePicker] = useState(false);
  const route = useRoute<any>();
  const { patientDetails, formData: initialFormData } = route.params;
  const [formData, setFormData] = useState({
    ...initialFormData,
    examinationFindings: initialFormData.advice.advice || '',
    followUpDate: initialFormData.advice.followUpDate || '',
  });

  const handleChange = (field: string, value: string) => {
     setFormData((prev) => ({
      ...prev,
      advice: {
        ...prev.advice,
        [field]: value,
      },
    }));
    // setFormData((prev) => ({
    //   ...prev,
    //   [field]: value,
    // }));
  };
   const onChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = moment(selectedDate).format('MM/DD/YYYY');
      handleChange('followUpDate', formatted);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Advice & Follow-Up</Text>
        <Text style={styles.stepText}>Step 5 of 5</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚕️</Text>
        </View>
        <Text style={styles.cardTitle}>Advice</Text>
        <Text style={styles.cardSubtitle}>
          Clinical examination findings and observations
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="Enter findings from clinical examination..."
          multiline
          value={formData.advice.advice}
          onChangeText={(text) => handleChange('advice', text)}
          placeholderTextColor={"#9CA3AF"}
        />
      </View>

      <View style={styles.cardGreen}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📅</Text>
      </View>

      <Text style={styles.cardTitle}>Follow-Ups</Text>

      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <TextInput
          style={styles.input}
          placeholder="mm/dd/yyyy"
          value={formData.advice.followUpDate}
          editable={false}
          pointerEvents="none"
          placeholderTextColor={"#9CA3AF"}
        />
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()} // disable past dates
          onChange={onChange}
        />
      )}
    </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton}  onPress={() => navigation.navigate('PrescriptionPreview', {
     patientDetails,
     formData
 
  })}>
          <Text style={styles.nextText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AdviceScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f6f6f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  stepText: {
    fontSize: 14,
    color: '#007bff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardGreen: {
    backgroundColor: '#e6ffe6',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    color: '#fff',
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#0A2342',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelText: {
    color: '#000',
    fontWeight: '500',
  },
  nextText: {
    color: '#fff',
    fontWeight: '600',
  },
});


