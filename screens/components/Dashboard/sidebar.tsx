// Sidebar.js
import React from 'react';
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
import { useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';



const Sidebar = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userId');

      // Clear Redux user ID
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
          <Text style={styles.name}>Dr. Rohan Mehta</Text>
          <Text style={styles.title}>Cardiologist</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="right" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Public Profile Button */}
      <TouchableOpacity style={styles.profileButton}>
        <Feather name="eye" size={16} color="#007AFF" />
        <Text style={styles.profileButtonText}>View Public Profile</Text>
      </TouchableOpacity>

      {/* Menu Items */}
      <MenuItem
        icon="group"
        label="Staff Management"
        description="Update Staff Management"
        iconColor="#3B82F6"
        onPress={() => navigation.navigate('StaffManagement')}

      />
      <MenuItem
        icon="clock"
        label="Availability"
        description="Update Availability"
        iconColor="#3B82F6"
        onPress={() => navigation.navigate('Availability')}
      />
      <MenuItem
        icon="event-available"
        label="Manage Availability"
        description="Time slots, consultation modes, OPD hours"
        iconColor="#10B981"
      />
      <MenuItem
        icon="notifications"
        label="Notification Preferences"
        description="Email, SMS, push toggle controls"
        iconColor="#FBBF24"
      />
      <MenuItem
        icon="folder"
        label="Patient records"
        description="Total patient records"
        iconColor="#8B5CF6"
      />
      <MenuItem
        icon="support-agent"
        label="Support & Help"
        description="In-app chat with VYDY0 support"
        iconColor="#06B6D4"
      />
      <MenuItem
        icon="bug-report"
        label="Report a Bug / Feedback"
        description="Submit issue or feedback"
        iconColor="#EF4444"
      />
      <MenuItem
        icon="dashboard"
        label="My Performance Dashboard"
        description="Ratings, milestones, trust metrics"
        iconColor="#6366F1"
      />
      <MenuItem
        icon="account-balance-wallet"
        label="Earnings & Wallet"
        description="Shortcut to wallet and reports"
        iconColor="#0EA5E9"
      />
       <MenuItem
        icon="logout"
        label="Logout"
        description="Sign out of your account"
        iconColor="#EF4444"
         onPress={handleLogout}
      />
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
