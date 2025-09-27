import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
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

const Sidebar = () => {
  const navigation = useNavigation<any>();
  const currentuserDetails = useSelector((state: any) => state?.currentUser);
  const doctorId =
    currentuserDetails?.role === 'doctor'
      ? currentuserDetails?.userId
      : currentuserDetails?.createdBy;
  const [department, setDepartment] = useState<string | undefined>(
    currentuserDetails?.specialization?.name
  );
  const [access, setAccess] = useState<string[]>(
    Array.isArray(currentuserDetails?.access) ? currentuserDetails.access : []
  );



  // Get profile picture from currentuserDetails
  const profilePic = currentuserDetails?.profilepic;

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
      key: 'my-patient',
      label: 'My Patient',
      description: 'Total patient',
      icon: 'groups',
      onPress: () => navigation.navigate('MyPatient'),
    },
    {
      key: 'prescription',
      label: 'Digital-Prescription',
      description: 'Patient Prescription',
      icon: 'description',
      onPress: () => navigation.navigate('EPrescriptionList'),
    },
    {
      key: 'labs',
      label: 'Labs',
      description: 'Labs',
      icon: 'science',
      onPress: () => navigation.navigate('labs'),
    },
    {
      key: 'pharmacy',
      label: 'Pharmacy',
      description: 'Pharmacy',
      icon: 'local-pharmacy',
      onPress: () => navigation.navigate('Pharmacy'),
    },
    {
      key: 'staff-management',
      label: 'Staff Management',
      description: 'Update Staff Management',
      icon: 'people',
      onPress: () => navigation.navigate('StaffManagement'),
    },
    {
      key: 'clinic-management',
      label: 'Clinic Management',
      description: 'Manage clinic settings and information',
      icon: 'business',
      onPress: () => navigation.navigate('Clinic'),
    },
    {
      key: 'availability',
      label: 'Availability',
      description: 'Update Availability',
      icon: 'schedule',
      onPress: () => navigation.navigate('Availability'),
    },
    {
      key: 'billing',
      label: 'Billing',
      description: 'All Bills ',
      icon: 'receipt',
      onPress: () => navigation.navigate('Billing'),
    },
    {
      key: 'accounts',
      label: 'Accounts',
      description: 'Accounts ',
      icon: 'account-balance',
      onPress: () => navigation.navigate('Accounts'),
    },
    {
      key: 'reviews',
      label: 'Reviews',
      description: 'Manage reviews and ratings',
      icon: 'star',
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

  const fetchUserData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');

      if (storedToken) {
        const profileResponse = await AuthFetch(
          `users/getUser?userId=${doctorId}`,
          storedToken
        );
        if (profileResponse?.status === 'success' && profileResponse.data) {
          const userData = profileResponse.data.data;

          if (userData?.role !== 'doctor') {
            setDepartment(userData?.specialization?.name || department);
          }
          if (userData?.access && Array.isArray(userData.access)) {
            const accessMap: { [key: string]: string } = {
              viewPatients: 'my-patient',
              myPatients: 'my-patient',
              dashboard: 'dashboard',
              appointments: 'appointments',
              availability: 'availability',
              labs: 'labs',
              pharmacy: 'pharmacy',
              staff: 'staff-management',
              staffManagement: 'staff-management',
              clinic: 'clinic-management',
              clinicManagement: 'clinic-management',
              accounts: 'accounts',
              billing: 'billing',
              reviews: 'reviews',
              digitalPrescription: 'prescription',
              prescription: 'prescription',
            };

            const transformedAccess = userData.access
              .map((item: string) => accessMap[item])
              .filter((item: string | undefined) => item !== undefined);

            setAccess(transformedAccess as string[]);
          }
          dispatch({ type: 'currentDoctor', payload: userData });
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as any).message
          : 'Failed to fetch user data. Please try again.'
      );
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [doctorId]);

  const handleLogout = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const response = await AuthPost('auth/logout', {}, storedToken);

      Alert.alert('Success', response?.message || 'Logged out successfully');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');

      dispatch({ type: 'currentUser', payload: null });
      dispatch({ type: 'currentUserID', payload: null });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Logged out successfully',
        position: 'top',
        visibilityTime: 3000,
      });

      navigation.navigate('Login');
      return;
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to log out. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const imageSource = profilePic
  const name =
    currentuserDetails?.role === 'doctor'
      ? `Dr. ${currentuserDetails?.firstname || ''} ${currentuserDetails?.lastname || ''}`
      : `${currentuserDetails?.firstname || ''} ${currentuserDetails?.lastname || ''}`;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        {imageSource ? (
          <Image
            source={{ uri: imageSource }}
            style={styles.profileImage}
            resizeMode="cover"
            onError={(e) => {
            }}
          />
        ) : (
          <View style={styles.placeholderCircle}>
            <Text style={styles.placeholderText}>
              {(currentuserDetails?.firstname?.[0]?.toUpperCase() || '') +
                (currentuserDetails?.lastname?.[0]?.toUpperCase() || '')}
            </Text>
          </View>
        )}

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
        <Text style={styles.profileButtonText}>View Profile</Text>
      </TouchableOpacity>

      {(currentuserDetails?.role === 'doctor'
        ? menuItems
        : menuItems?.filter(
          (item) => access?.includes(item.key) || item.key === 'Logout'
        )
      ).map((item, index) => (
        <MenuItem
          key={index}
          icon={item.icon}
          label={item.label}
          description={item.description}
          iconColor="#8B5CF6"
          onPress={item.onPress}
        />
      ))}
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

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  description,
  iconColor,
  onPress,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}10` }]}>
      <Icon name={icon} size={18} color={iconColor} />
    </View>
    <View>
      <Text style={styles.menuText}>{label}</Text>
      <Text style={styles.subText}>{description}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#fff',
  },
  header: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
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
  placeholderCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
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