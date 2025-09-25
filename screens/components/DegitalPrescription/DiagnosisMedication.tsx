import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const PrescriptionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientDetails, formData: initialFormData } = route.params;
  const currentUser = useSelector((state: any) => state.currentUser);
  const doctorId = currentUser.role === 'doctor' ? currentUser.userId : currentUser.createdBy;

  const [formData, setFormData] = useState(initialFormData || { diagnosis: { selectedTests: [], medications: [] } });
  const [testInput, setTestInput] = useState('');
  const [testList, setTestList] = useState<any[]>([]);
  const [testOptions, setTestOptions] = useState<any[]>([]);
  const [filteredTests, setFilteredTests] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>(formData?.diagnosis?.medications || []);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medInventory, setMedInventory] = useState<any[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<any[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'test' | 'medicine' | null>(null);

  const frequencyOptions = ['1-0-0', '1-0-1', '1-1-1', '0-0-1', '0-1-0', '1-1-0', '0-1-1', 'SOS'];
  const timingOptions = ['Before Breakfast', 'After Breakfast', 'Before Lunch', 'After Lunch', 'Before Dinner', 'After Dinner', 'Bedtime'];
  const medicineTypeOptions = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops'];
  const manualQuantityTypes = ['Syrup', 'Cream', 'Drops'];

  const fetchInventory = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('pharmacy/getAllMedicinesByDoctorID', storedToken);
      const medicines = response?.data?.data || [];
      const sortedMedicines = [...medicines].sort((a, b) =>
        a.medName.localeCompare(b.medName)
      );
      setMedInventory(sortedMedicines);
      setMedicineOptions(
        sortedMedicines.map((med) => ({
          value: med.medName,
          label: med.medName,
          id: med._id,
        }))
      );
    } catch (error) {
      // keep original behavior (silent fail)
    }
  };

  const fetchTests = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`lab/getTestsByDoctorId/${doctorId}`, storedToken);
      const tests = response?.data?.data?.tests || [];
      const sorted = [...tests].sort((a, b) => a.testName.localeCompare(b.testName));
      setTestList(sorted);
      setTestOptions(sorted.map((test) => ({ value: test.testName, label: test.testName })));
    } catch (error) {
      // silent
    }
  };

  useEffect(() => {
    fetchTests();
    fetchInventory();
  }, [doctorId]);

  useEffect(() => {
    const matches = testOptions
      .filter((t) => t.label.toLowerCase().includes(testInput.toLowerCase()))
      .map((t) => t.label);
    setFilteredTests(matches);
  }, [testInput, testOptions]);

  useEffect(() => {
    if (medications.length > 0) {
      const lastMed = medications[medications.length - 1];
      const matches = medicineOptions
        .filter((m) => m.label.toLowerCase().includes((lastMed.name || '').toLowerCase()))
        .map((m) => m.label);
      setFilteredMedicines(matches);
    } else {
      setFilteredMedicines([]);
    }
  }, [medications, medicineOptions]);

  const calculateQuantity = (frequency: string | null, duration: number | null, type: string | null) => {
    if (manualQuantityTypes.includes(type || '')) {
      return 0; // Will be entered manually
    }
    const freqCount = frequency === 'SOS' ? 1 : (frequency?.split('-').filter((x) => x === '1').length || 0);
    return duration ? freqCount * duration : 0;
  };

  const handleAddTest = (testName: string) => {
    if (!testName) return Toast.show({ type: 'error', text1: 'Please enter a valid test name' });
    const exists = (formData?.diagnosis?.selectedTests || []).some(
      (item: any) => item.testName.toLowerCase().trim() === testName.toLowerCase().trim()
    );
    if (!exists) {
      setFormData((prev: any) => ({
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
    setActiveDropdown(null);
  };

  const handleRemoveTest = (index: number) => {
    const updatedTests = [...(formData?.diagnosis?.selectedTests || [])];
    updatedTests.splice(index, 1);
    setFormData((prev: any) => ({
      ...prev,
      diagnosis: {
        ...prev.diagnosis,
        selectedTests: updatedTests,
      },
    }));
    Toast.show({ type: 'success', text1: 'Test removed' });
  };

  const handleAddMedicine = () => {
    if (medications.length > 0 && !validateMedication(medications[medications.length - 1])) return;
    const newMedication = {
      id: Date.now(),
      name: '',
      type: null,
      dosage: '',
      duration: null,
      timing: [],
      frequency: null,
      quantity: 0,
      manualQuantity: false,
      notes: '',
    };
    const updated = [...medications, newMedication];
    setMedications(updated);
    setFormData((prev: any) => ({ ...prev, diagnosis: { ...prev.diagnosis, medications: updated } }));
    setShowMedicationForm(true);
    Toast.show({ type: 'success', text1: 'Medicine form added' });
  };

  const handleMedicineChange = (index: number, field: string, value: any) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'type') {
      updated[index].manualQuantity = manualQuantityTypes.includes(value);
      if (updated[index].manualQuantity) {
        updated[index].quantity = 0;
      } else {
        const { frequency, duration } = updated[index];
        updated[index].quantity = calculateQuantity(frequency, duration, value);
      }
    }

    if ((field === 'frequency' || field === 'duration') && !updated[index].manualQuantity) {
      const { frequency, duration, type } = updated[index];
      updated[index].quantity = calculateQuantity(frequency, duration, type);
    }

    const transformed = updated.map((med) => ({
      medInventoryId: medInventory.find(m => m.medName === med.name)?._id || null,
      medName: med.name,
      quantity: med.quantity,
      medicineType: med.type,
      dosage: med.dosage,
      duration: med.duration,
      frequency: med.frequency,
      timings: med.timing || [],
    }));

    setMedications(updated);
    setFormData((prev: any) => ({
      ...prev,
      diagnosis: {
        ...prev.diagnosis,
        medications: transformed,
      },
    }));

    if (field === 'name') {
      const matches = medicineOptions
        .filter((m) => m.label.toLowerCase().includes(value.toLowerCase()))
        .map((m) => m.label);
      setFilteredMedicines(matches);
    }
  };

  const updateMedicationFrequency = (index: number, value: string) => {
    const updatedMedications = [...medications];
    const med = updatedMedications[index];
    med.frequency = value;
    med.timing = value === 'SOS' ? [] : med.timing.slice(0, value.split('-').filter((x) => x === '1').length);

    if (!med.manualQuantity) {
      med.quantity = calculateQuantity(med.frequency, med.duration, med.type);
    }

    setMedications(updatedMedications);
    setFormData((prev: any) => ({ ...prev, diagnosis: { ...prev.diagnosis, medications: updatedMedications } }));
  };

  const validateDosage = (dosage: string) => (/^\d+\s*(mg|ml|g|tablet|tab|capsule|cap|spoon|drop)s?$/i).test(dosage);

  const validateMedication = (med: any) => {
    if (!med.name || !med.name.trim()) { Alert.alert('Error', 'Enter a valid medicine name'); return false; }
    if (!med.type) { Alert.alert('Error', 'Select a medicine type'); return false; }
    if (!med.dosage || !validateDosage(med.dosage)) { Alert.alert("Error", 'Enter valid dosage Ex:100mg'); return false; }
    if (med.duration === null || med.duration <= 0) { Alert.alert('Error', 'Duration must be > 0'); return false; }
    if (!med.frequency) { Alert.alert('Error', 'Select a frequency'); return false; }
    const required = med.frequency === 'SOS' ? 0 : med.frequency.split('-').filter((x) => x === '1').length;
    if ((med.timing?.length || 0) !== required) { Alert.alert('Error', `Select ${required} timing(s)`); return false; }
    if ((!med.manualQuantity && (!med.quantity || med.quantity <= 0)) || (med.manualQuantity && (!med.quantity || med.quantity.length === 0))) {
      Alert.alert('Error', 'Quantity must be greater than 0'); return false;
    }
    return true;
  };

  const handleRemoveMedicine = (index: number) => {
    const updated = medications.filter((_, i) => i !== index);
    setMedications(updated);
    setFormData((prev: any) => ({ ...prev, diagnosis: { ...prev.diagnosis, medications: updated } }));
    if (updated.length === 0) setShowMedicationForm(false);
    Toast.show({ type: 'success', text1: 'Medicine removed' });
    setFilteredMedicines([]);
    setActiveDropdown(null);
  };

  const handleNext = () => {
    if (medications.length > 0 && !validateMedication(medications[medications.length - 1])) {
      return;
    }
    navigation.navigate('AdviceFollowup', { patientDetails, formData });
  };

  // Adjust this offset if your header/navigation bar height differs
  const keyboardVerticalOffset = Platform.select({ ios: 80, android: 80 }) as number;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.container, { flexGrow: 1, paddingBottom: 140 }]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧪 Diagnostic Tests</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter test name"
                value={testInput}
                onChangeText={setTestInput}
                onFocus={() => setActiveDropdown('test')}
                placeholderTextColor="#9CA3AF"
              />
              {activeDropdown === 'test' && testOptions.length > 0 && (
                <ScrollView style={styles.dropdown} nestedScrollEnabled={true}>
                  {testOptions.map((test, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        handleAddTest(test.value);
                        setActiveDropdown(null);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={{ color: 'black' }}>{test.value}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.addButton} onPress={() => handleAddTest(testInput)}>
                <Text style={styles.addButtonText}>+ Add Test</Text>
              </TouchableOpacity>

              {(formData?.diagnosis?.selectedTests || []).map((test: any, index: number) => (
                <View key={index} style={styles.testItemContainer}>
                  <Text style={styles.testTag}>{test.testName}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveTest(index)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🩺 Diagnosis</Text>
              <TextInput
                style={styles.textArea}
                placeholder="e.g. Hypertension, Diabetes"
                multiline
                value={formData?.diagnosis?.diagnosisList || ''}
                onChangeText={(text) => setFormData((prev: any) => ({
                  ...prev,
                  diagnosis: { ...prev.diagnosis, diagnosisList: text.toUpperCase() },
                }))}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.medHeader}>
                <Text style={styles.sectionTitle}>💊 Prescribed Medications</Text>
              </View>

              {(formData?.diagnosis?.medications || []).map((med: any, index: number) => (
                <View key={index} style={styles.medicationItemContainer}>
                  <View style={styles.medicationContent}>
                    <Text style={styles.medicationText}>Name: {med.medName}</Text>
                    <Text style={styles.medicationText}>Duration: {med.duration} days</Text>
                    <Text style={styles.medicationText}>Dosage: {med.dosage}</Text>
                    <Text style={styles.medicationText}>Frequency: {med.frequency}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const updatedMeds = [...medications];
                      updatedMeds.splice(index, 1);
                      setMedications(updatedMeds);

                      const transformed = updatedMeds.map((m) => ({
                        medInventoryId: medInventory.find(mi => mi.medName === m.name)?._id || null,
                        medName: m.name,
                        quantity: m.quantity,
                        medicineType: m.type,
                        dosage: m.dosage,
                        duration: m.duration,
                        frequency: m.frequency,
                        timings: m.timing || [],
                      }));

                      setFormData((prev: any) => ({
                        ...prev,
                        diagnosis: {
                          ...prev.diagnosis,
                          medications: transformed,
                        },
                      }));

                      Toast.show({ type: 'success', text1: 'Medicine removed' });
                    }}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {showMedicationForm && medications.map((med, index) => (
                <View key={med.id} style={styles.medBlock}>
                  <View style={styles.rowSpaceBetween}>
                    <Text style={styles.medLabel}>Medicine #{index + 1}</Text>
                    <TouchableOpacity onPress={() => handleRemoveMedicine(index)}>
                      <Text style={{ color: 'red' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    placeholder="Medicine Name"
                    style={styles.input}
                    value={med.name}
                    onChangeText={(text) => handleMedicineChange(index, 'name', text)}
                    onFocus={() => setActiveDropdown('medicine')}
                    placeholderTextColor="#9CA3AF"
                  />
                  {activeDropdown === 'medicine' && filteredMedicines.length > 0 && medications.length - 1 === index && (
                    <ScrollView style={styles.dropdown} nestedScrollEnabled={true}>
                      {filteredMedicines.map((medicine, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            handleMedicineChange(index, 'name', medicine);
                            setActiveDropdown(null);
                          }}
                          style={styles.dropdownItem}
                        >
                          <Text style={{ color: 'black' }}>{medicine}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={med.type}
                      onValueChange={(value) => handleMedicineChange(index, 'type', value)}
                      style={styles.pickerInner}
                      mode="dropdown"
                    >
                      <Picker.Item label="Select Type" value={null} color="#9CA3AF" />
                      {medicineTypeOptions.map((option) => (
                        <Picker.Item key={option} label={option} value={option} />
                      ))}
                    </Picker>
                  </View>

                  <TextInput
                    placeholder="Dosage (e.g. 100mg, 5ml)"
                    style={styles.input}
                    value={med.dosage}
                    onChangeText={(text) => handleMedicineChange(index, 'dosage', text)}
                    placeholderTextColor="#9CA3AF"
                  />
                  <TextInput
                    placeholder="Duration (days)"
                    style={styles.input}
                    value={med.duration?.toString() || ''}
                    onChangeText={(text) => handleMedicineChange(index, 'duration', parseInt(text) || null)}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={med.frequency}
                      onValueChange={(value) => updateMedicationFrequency(index, value)}
                      style={styles.pickerInner}
                      mode="dropdown"
                    >
                      <Picker.Item label="Select Frequency" value={null} color="#9CA3AF" />
                      {frequencyOptions.map((option) => (
                        <Picker.Item key={option} label={option} value={option} />
                      ))}
                    </Picker>
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontWeight: '600', marginBottom: 4, color: 'black' }}>Timing:</Text>
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

                  {med.manualQuantity ? (
                    <TextInput
                      placeholder="Quantity (e.g. 1 bottle, 1 tube)"
                      style={styles.input}
                      value={med.quantity?.toString() || ''}
                      onChangeText={(text) => handleMedicineChange(index, 'quantity', text)}
                      keyboardType="default"
                    />
                  ) : (
                    <TextInput
                      placeholder="Quantity"
                      style={[styles.input, { backgroundColor: '#eaeaea' }]}
                      value={med.quantity?.toString() || ''}
                      editable={false}
                      placeholderTextColor="#9CA3AF"
                    />
                  )}

                  <TextInput
                    placeholder="Notes"
                    style={styles.textArea}
                    multiline
                    value={med.notes || ''}
                    onChangeText={(text) => handleMedicineChange(index, 'notes', text)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              ))}

              <TouchableOpacity onPress={handleAddMedicine} style={[styles.blueButton, { marginTop: 16 }]}>
                <Text style={styles.blueButtonText}>+ Add Medicine</Text>
              </TouchableOpacity>
            </View>

            {/* spacer so content can push up above fixed buttons */}
            <View style={{ flex: 1 }} />
          </ScrollView>

          {/* Fixed button bar */}
          <View style={[styles.buttonRow, { paddingBottom: Platform.OS === 'ios' ? 20 : 12 }]}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { Keyboard.dismiss(); navigation.goBack(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default PrescriptionScreen;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f6f6f6' },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontWeight: '600', fontSize: 16, marginBottom: 8, color: '#0A2342' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10, color: 'black', backgroundColor: '#fff' },
  picker: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10, backgroundColor: '#fff', color: 'gray' },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', backgroundColor: '#fff', marginBottom: 10, color: 'black' },
  addButton: { backgroundColor: '#007bff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  testTag: { backgroundColor: '#e2e2e2', padding: 6, borderRadius: 6, marginTop: 4, color: 'black' },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 6, maxHeight: 150, overflow: 'scroll' },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blueButton: { backgroundColor: '#007bff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  blueButtonText: { color: '#fff', fontWeight: '600' },
  medBlock: { marginTop: 12, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8 },
  rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  buttonRow: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#f6f6f6', borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  cancelButton: { backgroundColor: '#ccc', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  nextButton: { backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  cancelText: { color: '#000', fontWeight: '500' },
  nextText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, flex: 1 },
  medLabel: { color: '#0A2342' },
  testItemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  medicationItemContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8 },
  medicationContent: { flex: 1, marginRight: 10 },
  medicationText: { color: 'black', marginBottom: 4, fontSize: 14 },
  deleteButton: { backgroundColor: '#ff4d4d', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginLeft: 8, flexShrink: 0 },
  pickerWrapper: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', marginBottom: 10, height: 48, justifyContent: 'center', paddingHorizontal: 6, overflow: 'hidden' },
  pickerInner: { alignSelf: 'stretch', height: 48, color: 'gray', margin: 0, padding: 0 },
  deleteText: { color: 'white', fontWeight: 'bold' },
});
