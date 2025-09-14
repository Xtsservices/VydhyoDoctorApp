// ClinicManagementScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthFetch, AuthPost, AuthPut, UploadFiles } from '../../auth/auth';
import Toast from 'react-native-toast-message';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useSelector } from 'react-redux';

const { width, height } = Dimensions.get('window');

interface Clinic {
  endTime: string;
  startTime: string;
  id: string;
  name: string;
  type: string;
  city: string;
  mobile: string;
  status: 'Active' | 'Pending' | 'Inactive';
  Avatar?: string;
  addressId?: string;
  address?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  headerImage?: string;
  digitalSignature?: string;
  pharmacyName?: string;
  pharmacyRegNum?: string;
  pharmacyGST?: string;
  pharmacyPAN?: string;
  pharmacyAddress?: string;
  pharmacyHeaderImage?: string;
  labName?: string;
  labRegNum?: string;
  labGST?: string;
  labPAN?: string;
  labAddress?: string;
  labHeaderImage?: string;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Active':
      return { backgroundColor: '#DCFCE7', color: '#16A34A' };
    case 'Pending':
      return { backgroundColor: '#FEF9C3', color: '#D97706' };
    case 'Inactive':
      return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    default:
      return { backgroundColor: '#E5E7EB', color: '#6B7280' };
  }
};

const ClinicManagementScreen = () => {
  const navigation = useNavigation<any>();
  const [clinics, setClinic] = useState<Clinic[]>([]);
  const [totalClinics, setTotalClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [headerModalVisible, setHeaderModalVisible] = useState(false);
  const [pharmacyModalVisible, setPharmacyModalVisible] = useState(false);
  const [labModalVisible, setLabModalVisible] = useState(false);
  const [imagePreviewModalVisible, setImagePreviewModalVisible] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [headerFile, setHeaderFile] = useState<any>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<any>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [pharmacyHeaderFile, setPharmacyHeaderFile] = useState<any>(null);
  const [pharmacyHeaderPreview, setPharmacyHeaderPreview] = useState<string | null>(null);
  const [labHeaderFile, setLabHeaderFile] = useState<any>(null);
  const [labHeaderPreview, setLabHeaderPreview] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
    const userId = useSelector((state: any) => state.currentUserId);
    const currentuserDetails =  useSelector((state: any) => state.currentUser);
    const isPhysiotherapist = currentuserDetails?.specialization?.name === "Physiotherapist";
    const doctorId = currentuserDetails.role==="doctor"? currentuserDetails.userId : currentuserDetails.createdBy
    const [form, setForm] = useState({
    id: '',
    name: '',
    type: 'General',
    city: 'unknown',
    mobile: '',
    status: 'Active' as Clinic['status'],
    Avatar: 'https://i.pravatar.cc/150?img=12',
    startTime: '',
    endTime: '',
    addressId: '',
    address: '',
    state: '',
    pincode: '',
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

  type FormKeys = keyof typeof form;

  const FIELD_CONFIGS: Array<{
    key: FormKeys;
    label: string;
    editableInEdit?: boolean;
    multiline?: boolean;
    keyboardType?:
    | 'default'
    | 'phone-pad'
    | 'numeric'
    | 'email-address'
    | 'number-pad'
    | 'decimal-pad';
  }> = [
      { key: 'name', label: 'Clinic Name' },
      { key: 'status', label: 'Status', editableInEdit: false },
      { key: 'type', label: 'Clinic Type' },
      { key: 'mobile', label: 'Mobile', keyboardType: 'phone-pad' },
      { key: 'address', label: 'Address', multiline: true },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pincode', label: 'Pincode', keyboardType: 'number-pad' },
      { key: 'country', label: 'Country' },
      { key: 'pharmacyName', label: 'Pharmacy Name' },
      { key: 'pharmacyRegNum', label: 'Pharmacy Registration Number' },
      { key: 'pharmacyGST', label: 'Pharmacy GST Number' },
      { key: 'pharmacyPAN', label: 'Pharmacy PAN Number' },
      { key: 'pharmacyAddress', label: 'Pharmacy Address', multiline: true },
      { key: 'labName', label: 'Lab Name' },
      { key: 'labRegNum', label: 'Lab Registration Number' },
      { key: 'labGST', label: 'Lab GST Number' },
      { key: 'labPAN', label: 'Lab PAN Number' },
      { key: 'labAddress', label: 'Lab Address', multiline: true },
    ];

  const fetchClinics = async () => {
    try {
      setInitialLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await AuthFetch('users/getClinicAddress', token);

      let data: any[] | undefined;
      if ('data' in res && Array.isArray(res.data?.data)) {
        data = res.data?.data?.reverse();
      } else {
        data = undefined;
      }

      if (data && Array.isArray(data)) {
        const formattedClinics: Clinic[] = data
          .filter((appt: any) => appt.status === 'Active')
          .map((appt: any) => ({
            id: appt.addressId || appt.appointmentId || '',
            addressId: appt.addressId || '',
            address: appt.address || '',
            state: appt.state || '',
            country: appt.country || '',
            pincode: appt.pincode || '',
            latitude: appt.latitude || '',
            longitude: appt.longitude || '',
            name: appt.clinicName || '',
            type: appt.appointmentType || 'General',
            city: appt.city || 'unknown',
            mobile: appt.mobile || '',
            status: 'Active',
            Avatar: 'https://i.pravatar.cc/150?img=12',
            startTime: appt.startTime || '',
            endTime: appt.endTime || '',
            headerImage: appt.headerImage || '',
            digitalSignature: appt.digitalSignature || '',
            pharmacyName: appt.pharmacyName || '',
            pharmacyRegNum: appt.pharmacyRegNum || appt.pharmacyRegistrationNo || '',
            pharmacyGST: appt.pharmacyGST || appt.pharmacyGst || '',
            pharmacyPAN: appt.pharmacyPAN || appt.pharmacyPan || '',
            pharmacyAddress: appt.pharmacyAddress || '',
            pharmacyHeaderImage: appt.pharmacyHeaderImage || '',
            labName: appt.labName || '',
            labRegNum: appt.labRegNum || appt.labRegistrationNo || '',
            labGST: appt.labGST || appt.labGst || '',
            labPAN: appt.labPAN || appt.labPan || '',
            labAddress: appt.labAddress || '',
            labHeaderImage: appt.labHeaderImage || '',
          }));

        setTotalClinics(formattedClinics);
        setClinic(formattedClinics);
      }
    } catch (error) {
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  useEffect(() => {
    if (search) {
      const q = search.toLowerCase();
      const filteredClinics = totalClinics.filter(
        (clinic) =>
          (clinic.name || '').toLowerCase().includes(q) ||
          (clinic.id || '').toLowerCase().includes(q)
      );
      setClinic(filteredClinics);
    } else {
      setClinic(totalClinics);
    }
  }, [search, totalClinics]);

  const openModal = (type: 'view' | 'edit' | 'delete', clinic: Clinic) => {
    setForm({
      id: clinic.id,
      name: clinic.name,
      type: clinic.type || 'General',
      city: clinic.city || 'unknown',
      mobile: clinic.mobile || '',
      status: clinic.status || 'Active',
      Avatar: clinic.Avatar || 'https://i.pravatar.cc/150?img=12',
      startTime: clinic.startTime || '',
      endTime: clinic.endTime || '',
      addressId: clinic.addressId || '',
      address: clinic.address || '',
      state: clinic.state || '',
      country: clinic.country || '',
      pincode: clinic.pincode || '',
      latitude: clinic.latitude || '',
      longitude: clinic.longitude || '',
      pharmacyName: clinic.pharmacyName || '',
      pharmacyRegNum: clinic.pharmacyRegNum || '',
      pharmacyGST: clinic.pharmacyGST || '',
      pharmacyPAN: clinic.pharmacyPAN || '',
      pharmacyAddress: clinic.pharmacyAddress || '',
      labName: clinic.labName || '',
      labRegNum: clinic.labRegNum || '',
      labGST: clinic.labGST || '',
      labPAN: clinic.labPAN || '',
      labAddress: clinic.labAddress || '',
    });
    setMode(type);
    setModalVisible(true);
  };

  const formatTimeTo12Hour = (time24: string): string => {
  if (!time24) return '—';
  const [hours, minutes] = time24.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

  const closeModal = () => {
    setModalVisible(false);
    setMode(null);
  };

  const openHeaderModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setHeaderModalVisible(true);
    setHeaderFile(null);
    setHeaderPreview(clinic.headerImage || null);
    setSignatureFile(null);
    setSignaturePreview(clinic.digitalSignature || null);
  };

  const openPharmacyModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setForm({
      ...form,
      pharmacyName: clinic.pharmacyName || '',
      pharmacyRegNum: clinic.pharmacyRegNum || '',
      pharmacyGST: clinic.pharmacyGST || '',
      pharmacyPAN: clinic.pharmacyPAN || '',
      pharmacyAddress: clinic.pharmacyAddress || '',
      addressId: clinic.addressId || '',
    });
    setPharmacyHeaderPreview(clinic.pharmacyHeaderImage || null);
    setPharmacyModalVisible(true);
  };

  const openLabModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setForm({
      ...form,
      labName: clinic.labName || '',
      labRegNum: clinic.labRegNum || '',
      labGST: clinic.labGST || '',
      labPAN: clinic.labPAN || '',
      labAddress: clinic.labAddress || '',
      addressId: clinic.addressId || '',
    });
    setLabHeaderPreview(clinic.labHeaderImage || null);
    setLabModalVisible(true);
  };

  const openImagePreview = (imageUrl: string, title: string) => {
    setSelectedImage(imageUrl);
    setPreviewTitle(title);
    setImagePreviewModalVisible(true);
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
    }
  };

  const handleHeaderSubmit = async () => {
    if (!headerFile || !selectedClinic) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', headerFile as any);
      if (signatureFile) formData.append('signature', signatureFile as any);
      formData.append('addressId', selectedClinic.addressId || '');

      const response = await UploadFiles('users/uploadClinicHeader', formData, token);

      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Header uploaded successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setHeaderModalVisible(false);
        await fetchClinics();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to upload header',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to upload header',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    const token = await AsyncStorage.getItem('authToken');
    try {
      const updateData = {
        addressId: form.addressId,
        clinicName: form.name,
        mobile: form.mobile,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        latitude: form.latitude,
        longitude: form.longitude,
        pharmacyName: form.pharmacyName,
        pharmacyRegistrationNo: form.pharmacyRegNum,
        pharmacyGst: form.pharmacyGST,
        pharmacyPan: form.pharmacyPAN,
        pharmacyAddress: form.pharmacyAddress,
        labName: form.labName,
        labRegistrationNo: form.labRegNum,
        labGst: form.labGST,
        labPan: form.labPAN,
        labAddress: form.labAddress,
      };

      const res = await AuthPut('users/updateAddress', updateData, token);

      if ((res as any)?.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Clinic updated successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        await fetchClinics();
        setForm({
          id: '',
          name: '',
          type: 'General',
          city: 'unknown',
          mobile: '',
          status: 'Active',
          Avatar: 'https://i.pravatar.cc/150?img=12',
          startTime: '',
          endTime: '',
          addressId: '',
          address: '',
          state: '',
          pincode: '',
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
        closeModal();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2:
            (res as any)?.message ||
            (res as any)?.data?.message ||
            'Failed to update clinic',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update clinic',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handlePharmacySubmit = async () => {
    if (!selectedClinic) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      const formData = new FormData();
      formData.append('userId', userId || '');
      formData.append('addressId', selectedClinic.addressId || '');
      formData.append('pharmacyName', form.pharmacyName);
      formData.append('pharmacyRegistrationNo', form.pharmacyRegNum);
      formData.append('pharmacyGst', form.pharmacyGST);
      formData.append('pharmacyPan', form.pharmacyPAN);
      formData.append('pharmacyAddress', form.pharmacyAddress);
      if (pharmacyHeaderFile) formData.append('pharmacyHeader', pharmacyHeaderFile as any);

      const response = await UploadFiles('users/addPharmacyToClinic', formData, token);
      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Pharmacy details added successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setPharmacyModalVisible(false);
        await fetchClinics();
      } else {
        Alert.alert("Warning", response?.message?.message)
        // Toast.show({
        //   type: 'error',
        //   text1: 'Error',
        //   text2: response?.message?.message || 'Failed to add pharmacy details',
        //   position: 'top',
        //   visibilityTime: 3000,
        // });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add pharmacy details',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLabSubmit = async () => {
    if (!selectedClinic) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      const formData = new FormData();
      formData.append('userId', userId || '');
      formData.append('addressId', selectedClinic.addressId || '');
      formData.append('labName', form.labName);
      formData.append('labRegistrationNo', form.labRegNum);
      formData.append('labGst', form.labGST);
      formData.append('labPan', form.labPAN);
      formData.append('labAddress', form.labAddress);
      if (labHeaderFile) formData.append('labHeader', labHeaderFile as any);

      const response = await UploadFiles('users/addLabToClinic', formData, token);

      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Lab details added successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setLabModalVisible(false);
        await fetchClinics();
      } else {
        Alert.alert("Warning", response?.message?.message)
        // Toast.show({
        //   type: 'error',
        //   text1: 'Error',
        //   text2: response?.message?.message || 'Failed to add lab details',
        //   position: 'top',
        //   visibilityTime: 3000,
        // });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add lab details',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addressId: any) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthPost(
        'users/deleteClinicAddress',
        { addressId },
        token
      );

      if ((response as any)?.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2:
            (response as any).data?.message ||
            (response as any).message ||
            'Clinic deleted successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setClinic((prev) =>
          prev.filter((c) => c.addressId !== addressId)
        );
        closeModal();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2:
            (response as any).data?.message ||
            (response as any).message ||
            'Failed to delete clinic',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Failed to delete clinic. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}></Text>
        {!isPhysiotherapist && (
  <TouchableOpacity
    style={styles.addButton}
    onPress={() => navigation.navigate('AddClinic')}
  >
    <Icon name="plus" size={20} color="#fff" />
    <Text style={styles.addButtonText}>Add Clinic</Text>
  </TouchableOpacity>
)}
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by Clinic Name "
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#6B7280"
          />
        </View>
      </View>

      {/* Main Clinic Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: height * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mode === 'view' && 'View Clinic Details'}
                {mode === 'edit' && 'Edit Clinic Details'}
                {mode === 'delete' && 'Delete Clinic'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {FIELD_CONFIGS.map((cfg) => {
                const value = String(form[cfg.key] ?? '');
                const isEditable =
                  mode === 'edit' &&
                  (cfg.editableInEdit === undefined ? true : cfg.editableInEdit);

                return (
                  <View key={String(cfg.key)} style={styles.inputGroup}>
                    <Text style={styles.label}>{cfg.label}</Text>

                    {mode === 'view' ? (
                      <Text style={styles.value}>{value || '—'}</Text>
                    ) : (
                      <TextInput
                        value={value}
                        onChangeText={(text) =>
                          setForm((prev) => ({ ...prev, [cfg.key]: text }))
                        }
                        style={[
                          styles.input,
                          !isEditable && { backgroundColor: '#f3f4f6', opacity: 0.8 },
                        ]}
                        editable={isEditable}
                        multiline={!!cfg.multiline}
                        keyboardType={cfg.keyboardType || 'default'}
                        placeholder={cfg.label}
                        placeholderTextColor="#6b7280"
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              {mode === 'edit' && (
                <TouchableOpacity style={styles.saveButton} onPress={handleEditSubmit}>
                  <Text style={styles.saveText}>Save Changes</Text>
                </TouchableOpacity>
              )}

              {mode === 'delete' && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(form.addressId)}
                >
                  <Text style={styles.deleteText}>Delete Clinic</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Header Upload Modal */}
      <Modal
        visible={headerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHeaderModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: height * 0.7 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Header and Signature</Text>
              <TouchableOpacity onPress={() => setHeaderModalVisible(false)} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Header Image</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handleFileChange('header')}
                >
                  {headerPreview ? (
                    <Image source={{ uri: headerPreview }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Icon name="image-outline" size={32} color="#6B7280" />
                      <Text style={styles.uploadText}>Tap to upload header image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Digital Signature (Optional)</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handleFileChange('signature')}
                >
                  {signaturePreview ? (
                    <Image source={{ uri: signaturePreview }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Icon name="draw" size={32} color="#6B7280" />
                      <Text style={styles.uploadText}>Tap to upload signature</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setHeaderModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !headerFile && styles.disabledButton]}
                onPress={handleHeaderSubmit}
                disabled={!headerFile}
              >
                <Text style={styles.saveText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pharmacy Modal */}
      <Modal
        visible={pharmacyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPharmacyModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: height * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pharmacy Details</Text>
              <TouchableOpacity onPress={() => setPharmacyModalVisible(false)} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pharmacy Name</Text>
                <TextInput
                  value={form.pharmacyName}
                  onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyName: text }))}
                  style={styles.input}
                  placeholder="Enter pharmacy name"
                  placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Registration Number</Text>
                <TextInput
                  value={form.pharmacyRegNum}
                  onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyRegNum: text }))}
                  style={styles.input}
                  placeholder="Enter registration number"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>GST Number</Text>
                <TextInput
                  value={form.pharmacyGST}
                  onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyGST: text }))}
                  style={styles.input}
                  placeholder="Enter GST number"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PAN Number</Text>
                <TextInput
                  value={form.pharmacyPAN}
                  onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyPAN: text }))}
                  style={styles.input}
                  placeholder="Enter PAN number"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pharmacy Address</Text>
                <TextInput
                  value={form.pharmacyAddress}
                  onChangeText={(text) => setForm(prev => ({ ...prev, pharmacyAddress: text }))}
                  style={[styles.input, { height: 80 }]}
                  multiline
                  placeholder="Enter pharmacy address"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pharmacy Header Image (Optional)</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handleFileChange('pharmacyHeader')}
                >
                  {pharmacyHeaderPreview ? (
                    <Image source={{ uri: pharmacyHeaderPreview }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Icon name="image-outline" size={32} color="#6B7280" />
                      <Text style={styles.uploadText}>Tap to upload pharmacy header</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPharmacyModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handlePharmacySubmit}
              >
                <Text style={styles.saveText}>Save Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lab Modal */}
      <Modal
        visible={labModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLabModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: height * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lab Details</Text>
              <TouchableOpacity onPress={() => setLabModalVisible(false)} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Lab Name</Text>
                <TextInput
                  value={form.labName}
                  onChangeText={(text) => setForm(prev => ({ ...prev, labName: text }))}
                  style={styles.input}
                  placeholder="Enter lab name"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Registration Number</Text>
                <TextInput
                  value={form.labRegNum}
                  onChangeText={(text) => setForm(prev => ({ ...prev, labRegNum: text }))}
                  style={styles.input}
                  placeholder="Enter registration number"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>GST Number</Text>
                <TextInput
                  value={form.labGST}
                  onChangeText={(text) => setForm(prev => ({ ...prev, labGST: text }))}
                  style={styles.input}
                  placeholder="Enter GST number"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PAN Number</Text>
                <TextInput
                  value={form.labPAN}
                  onChangeText={(text) => setForm(prev => ({ ...prev, labPAN: text }))}
                  style={styles.input}
                  placeholder="Enter PAN number"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Lab Address</Text>
                <TextInput
                  value={form.labAddress}
                  onChangeText={(text) => setForm(prev => ({ ...prev, labAddress: text }))}
                  style={[styles.input, { height: 80 }]}
                  multiline
                  placeholder="Enter lab address"
                   placeholderTextColor='gray'
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Lab Header Image (Optional)</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handleFileChange('labHeader')}
                >
                  {labHeaderPreview ? (
                    <Image source={{ uri: labHeaderPreview }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Icon name="image-outline" size={32} color="#6B7280" />
                      <Text style={styles.uploadText}>Tap to upload lab header</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setLabModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleLabSubmit}
              >
                <Text style={styles.saveText}>Save Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: height * 0.8, width: width * 0.9 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{previewTitle}</Text>
              <TouchableOpacity onPress={() => setImagePreviewModalVisible(false)} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setImagePreviewModalVisible(false)}
              >
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading clinics...</Text>
        </View>
      ) : (
        <ScrollView style={styles.clinicsContainer}>
          {clinics.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="hospital-building" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No clinics found</Text>
              <Text style={styles.emptyStateSubtext}>Add your first clinic to get started</Text>
            </View>
          ) : (
            clinics.map((clinic) => {
              const statusStyle = getStatusStyle(clinic.status);
              return (
                <View key={clinic.id} style={styles.card}>
                  <View style={styles.cardHeader}>

                    <View style={styles.placeholderCircle}>
                            <Text style={styles.placeholderText}>{clinic.name[0].toUpperCase() || ""}</Text>
                          </View>
                    {/* <Image source={{ uri: clinic.Avatar }} style={styles.avatar} /> */}
                    <View style={styles.clinicInfo}>
                      <Text style={styles.clinicName}>{clinic.name}</Text>
                      <Text style={styles.clinicType}>{clinic.type}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusStyle.backgroundColor },
                      ]}
                    >
                      <Text style={{ color: statusStyle.color, fontSize: 12, fontWeight: '600' }}>
                        {clinic.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.clinicDetails}>
                    <View style={styles.detailRow}>
                      <Icon name="map-marker" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{clinic.city}, {clinic.state}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Icon name="phone" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{clinic.mobile}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Icon name="clock-outline" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{formatTimeTo12Hour(clinic.startTime)} - {formatTimeTo12Hour(clinic.endTime)}</Text>
                    </View>
                  </View>

                  <View style={styles.actionsContainer}>
                    <View style={styles.actionGroup}>
                      <Text style={styles.actionGroupTitle}>Clinic Actions</Text>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openModal('view', clinic)}
                        >
                          <Text style={styles.actionButtonText}>View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openModal('edit', clinic)}
                        >
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>
                        {(!clinic.headerImage || !clinic.digitalSignature) && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openHeaderModal(clinic)}
                          >
                            <Text style={styles.actionButtonText}>
                              {!clinic.headerImage && !clinic.digitalSignature
                                ? 'Add Header & Signature'
                                : !clinic.headerImage
                                  ? 'Add Header'
                                  : 'Add Signature'
                              }
                            </Text>
                          </TouchableOpacity>
                        )}
                        {clinic.headerImage && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openImagePreview(clinic.headerImage!, 'Header Image')}
                          >
                            <Text style={styles.actionButtonText}>Preview Header</Text>
                          </TouchableOpacity>
                        )}
                        {clinic.digitalSignature && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openImagePreview(clinic.digitalSignature!, 'Digital Signature')}
                          >
                            <Text style={styles.actionButtonText}>Preview Signature</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.actionGroup}>
                      <Text style={styles.actionGroupTitle}>Pharmacy</Text>
                      <View style={styles.actionButtons}>
                        {clinic.pharmacyName ? (
                          <>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => openImagePreview(clinic.pharmacyHeaderImage || '', 'Pharmacy Header')}
                            >
                              {/* <Icon name="eye-outline" size={18} color="#10B981" /> */}
                              <Text style={styles.actionButtonText}>View</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => openPharmacyModal(clinic)}
                            >
                              {/* <Icon name="pencil-outline" size={18} color="#8B5CF6" /> */}
                              <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.addButtonSmall]}
                            onPress={() => openPharmacyModal(clinic)}
                          >
                            <Icon name="plus" size={18} color="#FFFFFF" />
                            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Add Pharmacy</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.actionGroup}>
                      <Text style={styles.actionGroupTitle}>Lab</Text>
                      <View style={styles.actionButtons}>
                        {clinic.labName ? (
                          <>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => openImagePreview(clinic.labHeaderImage || '', 'Lab Header')}
                            >
                              {/* <Icon name="eye-outline" size={18} color="#10B981" /> */}
                              <Text style={styles.actionButtonText}>View</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => openLabModal(clinic)}
                            >
                              {/* <Icon name="pencil-outline" size={18} color="#8B5CF6" /> */}
                              <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.addButtonSmall]}
                            onPress={() => openLabModal(clinic)}
                          >
                            <Icon name="plus" size={18} color="#FFFFFF" />
                            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Add Lab</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteAction}
                      onPress={() => openModal('delete', clinic)}
                    >
                      <Icon name="delete-outline" size={20} color="#EF4444" />
                      <Text style={styles.deleteActionText}>Delete Clinic</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

    </View>
  );
};

export default ClinicManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  clinicsContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  clinicType: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clinicDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  actionGroup: {
    marginBottom: 16,
  },
  actionGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  addButtonSmall: {
    backgroundColor: '#10B981',
  },
  deleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 6,
    gap: 8,
    marginTop: 8,
  },
  deleteActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    color: '#111827',
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  cancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  fullPreviewImage: {
    width: '100%',
    height: 300,
    marginBottom: 20,
    borderRadius: 8,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
     placeholderCircle: {
    width: 50, height: 50, borderRadius: 30, backgroundColor: '#1e3a5f',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  placeholderText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
});

