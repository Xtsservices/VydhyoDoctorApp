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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthFetch, AuthPost, AuthPut } from '../../auth/auth';
import Toast from 'react-native-toast-message';

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
  const [mode, setMode] = useState<'view' | 'edit' | 'delete' | null>(null);

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
    // { key: 'id', label: 'Clinic ID', editableInEdit: false },
    // { key: 'addressId', label: 'Address ID', editableInEdit: false },
    { key: 'name', label: 'Clinic Name' },
    { key: 'status', label: 'Status', editableInEdit: false },
    { key: 'type', label: 'Clinic Type' },
    { key: 'mobile', label: 'Mobile', keyboardType: 'phone-pad' },
    { key: 'address', label: 'Address', multiline: true },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'pincode', label: 'Pincode', keyboardType: 'number-pad' },
    { key: 'country', label: 'Country' },
    // { key: 'latitude', label: 'Latitude', keyboardType: 'decimal-pad' },
    // { key: 'longitude', label: 'Longitude', keyboardType: 'decimal-pad' },
    // { key: 'startTime', label: 'Start Time' },
    // { key: 'endTime', label: 'End Time' },
    // { key: 'Avatar', label: 'Avatar URL' },
  ];

  const fetchClinics = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await AuthFetch('users/getClinicAddress', token);

      let data: any[] | undefined;
      if ('data' in res && Array.isArray(res.data?.data)) {
        data = res.data.data;
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
          }));

        setTotalClinics(formattedClinics);
        setClinic(formattedClinics);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
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
    });
    setMode(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setMode(null);
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
        // If backend expects GeoJSON:
        // location: {
        //   type: 'Point',
        //   coordinates: [parseFloat(form.longitude), parseFloat(form.latitude)],
        // },
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
      console.error('Error updating clinic:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update clinic',
        position: 'top',
        visibilityTime: 3000,
      });
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
      console.error('Delete error:', err);
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
      <Text style={styles.header}>Clinic Management</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddClinic')}
      >
        <Text style={styles.addButtonText}>+ Add Clinic</Text>
      </TouchableOpacity>

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search by Clinic Name or ID"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="black"
        />
        <Icon name="magnify" size={20} color="#6B7280" />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>
              {mode === 'view' && 'View Clinic'}
              {mode === 'edit' && 'Edit Clinic'}
              {mode === 'delete' && 'Delete Clinic'}
            </Text>

            <ScrollView style={{ maxHeight: 420 }}>
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

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              {mode === 'edit' && (
                <TouchableOpacity style={styles.saveButton} onPress={handleEditSubmit}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              )}

              {mode === 'delete' && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(form.addressId)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={{ marginTop: 10 }}>
        {clinics.map((clinic) => {
          const statusStyle = getStatusStyle(clinic.status);
          return (
            <View key={clinic.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Image source={{ uri: clinic.Avatar }} style={styles.avatar} />
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusStyle.backgroundColor },
                  ]}
                >
                  <Text style={{ color: statusStyle.color, fontSize: 12 }}>
                    {clinic.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.clinicName}>{clinic.name}</Text>
              <Text style={styles.clinicType}>{clinic.type}</Text>

              <View style={styles.infoRow}>
                <Icon name="map-marker" size={16} color="#6B7280" />
                <Text style={styles.infoText}>{clinic.city}</Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="phone" size={16} color="#6B7280" />
                <Text style={styles.infoText}>{clinic.mobile}</Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => openModal('view', clinic)}>
                  <Icon name="eye-outline" size={20} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => openModal('edit', clinic)}>
                  <Icon name="pencil-outline" size={20} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => openModal('delete', clinic)}
                >
                  <Icon name="delete-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default ClinicManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: 'black',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: 'black',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    color: 'black',
  },
  clinicType: {
    color: '#6B7280',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    color: '#4B5563',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    color: '#555',
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: '#222',
    paddingVertical: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    color: 'black',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  cancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  iconButton: {
    paddingHorizontal: 6,
  },
});
