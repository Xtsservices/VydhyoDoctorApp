// Updated PrescriptionScreen with timing-frequency match, multi-timing, and auto quantity

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';

const PrescriptionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientDetails, formData: initialFormData } = route.params;
  const currentUser = useSelector((state: any) => state.currentUser);
  const doctorId = currentUser.role === 'doctor' ? currentUser.userId : currentUser.createdBy;

  const [formData, setFormData] = useState(initialFormData);
  const [testInput, setTestInput] = useState('');
  const [testList, setTestList] = useState<any[]>([]);
  const [testOptions, setTestOptions] = useState<any[]>([]);
  const [filteredTests, setFilteredTests] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [showMedicationForm, setShowMedicationForm] = useState(false);

  const frequencyOptions = ['1-0-0','1-0-1','1-1-1','0-0-1','0-1-0','1-1-0','0-1-1','SOS'];
  const timingOptions = ['Before Breakfast','After Breakfast','Before Lunch','After Lunch','Before Dinner','After Dinner','Bedtime'];
  const medicineTypeOptions = ['Tablet','Capsule','Syrup','Injection','Cream','Drops'];

  useEffect(() => { fetchTests(); }, [doctorId]);

  const fetchTests = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`lab/getTestsByDoctorId/${doctorId}`, storedToken);
      const tests = response.data.data || [];
      const sorted = [...tests].sort((a, b) => a.testName.localeCompare(b.testName));
      setTestList(sorted);
      setTestOptions(sorted.map((test) => ({ value: test.testName, label: test.testName })));
    } catch (error) { console.error('Error fetching tests:', error); }
  };

  const calculateQuantity = (frequency: string, duration: number | null) => {
    const freqCount = frequency === 'SOS' ? 1 : frequency?.split('-').filter((x) => x === '1').length || 0;
    return duration ? freqCount * duration : 0;
  };

  const handleAddTest = (testName: string) => {
    if (!testName) return Toast.show({ type: 'error', text1: 'Please enter a valid test name' });
    const exists = formData?.diagnosis?.selectedTests?.some((item) => item.testName.toLowerCase().trim() === testName.toLowerCase().trim());
    if (!exists) {
      setFormData((prev) => ({
        ...prev,
        diagnosis: {
          ...prev.diagnosis,
          selectedTests: [...(prev.diagnosis?.selectedTests || []), { testName: testName.trim() }],
        },
      }));
      Toast.show({ type: 'success', text1: 'Test added successfully' });
    } else {
      Toast.show({ type: 'error', text1: 'This test is already added' });
    }
    setTestInput('');
    setFilteredTests([]);
  };

  const handleAddMedicine = () => {
    if (medications.length > 0 && !validateMedication(medications[medications.length - 1])) return;
    const newMedication = { id: Date.now(), name: '', type: null, dosage: '', duration: null, timing: [], frequency: null, quantity: 0 };
    const updated = [...medications, newMedication];
    setMedications(updated);
    setFormData((prev) => ({ ...prev, prescribedMedications: updated }));
    setShowMedicationForm(true);
    Toast.show({ type: 'success', text1: 'Medicine form added' });
  };

     const handleMedicineChange = (index: number, field: string, value: any) => {
    const updated = [...medications];
    updated[index][field] = value;
    const { frequency, duration, name, type, dosage, timing } = updated[index];

    if (frequency && duration) {
      updated[index].quantity = calculateQuantity(frequency, duration);
    }

    const transformed = updated.map((med) => ({
      medInventoryId: med.medInventoryId || null,
      medName: med.name,
      quantity: med.quantity,
      medicineType: med.type,
      dosage: med.dosage,
      duration: med.duration,
      frequency: med.frequency,
      timings: med.timing || [],
    }));

    setMedications(updated);
    setFormData((prev) => ({
      ...prev,
      diagnosis: {
        ...prev.diagnosis,
        medications: transformed
      }
    }));
  };

  const updateMedicationFrequency = (index: number, value: string) => {
    const updatedMedications = [...medications];
    const med = updatedMedications[index];
    med.frequency = value;
    med.timing = value === 'SOS' ? [] : med.timing.slice(0, value.split('-').filter((x) => x === '1').length);
    med.quantity = calculateQuantity(med.frequency, med.duration);
    setMedications(updatedMedications);
    setFormData((prev: any) => ({ ...prev, prescribedMedications: updatedMedications }));
  };

  const validateDosage = (dosage: string) => (/^\d+\s*(mg|ml|g|tablet|tab|capsule|cap|spoon|drop)s?$/i).test(dosage);

  const validateMedication = (med: any) => {
    if (!med.name.trim()) return Toast.show({ type: 'error', text1: 'Enter a valid medicine name' }), false;
    if (!med.type) return Toast.show({ type: 'error', text1: 'Select a medicine type' }), false;
    if (!med.dosage.trim() || !validateDosage(med.dosage)) return Toast.show({ type: 'error', text1: 'Enter valid dosage' }), false;
    if (med.duration === null || med.duration <= 0) return Toast.show({ type: 'error', text1: 'Duration must be > 0' }), false;
    if (!med.frequency) return Toast.show({ type: 'error', text1: 'Select a frequency' }), false;
    const required = med.frequency === 'SOS' ? 0 : med.frequency.split('-').filter((x) => x === '1').length;
    if (med.timing.length !== required) return Toast.show({ type: 'error', text1: `Select ${required} timing(s)` }), false;
    return true;
  };

  const handleRemoveMedicine = (index: number) => {
    const updated = medications.filter((_, i) => i !== index);
    setMedications(updated);
    setFormData((prev: any) => ({ ...prev, prescribedMedications: updated }));
    if (updated.length === 0) setShowMedicationForm(false);
    Toast.show({ type: 'success', text1: 'Medicine removed' });
  };

  const handleNext = () => {
    if (medications.length > 0 && !validateMedication(medications[medications.length - 1])) return;
    navigation.navigate('AdviceFollowup', { patientDetails, formData });
  };

  useEffect(() => {
    const matches = testOptions.filter((t) => t.label.toLowerCase().includes(testInput.toLowerCase())).map((t) => t.label);
    setFilteredTests(matches);
  }, [testInput]);

  console.log(formData, "complete form data after adding medicine")

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Diagnostic Tests</Text>
        <TextInput style={styles.input} placeholder="Enter test name" value={testInput} onChangeText={setTestInput} />
        {filteredTests.length > 0 && (
          <View style={styles.dropdown}>
            {filteredTests.map((test, idx) => (
              <TouchableOpacity key={idx} onPress={() => handleAddTest(test)} style={styles.dropdownItem}>
                <Text>{test}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.addButton} onPress={() => handleAddTest(testInput)}>
          <Text style={styles.addButtonText}>+ Add Test</Text>
        </TouchableOpacity>
        {formData?.diagnosis?.selectedTests?.map((test: any, index: number) => (
          <Text key={index} style={styles.testTag}>{test.testName}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🩺 Diagnosis</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Hypertension, Diabetes"
          multiline
          value={formData?.diagnosis?.diagnosisList || ''}
          onChangeText={(text) => setFormData((prev) => ({
            ...prev,
            diagnosis: { ...prev.diagnosis, diagnosisList: text.toUpperCase() },
          }))}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.medHeader}>
          <Text style={styles.sectionTitle}>💊 Prescribed Medications</Text>
          <TouchableOpacity onPress={handleAddMedicine} style={styles.blueButton}>
            <Text style={styles.blueButtonText}>+ Add Medicine</Text>
          </TouchableOpacity>
        </View>

        {showMedicationForm && medications.map((med, index) => (
          <View key={med.id} style={styles.medBlock}>
            <View style={styles.rowSpaceBetween}>
              <Text>Medicine #{index + 1}</Text>
              <TouchableOpacity onPress={() => handleRemoveMedicine(index)}>
                <Text style={{ color: 'red' }}>🗑️</Text>
              </TouchableOpacity>
            </View>
            <TextInput placeholder="Medicine Name" style={styles.input} value={med.name} onChangeText={(text) => handleMedicineChange(index, 'name', text)} />
            <Picker selectedValue={med.type} onValueChange={(value) => handleMedicineChange(index, 'type', value)} style={styles.picker}>
              <Picker.Item label="Select Type" value={null} />
              {medicineTypeOptions.map((option) => <Picker.Item key={option} label={option} value={option} />)}
            </Picker>
            <TextInput placeholder="Dosage (e.g. 100mg, 5ml)" style={styles.input} value={med.dosage} onChangeText={(text) => handleMedicineChange(index, 'dosage', text)} />
            <TextInput placeholder="Duration (days)" style={styles.input} value={med.duration?.toString() || ''} onChangeText={(text) => handleMedicineChange(index, 'duration', parseInt(text) || null)} keyboardType="numeric" />
            <Picker selectedValue={med.frequency} onValueChange={(value) => updateMedicationFrequency(index, value)} style={styles.picker}>
              <Picker.Item label="Select Frequency" value={null} />
              {frequencyOptions.map((option) => <Picker.Item key={option} label={option} value={option} />)}
            </Picker>

            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4 }}>Timing:</Text>
              {timingOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    if (med.frequency === 'SOS') return;
                    const currentTimings = med.timing || [];
                    const alreadySelected = currentTimings.includes(option);
                    let updatedTimings = [];
                    const maxTimings = med.frequency?.split('-').filter((x) => x === '1').length || 0;
                    if (alreadySelected) {
                      updatedTimings = currentTimings.filter((t) => t !== option);
                    } else if (currentTimings.length < maxTimings) {
                      updatedTimings = [...currentTimings, option];
                    } else {
                      Toast.show({ type: 'error', text1: `You can select max ${maxTimings} timing(s)` });
                      return;
                    }
                    handleMedicineChange(index, 'timing', updatedTimings);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 4,
                    backgroundColor: med.timing?.includes(option) ? '#007bff' : '#f0f0f0',
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: med.timing?.includes(option) ? '#fff' : '#000' }}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Quantity"
              style={[styles.input, { backgroundColor: '#eaeaea' }]}
              value={med.quantity?.toString() || ''}
              editable={false}
            />

            <TextInput
              placeholder="Notes"
              style={styles.textArea}
              multiline
              value={med.notes || ''}
              onChangeText={(text) => handleMedicineChange(index, 'notes', text)}
            />
          </View>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PrescriptionScreen;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f6f6f6' },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontWeight: '600', fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  picker: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10, backgroundColor: '#fff' },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', backgroundColor: '#fff', marginBottom: 10 },
  addButton: { backgroundColor: '#007bff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  testTag: { backgroundColor: '#e2e2e2', padding: 6, borderRadius: 6, marginTop: 4 },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 6 },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blueButton: { backgroundColor: '#007bff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  blueButtonText: { color: '#fff', fontWeight: '600' },
  medBlock: { marginTop: 12, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8 },
  rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 24 },
  cancelButton: { backgroundColor: '#ccc', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  nextButton: { backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  cancelText: { color: '#000', fontWeight: '500' },
  nextText: { color: '#fff', fontWeight: '600' },
});
