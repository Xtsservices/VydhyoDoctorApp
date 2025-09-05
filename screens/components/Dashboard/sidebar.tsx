// Sidebar.js
import React, { use, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
const PLACEHOLDER_IMAGE = require('../../assets/img.png'); 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { AuthFetch, AuthPost } from '../../auth/auth';
import { Alert } from 'react-native';


const Sidebar = () => {
  const navigation = useNavigation<any>();
const currentuserDetails =  useSelector((state: any) => state?.currentUser);
    const doctorId = currentuserDetails?.role==="doctor"? currentuserDetails?.userId : currentuserDetails?.createdBy
    console.log(currentuserDetails?.access, "currentuserdeils")
    const [department, setDepartment] = useState(currentuserDetails?.specialization?.name)
const [access, setAccess] = useState<string[]>(currentuserDetails?.access); // ← You’ll receive this from backend

const confirmLogout = () => {
  Alert.alert(
    'Confirm Logout',
    'Are you sure you want to log out?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: handleLogout,
      },
    ],
    { cancelable: true }
  );
};

const menuItems = [
  {
    key: 'dashboard',
    label: ' Dashboard',
    description: 'Ratings, milestones, trust metrics',
    icon: 'dashboard',
    onPress: () => navigation.navigate('DoctorDashboard'),
  },
  {
    key: 'appointments',
    label: 'Appointments',
    description: 'Manage your appointments',
    icon: 'event',
    onPress: () => navigation.navigate('Appointments'),
  },
  {
    key: 'viewPatient',
    label: 'My Patient',
    description: 'Total patient',
    icon: 'groups',
    onPress: () => navigation.navigate('MyPatient'),
  },
  {
      key: 'prescription',
      label: 'E Prescription',
      description: 'Patient Prescription',
      icon: 'description',
      onPress: () => navigation.navigate('EPrescriptionList'),
    },
  {
    key: 'labs',
    label: 'Labs',
    description: 'Labs',
    icon: 'science',
      onPress: () => navigation.navigate('Labs'),

  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    description: 'Pharmacy',
    icon: 'folder',
    onPress: () => navigation.navigate('Pharmacy'),
  },
  {
    key: 'staff',
    label: 'Staff Management',
    description: 'Update Staff Management',
    icon: 'settings',
    onPress: () => navigation.navigate('StaffManagement'),
  },
  {
    key: 'clinic',
    label: 'Clinic Management',
    description: 'Manage clinic settings and information',
    icon: 'star',
    onPress: () => navigation.navigate('Clinic'),
  },
  {
    key: 'availability',
    label: 'Availability',
    description: 'Update Availability',
    icon: 'event',
    onPress: () => navigation.navigate('Availability'),
  },
  {
    key: 'accounts',
    label: 'Accounts',
    description: 'Accounts ',
    icon: 'receipt',
    onPress: () => navigation.navigate('Accounts'),
  },
  {
    key: 'reviews',
    label: 'Reviews',
    description: 'Manage reviews and ratings',
    icon: 'reviews',
    onPress: () => navigation.navigate('Reviews'),
  },
  {
    key: 'Logout',
    label: 'Logout',
    description: 'Sign out of your account',
    icon: 'logout',
    onPress: confirmLogout,
  },
];


  const dispatch = useDispatch();
      const userId = useSelector((state: any) => state.currentUser);
  console.log('Current User ID:', userId);

  const fetchUserData = async () => {
    try {
       const storedToken = await AsyncStorage.getItem('authToken');
            const storedUserId = await AsyncStorage.getItem('userId');
            // const storedStep = await AsyncStorage.getItem('currentStep');
      
            if (storedToken && storedUserId) {
              const profileResponse = await AuthFetch(`users/getUser/${doctorId}`, storedToken);
              console.log('Profile response:', profileResponse);
              if (profileResponse.status === 'success') {
                if (profileResponse.data.data.role !== 'doctor'){
                  console.log(profileResponse.data.data.specialization.name, "department")
setDepartment (profileResponse.data.data.specialization.name)
                }
                if (profileResponse.data.data.access && Array.isArray(profileResponse.data.data.access)) {
  const accessMap: { [key: string]: string } = {
    viewPatients: 'viewPatient',
    dashboard: 'dashboard',
    appointments: 'appointments',
    availability: 'availability',
    labs: 'labs',
    pharmacy: 'pharmacy',
    staff: 'staff',
    clinic: 'clinic',
    accounts: 'accounts',
    reviews: 'reviews',
  };
  console.group( profileResponse.data.data.access)

  const transformedAccess = profileResponse.data.data.access.map(item => accessMap[item])
  setAccess(transformedAccess);
}

              }
                
              
              console.log('Access:', access);

              // setAccess(access);
      
              if (
                profileResponse.status === 'success' &&
                'data' in profileResponse &&
                profileResponse.data
              ) {
                const userData = profileResponse.data.data;
            dispatch({ type: 'currentUser', payload: userData });

                dispatch({ type: 'currentUserID', payload: storedUserId });
          
      
                // Toast.show({
                //   type: 'success',
                //   text1: 'Success',
                //   text2: 'Auto-login successful',
                //   position: 'top',
                //   visibilityTime: 3000,
                // });
      
              } 
             
            } 
     
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);
  

  const handleLogout = async () => {
    try {
      // Clear AsyncStorage
       const storedToken = await AsyncStorage.getItem('authToken');

       const response = await AuthPost("auth/logout", storedToken);

       console.log(response, 'logoutresponse ')
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');

      // Clear Redux user ID
            dispatch({ type: 'currentUser', payload: null });

      dispatch({ type: 'currentUserID', payload: null });

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Logged out successfully',
        position: 'top',
        visibilityTime: 3000,
      });
     navigation.navigate('Login'); // Navigate to Login screen
     return;
    } catch (error) {
      console.error('Error during logout:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to log out. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const name = currentuserDetails?.role === 'doctor' ? `Dr.${currentuserDetails?.firstname} ${currentuserDetails?.lastname}` : `${currentuserDetails?.firstname} ${currentuserDetails?.lastname}`
console.log(department, 'departmetn')
  return (
   <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={PLACEHOLDER_IMAGE} // Replace with actual profile image
          style={styles.profileImage}
        />
        <View style={styles.headerText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.title}>{department}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="right" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Public Profile Button */}
      <TouchableOpacity 
        style={styles.profileButton} 
        onPress={() => navigation.navigate('Profile')}
      >
        <Feather name="eye" size={16} color="#007AFF" />
        <Text style={styles.profileButtonText}>View Public Profile</Text>
      </TouchableOpacity>

      {
  (currentuserDetails?.role === 'doctor'
    ? menuItems
    : menuItems?.filter(item => access?.includes(item.key) || item.key === 'Logout') // always allow logout
  ).map((item, index) => (
    <MenuItem
      key={index}
      icon={item.icon}
      label={item.label}
      description={item.description}
      iconColor="#8B5CF6"
      onPress={item.onPress}
    />
  ))
}


      {/* Menu Items */}
     
    </ScrollView>
  );
};

type MenuItemProps = {
  icon: string;
  label: string;
  description: string;
  iconColor: string;
  onPress?: () => void;
};
const MenuItem: React.FC<MenuItemProps> = ({ icon, label, description, iconColor, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}10` }]}>
      <MaterialIcon name={icon} size={18} color={iconColor} />
    </View>
    <View>
      <Text style={styles.menuText}>{label}</Text>
      <Text style={styles.subText}>{description}</Text>
    </View>
  </TouchableOpacity>
);


const MaterialIcon = Icon; // Short alias

const styles = StyleSheet.create({
     container: {
    flex: 1, // Ensure container takes full available space
    backgroundColor: '#fff',
  },
  scrollView: {
    flexGrow: 1, // Allow ScrollView to expand
     backgroundColor: '#fff',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20, // Add padding to ensure last item is fully visible
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
     backgroundColor: '#fff',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  title: {
    fontSize: 14,
    color: '#007AFF',
  },
  profileButton: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 20,
  },
  profileButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  subText: {
    fontSize: 12,
    color: '#555',
  },
});

export default Sidebar;
