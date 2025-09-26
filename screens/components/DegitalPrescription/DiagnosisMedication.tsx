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
  Modal,
  ActivityIndicator,
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
  // NOTE: changed to object suggestions to support name+dosage filling
  const [filteredMedicines, setFilteredMedicines] = useState<{label: string; name: string; dosage?: string; type?: string}[]>([]);

  // saved cards (finalized for this visit)
  const [savedMeds, setSavedMeds] = useState<any[]>(
    formData?.diagnosis?.medications || []
  );

  // NEW: support multiple draft forms (every draft is a dropdown-editable block)
  const [draftMeds, setDraftMeds] = useState<any[]>([]);
  const showMedicationForm = draftMeds.length > 0;

  // Previous prescriptions state
  const [previousPrescriptions, setPreviousPrescriptions] = useState<any[]>([]);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState(false);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  // Template functionality
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  // Dropdown selection inside Template modal
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // ===== NEW: previous-medicine suggestions for the name input =====
  const [prevMedSuggestions, setPrevMedSuggestions] = useState<
    { name: string; dosage?: string; type?: string }[]
  >([]);
  const [loadingPrevMeds, setLoadingPrevMeds] = useState(false);

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

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`template/getTemplatesByDoctorId?doctorId=${doctorId}`, storedToken);
      const data = response?.data?.data || response?.data || [];
      const templateList = Array.isArray(data) ? data : [];
      templateList.sort((a, b) => new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime());
      setTemplates(templateList);
      if (templateList.length > 0) {
        setSelectedTemplateId(templateList[0]._id);
      }
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Failed to load templates' });
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch previous prescriptions (for modal)
  const fetchPreviousPrescriptions = async () => {
    try {
      setLoadingPrescriptions(true);
      const storedToken = await AsyncStorage.getItem('authToken');
      const patientId = patientDetails?.patientId || patientDetails?.userId;

      if (!patientId) {
        Toast.show({ type: 'error', text1: 'Patient ID not found' });
        return;
      }

      const response = await AuthFetch(
        `pharmacy/getEPrescriptionByPatientIdAndDoctorId/${patientId}?doctorId=${doctorId}`,
        storedToken
      );
      if (response?.status === 'success') {
        const sortedPrescriptions = (response?.data?.data || [])
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPreviousPrescriptions(sortedPrescriptions);
        setShowPrescriptionsModal(true);
      } else {
        Toast.show({ type: 'error', text1: 'Failed to fetch prescriptions' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error fetching prescriptions' });
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  // ===== NEW: fetch just previous medicines for suggestions (used under Name input) =====
  const fetchPreviousMedicineSuggestions = async () => {
    try {
      setLoadingPrevMeds(true);
      const storedToken = await AsyncStorage.getItem('authToken');
      const patientId = patientDetails?.patientId || patientDetails?.userId;
      if (!patientId) return;

      const response = await AuthFetch(
        `pharmacy/getEPrescriptionByPatientIdAndDoctorId/${patientId}?doctorId=${doctorId}`,
        storedToken
      );

      const list = (response?.data?.data || []) as any[];
      // Flatten meds, dedupe by medName+dosage, keep most recent first
      const seen = new Set<string>();
      const out: {name: string; dosage?: string; type?: string}[] = [];

      // Sort by createdAt desc, then traverse
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      for (const rx of list) {
        const meds = Array.isArray(rx.medications) ? rx.medications : [];
        for (const m of meds) {
          const key = `${(m.medName || '').toLowerCase()}|${(m.dosage || '').toLowerCase()}`;
          if (m.medName && !seen.has(key)) {
            seen.add(key);
            out.push({
              name: m.medName,
              dosage: m.dosage,
              type: m.medicineType,
            });
          }
        }
      }

      // Fallback: if nothing, keep empty array
      setPrevMedSuggestions(out);
    } catch (e) {
      // silent; suggestions are optional
    } finally {
      setLoadingPrevMeds(false);
    }
  };

  useEffect(() => {
    fetchTests();
    fetchInventory();
    fetchTemplates();
    fetchPreviousMedicineSuggestions(); // load previous-meds suggestions once patient/doctor known
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  // keep tests suggestions filtered
  useEffect(() => {
    const matches = testOptions
      .filter((t) => t.label.toLowerCase().includes(testInput.toLowerCase()))
      .map((t) => t.label);
    setFilteredTests(matches);
  }, [testInput, testOptions]);

  // medicine suggestions filtered from currently focused name (if any draft being edited)
  useEffect(() => {
    // when any draft name changes, we update filteredMedicines in handleDraftChange
  }, [medicineOptions, prevMedSuggestions]);

  // whenever savedMeds change, reflect back into formData
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

  // Check if medicine already exists in today's saved cards (same name + dosage)
  const isMedicineAlreadyAdded = (medicineName: string, dosage: string) => {
    return savedMeds.some(med =>
      med.medName?.toLowerCase() === medicineName?.toLowerCase() &&
      med.dosage?.toLowerCase() === dosage?.toLowerCase()
    );
  };

  // ---------- Draft creation helpers ----------
  const createDraftFromMed = (med: any, opts?: { fromPrev?: boolean; fromTemplate?: boolean; originalPrescriptionId?: string | null; templateId?: string | null; }) => {
    return {
      id: Date.now() + Math.random(),
      name: med.medName || med.name || '',
      type: med.medicineType || med.type || null,
      dosage: med.dosage || '',
      duration: med.duration ?? null,
      timing: med.timings || med.timing || [],
      frequency: med.frequency || null,
      quantity: med.quantity ?? 0,
      manualQuantity: manualQuantityTypes.includes((med.medicineType || med.type) || ''),
      notes: med.notes || '',
      isFromPrevious: !!opts?.fromPrev,
      isFromTemplate: !!opts?.fromTemplate,
      originalPrescriptionId: opts?.originalPrescriptionId || null,
      templateId: opts?.templateId || null,
    };
  };

  const draftToCard = (d: any) => ({
    medInventoryId: medInventory.find(m => m.medName === d.name)?._id || null,
    medName: d.name,
    quantity: d.quantity,
    medicineType: d.type,
    dosage: d.dosage,
    duration: d.duration,
    frequency: d.frequency,
    timings: d.timing || [],
    isFromPrevious: d.isFromPrevious || false,
    isFromTemplate: d.isFromTemplate || false,
    originalPrescriptionId: d.originalPrescriptionId || null,
    templateId: d.templateId || null,
  });

  // ---------- Loaders (now ALWAYS into drafts) ----------
  const loadPrescriptionIntoForm = (medication: any) => {
    if (isMedicineAlreadyAdded(medication.medName, medication.dosage)) {
      const updatedMeds = savedMeds.filter(med =>
        !(med.medName.toLowerCase() === medication.medName.toLowerCase() &&
          med.dosage.toLowerCase() === medication.dosage.toLowerCase())
      );
      setSavedMeds(updatedMeds);
      Toast.show({ type: 'info', text1: 'Medicine removed from today\'s prescription' });
      return;
    }

    const newDraft = createDraftFromMed(medication, {
      fromPrev: true,
      originalPrescriptionId: medication.prescriptionId || null,
    });
    setDraftMeds(prev => [...prev, newDraft]);
    setActiveDropdown('medicine');
    setShowPrescriptionsModal(false);
    Toast.show({ type: 'success', text1: 'Medicine loaded into form' });
  };

  const loadEntirePrescription = (prescription: any) => {
    if (prescription.selectedTests && prescription.selectedTests.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        diagnosis: {
          ...prev.diagnosis,
          selectedTests: prescription.selectedTests.map((test: any) => ({
            testName: test.testName,
            testInventoryId: test.testInventoryId,
          })),
        },
      }));
    }
    if (prescription.diagnosisList) {
      setFormData((prev: any) => ({
        ...prev,
        diagnosis: {
          ...prev.diagnosis,
          diagnosisList: prescription.diagnosisList,
        },
      }));
    }

    const drafts = (prescription.medications || []).map((m: any) =>
      createDraftFromMed(m, { fromPrev: true, originalPrescriptionId: prescription._id })
    );

    if (drafts.length === 0) {
      Toast.show({ type: 'info', text1: 'No medications in this prescription' });
      return;
    }

    setDraftMeds(prev => [...prev, ...drafts]);
    setActiveDropdown('medicine');
    setShowPrescriptionsModal(false);
    Toast.show({ type: 'success', text1: 'Prescription loaded into forms' });
  };

  const loadTemplateAsDrafts = (template: any) => {
    if (template.selectedTests && template.selectedTests.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        diagnosis: {
          ...prev.diagnosis,
          selectedTests: template.selectedTests.map((test: any) => ({
            testName: test.testName,
            testInventoryId: test.testInventoryId,
          })),
        },
      }));
    }
    if (template.diagnosisList) {
      setFormData((prev: any) => ({
        ...prev,
        diagnosis: {
          ...prev.diagnosis,
          diagnosisList: template.diagnosisList,
        },
      }));
    }

    if (!template?.medications || template.medications.length === 0) {
      Toast.show({ type: 'error', text1: 'No medications found in template' });
      return;
    }

    const drafts = template.medications.map((m: any) =>
      createDraftFromMed(m, { fromTemplate: true, templateId: template._id })
    );

    setDraftMeds(prev => [...prev, ...drafts]);
    setActiveDropdown('medicine');
    setShowTemplateModal(false);
    Toast.show({ type: 'success', text1: `Template "${template.name}" loaded into forms` });
  };

  // Update previous prescription when medicine is edited (placeholder)
  const updatePreviousPrescription = async (updatedMedication: any) => {
    try {
      if (!updatedMedication.originalPrescriptionId) return;
      const storedToken = await AsyncStorage.getItem('authToken');
      console.log('Updating previous prescription:', updatedMedication.originalPrescriptionId, storedToken);
      Toast.show({ type: 'success', text1: 'Previous prescription updated' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to update previous prescription' });
    }
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

  // ---------- medicines: add/open, edit draft(s), remove ----------
  const handleAddMedicine = () => {
    const newDraft = {
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
      isFromPrevious: false,
      isFromTemplate: false,
      originalPrescriptionId: null,
      templateId: null,
    };
    setDraftMeds(prev => [...prev, newDraft]);
    setActiveDropdown('medicine');
    Toast.show({ type: 'success', text1: 'Medicine form added' });
  };

  const handleDraftChange = (id: number, field: string, value: any) => {
    setDraftMeds(prev => {
      const next = prev.map(d => {
        if (d.id !== id) return d;
        let updated = { ...d, [field]: value };

        if (field === 'type') {
          updated.manualQuantity = manualQuantityTypes.includes(value);
          updated.quantity = updated.manualQuantity
            ? 0
            : calculateQuantity(updated.frequency, updated.duration, value);
        }

        if ((field === 'frequency' || field === 'duration') && !updated.manualQuantity) {
          updated.quantity = calculateQuantity(updated.frequency, updated.duration, updated.type);
        }

        return updated;
      });
      return next;
    });

    if (field === 'name') {
      // Use previous-meds suggestions; fallback to inventory by toggling the source below if needed
      const t = String(value || '').toLowerCase();
      const matches = (prevMedSuggestions || [])
        .filter(m => (m.name || '').toLowerCase().includes(t))
        .slice(0, 50)
        .map(m => ({
          label: `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`,
          name: m.name,
          dosage: m.dosage,
          type: m.type,
        }));

      // If you prefer inventory suggestions instead, replace prevMedSuggestions with:
      // const matches = medicineOptions
      //   .filter((m) => (m.label || '').toLowerCase().includes(t))
      //   .map((m) => ({ label: m.label, name: m.label }));

      setFilteredMedicines(matches);
    }
  };

  const updateDraftFrequency = (id: number, value: string) => {
    setDraftMeds(prev => prev.map(d => {
      if (d.id !== id) return d;
      const maxSel = value === 'SOS' ? 0 : value.split('-').filter((x) => x === '1').length;
      const newTiming = value === 'SOS' ? [] : (d.timing || []).slice(0, maxSel);
      return {
        ...d,
        frequency: value,
        timing: newTiming,
        quantity: d.manualQuantity ? d.quantity : calculateQuantity(value, d.duration, d.type),
      };
    }));
  };

  const handleCancelDraft = (id: number) => {
    setDraftMeds(prev => prev.filter(d => d.id !== id));
    setFilteredMedicines([]);
    setActiveDropdown(null);
  };

  const handleRemoveMedicine = (index: number) => {
    const medicineToRemove = savedMeds[index];
    if (medicineToRemove.isFromPrevious) {
      Toast.show({ type: 'info', text1: 'Medicine from previous prescription removed' });
    }
    if (medicineToRemove.isFromTemplate) {
      Toast.show({ type: 'info', text1: 'Medicine from template removed' });
    }
    const updated = savedMeds.filter((_, i) => i !== index);
    setSavedMeds(updated);
    Toast.show({ type: 'success', text1: 'Medicine removed' });
    setFilteredMedicines([]);
    setActiveDropdown(null);
  };

  // ---------- next ----------
  const handleNext = () => {
    if (draftMeds.length > 0) {
      for (const d of draftMeds) {
        if (!validateMedication(d)) return;
      }
      draftMeds.forEach(d => {
        if (d.isFromPrevious && d.originalPrescriptionId) {
          updatePreviousPrescription(d);
        }
      });

      const merged = [...savedMeds, ...draftMeds.map(draftToCard)];
      const nextFormData = {
        ...formData,
        diagnosis: {
          ...(formData?.diagnosis || {}),
          medications: merged,
        },
      };

      setSavedMeds(merged);
      setDraftMeds([]);
      setFilteredMedicines([]);
      setActiveDropdown(null);

      navigation.navigate('AdviceFollowup', { patientDetails, formData: nextFormData });
      return;
    }

    navigation.navigate('AdviceFollowup', { patientDetails, formData });
  };

  // Adjust this offset if your header/navigation bar height differs
  const keyboardVerticalOffset = Platform.select({ ios: 80, android: 80 }) as number;

  // helpers for UI
  const getTemplateById = (id: string | null) => templates.find(t => t._id === id);

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

            {/* Template and Previous Prescriptions Buttons */}
            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.templateButton}
                onPress={() => setShowTemplateModal(true)}
                disabled={loadingTemplates}
              >
                {loadingTemplates ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.templateButtonText}>Templates</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.getPrescriptionButton}
                onPress={fetchPreviousPrescriptions}
                disabled={loadingPrescriptions}
              >
                {loadingPrescriptions ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.getPrescriptionButtonText}>Previous Prescriptions</Text>
                )}
              </TouchableOpacity>
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
                    <Text style={styles.medicationText}>
                      {med.medName} {med.dosage} 
                      {med.isFromPrevious && <Text style={styles.previousTag}> (Previous)</Text>}
                      {med.isFromTemplate && <Text style={styles.templateTag}> (Template)</Text>}
                    </Text>
                    <Text style={styles.medicationSubText}>
                      {med.duration} days • {med.frequency} • {med.medicineType}
                    </Text>
                    {med.timings && med.timings.length > 0 && (
                      <Text style={styles.medicationSubText}>Timings: {med.timings.join(', ')}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveMedicine(index)} style={styles.deleteButton}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Draft forms (multiple) */}
              {showMedicationForm && draftMeds.map((draft) => (
                <View key={draft.id} style={styles.medBlock}>
                  <View style={styles.rowSpaceBetween}>
                    <Text style={styles.medLabel}>
                      {draft.isFromPrevious 
                        ? '📋 Previous Medicine' 
                        : draft.isFromTemplate
                          ? '📄 Template Medicine'
                          : ' New Medicine'}
                    </Text>
                    <TouchableOpacity onPress={() => handleCancelDraft(draft.id)}>
                      <Text style={{ color: 'red', fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ position: 'relative' }}>
                    <TextInput
                      placeholder="Medicine Name"
                      style={[styles.input, (draft.isFromPrevious || draft.isFromTemplate) && styles.disabledInput]}
                      value={draft.name}
                      onChangeText={(text) => handleDraftChange(draft.id, 'name', text)}
                      onFocus={() => {
                        // refresh suggestions on focus
                        if (!prevMedSuggestions.length) fetchPreviousMedicineSuggestions();
                        const matches = (prevMedSuggestions || []).slice(0, 50).map(m => ({
                          label: `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`,
                          name: m.name,
                          dosage: m.dosage,
                          type: m.type,
                        }));
                        setFilteredMedicines(matches);
                        setActiveDropdown('medicine');
                      }}
                      placeholderTextColor="#9CA3AF"
                      editable={!draft.isFromPrevious && !draft.isFromTemplate}
                    />
                    {/* Name dropdown (previous meds) */}
                    {activeDropdown === 'medicine' && filteredMedicines.length > 0 && !draft.isFromPrevious && !draft.isFromTemplate && (
                      <ScrollView style={[styles.dropdown, { position: 'absolute', top: 52, left: 0, right: 0, zIndex: 30 }]} nestedScrollEnabled={true}>
                        {loadingPrevMeds ? (
                          <View style={{ padding: 12, alignItems: 'center' }}>
                            <ActivityIndicator />
                            <Text style={{ marginTop: 6, color: '#475569' }}>Loading previous meds…</Text>
                          </View>
                        ) : (
                          filteredMedicines.map((opt, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => {
                                handleDraftChange(draft.id, 'name', opt.name);
                                if (opt.dosage && !(draft.isFromPrevious || draft.isFromTemplate)) {
                                  handleDraftChange(draft.id, 'dosage', opt.dosage);
                                }
                                if (opt.type && !(draft.isFromPrevious || draft.isFromTemplate)) {
                                  handleDraftChange(draft.id, 'type', opt.type);
                                }
                                setActiveDropdown(null);
                                setFilteredMedicines([]);
                                Toast.show({ type: 'success', text1: 'Selected from previous prescriptions' });
                              }}
                              style={styles.dropdownItem}
                            >
                              <Text style={{ color: 'black' }}>{opt.label}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    )}
                  </View>

                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={draft.type}
                      onValueChange={(value) => handleDraftChange(draft.id, 'type', value)}
                      style={[styles.pickerInner, { color: draft.type ? '#111' : '#928686' }]}
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
                    style={[styles.input, (draft.isFromPrevious || draft.isFromTemplate) && styles.disabledInput]}
                    value={draft.dosage}
                    onChangeText={(text) => handleDraftChange(draft.id, 'dosage', text)}
                    placeholderTextColor="#9CA3AF"
                    editable={!draft.isFromPrevious && !draft.isFromTemplate}
                  />

                  <TextInput
                    placeholder="Duration (days)"
                    style={styles.input}
                    value={draft.duration?.toString() || ''}
                    onChangeText={(text) => handleDraftChange(draft.id, 'duration', parseInt(text) || null)}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={draft.frequency}
                      onValueChange={(value) => updateDraftFrequency(draft.id, value)}
                      style={[styles.pickerInner, { color: draft.type ? '#111' : '#928686' }]}
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
                      const selected = (draft.timing || []).includes(option);
                      const maxTimings =
                        draft.frequency === 'SOS'
                          ? 0
                          : (draft.frequency?.split('-').filter((x: string) => x === '1').length || 0);
                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            if (draft.frequency === 'SOS') return;
                            const current = draft.timing || [];
                            let updated = current;
                            if (selected) {
                              updated = current.filter((t: string) => t !== option);
                            } else if (current.length < maxTimings) {
                              updated = [...current, option];
                            } else {
                              Toast.show({ type: 'error', text1: `You can select max ${maxTimings} timing(s)` });
                              return;
                            }
                            handleDraftChange(draft.id, 'timing', updated);
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

                  {draft.manualQuantity ? (
                    <TextInput
                      placeholder="Quantity (e.g. 1 bottle, 1 tube)"
                      style={styles.input}
                      value={String(draft.quantity ?? '')}
                      onChangeText={(text) => handleDraftChange(draft.id, 'quantity', text)}
                      keyboardType="default"
                    />
                  ) : (
                    <TextInput
                      placeholder="Quantity"
                      style={[styles.input, { backgroundColor: '#eaeaea' }]}
                      value={String(draft.quantity ?? '')}
                      editable={false}
                      placeholderTextColor="#9CA3AF"
                    />
                  )}

                  <TextInput
                    placeholder="Notes"
                    style={styles.textArea}
                    multiline
                    value={draft.notes || ''}
                    onChangeText={(text) => handleDraftChange(draft.id, 'notes', text)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              ))}

              {/* Add medicine button */}
              <TouchableOpacity onPress={handleAddMedicine} style={[styles.blueButton, { marginTop: 16 }]}>
                <Text style={styles.blueButtonText}>+ Add Medicine</Text>
              </TouchableOpacity>
            </View>

            {/* spacer so content can push up above fixed buttons */}
            <View style={{ flex: 1 }} />
          </ScrollView>

          {/* Template Modal */}
          <Modal
            visible={showTemplateModal}
            animationType="slide"
            onRequestClose={() => setShowTemplateModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Templates</Text>
                <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Top dropdown to pick a template by name (e.g., Fever) */}
                {templates.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#0A2342', fontWeight: '600', marginBottom: 6 }}>Select Template</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={selectedTemplateId}
                        onValueChange={(v) => setSelectedTemplateId(v)}
                        style={styles.pickerInner}
                        mode="dropdown"
                      >
                        {templates.map((t) => (
                          <Picker.Item key={t._id} label={t.name || 'Untitled'} value={t._id} />
                        ))}
                      </Picker>
                    </View>
                    <TouchableOpacity
                      style={styles.loadFullButton}
                      onPress={() => {
                        const tpl = getTemplateById(selectedTemplateId);
                        if (tpl) loadTemplateAsDrafts(tpl);
                      }}
                    >
                      <Text style={styles.loadFullButtonText}>Load into forms</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {templates.length === 0 ? (
                  <Text style={styles.noPrescriptionsText}>No templates found</Text>
                ) : (
                  templates.map((template, index) => (
                    <View key={index} style={styles.prescriptionItem}>
                      <View style={styles.prescriptionHeader}>
                        <Text style={styles.prescriptionTitle}>
                          {template.name}
                        </Text>
                        <Text style={styles.prescriptionDate}>
                          {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'No date'}
                        </Text>
                      </View>
                      
                      <View style={styles.prescriptionStats}>
                        <Text style={styles.prescriptionStat}>
                          💊 {template.medications?.length || 0} Medications
                        </Text>
                        
                      </View>

                      {/* Load entire template -> drafts */}
                      <TouchableOpacity
                        style={styles.loadFullButton}
                        onPress={() => loadTemplateAsDrafts(template)}
                      >
                        <Text style={styles.loadFullButtonText}>Use This Template</Text>
                      </TouchableOpacity>

                      {/* Individual medication buttons -> single draft each */}
                      <Text style={styles.medicationsTitle}>Medications:</Text>
                      {template.medications?.map((med: any, medIndex: number) => (
                        <TouchableOpacity
                          key={medIndex}
                          style={[
                            styles.medicationButton,
                            isMedicineAlreadyAdded(med.medName, med.dosage) && styles.medicationButtonAdded
                          ]}
                          onPress={() => {
                            const newDraft = createDraftFromMed(med, { fromTemplate: true, templateId: template._id });
                            setDraftMeds(prev => [...prev, newDraft]);
                            setShowTemplateModal(false);
                            setActiveDropdown('medicine');
                            Toast.show({ type: 'success', text1: 'Medicine loaded into form' });
                          }}
                        >
                          <View style={styles.medicationButtonContent}>
                            <Text style={styles.medicationButtonText}>
                              {med.medName} - {med.dosage}
                            </Text>
                            <Text style={styles.medicationButtonSubText}>
                              {med.frequency} • {med.duration} days
                            </Text>
                          </View>
                          {isMedicineAlreadyAdded(med.medName, med.dosage) ? (
                            <Text style={styles.addedText}>✓ Added</Text>
                          ) : (
                            <Text style={styles.addText}>+ Add</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </Modal>

          {/* Previous Prescriptions Modal */}
          <Modal
            visible={showPrescriptionsModal}
            animationType="slide"
            onRequestClose={() => setShowPrescriptionsModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Previous Prescriptions</Text>
                <TouchableOpacity onPress={() => setShowPrescriptionsModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {previousPrescriptions.length === 0 ? (
                  <Text style={styles.noPrescriptionsText}>No previous prescriptions found</Text>
                ) : (
                  previousPrescriptions.map((prescription, index) => (
                    <View key={index} style={styles.prescriptionItem}>
                      <View style={styles.prescriptionHeader}>
                        <Text style={styles.prescriptionTitle}>
                          Prescription #{previousPrescriptions.length - index}
                        </Text>
                        
                      </View>
                      
                      <View style={styles.prescriptionStats}>
                        <Text style={styles.prescriptionStat}>
                          💊 {prescription.medications?.length || 0} Medications
                        </Text>
                      
                      </View>

                      {/* Entire prescription -> drafts */}
                      <TouchableOpacity
                        style={styles.loadFullButton}
                        onPress={() => loadEntirePrescription(prescription)}
                      >
                        <Text style={styles.loadFullButtonText}>Use This Prescription</Text>
                      </TouchableOpacity>

                      {/* Individual medication -> single draft */}
                      <Text style={styles.medicationsTitle}>Medications:</Text>
                      {prescription.medications?.map((med: any, medIndex: number) => (
                        <TouchableOpacity
                          key={medIndex}
                          style={[
                            styles.medicationButton,
                            isMedicineAlreadyAdded(med.medName, med.dosage) && styles.medicationButtonAdded
                          ]}
                          onPress={() => loadPrescriptionIntoForm(med)}
                        >
                          <View style={styles.medicationButtonContent}>
                            <Text style={styles.medicationButtonText}>
                              {med.medName} - {med.dosage}
                            </Text>
                            <Text style={styles.medicationButtonSubText}>
                              {med.frequency} • {med.duration} days
                            </Text>
                          </View>
                          {isMedicineAlreadyAdded(med.medName, med.dosage) ? (
                            <Text style={styles.addedText}>✓ Added</Text>
                          ) : (
                            <Text style={styles.addText}>+ Add</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </Modal>

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
  disabledInput: { backgroundColor: '#f5f5f5', color: '#666' },
  picker: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10, backgroundColor: '#fff', color: 'gray' },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', backgroundColor: '#fff', marginBottom: 10, color: 'black' },
  addButton: { backgroundColor: '#007bff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  testTag: { backgroundColor: '#e2e2e2', padding: 6, borderRadius: 6, marginTop: 4, color: 'black' },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 6, maxHeight: 220, overflow: 'scroll' },
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
  medLabel: { color: '#0A2342', fontWeight: '600' },
  testItemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  medicationItemContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 8, 
    backgroundColor: '#f8f9fa', 
    padding: 12, 
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff'
  },
  medicationContent: { flex: 1, marginRight: 10 },
  medicationText: { color: 'black', marginBottom: 2, fontSize: 14, fontWeight: '500' },
  medicationSubText: { color: '#666', fontSize: 12, marginBottom: 2 },
  previousTag: { color: '#28a745', fontSize: 12, fontWeight: '600' },
  templateTag: { color: '#ff6b35', fontSize: 12, fontWeight: '600' },
  deleteButton: { backgroundColor: '#dc3545', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  pickerWrapper: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', marginBottom: 10, height: 48, justifyContent: 'center', paddingHorizontal: 6, overflow: 'hidden' },
  pickerInner: { alignSelf: 'stretch', height: 48, color: 'gray', margin: 0, padding: 0 },
  deleteText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  // Button row container for Template and Previous Prescriptions
  buttonRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  templateButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  templateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  getPrescriptionButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  getPrescriptionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A2342',
  },
  closeButton: {
    fontSize: 20,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  prescriptionItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  prescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2342',
    flex: 1,
  },
  prescriptionDate: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  prescriptionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  prescriptionStat: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  loadFullButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  loadFullButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  medicationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  medicationButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  medicationButtonAdded: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  medicationButtonContent: {
    flex: 1,
  },
  medicationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  medicationButtonSubText: {
    fontSize: 12,
    color: '#6c757d',
  },
  addText: {
    color: '#28a745',
    fontWeight: '600',
    fontSize: 12,
  },
  addedText: {
    color: '#155724',
    fontWeight: '600',
    fontSize: 12, 
  },
  noPrescriptionsText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 16,
    marginTop: 20,
  },
});
