
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { Key, ReactNode, use, useEffect, useState } from 'react';
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
import AvailabilityScreen from './Availability';
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
  Avatar?: string; // Optional property for avatar URL
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
  const [search, setSearch] = useState(''); const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit' | 'delete' | null>(null);
  const [form, setForm] = useState({
    id: '',
    name:  '',
    type:  'General',
    city:  'unknown',
    mobile:  '',
    status: 'Active',
    Avatar: "https://i.pravatar.cc/150?img=12",
    startTime: '',
    endTime: '',
    addressId: '',
    address: '',
    state: '',
    pincode: '',
    country: 'India',
      latitude: '56.1304',
      longitude: '-106.3468'

  });


const fetchClinics = async () => {
     
      try {
        const token = await AsyncStorage.getItem('authToken');
        console.log('Auth Token:', token);
        const res = await AuthFetch('users/getClinicAddress', token);
        
  
        console.log('Response from API:', res);
  
        let data: any[] | undefined;
        if ('data' in res && Array.isArray(res.data?.data)) {
          data = res.data.data;
        } else {
          data = undefined;
        }
        console.log('Data fetched:', data);
        if (data && Array.isArray(data)) {
          
          const formattedClinics = data
  .filter((appt: any) => appt.status === 'Active') // ✅ Only 'Completed' = Active
  .map((appt: any) => ({
    id: appt.appointmentId || '',
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
    status: 'Active' as 'Active', // ✅ Hardcoded and explicitly typed
    Avatar: 'https://i.pravatar.cc/150?img=12',
    startTime: appt.startTime || '',
    endTime: appt.endTime || '',
  }));

          console.log('Formatted Clinics:', formattedClinics);
          

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
      const filteredClinics = totalClinics.filter((clinic) =>
        clinic.name.toLowerCase().includes(search.toLowerCase()) ||
        clinic.id.toLowerCase().includes(search.toLowerCase())
      );
    
      setClinic(filteredClinics);
    } else {
      setClinic(totalClinics);
    }
  }, [search, totalClinics]);
   const openModal = (type: 'view' | 'edit' | 'delete', clinic: Clinic) => {
      console.log('Opening modal for:', type, clinic);
    setForm({
      id: clinic.id,
      name: clinic.name,
      type: clinic.type || 'General',
      city: clinic.city || 'unknown',
      mobile: clinic.mobile || '',
      status: clinic.status || 'Active',
      Avatar: clinic.Avatar || "https://i.pravatar.cc/150?img=12",
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
  }

  const closeModal = () => {
    setModalVisible(false);
    setMode(null);
  };
  
  const handleEditSubmit = async () => {
    const token = await AsyncStorage.getItem('authToken');
    console.log(form, 'Form Data to be sent for update');
    try{
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
          // location: {
          //   type: "Point",
          //   coordinates: [
          //     parseFloat(form.longitude),
          //     parseFloat(form.latitude),
          //   ],
          // },
        };
        console.log('Update Data:', updateData);
      const res = await AuthPut('users/updateAddress', updateData, token);
      console.log('Response from API:', res);
      if (res.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Clinic updated successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        fetchClinics();
        setForm({ id: '',
    name:  '',
    type:  'General',
    city:  'unknown',
    mobile:  '',
    status: 'Active',
    Avatar: "https://i.pravatar.cc/150?img=12",
    startTime: '',
    endTime: '',
    addressId: '',
    address: '',
    state: '',
    pincode: '',
    country: 'India',
      latitude: '56.1304',
      longitude: '-106.3468' });
        closeModal();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: res.message || 'Failed to update clinic',
          position: 'top',
          visibilityTime: 3000,
        });
      }

    }catch (error) {
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
      const response = await AuthPost("/users/deleteClinicAddress", { addressId: addressId }, token);
      console.log('Response from API:', response);
      if (response.status ==='success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: (response as any).data?.message || (response as any).message || "Clinic deleted successfully",
          position: 'top',
          visibilityTime: 3000,
        });
        setClinic(prevClinics => prevClinics.filter(clinic => clinic.addressId !== form.addressId));
        closeModal();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: (response as any).data?.message || (response as any).message || "Failed to delete clinic",
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || "Failed to delete clinic. Please try again.",
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Clinic Management</Text>

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddClinic')}>
        <Text style={styles.addButtonText}>+ Add Clinic</Text>
      </TouchableOpacity>

      <View style={styles.searchBox}>
         <TextInput
          placeholder="Search by Clinic Name or ID"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        <Icon name="magnify" size={20} color="#6B7280" />
      </View>

      <Modal visible={modalVisible}  >
            
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>
              {mode === 'view' && 'Staff Details'}
              {mode === 'edit' && 'Edit Staff'}
              {mode === 'delete' && 'Delete Staff'}
            </Text>

            {['name', 'type', 'mobile', 'city', 'startTime', 'endTime'].map((field, i) => (
              <View key={i} style={styles.inputGroup}>
                <Text style={styles.label}>{field}</Text>
                {mode === 'view' ? (
                  <Text style={styles.value}>view clinic</Text>
                ) : (
                  <TextInput
                    value={
                      Array.isArray(form[field as keyof typeof form])
                        ? ''
                        : String(form[field as keyof typeof form] ?? '')
                    }
                    onChangeText={(text) => setForm({ ...form, [field]: text })}
                    style={styles.input}
                    editable={mode === 'edit'}
                  />
                )}
              </View>
            ))}
      
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
                {/* <TouchableOpacity>
                  <Icon name="eye-outline" size={20} color="#6B7280"  onPress={() => openModal('view', clinic)} />
                </TouchableOpacity> */}
                <TouchableOpacity>
                  <Icon name="pencil-outline" size={20} color="#6B7280"  onPress={() => openModal('edit', clinic)} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => openModal('delete', clinic)}>
                  <Icon name="delete-outline" size={20} color="#6B7280"  onPress={() => openModal('delete', clinic)} />
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
  clinicId: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
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
  bottomRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 40,
},

searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f1f5f9',
  borderRadius: 10,
  paddingHorizontal: 10,
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
