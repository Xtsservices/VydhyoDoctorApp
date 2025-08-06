import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const VitalsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientDetails, formData: initialFormData } = route.params;

  const [formData, setFormData] = useState(initialFormData);

  console.log(formData, "previousData if any")

  // Auto-calculate BMI
  useEffect(() => {
    const { weight, height } = formData.vitals || {};
    if (weight && height) {
      const heightInMeters = parseFloat(height) / 100;
      const bmi = (parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(1);
      setFormData((prev) => ({
        ...prev,
        vitals: {
          ...prev.vitals,
          bmi: bmi,
        },
      }));
    }
  }, [formData.vitals?.weight, formData.vitals?.height]);

  const handleVitalsChange = (field: string, value: string) => {
     const normalizedValue =
      value === "" ? "" : Number(value) < 0 ? "" : String(value).trim();
    const updatedData = { ...formData, [field]: normalizedValue };
    if (field === "bpSystolic" || field === "bpDiastolic") {
      const systolic =
        field === "bpSystolic" ? normalizedValue : formData.bpSystolic;
      const diastolic =
        field === "bpDiastolic" ? normalizedValue : formData.bpDiastolic;
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
      vitals: {
        ...prev.vitals,
        [field]: value,
      },
    }));
  };

   const validationRules = {
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
      max: 30,
      message: "Respiratory rate must be between 0 and 30 breaths/min",
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
   const calculateBMI = (weight, height) => {
    if (weight && height && !isNaN(Number(weight)) && !isNaN(Number(height))) {
      const heightInMeters = Number(height) / 100;
      const bmi = Number(weight) / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return "";
  };

  //   const validateField = (field, value) => {
  //   const rules = validationRules[field];
  //   if (!rules || value === "" || value === null || value === undefined)
  //     return true;
  //   const numVal = Number(value);
  //   return !isNaN(numVal) && numVal >= rules.min && numVal <= rules.max;
  // };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Vitals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🩺 Vitals</Text>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="bpSystolic"
              style={styles.input}
              value={formData.vitals?.bpSystolic || ''}
              onChangeText={(text) => handleVitalsChange('bpSystolic', text)}
              keyboardType="numeric"

            />
            {/* <Text>/</Text> */}
             <TextInput
              placeholder="bpDiastolic"
              style={styles.input}
              value={formData.vitals?.bpDiastolic || ''}
              onChangeText={(text) => handleVitalsChange('bpDiastolic', text)}
              keyboardType="numeric"

            />

            <TextInput
              placeholder="Pulse Rate"
              style={styles.input}
              value={formData.vitals?.pulseRate || ''}
              onChangeText={(text) => handleVitalsChange('pulseRate', text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              placeholder="Respiratory Rate"
              style={styles.input}
              value={formData.vitals?.respiratoryRate || ''}
              onChangeText={(text) => handleVitalsChange('respiratoryRate', text)}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Temperature"
              style={styles.input}
              value={formData.vitals?.temperature || ''}
              onChangeText={(text) => handleVitalsChange('temperature', text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              placeholder="SpO2"
              style={styles.input}
              value={formData.vitals?.spo2 || ''}
              onChangeText={(text) => handleVitalsChange('spo2', text)}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Height (cm)"
              style={styles.input}
              value={formData.vitals?.height || ''}
              onChangeText={(text) => handleVitalsChange('height', text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              placeholder="Weight (kg)"
              style={styles.input}
              value={formData.vitals?.weight || ''}
              onChangeText={(text) => handleVitalsChange('weight', text)}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="BMI"
              style={[styles.input, { backgroundColor: '#f0f0f0' }]}
              value={formData.vitals?.bmi || 'Auto-calculated'}
              editable={false}
            />
          </View>
        </View>

        {/* Investigation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Investigation</Text>
          <Text style={styles.subtitle}>Clinical examination findings and observations</Text>
          <TextInput
            placeholder="Enter findings from clinical examination..."
            style={styles.textArea}
            multiline
            value={formData.patientInfo?.examinationFindings || ''}
            onChangeText={(text) =>
              setFormData((prev) => ({
                ...prev,
                patientInfo: {
                  ...prev.patientInfo,
                  examinationFindings: text,
                },
              }))
            }
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate('DiagnosisMedication', {
              patientDetails,
              formData,
            })}
          >
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 16,
    borderRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    backgroundColor: '#fff',
    color:'black'
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
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
