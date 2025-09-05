import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { UploadFiles } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const AddClinicForm = () => {
  const navigation = useNavigation<any>();
  const [form, setForm] = useState({
    clinicName: '',
    startTime: '09:00',
    endTime: '17:00',
    address: '',
    city: '',
    state: '',
    mobile: '',
    email: '',
    pincode: '',
    type: 'Clinic',
    country: 'India',
    latitude: '56.1304',
    longitude: '-106.3468',
    pharmacyName: '',
    pharmacyRegNum: '',
    pharmacyGST: '',
    pharmacyPAN: '',
    pharmacyAddress: '',
    labName: '',
    labRegNum: '',
    labGST: '',
    labPAN: '',
    labAddress: '',
  });

  const [headerFile, setHeaderFile] = useState<any>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<any>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [pharmacyHeaderFile, setPharmacyHeaderFile] = useState<any>(null);
  const [pharmacyHeaderPreview, setPharmacyHeaderPreview] = useState<string | null>(null);
  const [labHeaderFile, setLabHeaderFile] = useState<any>(null);
  const [labHeaderPreview, setLabHeaderPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileChange = async (type: 'header' | 'signature' | 'pharmacyHeader' | 'labHeader') => {
    try {
      Alert.alert(
        `Upload ${type === 'header' ? 'Header' : type === 'signature' ? 'Signature' : type === 'pharmacyHeader' ? 'Pharmacy Header' : 'Lab Header'}`,
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              try {
                const result = await launchCamera({
                  mediaType: 'photo',
                  includeBase64: false,
                });

                if (result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  const file = {
                    uri: asset.uri!,
                    name: asset.fileName || `${type}_camera.jpg`,
                    type: asset.type || 'image/jpeg',
                  };

                  if (type === 'header') {
                    setHeaderFile(file);
                    setHeaderPreview(asset.uri!);
                  } else if (type === 'signature') {
                    setSignatureFile(file);
                    setSignaturePreview(asset.uri!);
                  } else if (type === 'pharmacyHeader') {
                    setPharmacyHeaderFile(file);
                    setPharmacyHeaderPreview(asset.uri!);
                  } else if (type === 'labHeader') {
                    setLabHeaderFile(file);
                    setLabHeaderPreview(asset.uri!);
                  }
                }
              } catch (error) {
                Alert.alert('Error', 'Camera access failed.');
                console.error('Camera error:', error);
              }
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              try {
                const result = await launchImageLibrary({
                  mediaType: 'photo',
                  includeBase64: false,
                });

                if (result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  const file = {
                    uri: asset.uri!,
                    name: asset.fileName || `${type}_gallery.jpg`,
                    type: asset.type || 'image/jpeg',
                  };

                  if (type === 'header') {
                    setHeaderFile(file);
                    setHeaderPreview(asset.uri!);
                  } else if (type === 'signature') {
                    setSignatureFile(file);
                    setSignaturePreview(asset.uri!);
                  } else if (type === 'pharmacyHeader') {
                    setPharmacyHeaderFile(file);
                    setPharmacyHeaderPreview(asset.uri!);
                  } else if (type === 'labHeader') {
                    setLabHeaderFile(file);
                    setLabHeaderPreview(asset.uri!);
                  }
                }
              } catch (error) {
                Alert.alert('Error', 'Gallery access failed.');
                console.error('Gallery error:', error);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file. Please try again.');
      console.error('File upload error:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.clinicName.trim()) newErrors.clinicName = 'Clinic name is required';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state.trim()) newErrors.state = 'State is required';
    
    if (!form.mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9][0-9]{9}$/.test(form.mobile)) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
    }
    
    if (!form.latitude) newErrors.latitude = 'Latitude is required';
    else if (isNaN(Number(form.latitude))) newErrors.latitude = 'Latitude must be a valid number';
    
    if (!form.longitude) newErrors.longitude = 'Longitude is required';
    else if (isNaN(Number(form.longitude))) newErrors.longitude = 'Longitude must be a valid number';
    
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      newErrors.pincode = 'Enter a valid 6-digit pincode';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      const firstError = Object.values(errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

      const formData = new FormData();
      
      // Add basic clinic information
      formData.append("userId", userId || '');
      formData.append("type", form.type);
      formData.append("clinicName", form.clinicName);
      formData.append("address", form.address);
      formData.append("city", form.city);
      formData.append("state", form.state);
      formData.append("country", form.country);
      formData.append("mobile", form.mobile);
      formData.append("pincode", form.pincode);
      formData.append("startTime", form.startTime);
      formData.append("endTime", form.endTime);
      formData.append("latitude", form.latitude);
      formData.append("longitude", form.longitude);
      
      // Add header and signature files
      if (headerFile) formData.append("file", headerFile as any);
      if (signatureFile) formData.append("signature", signatureFile as any);
      
      // Add pharmacy details
      if (form.pharmacyName) formData.append("pharmacyName", form.pharmacyName);
      if (form.pharmacyRegNum) formData.append("pharmacyRegistrationNo", form.pharmacyRegNum);
      if (form.pharmacyGST) formData.append("pharmacyGst", form.pharmacyGST);
      if (form.pharmacyPAN) formData.append("pharmacyPan", form.pharmacyPAN);
      if (form.pharmacyAddress) formData.append("pharmacyAddress", form.pharmacyAddress);
      if (pharmacyHeaderFile) formData.append("pharmacyHeader", pharmacyHeaderFile as any);
      
      // Add lab details
      if (form.labName) formData.append("labName", form.labName);
      if (form.labRegNum) formData.append("labRegistrationNo", form.labRegNum);
      if (form.labGST) formData.append("labGst", form.labGST);
      if (form.labPAN) formData.append("labPan", form.labPAN);
      if (form.labAddress) formData.append("labAddress", form.labAddress);
      if (labHeaderFile) formData.append("labHeader", labHeaderFile as any);

      const response = await UploadFiles('users/addAddressFromWeb', formData, token);
      console.log("Add Clinic Response:", response);

      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Clinic added successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        navigation.navigate('Clinic' as never);
      } else {
        Alert.alert('Error', response.message || 'Failed to add clinic.');
      }
    } catch (error) {
      console.error('Error adding clinic:', error);
      Alert.alert('Error', 'Failed to add clinic.');
    } finally {
      setLoading(false);
    }
  };

  const renderFileUpload = (type: 'header' | 'signature' | 'pharmacyHeader' | 'labHeader', label: string, preview: string | null) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.uploadBox}
        onPress={() => handleFileChange(type)}
      >
        {preview ? (
          <Image source={{ uri: preview }} style={styles.previewImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Icon name="upload" size={24} color="#6B7280" />
            <Text style={styles.uploadText}>Select File</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Add New Clinic</Text>

        <Text style={styles.label}>Clinic Name *</Text>
        <TextInput
          style={[styles.input, errors.clinicName && styles.inputError]}
          placeholder="Enter clinic name"
          value={form.clinicName}
          onChangeText={(text) => handleChange('clinicName', text)}
          placeholderTextColor="gray"
        />
        {errors.clinicName && <Text style={styles.errorText}>{errors.clinicName}</Text>}

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, styles.textarea, errors.address && styles.inputError]}
          placeholder="Enter clinic address"
          multiline
          numberOfLines={3}
          value={form.address}
          onChangeText={(text) => handleChange('address', text)}
          placeholderTextColor="gray"
        />
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="Enter city"
              value={form.city}
              onChangeText={(text) => handleChange('city', text)}
              placeholderTextColor="gray"
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={[styles.input, errors.state && styles.inputError]}
              placeholder="Enter state"
              value={form.state}
              onChangeText={(text) => handleChange('state', text)}
              placeholderTextColor="gray"
            />
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>
        </View>

        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput
          style={[styles.input, errors.mobile && styles.inputError]}
          placeholder="Enter 10-digit mobile number"
          keyboardType="phone-pad"
          value={form.mobile}
          onChangeText={(text) => handleChange('mobile', text)}
          maxLength={10}
          placeholderTextColor="gray"
        />
        {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Enter email address"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => handleChange('email', text)}
          placeholderTextColor="gray"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <Text style={styles.label}>Pin Code</Text>
        <TextInput
          style={[styles.input, errors.pincode && styles.inputError]}
          placeholder="Enter pincode"
          keyboardType="numeric"
          value={form.pincode}
          onChangeText={(text) => handleChange('pincode', text)}
          maxLength={6}
          placeholderTextColor="gray"
        />
        {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Latitude *</Text>
            <TextInput
              style={[styles.input, errors.latitude && styles.inputError]}
              placeholder="Enter latitude"
              keyboardType="decimal-pad"
              value={form.latitude}
              onChangeText={(text) => handleChange('latitude', text)}
              placeholderTextColor="gray"
            />
            {errors.latitude && <Text style={styles.errorText}>{errors.latitude}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Longitude *</Text>
            <TextInput
              style={[styles.input, errors.longitude && styles.inputError]}
              placeholder="Enter longitude"
              keyboardType="decimal-pad"
              value={form.longitude}
              onChangeText={(text) => handleChange('longitude', text)}
              placeholderTextColor="gray"
            />
            {errors.longitude && <Text style={styles.errorText}>{errors.longitude}</Text>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              style={styles.input}
              placeholder="09:00"
              value={form.startTime}
              onChangeText={(text) => handleChange('startTime', text)}
              placeholderTextColor="gray"
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              style={styles.input}
              placeholder="17:00"
              value={form.endTime}
              onChangeText={(text) => handleChange('endTime', text)}
              placeholderTextColor="gray"
            />
          </View>
        </View>

        {renderFileUpload('header', 'Clinic Header Image', headerPreview)}
        {renderFileUpload('signature', 'Digital Signature (Optional)', signaturePreview)}

        <Text style={styles.sectionTitle}>Pharmacy Details (Optional)</Text>
        
        <Text style={styles.label}>Pharmacy Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter pharmacy name"
          value={form.pharmacyName}
          onChangeText={(text) => handleChange('pharmacyName', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Pharmacy Registration Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter registration number"
          value={form.pharmacyRegNum}
          onChangeText={(text) => handleChange('pharmacyRegNum', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Pharmacy GST Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter GST number"
          value={form.pharmacyGST}
          onChangeText={(text) => handleChange('pharmacyGST', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Pharmacy PAN</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter PAN number"
          value={form.pharmacyPAN}
          onChangeText={(text) => handleChange('pharmacyPAN', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Pharmacy Address</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Enter pharmacy address"
          multiline
          numberOfLines={3}
          value={form.pharmacyAddress}
          onChangeText={(text) => handleChange('pharmacyAddress', text)}
          placeholderTextColor="gray"
        />

        {renderFileUpload('pharmacyHeader', 'Pharmacy Header Image (Optional)', pharmacyHeaderPreview)}

        <Text style={styles.sectionTitle}>Lab Details (Optional)</Text>
        
        <Text style={styles.label}>Lab Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter lab name"
          value={form.labName}
          onChangeText={(text) => handleChange('labName', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Lab Registration Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter registration number"
          value={form.labRegNum}
          onChangeText={(text) => handleChange('labRegNum', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Lab GST Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter GST number"
          value={form.labGST}
          onChangeText={(text) => handleChange('labGST', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Lab PAN</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter PAN number"
          value={form.labPAN}
          onChangeText={(text) => handleChange('labPAN', text)}
          placeholderTextColor="gray"
        />

        <Text style={styles.label}>Lab Address</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Enter lab address"
          multiline
          numberOfLines={3}
          value={form.labAddress}
          onChangeText={(text) => handleChange('labAddress', text)}
          placeholderTextColor="gray"
        />

        {renderFileUpload('labHeader', 'Lab Header Image (Optional)', labHeaderPreview)}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>✖ Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>✔ Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddClinicForm;

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: 'black',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
    color: 'black',
  },
  label: {
    fontSize: 14,
    color: '#161b20ff',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: 'black'
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  column: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 20,
    marginBottom: 50
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#111827',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});