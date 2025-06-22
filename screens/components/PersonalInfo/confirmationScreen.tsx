import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface FormData {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  practice: string;
  consultationPreferences: string;
  bank: string;
  accountNumber: string;
}

const ConfirmationScreen: React.FC = () => {
    const navigation = useNavigation();
  const [formData, setFormData] = useState<FormData>({
    name: 'Dr. Karthik',
    email: 'karthik@email.com',
    phone: '+91 234 567 8901',
    specialization: 'Family Medicine, Pediatrics',
    practice: 'Sunrise Clinic, 123 Wellness Ave, NY',
    consultationPreferences: 'Online & In-person, Mon-Fri: 10am-5pm',
    bank: 'Bank of America',
    accountNumber: '**** 1234',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = () => {
    let tempErrors: Partial<FormData> = {};
    if (!formData.name.trim()) tempErrors.name = 'Name is required';
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) tempErrors.email = 'Valid email is required';
    if (!formData.phone.trim() || !/^\+\d{2}\s\d{3}\s\d{3}\s\d{4}$/.test(formData.phone)) tempErrors.phone = 'Valid phone is required';
    if (!formData.specialization.trim()) tempErrors.specialization = 'Specialization is required';
    if (!formData.practice.trim()) tempErrors.practice = 'Practice details are required';
    if (!formData.consultationPreferences.trim()) tempErrors.consultationPreferences = 'Preferences are required';
    if (!formData.bank.trim()) tempErrors.bank = 'Bank is required';
    if (!formData.accountNumber.trim()) tempErrors.accountNumber = 'Account number is required';
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
    //   alert('Verification Submitted!');
    }
    navigation.navigate('ProfileReview' as never);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

    const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
         <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                                        <Icon name="arrow-left" size={20} color="#000" />
                                      </TouchableOpacity>
      <Text style={styles.header}>Step 6 - Confirmation</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Review your details</Text>
        {/* Personal Info Section */}
        <View style={styles.row}>
          <Icon name="account" size={20} color="#000" />
          <Text style={styles.label}>Personal Info</Text>
          <TouchableOpacity onPress={() => handleChange('name', '')}>
            <Icon name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <TextInput
          value={formData.name}
          onChangeText={(text) => handleChange('name', text)}
          style={styles.input}
          placeholder="Enter Name"
          editable={true}
          autoCapitalize="words"
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}
        <TextInput
          value={formData.email}
          onChangeText={(text) => handleChange('email', text)}
          style={styles.input}
          placeholder="Enter Email"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={true}
        />
        {errors.email && <Text style={styles.error}>{errors.email}</Text>}
        <TextInput
          value={formData.phone}
          onChangeText={(text) => handleChange('phone', text)}
          style={styles.input}
          placeholder="Enter Phone (e.g., +91 234 567 8901)"
          keyboardType="phone-pad"
          editable={true}
        />
        {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

        {/* Specialization Section */}
        <View style={styles.row}>
          <Icon name="briefcase" size={20} color="#000" />
          <Text style={styles.label}>Specialization</Text>
          <TouchableOpacity onPress={() => handleChange('specialization', '')}>
            <Icon name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <TextInput
          value={formData.specialization}
          onChangeText={(text) => handleChange('specialization', text)}
          style={styles.input}
          placeholder="Enter Specialization"
          editable={true}
        />
        {errors.specialization && <Text style={styles.error}>{errors.specialization}</Text>}

        {/* Practice Section */}
        <View style={styles.row}>
          <Icon name="office-building" size={20} color="#000" />
          <Text style={styles.label}>Practice</Text>
          <TouchableOpacity onPress={() => handleChange('practice', '')}>
            <Icon name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <TextInput
          value={formData.practice}
          onChangeText={(text) => handleChange('practice', text)}
          style={styles.input}
          placeholder="Enter Practice"
          editable={true}
        />
        {errors.practice && <Text style={styles.error}>{errors.practice}</Text>}

        {/* Consultation Preferences Section */}
        <View style={styles.row}>
          <Icon name="calendar" size={20} color="#000" />
          <Text style={styles.label}>Consultation Preferences</Text>
          <TouchableOpacity onPress={() => handleChange('consultationPreferences', '')}>
            <Icon name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <TextInput
          value={formData.consultationPreferences}
          onChangeText={(text) => handleChange('consultationPreferences', text)}
          style={styles.input}
          placeholder="Enter Preferences"
          editable={true}
        />
        {errors.consultationPreferences && <Text style={styles.error}>{errors.consultationPreferences}</Text>}

        {/* Financial Setup Section */}
        <View style={styles.row}>
          <Icon name="bank" size={20} color="#000" />
          <Text style={styles.label}>Financial Setup</Text>
          <TouchableOpacity onPress={() => handleChange('bank', '')}>
            <Icon name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <TextInput
          value={formData.bank}
          onChangeText={(text) => handleChange('bank', text)}
          style={styles.input}
          placeholder="Enter Bank"
          editable={true}
        />
        {errors.bank && <Text style={styles.error}>{errors.bank}</Text>}
        <TextInput
          value={formData.accountNumber}
          onChangeText={(text) => handleChange('accountNumber', text)}
          style={styles.input}
          placeholder="Enter Account Number"
          keyboardType="number-pad"
          editable={true}
        />
        {errors.accountNumber && <Text style={styles.error}>{errors.accountNumber}</Text>}
      </View>
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Icon name="send" size={20} color="#fff" />
        <Text style={styles.submitText}>Submit for Verification</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F3E6', padding: 20 },
      backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 100, color:'#000', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { flex: 1, marginLeft: 10, fontSize: 14 , color: '#333', fontWeight: '500' },
  input: { 
    // borderBottomWidth: 1, 
    // borderColor: '#ccc', 
    marginBottom: -10, 
    padding: 4, 
    fontSize: 14,
    color: '#6B7280',
  },
  error: { color: 'red', fontSize: 12, marginBottom: 5 },
  submitButton: { 
    backgroundColor: '#00203F', 
    padding: 12, 
    borderRadius: 5, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 20 ,
     position: 'absolute',
    bottom: 20,
    width: '90%',
    alignSelf: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, marginLeft: 10 },
});

export default ConfirmationScreen;