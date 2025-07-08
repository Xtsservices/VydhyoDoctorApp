
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthFetch } from '../../auth/auth';
import AvailabilityScreen from './Availability';

interface Clinic {
  id: string;
  name: string;
  type: string;
  city: string;
  mobile: string;
  status: 'Active' | 'Pending' | 'Inactive';
  Avatar?: string; // Optional property for avatar URL
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
          const formattedClinics = data.map((appt: any) => {
            let status: 'Active' | 'Pending' | 'Inactive';
            if (appt.appointmentStatus === 'Completed') {
              status = 'Active';
            } else if (appt.appointmentStatus === 'Pending') {
              status = 'Pending';
            } else {
              status = 'Inactive';
            }
            return {
              id: appt.appointmentId || '',
              name: appt.clinicName || '',
              type: appt.appointmentType || 'General',
              city: appt.city || 'unknown',
              mobile: appt.mobile || '',
              status,
              Avatar:"https://i.pravatar.cc/150?img=12"
            };
          });
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
                <TouchableOpacity>
                  <Icon name="eye-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Icon name="pencil-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity>
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
});
