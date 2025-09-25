import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';

const AdviceScreen = () => {
  const navigation = useNavigation<any>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const route = useRoute<any>();
  const { patientDetails, formData: initialFormData } = route.params;
  const [formData, setFormData] = useState(initialFormData || { advice: {} });

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      advice: {
        ...prev.advice,
        [name]: value,
      },
    }));
  };

  const onChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Store in YYYY-MM-DD format for consistency
      const formatted = moment(selectedDate).format('YYYY-MM-DD');
      handleChange('followUpDate', formatted);
    }
  };

  // Adjust offset if you have a custom header; bump for larger headers
  const keyboardVerticalOffset = Platform.select({ ios: 80, android: 80 }) as number;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 140 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View>
              <View style={styles.header}>
                <Text style={styles.headerText}>Advice & Follow-Up</Text>
                <Text style={styles.stepText}>Step 5 of 5</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>ℹ️ General Notes</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Enter general notes..."
                  placeholderTextColor={'#9CA3AF'}
                  multiline
                  value={formData.advice?.medicationNotes || ''}
                  onChangeText={text => handleChange('medicationNotes', text)}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>💡 Advice</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Enter findings from clinical examination..."
                  multiline
                  value={formData.advice?.advice || ''}
                  onChangeText={text => handleChange('advice', text)}
                  placeholderTextColor={'#9CA3AF'}
                />
              </View>

              <Text style={styles.cardTitle}>Follow-Ups</Text>

              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <TextInput
                  style={styles.input}
                  placeholder="dd-mmm-yyyy"
                  value={
                    formData.advice?.followUpDate
                      ? moment(formData.advice.followUpDate).format('DD-MMM-YYYY')
                      : ''
                  }
                  editable={false}
                  pointerEvents="none"
                  placeholderTextColor={'#9CA3AF'}
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

            {/* spacer so content can push up above the fixed buttons */}
            <View style={{ flex: 1 }} />
          </ScrollView>

          {/* Fixed buttons at bottom */}
          <View style={[styles.buttonRow, { paddingBottom: Platform.OS === 'ios' ? 20 : 12 }]}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                Keyboard.dismiss();
                navigation.goBack();
              }}
            >
              <Text style={[styles.buttonText, { color: '#000' }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() =>
                navigation.navigate('PrescriptionPreview', {
                  patientDetails,
                  formData,
                })
              }
            >
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default AdviceScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    height: '100%',
  },
  scrollContent: {
    padding: 16,
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
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    color: 'black',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    color: 'black',
  },
  buttonRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
