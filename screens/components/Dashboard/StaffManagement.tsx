import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, ScrollView } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthPost, AuthFetch, AuthPut } from '../../auth/auth';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

interface Staff {
  profilepic: string;
  DOB: any;
  gender: string;
  mobile: string;
  userId: string;
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Online' | 'Offline' | 'Blocked';
  avatar: string;
  lastLogin: string;
  isBlocked?: boolean;
  access?: string[];
}

const StaffManagement = () => {
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails.role === "doctor" ? currentuserDetails.userId : currentuserDetails.createdBy;
  const userId = doctorId;

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'doctor':
        return '#A855F7';
      case 'assistant':
        return '#F97316';
      case 'receptionist':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const navigation = useNavigation<any>();

  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit' | 'delete' | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    gender: '',
    DOB: '',
    profilepic: {},
    access: [] as string[],
    role: ''
  });

  const accessOptions = [
    { value: "my-patients", label: "My Patients" },
    { value: "appointments", label: "Appointments" },
    { value: "labs", label: "Labs" },
    { value: "dashboard", label: "Dashboard" },
    { value: "pharmacy", label: "Pharmacy" },
    { value: "availability", label: "Availability" },
    { value: "staff-management", label: "Staff Management" },
    { value: "clinic-management", label: "Clinic Management" },
    { value: "billing", label: "Billing" },
    { value: "reviews", label: "Reviews" },
  ];

  const [staffData, setStaffData] = useState<Staff[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [accessDropdownVisible, setAccessDropdownVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'Lab Assistant' | 'Pharmacy Assistant' | 'Assistant' | 'Receptionist'>('all');

  const options = [
    { label: 'All', value: 'all' },
    { label: 'Lab Assistant', value: 'lab_assistant' },
    { label: 'Pharmacy Assistant', value: 'pharmacy_assistant' },
    { label: 'Assistant', value: 'assistant' },
    { label: 'Receptionist', value: 'receptionist' },
  ];

  const [searchText, setSearchText] = useState('');
  const [originalStaffData, setOriginalStaffData] = useState<Staff[]>([]);
  const [fetchLoading, setFetchLoading] = useState<boolean>(false);

  const openModal = (type: 'view' | 'edit' | 'delete', staff: Staff) => {
    setSelectedStaff(staff);
    setForm({
      userId: staff.userId,
      firstName: staff.name.split(' ')[0],
      lastName: staff.name.split(' ')[1] || '',
      email: staff.email,
      mobile: staff.mobile || '',
      gender: staff.gender || '',
      DOB: staff.DOB || 'N/A',
      profilepic: staff.profilepic || {},
      access: staff.access || [],
      role: staff.role || '',
    });
    setMode(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setMode(null);
    setSelectedStaff(null);
    setAccessDropdownVisible(false);
  };

  const handleEditSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const formatDOBToDDMMYYYY = (dobString: string): string => {
        const date = new Date(dobString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const { firstName, lastName, ...restForm } = form;
      const payload = {
        ...restForm,
        stafftype: form.role,
        userId: form.userId,
        DOB: form.DOB,
        firstname: form.firstName,
        lastname: form.lastName
      };

      const res = await AuthPut('doctor/editReceptionist', payload, token);
      if (res.status === 'success') {
        fetchStaff();
        Alert.alert('Success', 'Staff updated successfully');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Edited Successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        closeModal();
        return;
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update staff');
    }
  };

  const handleDelete = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await AuthFetch(`users/deleteMyAccount?userId=${selectedStaff?.userId}`, token);
      if (res?.data?.status === 'success') {
        fetchStaff();
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Staff Deleted Successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        closeModal();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to delete staff');
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      setStaffData(originalStaffData);
    } else {
      const filtered = originalStaffData.filter((staff) =>
        staff.email.toLowerCase().includes(text.toLowerCase())
      );
      setStaffData(filtered);
    }
  };

  useEffect(() => {
    if (selectedStatus !== 'all') {
      const filtered = originalStaffData.filter((staff) =>
        staff.role.toLowerCase() === selectedStatus.toLowerCase()
      );
      setStaffData(filtered);
    } else {
      setStaffData(originalStaffData);
    }
  }, [selectedStatus]);

  const fetchStaff = async () => {
    if (!userId) return;
    try {
      setFetchLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`doctor/getStaffByCreator/${userId}`, token);

      let filterData: any[] = [];
      if ('data' in response && response.data && Array.isArray(response.data.data)) {
        filterData = response.data.data.filter(
          (each: { userId: any }) => each.userId !== currentuserDetails.createdBy
        );
      }

      const sortedData = [...filterData].sort((a, b) => {
        const dateA = new Date(a.joinDate).getTime();
        const dateB = new Date(b.joinDate).getTime();
        return dateB - dateA;
      });

      const formattedData: Staff[] = sortedData.map((staff, index) => ({
        id: staff._id || String(index + 1),
        name: staff.name,
        userId: staff.userId,
        role: staff.stafftype || 'Unknown',
        email: staff.email,
        mobile: staff.mobile || 'N/A',
        gender: staff.gender || 'Unknown',
        DOB: staff.DOB || 'N/A',
        profilepic: staff.profilepic || '',
        avatar: staff.avatar || 'https://via.placeholder.com/150',
        status: staff.isLoggedIn ? 'Online' : (staff.status?.toLowerCase() === 'blocked' ? 'Blocked' : 'Offline'),
        lastLogin: staff.lastLogin && staff.lastLogin !== "N/A"
          ? dayjs(staff.lastLogin).isValid()
            ? dayjs(staff.lastLogin).format("YYYY-MM-DD HH:mm:ss")
            : staff.lastLogin
          : "-",
        isBlocked: staff.status?.toLowerCase() === 'blocked',
        access: staff.access || []
      }));

      setOriginalStaffData(formattedData);
      setStaffData(formattedData);
    } catch (error: any) {
      let errorMessage = 'Failed to fetch staff data';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      Alert.alert('Error Fetching Staff', errorMessage);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const renderStaffCard = ({ item }: { item: Staff }) => (
    <View style={styles.card}>
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
        ) : (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
          <View style={[
            styles.statusDot,
            {
              backgroundColor:
                item.status === 'Online' ? '#22C55E' :
                item.status === 'Offline' ? '#FBBF24' : 'gray',
            },
          ]} />
        </View>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.lastLogin}>
          {item.isBlocked ? 'Account blocked' : `Last login: ${item.lastLogin}`}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.actionIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => openModal('view', item)}>
            <Icon name="visibility" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => openModal('edit', item)}>
            <Icon name="edit" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => openModal('delete', item)}>
            <Icon name="delete" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearch}
            placeholder="Search by email"
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.filterButton}>
            <Icon name="filter-list" size={24} color="#fff" onPress={() => setDropdownVisible((prev) => !prev)} />
          </TouchableOpacity>
        </View>
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

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddStaff')}>
        <Text style={styles.addButtonText}>+ Add Staff</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.title}>
                {mode === 'view' && 'Staff Details'}
                {mode === 'edit' && 'Edit Staff'}
                {mode === 'delete' && 'Delete Staff'}
              </Text>

              {['firstName', 'lastName', 'email', 'mobile', 'gender', 'DOB', 'access'].map((field, i) => (
                <View key={i} style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {field === 'firstName' ? 'Firstname' : 
                     field === 'lastName' ? 'Lastname' : 
                     field === 'DOB' ? 'Date of Birth' : 
                     field === 'access' ? 'Access' : 
                     field.charAt(0).toUpperCase() + field.slice(1)}
                  </Text>
                  {mode === 'view' ? (
                    <Text style={styles.value}>
                      {field === 'access'
                        ? Array.isArray(form.access)
                          ? form.access.join(', ')
                          : ''
                        : String(form[field as keyof typeof form] ?? '')}
                    </Text>
                  ) : field === 'access' ? (
                    <>
                      <View style={styles.accessContainer}>
                        {Array.isArray(form.access) &&
                          form.access.map((item, index) => (
                            <View key={index} style={styles.accessItem}>
                              <Text style={styles.accessText}>{item}</Text>
                              <Text
                                style={styles.removeButton}
                                onPress={() =>
                                  setForm({
                                    ...form,
                                    access: form.access.filter((_, i) => i !== index),
                                  })
                                }
                              >
                                ✕
                              </Text>
                            </View>
                          ))}
                      </View>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setAccessDropdownVisible((prev) => !prev)}
                      >
                        <Text style={styles.dropdownButtonText}>Select access to add...</Text>
                        <Icon name={accessDropdownVisible ? "arrow-drop-up" : "arrow-drop-down"} size={20} color="#6B7280" />
                      </TouchableOpacity>
                      {accessDropdownVisible && (
                        <View style={styles.accessDropdown}>
                          <ScrollView >
                            {accessOptions.map((option) => (
                              <TouchableOpacity
                                key={option.value}
                                onPress={() => {
                                  if (!form.access.includes(option.value)) {
                                    setForm({ ...form, access: [...form.access, option.value] });
                                  }
                                  setAccessDropdownVisible(false);
                                }}
                                style={styles.dropdownOption}
                              >
                                <Text style={styles.dropdownText}>{option.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  ) : field === 'mobile' ? (
                    <TextInput
                      value={String(form.mobile ?? '')}
                      onChangeText={(text) => {
                        const onlyDigits = text.replace(/\D/g, '').slice(0, 10);
                        setForm({ ...form, mobile: onlyDigits });
                      }}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.input}
                      editable={mode === 'edit'}
                      placeholder="10-digit mobile"
                    />
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
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FlatList
        data={staffData}
        keyExtractor={(item) => item.id}
        renderItem={renderStaffCard}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
            <Text style={{ fontSize: 16, color: '#6B7280' }}>No staff found.</Text>
          </View>
        }
      />
    </View>
  );
};

export default StaffManagement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F0FDF4',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginRight: 8,
    color: 'black',
  },
  filterButton: {
    padding: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 40,
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
  },
  lastLogin: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    marginTop: 8,
  },
  iconButton: {
    paddingHorizontal: 6,
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
  modalScrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: '#111827',
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
    color: 'black',
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
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  dropdown: {
    position: 'absolute',
    top: 55,
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
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: '#f6f8fcff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  accessContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  accessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  accessText: {
    marginRight: 6,
    color: 'black',
  },
  removeButton: {
    color: 'red',
    fontWeight: 'bold',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
    marginTop: 8,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#6B7280',
  },
  accessDropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    elevation: 5,
    zIndex: 999,
    marginTop: 4,
    width: '100%',
  },
});