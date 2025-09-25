import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

const VitalsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientDetails, formData: initialFormData } = route.params;

  const [formData, setFormData] = useState(initialFormData || { vitals: {} });
  const [errors, setErrors] = useState({} as Record<string, string>);

  const validationRules: Record<string, any> = {
    bpSystolic: {
      min: 0,
      max: 240,
      message: "Systolic BP must be between 0 and 240 mmHg",
    },
    bpDiastolic: {
      min: 0,
      max: 200,
      message: "Diastolic BP must be between 0 and 200 mmHg",
    },
    pulseRate: {
      min: 0,
      max: 350,
      message: "Pulse rate must be between 0 and 350 bpm",
    },
    respiratoryRate: {
      min: 0,
      max: 60,
      message: "Respiratory rate must be between 0 and 60 breaths/min",
    },
    temperature: {
      min: 95,
      max: 110,
      message: "Temperature must be between 95 and 110 °F",
    },
    spo2: { min: 0, max: 100, message: "SpO2 must be between 0 and 100%" },
    height: {
      min: 50,
      max: 300,
      message: "Height must be between 50 and 300 cm",
    },
    weight: {
      min: 0,
      max: 250,
      message: "Weight must be between 0 and 250 kg",
    },
  };

  useEffect(() => {
    const { weight, height } = formData.vitals || {};
    if (weight && height) {
      const heightInMeters = Number(height) / 100;
      if (heightInMeters > 0) {
        const bmi = (Number(weight) / (heightInMeters * heightInMeters)).toFixed(1);
        setFormData((prev) => ({
          ...prev,
          vitals: {
            ...prev.vitals,
            bmi,
          },
        }));
      }
    }
  }, [formData.vitals?.weight, formData.vitals?.height]);

  const validateField = (field: string, value: any) => {
    const rules = validationRules[field];
    if (!rules || value === "" || value === null || value === undefined) return true;
    const numVal = Number(value);
    return !isNaN(numVal) && numVal >= rules.min && numVal <= rules.max;
  };

  const handleVitalsChange = (field: string, value: string) => {
    // allow empty string to clear
    const normalizedValue = value === "" ? "" : String(value).trim();
    const updatedData = { ...(formData.vitals || {}), [field]: normalizedValue };

    if (field === "bpSystolic" || field === "bpDiastolic") {
      const systolic = field === "bpSystolic" ? normalizedValue : updatedData.bpSystolic || updatedData.bp?.split('/')[0];
      const diastolic = field === "bpDiastolic" ? normalizedValue : updatedData.bpDiastolic || updatedData.bp?.split('/')[1];
      updatedData.bpSystolic = systolic;
      updatedData.bpDiastolic = diastolic;
      updatedData.bp = systolic && diastolic ? `${systolic}/${diastolic}` : "";
    }

    if (field === "weight" || field === "height") {
      updatedData.bmi = calculateBMI(
        field === "weight" ? normalizedValue : updatedData.weight,
        field === "height" ? normalizedValue : updatedData.height
      );
    }

    setFormData((prev) => ({
      ...prev,
      vitals: updatedData,
    }));
  };

  const handleBlur = (field: string) => {
    const value = (formData.vitals || {})[field];
    if (!validateField(field, value)) {
      const msg = validationRules[field]?.message || 'Invalid value';
      Toast.show({
        type: 'error',
        text1: 'Invalid Value',
        text2: msg,
      });

      const updatedData = { ...(formData.vitals || {}), [field]: "" };

      if (field === "height" || field === "weight") {
        updatedData.bmi = calculateBMI(
          field === "weight" ? "" : updatedData.weight,
          field === "height" ? "" : updatedData.height
        );
      }

      setFormData((prev) => ({
        ...prev,
        vitals: updatedData,
      }));
      setErrors((prev) => ({ ...prev, [field]: validationRules[field].message }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const calculateBMI = (weight: any, height: any) => {
    if (weight && height && !isNaN(Number(weight)) && !isNaN(Number(height))) {
      const heightInMeters = Number(height) / 100;
      if (heightInMeters <= 0) return "";
      const bmi = Number(weight) / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return "";
  };

  // Adjust offset if you have a custom header; bump for larger headers
  const keyboardVerticalOffset = Platform.select({ ios: 80, android: 80 }) as number;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.container, { flexGrow: 1, paddingBottom: 140 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🩺 Vitals</Text>

              {/* Blood Pressure Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Blood Pressure (MMHG)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="Systolic"
                      style={styles.input}
                      value={formData.vitals?.bpSystolic || ''}
                      onChangeText={(text) => handleVitalsChange('bpSystolic', text)}
                      onBlur={() => handleBlur('bpSystolic')}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <Text style={styles.unitSeparator}>/</Text>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="Diastolic"
                      style={styles.input}
                      value={formData.vitals?.bpDiastolic || ''}
                      onChangeText={(text) => handleVitalsChange('bpDiastolic', text)}
                      onBlur={() => handleBlur('bpDiastolic')}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Pulse Rate Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pulse Rate (BPM)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="Pulse Rate"
                      style={styles.input}
                      value={formData.vitals?.pulseRate || ''}
                      onChangeText={(text) => handleVitalsChange('pulseRate', text)}
                      onBlur={() => handleBlur('pulseRate')}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Respiratory Rate Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Respiratory Rate (Breaths/Min)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="Respiratory Rate"
                      style={styles.input}
                      value={formData.vitals?.respiratoryRate || ''}
                      onChangeText={(text) => handleVitalsChange('respiratoryRate', text)}
                      onBlur={() => handleBlur('respiratoryRate')}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Temperature Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Temperature (°F)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="Temperature"
                      style={styles.input}
                      value={formData.vitals?.temperature || ''}
                      onChangeText={(text) => handleVitalsChange('temperature', text)}
                      onBlur={() => handleBlur('temperature')}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* SpO2 Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>SpO₂ (%)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="SpO2"
                      style={styles.input}
                      value={formData.vitals?.spo2 || ''}
                      onChangeText={(text) => handleVitalsChange('spo2', text)}
                      onBlur={() => handleBlur('spo2')}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Height Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Height (CM)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="Height"
                      style={styles.input}
                      value={formData.vitals?.height || ''}
                      onChangeText={(text) => handleVitalsChange('height', text)}
                      onBlur={() => handleBlur('height')}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Weight Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Weight (KG)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="Weight"
                      style={styles.input}
                      value={formData.vitals?.weight || ''}
                      onChangeText={(text) => handleVitalsChange('weight', text)}
                      onBlur={() => handleBlur('weight')}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* BMI Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>BMI (KG/M²)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      placeholder="BMI"
                      style={[styles.input, { backgroundColor: '#f0f0f0' }]}
                      value={formData.vitals?.bmi || 'Auto-calculated'}
                      editable={false}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* spacer so content can push up */}
            <View style={{ flex: 1 }} />
          </ScrollView>

          {/* Fixed button bar */}
          <View style={[styles.buttonRow, { paddingBottom: Platform.OS === 'ios' ? 20 : 12 }]}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { Keyboard.dismiss(); navigation.goBack(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() =>
                navigation.navigate('DiagnosisMedication', {
                  patientDetails,
                  formData,
                })
              }
            >
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default VitalsScreen;

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
    backgroundColor: '#f6f6f6',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: -25,
    borderRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 16,
    color: 'black'
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: 'black'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWithUnit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    color: 'black'
  },
  unitSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black'
  },
  buttonRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f6f6f6',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
  cancelText: {
    color: '#000',
    fontWeight: '500',
  },
  nextText: {
    color: '#fff',
    fontWeight: '600',
  },
});
