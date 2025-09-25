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
import { AuthFetch } from '../../auth/auth';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const PrescriptionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientDetails, formData: initialFormData } = route.params;
  const currentUser = useSelector((state: any) => state.currentUser);
  const doctorId = currentUser.role === 'doctor' ? currentUser.userId : currentUser.createdBy;

  // master form data (tests + diagnosis + meds)
  const [formData, setFormData] = useState(
    initialFormData || { diagnosis: { selectedTests: [], medications: [] } }
  );

  // tests state
  const [testInput, setTestInput] = useState('');
  const [testList, setTestList] = useState<any[]>([]);
  const [testOptions, setTestOptions] = useState<any[]>([]);
  const [filteredTests, setFilteredTests] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'test' | 'medicine' | null>(null);

  // medicines/inventory state
  const [medInventory, setMedInventory] = useState<any[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<any[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<any[]>([]);

  // split medicines: saved cards vs draft form
  const [savedMeds, setSavedMeds] = useState<any[]>(
    formData?.diagnosis?.medications || []
  );
  const [draftMed, setDraftMed] = useState<any | null>(null);
  const [showMedicationForm, setShowMedicationForm] = useState(false);

  const frequencyOptions = ['1-0-0', '1-0-1', '1-1-1', '0-0-1', '0-1-0', '1-1-0', '0-1-1', 'SOS'];
  const timingOptions = ['Before Breakfast', 'After Breakfast', 'Before Lunch', 'After Lunch', 'Before Dinner', 'After Dinner', 'Bedtime'];
  const medicineTypeOptions = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops'];
  const manualQuantityTypes = ['Syrup', 'Cream', 'Drops'];

  // ---------- data fetchers ----------
  const fetchInventory = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch('pharmacy/getAllMedicinesByDoctorID', storedToken);
      const medicines = response?.data?.data || [];
      const sortedMedicines = [...medicines].sort((a, b) => a.medName.localeCompare(b.medName));
      setMedInventory(sortedMedicines);
      setMedicineOptions(
        sortedMedicines.map((med) => ({
          value: med.medName,
          label: med.medName,
          id: med._id,
        }))
      );
    } catch {
      // silent
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
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchTests();
    fetchInventory();
  }, [doctorId]);

  // keep tests suggestions filtered
  useEffect(() => {
    const matches = testOptions
      .filter((t) => t.label.toLowerCase().includes(testInput.toLowerCase()))
      .map((t) => t.label);
    setFilteredTests(matches);
  }, [testInput, testOptions]);

  // keep medicine suggestions filtered from draft name
  useEffect(() => {
    if (!draftMed?.name) {
      setFilteredMedicines([]);
      return;
    }
    const matches = medicineOptions
      .filter((m) => m.label.toLowerCase().includes(String(draftMed.name).toLowerCase()))
      .map((m) => m.label);
    setFilteredMedicines(matches);
  }, [draftMed?.name, medicineOptions]);

  // whenever savedMeds change, reflect back into formData (to keep downstream screens intact)
  useEffect(() => {
    setFormData((prev: any) => ({
      ...prev,
      diagnosis: { ...(prev?.diagnosis || {}), medications: savedMeds },
    }));
  }, [savedMeds]);

  // ---------- helpers ----------
  const calculateQuantity = (frequency: string | null, duration: number | null, type: string | null) => {
    if (manualQuantityTypes.includes(type || '')) return 0; // manual entry
    const freqCount = frequency === 'SOS' ? 1 : (frequency?.split('-').filter((x) => x === '1').length || 0);
    return duration ? freqCount * duration : 0;
  };

  const validateDosage = (dosage: string) =>
    (/^\d+\s*(mg|ml|g|tablet|tab|capsule|cap|spoon|drop)s?$/i).test(dosage);

  const validateMedication = (med: any) => {
    if (!med?.name || !String(med.name).trim()) { Alert.alert('Error', 'Enter a valid medicine name'); return false; }
    if (!med.type) { Alert.alert('Error', 'Select a medicine type'); return false; }
    if (!med.dosage || !validateDosage(med.dosage)) { Alert.alert('Error', 'Enter valid dosage Ex: 100mg'); return false; }
    if (med.duration === null || med.duration <= 0) { Alert.alert('Error', 'Duration must be > 0'); return false; }
    if (!med.frequency) { Alert.alert('Error', 'Select a frequency'); return false; }
    const required = med.frequency === 'SOS' ? 0 : med.frequency.split('-').filter((x: string) => x === '1').length;
    if ((med.timing?.length || 0) !== required) { Alert.alert('Error', `Select ${required} timing(s)`); return false; }
    if ((!med.manualQuantity && (!med.quantity || med.quantity <= 0)) ||
        (med.manualQuantity && (!med.quantity || String(med.quantity).length === 0))) {
      Alert.alert('Error', 'Quantity must be greater than 0'); return false;
    }
    return true;
  };

  // ---------- tests ----------
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
      diagnosis: { ...prev.diagnosis, selectedTests: updatedTests },
    }));
    Toast.show({ type: 'success', text1: 'Test removed' });
  };

  // ---------- medicines: add/open, edit draft, remove ----------
  const handleAddMedicine = () => {
    // if a draft is already open and incomplete, block creating a new one
    if (draftMed && !validateMedication(draftMed)) {
      Alert.alert('Incomplete medicine', 'Please complete the current medicine before adding another.');
      return;
    }
    // open a clean draft (existing cards remain untouched)
    setDraftMed({
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
    });
    setShowMedicationForm(true);
    setFilteredMedicines([]);
    setActiveDropdown(null);
    Toast.show({ type: 'success', text1: 'Medicine form added' });
  };

  const handleDraftChange = (field: string, value: any) => {
    if (!draftMed) return;
    let updated = { ...draftMed, [field]: value };

    if (field === 'type') {
      updated.manualQuantity = manualQuantityTypes.includes(value);
      updated.quantity = updated.manualQuantity
        ? 0
        : calculateQuantity(updated.frequency, updated.duration, value);
    }

    if ((field === 'frequency' || field === 'duration') && !updated.manualQuantity) {
      updated.quantity = calculateQuantity(updated.frequency, updated.duration, updated.type);
    }

    setDraftMed(updated);

    if (field === 'name') {
      const matches = medicineOptions
        .filter((m) => m.label.toLowerCase().includes(String(value).toLowerCase()))
        .map((m) => m.label);
      setFilteredMedicines(matches);
    }
  };

  const updateDraftFrequency = (value: string) => {
    if (!draftMed) return;
    const maxSel = value === 'SOS' ? 0 : value.split('-').filter((x) => x === '1').length;
    const newTiming = value === 'SOS' ? [] : (draftMed.timing || []).slice(0, maxSel);
    const updated = {
      ...draftMed,
      frequency: value,
      timing: newTiming,
      quantity: draftMed.manualQuantity ? draftMed.quantity : calculateQuantity(value, draftMed.duration, draftMed.type),
    };
    setDraftMed(updated);
  };

  const handleCancelDraft = () => {
    setDraftMed(null);
    setShowMedicationForm(false);
    setFilteredMedicines([]);
    setActiveDropdown(null);
  };

  const handleRemoveMedicine = (index: number) => {
    const updated = savedMeds.filter((_, i) => i !== index);
    setSavedMeds(updated);
    Toast.show({ type: 'success', text1: 'Medicine removed' });
    setFilteredMedicines([]);
    setActiveDropdown(null);
  };

  // helper to convert draft to card/backend shape
  const draftToCard = (d: any) => ({
    medInventoryId: medInventory.find(m => m.medName === d.name)?._id || null,
    medName: d.name,
    quantity: d.quantity,
    medicineType: d.type,
    dosage: d.dosage,
    duration: d.duration,
    frequency: d.frequency,
    timings: d.timing || [],
  });

  // ---------- next ----------
  const handleNext = () => {
    // If a draft is open, validate it first
    if (draftMed) {
      if (!validateMedication(draftMed)) return;

      // merge draft into saved list (so it appears as a new card)
      const mergedMeds = [...savedMeds, draftToCard(draftMed)];

      // build the next formData synchronously and navigate with it
      const nextFormData = {
        ...formData,
        diagnosis: {
          ...(formData?.diagnosis || {}),
          medications: mergedMeds,
        },
      };

      setSavedMeds(mergedMeds);
      setDraftMed(null);
      setShowMedicationForm(false);
      setFilteredMedicines([]);
      setActiveDropdown(null);

      navigation.navigate('AdviceFollowup', { patientDetails, formData: nextFormData });
      return;
    }

    // No draft open — just navigate with current formData (already synced from savedMeds via effect)
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
            {/* Tests */}
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
                  <TouchableOpacity onPress={() => handleRemoveTest(index)} style={styles.deleteButton}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Diagnosis */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🩺 Diagnosis</Text>
              <TextInput
                style={styles.textArea}
                placeholder="e.g. Hypertension, Diabetes"
                multiline
                value={formData?.diagnosis?.diagnosisList || ''}
                onChangeText={(text) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    diagnosis: { ...prev.diagnosis, diagnosisList: text.toUpperCase() },
                  }))
                }
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Medications */}
            <View style={styles.section}>
              <View style={styles.medHeader}>
                <Text style={styles.sectionTitle}>💊 Prescribed Medications</Text>
              </View>

              {/* Saved cards */}
              {savedMeds.map((med: any, index: number) => (
                <View key={`card-${index}`} style={styles.medicationItemContainer}>
                  <View style={styles.medicationContent}>
                    <Text style={styles.medicationText}>Name: {med.medName}</Text>
                    <Text style={styles.medicationText}>Duration: {med.duration} days</Text>
                    <Text style={styles.medicationText}>Dosage: {med.dosage}</Text>
                    <Text style={styles.medicationText}>Frequency: {med.frequency}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveMedicine(index)} style={styles.deleteButton}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Draft form (no Save button; saved on Next) */}
              {showMedicationForm && draftMed && (
                <View key={draftMed.id} style={styles.medBlock}>
                  <View style={styles.rowSpaceBetween}>
                    <Text style={styles.medLabel}>New Medicine</Text>
                    <TouchableOpacity onPress={handleCancelDraft}>
                      <Text style={{ color: 'red' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    placeholder="Medicine Name"
                    style={styles.input}
                    value={draftMed.name}
                    onChangeText={(text) => handleDraftChange('name', text)}
                    onFocus={() => setActiveDropdown('medicine')}
                    placeholderTextColor="#9CA3AF"
                  />
                  {activeDropdown === 'medicine' && filteredMedicines.length > 0 && (
                    <ScrollView style={styles.dropdown} nestedScrollEnabled={true}>
                      {filteredMedicines.map((medicine, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            handleDraftChange('name', medicine);
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
                      selectedValue={draftMed.type}
                      onValueChange={(value) => handleDraftChange('type', value)}
                      style={[styles.pickerInner, { color: draftMed.type ? '#111' : '#928686' }]}
                      mode="dropdown"
                    >
                      <Picker.Item label="Select Type" value={null} color="#928686ff" />
                      {medicineTypeOptions.map((option) => (
                        <Picker.Item key={option} label={option} value={option} />
                      ))}
                    </Picker>
                  </View>

                  <TextInput
                    placeholder="Dosage (e.g. 100mg, 5ml)"
                    style={styles.input}
                    value={draftMed.dosage}
                    onChangeText={(text) => handleDraftChange('dosage', text)}
                    placeholderTextColor="#9CA3AF"
                  />
                  <TextInput
                    placeholder="Duration (days)"
                    style={styles.input}
                    value={draftMed.duration?.toString() || ''}
                    onChangeText={(text) => handleDraftChange('duration', parseInt(text) || null)}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={draftMed.frequency}
                      onValueChange={(value) => updateDraftFrequency(value)}
                      style={[styles.pickerInner, { color: draftMed.type ? '#111' : '#928686' }]}
                      mode="dropdown"
                    >
                      <Picker.Item label="Select Frequency" value={null} color="#9a9aa5ff" />
                      {frequencyOptions.map((option) => (
                        <Picker.Item key={option} label={option} value={option} />
                      ))}
                    </Picker>
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontWeight: '600', marginBottom: 4, color: 'black' }}>Timing:</Text>
                    {timingOptions.map((option) => {
                      const selected = (draftMed.timing || []).includes(option);
                      const maxTimings =
                        draftMed.frequency === 'SOS'
                          ? 0
                          : (draftMed.frequency?.split('-').filter((x: string) => x === '1').length || 0);
                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            if (draftMed.frequency === 'SOS') return;
                            const current = draftMed.timing || [];
                            let updated = current;
                            if (selected) {
                              updated = current.filter((t: string) => t !== option);
                            } else if (current.length < maxTimings) {
                              updated = [...current, option];
                            } else {
                              Toast.show({ type: 'error', text1: `You can select max ${maxTimings} timing(s)` });
                              return;
                            }
                            handleDraftChange('timing', updated);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 4,
                            backgroundColor: selected ? '#007bff' : '#f0f0f0',
                            padding: 6,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: selected ? '#fff' : '#000' }}>{option}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {draftMed.manualQuantity ? (
                    <TextInput
                      placeholder="Quantity (e.g. 1 bottle, 1 tube)"
                      style={styles.input}
                      value={String(draftMed.quantity ?? '')}
                      onChangeText={(text) => handleDraftChange('quantity', text)}
                      keyboardType="default"
                    />
                  ) : (
                    <TextInput
                      placeholder="Quantity"
                      style={[styles.input, { backgroundColor: '#eaeaea' }]}
                      value={String(draftMed.quantity ?? '')}
                      editable={false}
                      placeholderTextColor="#9CA3AF"
                    />
                  )}

                  <TextInput
                    placeholder="Notes"
                    style={styles.textArea}
                    multiline
                    value={draftMed.notes || ''}
                    onChangeText={(text) => handleDraftChange('notes', text)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}

              {/* Add medicine button */}
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
