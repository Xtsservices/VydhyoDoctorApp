import React, { use, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthPost, AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Patient = {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  age: number;
  phone: string;
  lastVisit: string;
  status:'New Walkin' | 'New HomeCare' | 'New Patient Walkthrough' | 'Followup Walkin' | 'Followup Video' | 'Followup Homecare';
  avatar: any;
};



const MyPatients: React.FC = () => {
  const [patients , setPatients] = useState<Patient[]>([]);
  const [totalPatients, setTotalPatients] = useState<Patient[]>([]);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [searchText, setSearchText] = useState('');

  const [selectedStatus, setSelectedStatus] = useState<'all' | 'New Walkin' | 'New HomeCare' | 'New Patient Walkthrough' | 'Followup Walkin' | 'Followup Video' | 'Followup Homecare'>('all');

  const options = [
    { label: 'All', value: 'all' },
    { label: 'New Walkin', value: 'new-walkin' },
    { label: 'New HomeCare', value: 'new-homecare' },
    { label: 'New Patient Walkthrough', value: 'new-patient-walkthrough' },
    { label: 'Followup Walkin', value: 'followup-walkin' },
    { label: 'Followup Video', value: 'followup-video' },
    { label: 'Followup Homecare', value: 'followup-homecare' },

  ];

  const fetchPatients = async () => {
   
    try {
      const token = await AsyncStorage.getItem('authToken');
      console.log('Auth Token:', token);
      const res = await AuthFetch(`appointment/getAppointmentsByDoctorID/patients`, token);

      console.log('Response from API:', res);

      let data: any[] = [];
      if ('data' in res && res.data && Array.isArray(res.data.data)) {
        data = res.data.data;
      } else {
        console.warn('No patient data found in response:', res);
      }
      console.log('Data fetched:', data);
      if (data && Array.isArray(data)) {
        const formattedPatients = data.map((patient: any) => ({
          id: patient._id,
          name: patient.patientName,
          gender: patient.gender,
          age: patient.age,
          phone: patient.phone,
          lastVisit: patient.lastVisit,
          status: patient.appointmentType,
          avatar: "https://i.pravatar.cc/150?img=12",
         
        }));
        setPatients(formattedPatients);
        setTotalPatients(formattedPatients)


      }

      // Simulate fetching data from an API
      console.log('Fetched patients:', patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedStatus === 'all') {
      setPatients(totalPatients);
    } else {
      console.log(selectedStatus, 'selectedStatus in useEffect');
      const filteredPatients = totalPatients.filter(
        (patient) => patient.status === selectedStatus
      );
      console.log('Filtered Patients:', filteredPatients);
      console.log('Total Patients:', totalPatients);
      setPatients(filteredPatients);
    }

     if (searchText.trim() !== '') {
    console.log(searchText, 'searching for keyword');
    const keyword = searchText.toLowerCase();
    // The following lines reference 'filtered' and 'appt', which are not defined in this scope.
    // If you want to filter patients by searchText, you should filter totalPatients or patients.
    const filteredPatients = patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(keyword) ||
        patient.id.toLowerCase().includes(keyword)
    );
    setPatients(filteredPatients);
  }
  }, [selectedStatus, totalPatients, searchText]);


//   const handleSearch = () => {
//   const query = searchText.trim().toLowerCase();
//   console.log('Search Query:', query);

//   if (!query) {
//     setPatients(patients); // show all if search is empty
//     return;
//   }

//   const filtered = patients.filter((patient) =>
//     patient.id.toLowerCase().includes(query) ||
//     patient.name.toLowerCase().includes(query)
//   );

//   setPatients(filtered);
// };


  console.log(selectedStatus, 'selectedStatus');


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
        <TouchableOpacity>
          {/* <Image
            source={''}
            style={styles.profileIcon}
          /> */}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
  placeholder="Search by Patient ID or Name"
  placeholderTextColor="#999"
  style={styles.searchInput}
  value={searchText}
  onChangeText={(text) => setSearchText(text)}
  //  onPress={handleSearch}
/>

       
        <TouchableOpacity>
          <Icon name="filter-variant" size={24} color="#007AFF" onPress={() => setDropdownVisible((prev) => !prev)} />
           
        </TouchableOpacity>
       
      </View>

      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={item.avatar} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.id}>ID: {item.id}</Text>
              <Text style={styles.details}>
                {item.gender}, {item.age} years
              </Text>
              <Text style={styles.phone}>{item.phone}</Text>
              <Text style={styles.lastVisit}>Last Visit: {item.lastVisit}</Text>
            </View>
            <View
              style={[
                styles.statusTag,
                item.status === 'New Walkin' ||
                item.status === 'New HomeCare' ||
                item.status === 'New Patient Walkthrough'
                  ? styles.newTag
                  : styles.followUpTag,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  item.status === 'New Walkin' ||
                  item.status === 'New HomeCare' ||
                  item.status === 'New Patient Walkthrough'
                    ? styles.newText
                    : styles.followUpText,
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
        )}
      />
     
       {dropdownVisible && (
          <View style={styles.dropdown}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSelectedStatus(option.value as typeof selectedStatus);
                  setDropdownVisible(false);
                }}
                style={styles.dropdownOption}
              >
                <Text style={styles.dropdownText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      
    </View>
  );
};

export default MyPatients;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    marginTop: 4,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  id: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  details: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
  },
  phone: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
    marginTop: 2,
  },
  lastVisit: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusTag: {
    position: 'absolute',
    top: 10,
    right: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  newTag: {
    backgroundColor: '#DCFCE7',
  },
  followUpTag: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  newText: {
    color: '#15803D',
  },
  followUpText: {
    color: '#B45309',
  },
  dropdownWrapper: {
  // position: 'relative',
  marginLeft: 10,
},

filterButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#E8F0FE',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
},

filterButtonText: {
  color: '#007AFF',
  marginRight: 6,
},

dropdown: {
  position: 'absolute',
  top: 100,
  right: 0,
  backgroundColor: '#fff',
  borderRadius: 8,
  elevation: 5,
  zIndex: 999,
  width: 150,
  paddingVertical: 8,
},

dropdownOption: {
  paddingVertical: 8,
  paddingHorizontal: 12,
},

dropdownText: {
  fontSize: 14,
  color: '#1E293B',
},

});

