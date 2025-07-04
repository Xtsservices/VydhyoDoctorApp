import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator, View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ScrollView,FlatList ,Animated} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Footer from './Footer';
import Sidebar from './sidebar';
import { useNavigation } from '@react-navigation/native';
const StethoscopeIcon = require('../../assets/doc.png')
const today_image = require('../../assets/Frame.png')
const total = require('../../assets/i.png')
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { AuthFetch } from '../../auth/auth';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// import { PieChart } from 'react-native-svg-charts';
// import { AntDesign } from '@expo/vector-icons';
// import PieChart from 'react-native-pie-chart';
// import { PieChart } from 'react-native-chart-kit';

import DateTimePicker from '@react-native-community/datetimepicker';
// import { Ionicons } from '@expo/vector-icons';
// import { VERTICAL } from 'react-native/types_generated/Libraries/Components/ScrollView/ScrollViewContext';

interface FormData {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  practice: string;
  consultationPreferences: string;
  bank: string;
  accountNumber: string;
}




const { width, height } = Dimensions.get('window');
const PLACEHOLDER_IMAGE = require('../../assets/img.png'); 
const screenWidth = Dimensions.get('window').width;

const DoctorDashboard = () => {
    const navigation = useNavigation<any>();
  
  const [currentDate, setCurrentDate] = useState(new Date('2025-06-27T16:12:00+05:30')); // Set to 04:12 PM IST, June 27, 2025
 const [sidebarVisible, setSidebarVisible] = useState(false);
   const [loading, setLoading] = useState(false);
   const [newAppointments, setNewAppointments] = useState<any[]>([]);
   const [followUps, setFollowUps] = useState<any[]>([]);
//    const [date, setDate] = useState(new Date()); // today's date by default
// const [showPicker, setShowPicker] = useState(false);

const [filteredAppointments, setFilteredAppointments] = useState([]);
   const [formData, setFormData] = useState<FormData>({
       name: '',
       email: '',
       phone: '',
       specialization: '',
       practice: '',
       consultationPreferences: '',
       bank: '',
       accountNumber: '',
     });

     const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [patients, setPatients] = useState([]);
  // const [loading, setLoading] = useState(true);
  const [viewAll, setViewAll] = useState(false);
 
  const slideAnim = useRef(new Animated.Value(width)).current;
    const userId = useSelector((state: any) => state.currentUserID);
    console.log('User ID:', userId);
  const API_BASE_URL = "http://192.168.1.44:3000";
  const [appointments, setAppointments] = useState<any[]>([]);
    const [dashboardData, setDashboardData] = useState({
    success: true,
    totalAmount: { today: 12450, week: 0, month: 3385200, total: 0 },
    appointmentCounts: {
      today: 0,
      newAppointments: 0,
      followUp: 0,
      upcoming: 0,
      completed: 0,
      rescheduled: 0,
      cancelled: 0,
      active: 0,
      total: 0,
    },
  }); 
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);

  
  
    const getAppointments = async () => {
  try {
    console.log("Fetching appointments...");
    const storedToken = await AsyncStorage.getItem('authToken');
    console.log('Stored Token:', storedToken);
   const date = new Date();
const formattedDate = date.toISOString().split('T')[0];
console.log('Formatted Date:', formattedDate);
const response = await AuthFetch(
  `appointment/getAppointmentsByDoctorID/appointment?date=${formattedDate}`,
  storedToken
);

console.log('Response from getAllAppointments:', response);

    // Success case
    if (
      response.status === 'success' &&
      'data' in response &&
      response.data &&
      typeof response.data === 'object'
    ) {
      const data = response.data.data|| []


      // Save to async storage
      await AsyncStorage.setItem('appointments', JSON.stringify(data));

      // Set main list
      setAppointments(data);

      // Filter new appointments
      const newList = data.filter((item:any )=> !item.isFollowUp);
      const followUpList = data.filter((item: any) => item.isFollowUp);

      setNewAppointments(newList);
      setFollowUps(followUpList);

      console.log("New:", newList.length, "Follow-ups:", followUpList.length);
    } else {
      console.warn("Server responded with error, falling back to local appointments...");

      const storedData = await AsyncStorage.getItem('appointments');
      const fallbackData = storedData
        ? JSON.parse(storedData)
        : {
            totalAppointments: [],
          };

      setAppointments(fallbackData?.totalAppointments);
      setNewAppointments(fallbackData?.totalAppointments.filter((a:any) => !a.isFollowUp));
      setFollowUps(fallbackData?.totalAppointments.filter((a:any )=> a.isFollowUp));
    }
  } catch (error) {
    console.error("Fetch error:", error);

    // fallback to previously stored
    const storedData = await AsyncStorage.getItem('appointments');
    const fallbackData = storedData
      ? JSON.parse(storedData)
      : {
          totalAppointments: [],
        };

    setAppointments(fallbackData.totalAppointments);
    setNewAppointments(fallbackData.totalAppointments.filter((a:any) => !a.isFollowUp));
    setFollowUps(fallbackData.totalAppointments.filter((a:any) => a.isFollowUp));
  }
};

const getRevenueData = async () => {

    const storedToken = await AsyncStorage.getItem('authToken');
   const date = new Date();
const response = await AuthFetch(
  'finance/getTodayRevenuebyDoctorId',
  storedToken
);

const revenue = (response && 'data' in response && response.data && 'data' in response.data)
  ? response.data.data
  : {};
  setTodayRevenue(revenue.todayRevenue || 0);
  setMonthRevenue(revenue.monthRevenue || 0);

console.log(revenue, 'Response from getTodayRevenuebyDoctorId');
}

  const fetchUserData = async () => {
      setLoading(true);

      try {
        // Retrieve token from AsyncStorage
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        AsyncStorage.setItem('stepNo', '7');

        // Make API call
        const response = await axios.get(
          'http://192.168.1.44:3000/users/getUser',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              userid: userId, // Include userId in headers
            },
            params: {
              userId, // Include userId in query params as well
            },
          },
        );
        console.log('User data fetched successfully:', response?.data?.data);
        // Check if response status is success
        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Failed to fetch user data');
        }

        const userData = response.data.data;
        // Format phone number to match +XX XXX XXX XXXX
        const rawMobile = userData.mobile || '';
        const formattedPhone =
          rawMobile.length === 10
            ? `+91 ${rawMobile.slice(0, 3)} ${rawMobile.slice(
                3,
                6,
              )} ${rawMobile.slice(6, 10)}`
            : '';

        // Helper function to mask account number
        const maskAccountNumber = (accountNumber: string) => {
          if (!accountNumber) return '';
          // Show only last 4 characters, mask the rest with '*'
          const visible = accountNumber.slice(-4);
          const masked = '*'.repeat(accountNumber.length - 4);
          return `${masked}${visible}`;
        };

        setFormData({
          name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim(),
          email: userData.email || '',
          phone: formattedPhone,
          specialization: userData.specialization.name || '',
          practice: userData.addresses.length > 0 ? userData.addresses[0] : '',
          consultationPreferences:
            userData.consultationModeFee.length > 0
              ? userData.consultationModeFee
                  .map((mode: any) => mode.type)
                  .join(', ')
              : '',
          bank: userData.bankDetails.bankName || '',
          accountNumber: maskAccountNumber(
            userData.bankDetails?.accountNumber || '',
          ),
        });
        // setLoading(false);
      } catch (error: any) {
        // setLoading(false);

        console.error('Error fetching user data:', error.message);
      }finally {
        setLoading(false); // Stop loading regardless of success or failure
      }
    };

  useEffect(() => {
    fetchUserData();
    getAppointments()
    getRevenueData()
  }, []);

  const today = currentDate.getDay();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - today + i);
    return d.getDate();
  });

 const handleDateChange = (
  event: DateTimePickerEvent,
  selectedDate?: Date
) => {
  setShowPicker(false);

  if (event.type === 'dismissed') {
    return;
  }

  if (selectedDate) {
    setDate(selectedDate);

    const selectedDay = selectedDate.toISOString().split('T')[0];

    const filtered = appointments.filter(item => {
      const itemDate = new Date(item.appointmentDate).toISOString().split('T')[0];
      return itemDate === selectedDay;
    });

    setFilteredAppointments(filtered);
  }
};
  
  const upcomingSlots = [
  {
    id: 1,
    name: "Sofi’s Clinic",
    image: PLACEHOLDER_IMAGE, // replace with actual image
    price: "$900",
    availability: [
      { day: "Tue", time: "07:00 AM - 09:00 PM" },
      { day: "Wed", time: "07:00 AM - 09:00 PM" },
    ]
  },
  {
    id: 2,
    name: "The Family Dentistry Clinic",
    image: PLACEHOLDER_IMAGE, // replace with actual image
    price: "$600",
    availability: [
      { day: "Sat", time: "07:00 AM - 09:00 PM" },
      { day: "Tue", time: "07:00 AM - 09:00 PM" },
    ]
  },
];

  const validateStatus = (status: string) => {
    const validStatuses = ['Confirmed', 'Pending', 'In Progress', 'Scheduled'];
    return validStatuses.includes(status) ? status : 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return '#DCFCE7'; // Green
      case 'Pending': return '#FEF9C3'; // Yellow
      case 'In Progress': return '#DBEAFE'; // Blue
      case 'Scheduled': return '#F3F4F6'; // Purple
      default: return '#757575'; // Grey
    }
  };

  const getIconColor = (icon: string) => {
    switch (icon) {
      case 'videocam': return '#2563EB'; // Video color
      case 'person': return '#E5E7EB'; // Contact color
      case 'call': return '#22C55E'; // Call color
      default: return '#4CAF50'; // Default color
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return '#15803D'; // White for #15803D
      case 'Pending': return '#A16207'; // White for #A16207
      case 'In Progress': return '#1D4ED8'; // White for #1D4ED8
      case 'Scheduled': return '#374151'; // White for #374151
      default: return '#FFFFFF'; // Default white
    }
  };

 type FollowUpItem = {
   id: string;
   icon: string;
   iconColor: string;
   text: string;
   name: string;
   badge: string;
   badgeColor: string;
 };

 const [currentClinicIndex, setCurrentClinicIndex] = useState(0);

  const handlePreviousClinic = () => {
    setCurrentClinicIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleNextClinic = () => {
    setCurrentClinicIndex((prev) => (prev + 1) % 0);
  };
   const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? feedback.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % feedback.length);
  };

  const handleClearDate = () => {
    const today = new Date();
    setDate(today);
    setFilteredAppointments([]);
  };


  const feedback = [
  {
    name: "Rani",
    avatar: "https://i.pravatar.cc/150?img=12",
    rating: 4,
    comment: "Very helpful and polite doctor.",
    daysAgo: 3,
  },
  {
    name: "Kiran",
    avatar: "https://i.pravatar.cc/150?img=10",
    rating: 5,
    comment: "Excellent service and guidance.",
    daysAgo: 1,
  },
];

const dataToDisplay = filteredAppointments === null ? appointments : filteredAppointments;



console.log('Appointments:', filteredAppointments);
  return (

    <View style={styles.container}>
 <ScrollView style={styles.scrollView}>

        <View style={styles.header}>
          <Text style={styles.headerText}>
  Good Morning,{"\n"}Dr. {formData.name}
</Text>

         <View style={styles.rightIcons}>
            <View style={styles.notification}>
              <Ionicons name="notifications" size={20} color="#000" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>2</Text>
              </View>
            </View>
        <TouchableOpacity onPress={() => navigation.navigate('Sidebar')}>
          <Image source={PLACEHOLDER_IMAGE} style={{ width: 30, height: 30, marginLeft: 10 }} />
        </TouchableOpacity>
          </View>
        </View>
     <View style={[styles.appointmentButton, { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }]}>
  <TouchableOpacity
  style={styles.addButton}
  onPress={() => navigation.navigate("AddAppointment")}
>
  <Text style={styles.addButtonText}>+ Add Appointment</Text>
</TouchableOpacity>

</View>

<View style={styles.container}>
      {/* Today's Appointments Card */}
      <View style={styles.appointmentsCard}>
        <View style={styles.centered}>
          <Text style={styles.mainNumber}>
            {appointments?.length>0 ? appointments.length : 0}
          </Text>
          <Text style={styles.subText}>Today's Appointments</Text>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.newCard}>
            <Text style={styles.newNumber}>
              {newAppointments.length}
            </Text>
            <Text style={styles.newLabel}>New Appointments</Text>
            {/* <View style={styles.trendRow}>
              <Text style={styles.newTrend}>↑ +5%</Text>
            </View> */}
          </View>

          <View style={styles.followUpCard}>
            <Text style={styles.followUpNumber}>
              {followUps.length}
            </Text>
            <Text style={styles.followUpLabel}>Follow-ups</Text>
            {/* <View style={styles.trendRow}>
              <Text style={styles.followUpTrend}>↑ +8%</Text>
            </View> */}
          </View>
        </View>
      </View>

      {/* Revenue Card */}
      <View style={styles.revenueCard}>
  <View style={styles.revenueRow}>
    <View style={styles.revenueBoxPurple}>
      <Text style={styles.revenueAmountPurple}>
        ₹{todayRevenue}
      </Text>
      <Text style={styles.revenueSubLabel}>Today's Revenue</Text>    
    </View>
    <View style={styles.revenueBoxOrange}>
      <Text style={styles.revenueAmountOrange}>
        ₹{monthRevenue}
      </Text>
      <Text style={styles.revenueSubLabelOrange}>This Month</Text>
    </View>
  </View>
</View>
    </View> 
     <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setShowPicker(true)}>
        <Text style={styles.title}>Patient Appointments</Text>
        <Ionicons name="chevron-down" size={20} color="#555" />
      </TouchableOpacity>

     <TouchableOpacity style={styles.datePicker} onPress={() => setShowPicker(true)}>
  <Ionicons name="calendar" size={20} color="#333" />
  <Text style={styles.dateText}>{date.toDateString()}</Text>
</TouchableOpacity>

{showPicker && (
  <DateTimePicker
    value={date}
    mode="date"
    display="default"
    onChange={handleDateChange}
  />
)}

      
      

{dataToDisplay.length > 0 ? (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      <Text style={styles.headerCell}>Name</Text>
      <Text style={styles.headerCell}>Type</Text>
      <Text style={styles.headerCell}>Status</Text>
    </View>

    {dataToDisplay.slice(0, viewAll ? dataToDisplay.length : 5).map((item, index) => (
      <View key={index} style={styles.tableRow}>
        <View style={styles.nameColumn}>
          <Text style={styles.nameText}>{item.patientName}</Text>
          <Text style={styles.datetimeText}>
            {item.appointmentDate} {item.appointmentTime}
          </Text>
        </View>
        <Text style={styles.cell}>{item.appointmentType}</Text>
        <Text style={styles.cell}>{item.appointmentStatus}</Text>
      </View>
    ))}
  </View>
) : (
  <Text style={{ textAlign: "center", marginTop: 20 }}>
    No appointments on this date.
  </Text>
)}

      {appointments?.length >= 0 && !viewAll && (
        <TouchableOpacity style={styles.viewAllButton} onPress={() => setViewAll(true)}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      )}

      

      
    </View>
     <View style={styles.card}>
        <Text style={styles.title}>Clinic Availability</Text>

        <View style={styles.clinicInfo}>
          <Text style={styles.clinicName}></Text>
          <Text style={styles.clinicDate}></Text>
          <Text style={styles.clinicLocation}></Text>
        </View>

        <Text style={styles.unavailableText}>Available Slots:</Text>
        <View style={styles.slotContainer}>
          <View style={styles.slot}>
            <Text style={styles.slotText}>10:00 AM - 11:00 AM</Text>
          </View>
          <View style={styles.slot}>
            <Text style={styles.slotText}>2:00 PM - 3:00 PM</Text>
          </View>
        </View>

        <View style={styles.availabilityBox}>
          <Text style={styles.nextAvailableText}>Next Availability</Text>
          <Text style={styles.nextTimeText}>Tomorrow 9:30 AM</Text>
        </View>

        <View style={styles.navigation}>
          <TouchableOpacity onPress={handlePreviousClinic} style={styles.arrowButton}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextClinic} style={styles.arrowButton}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Revenue Summary Card */}
       <View style={styles.container}>
      <Text style={styles.title}>Staff Role Distribution</Text>
      {/* <PieChart
        data={data}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          color: () => `black`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute // shows numbers instead of percentage
      /> */}
    </View>
      {/* <View style={styles.card}>
        <Text style={styles.title}>Revenue Summary</Text>
        <View style={styles.chartContainer}> */}
          {/* <PieChart
            style={{ height: 200 }}
            data={[
              { key: 1, value: 50, svg: { fill: '#4caf50' } },
              { key: 2, value: 30, svg: { fill: '#ff9800' } },
              { key: 3, value: 20, svg: { fill: '#f44336' } },
            ]}
          />
        </View>

      </View> */}
      <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Patient Feedback</Text>
        <View style={styles.navButtons}>
          {/* <TouchableOpacity onPress={handlePrev}>
            <AntDesign name="left" size={16} color="#bfbfbf" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext}>
            <AntDesign name="right" size={16} color="#bfbfbf" />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Feedback Scroll */}
      <ScrollView style={{ maxHeight: 200 }}>
  {feedback.slice(currentIndex, currentIndex + 1).map((feedback, index) => (
    <View key={index} style={styles.feedbackItem}>
      {/* Avatar & Name */}
      <View style={styles.avatarRow}>
        <Image
          source={{ uri: feedback.avatar }}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{feedback.name}</Text>
          {/* <View style={styles.ratingRow}>
            {[...Array(feedback.rating)].map((_, i) => (
              <AntDesign key={i} name="star" size={14} color="#fbbf24" />
            ))}
          </View> */}
        </View>
      </View>

      {/* Comment */}
      <Text style={styles.comment}>
        "{feedback.comment}"
      </Text>

      {/* Days Ago */}
      <Text style={styles.dateText}>
        {feedback.daysAgo} days ago
      </Text>
    </View>
  ))}
</ScrollView>

      <ScrollView style={{ maxHeight: 200 }}>
        <View style={styles.feedbackItem}>
          {/* Avatar & Name */}
          <View style={styles.avatarRow}>
            <Image
              source={{}}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{}</Text>
              <View style={styles.ratingRow}>
                
              </View>
            </View>
          </View>

          {/* Comment */}
          <Text style={styles.comment}>
            "{}"
          </Text>

          {/* Days Ago */}
          <Text style={styles.dateText}>
            {} days ago
          </Text>
        </View>
      </ScrollView>
    </View>



     
      </ScrollView>

   
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 , padding: 10},

  table: {
  marginTop: 10,
  borderTopWidth: 1,
  borderColor: '#ccc',
},
tableHeader: {
  flexDirection: 'row',
  backgroundColor: '#f0f0f0',
  paddingVertical: 8,
  paddingHorizontal: 10,
},
headerCell: {
  flex: 1,
  fontWeight: 'bold',
  color: '#333',
},
tableRow: {
  flexDirection: 'row',
  paddingVertical: 10,
  paddingHorizontal: 10,
  borderBottomWidth: 1,
  borderColor: '#eee',
  alignItems: 'flex-start',
},
nameColumn: {
  flex: 1,
},
nameText: {
  fontWeight: '600',
  fontSize: 14,
},
datetimeText: {
  color: '#777',
  fontSize: 12,
},
cell: {
  flex: 1,
  fontSize: 13,
  color: '#555',
},

  
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    // backgroundColor: '#00203F', // Adjusted to match image
  },
  headerText: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  notification: { position: 'relative' },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    width: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  appointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 0,
    // backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 10,
  },
  dayHeader: {
    backgroundColor: '#2563EB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginBottom: 0,
  },
  dayGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },

  appointmentsCard: {
    backgroundColor: '#16a8a0',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#20d0c4',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    
  },
  centered: {
    alignItems: 'center',
    marginBottom: 10,
  },
  mainNumber: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
  subText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'space-between',
  },
  newCard: {
    backgroundColor: '#F0FDF4',
    flex: 1,
    borderRadius: 12,
    // padding: 16,
    alignItems: 'center',
  },
  newNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  newLabel: {
    color: '#16A34A',
    marginTop: 4,
  },
  newTrend: {
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 6,
  },
  followUpCard: {
    backgroundColor: '#EFF6FF',
    flex: 1,
    borderRadius: 12,
    padding: 5,
    alignItems: 'center',
  },
  followUpNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  followUpLabel: {
    color: '#2563EB',
    // marginTop: 2,
  },
  followUpTrend: {
    color: '#2563EB',
    fontWeight: '600',
    // marginTop: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  revenueRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  // gap: 10, // Optional if using React Native 0.71+
},
  revenueCard: {
    marginTop: 10,
  },
  revenueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  revenueBoxPurple: {
     flex: 1,
  backgroundColor: '#FAF5FF',
  padding: 16,
  borderRadius: 8,
  marginRight: 8,
  },
  revenueBoxOrange: {
     flex: 1,
  backgroundColor: '#FFF7ED',
  padding: 16,
  borderRadius: 8,
  marginLeft: 8
  },
  revenueSubLabel: {
    fontSize: 12,
    color: '#9333EA',
    marginBottom: 4,
  },
  revenueSubLabelOrange: {
    fontSize: 12,
    color: '#EA580C',
    marginBottom: 4,
  },
  revenueAmountPurple: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9333EA',
  },
  revenueAmountOrange: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EA580C',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  addButton: {
  backgroundColor: '#007bff', // Primary blue, change as needed
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
},

addButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 14,
},

  dayItem: {
    alignItems: 'center',
    width: width / 6 - 20, // Adjust for 7 days with padding
  },
  day: { fontSize: 14, color: '#666', textAlign: 'center' },
  activeDay: { color: '#2563EB', fontWeight: 'bold' },
  date: { fontSize: 16, color: '#666', fontWeight: 'bold', textAlign: 'center' },
  activeDate: { color: '#2563EB', fontWeight: 'bold' },
  
  dayText: { fontSize: 16, color: '#fff', fontWeight: 'bold' }, // Adjusted color
 
  stats: { flexDirection: 'row', justifyContent: 'space-around', padding: 5,  margin: 5 },
   statItem: {
    alignItems: 'center',
    width: '45%', // Adjust the divisor as needed
    paddingVertical: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 18,
    marginBottom: 8,
  },statValue: { fontSize: 14, fontWeight: 'bold', color: '#000', marginTop:
    5, marginBottom: 5  // Adjusted color
   },
  statLabel: { fontSize: 12, color: '#666' },
  section: { margin: 10, backgroundColor: '#FFF', borderRadius: 10, padding: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#00203F' }, // Adjusted color
  seeAll: { color: '#00203F' }, // Adjusted color
  appointment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6F3E6',
  },
  time: { width: 50, fontSize: 14, color: '#666' },
  appointmentImage: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 10 },
  appointmentName: {  fontSize: 14, color: '#333' },
  icon: { marginHorizontal: 5 },
  status: {
    fontSize: 12,
    color: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 5,
    textAlign: 'center',
    minWidth: 80,
     marginLeft: 'auto'
  },
  upcomingSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6F3E6',
  },
  upcomingTime: { width: 50, fontSize: 14, color: '#666' },
  upcomingDate: { width: 70, fontSize: 12, color: '#666', marginLeft: 5 },
  upcomingImage: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 10 },
  upcomingName: { flex: 1, fontSize: 14, color: '#333' },
  upcomingIcon: { marginHorizontal: 5 },
  upcomingStatus: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 5,
    textAlign: 'center',
    minWidth: 80,
  },
   card: {
    backgroundColor: '#F9FBFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  clinicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clinicImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2342',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2342',
  },
  availabilityContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  day1: {
    fontWeight: '600',
    width: 50,
    color: '#0A2342',
  },
  time1: {
    flex: 1,
    color: '#0A2342',
  },
  change: {
    color: '#0A2342',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  card2: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  header2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  flagIcon: {
    marginRight: 6,
  },
  headerText2: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1F2937',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowIcon: {
    marginRight: 6,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  bold: {
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sidebar: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  list: {
    maxHeight: 300,
  },
  // row: {
  //   flexDirection: 'row',
  //   paddingVertical: 10,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#eee',
  // },
  // nameColumn: {
  //   flex: 2,
  // },
  name: {
    fontWeight: '600',
    fontSize: 14,
  },
  // time: {
  //   fontSize: 12,
  //   color: '#777',
  // },
  typeColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
  },
  statusColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
  },
  viewAllButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  viewAllText: {
    color: '#16a8a0',
    fontWeight: '600',
  },

  // card: {
  //   borderRadius: 16,
  //   backgroundColor: '#fff',
  //   padding: 24,
  //   marginBottom: 24,
  //   shadowColor: '#000',
  //   shadowOpacity: 0.08,
  //   shadowOffset: { width: 0, height: 4 },
  //   shadowRadius: 20,
  //   elevation: 5,
  // },
  
  clinicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  // clinicName: {
  //   fontSize: 16,
  //   fontWeight: '600',
  //   color: '#495057',
  //   fontFamily: 'Poppins',
  // },
  clinicDate: {
    fontSize: 12,
    color: '#8c8c8c',
    fontFamily: 'Poppins',
    marginHorizontal: 6,
  },
  clinicLocation: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  unavailableText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 12,
    fontFamily: 'Poppins',
  },
  slotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  slot: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f8f0',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1b5e20',
  },
  slotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1b5e20',
    fontFamily: 'Poppins',
  },
  availabilityBox: {
    padding: 16,
    backgroundColor: '#f0f8f0',
    borderRadius: 12,
    marginBottom: 48,
  },
  nextAvailableText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2e7d32',
    fontFamily: 'Poppins',
  },
  nextTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b5e20',
    fontFamily: 'Poppins',
  },
  navigation: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 64,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9EBEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackItem: {
    marginBottom: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
  },
  
  ratingRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  comment: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },


  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pie: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3b82f6', // Base color: OPD
    overflow: 'hidden',
    position: 'relative',
  },
  slice: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  slice1: {
    transform: [{ rotate: '0deg' }],
    backgroundColor: '#3b82f6', // OPD
  },
  slice2: {
    transform: [{ rotate: '120deg' }],
    backgroundColor: '#4caf50', // Labs
  },
  slice3: {
    transform: [{ rotate: '240deg' }],
    backgroundColor: '#f97316', // Pharmacy
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#555',
  },



});

export default DoctorDashboard;