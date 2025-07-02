import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ScrollView,FlatList ,Animated} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Footer from './Footer';
import Sidebar from './sidebar';
import { useNavigation } from '@react-navigation/native';
const StethoscopeIcon = require('../../assets/doc.png')
const today_image = require('../../assets/Frame.png')
const total = require('../../assets/i.png')

const { width, height } = Dimensions.get('window');
const PLACEHOLDER_IMAGE = require('../../assets/img.png'); 

const DoctorDashboard = () => {
    const navigation = useNavigation<any>();
  
  const [currentDate, setCurrentDate] = useState(new Date('2025-06-27T16:12:00+05:30')); // Set to 04:12 PM IST, June 27, 2025
 const [sidebarVisible, setSidebarVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(width)).current;
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = currentDate.getDay();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - today + i);
    return d.getDate();
  });

  const todayAppointments = [
    { time: '09:00', name: 'Drishti S.', image: PLACEHOLDER_IMAGE, status: 'Confirmed', icon: 'videocam' },
    { time: '10:30', name: 'Aarav P.', image: PLACEHOLDER_IMAGE, status: 'Pending', icon: 'person' },
    { time: '12:00', name: 'Riya T.', image: PLACEHOLDER_IMAGE, status: 'In Progress', icon: 'call' },
    { time: '14:30', name: 'Deva M.', image: PLACEHOLDER_IMAGE, status: 'Scheduled', icon: 'videocam' },
  ];

  
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


  const followUpData = [
  {
    id: '1',
    icon: 'account-circle-outline',
    iconColor: '#6B7280',
    text: 'Follow-up call with',
    name: 'Dev M.',
    badge: 'Today',
    badgeColor: '#FEF3C7',
  },
  {
    id: '2',
    icon: 'test-tube',
    iconColor: '#A855F7',
    text: 'Report pending for',
    name: 'Aarav P.',
    badge: 'Overdue',
    badgeColor: '#FEE2E2',
  },
];

 type FollowUpItem = {
   id: string;
   icon: string;
   iconColor: string;
   text: string;
   name: string;
   badge: string;
   badgeColor: string;
 };

 const renderItem = ({ item }: { item: FollowUpItem }) => (
    <View style={styles.row}>
      <Icon name={item.icon} size={20} color={item.iconColor} style={styles.rowIcon} />
      <Text style={styles.text}>
        {item.text} <Text style={styles.bold}>{item.name}</Text>
      </Text>
      <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
        <Text style={styles.badgeText}>{item.badge}</Text>
      </View>
    </View>
  );

  


  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>HELLO Doctor !</Text>
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
      <View style={styles.daySelector}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayText}>Day</Text>
          </View>
          <View style={styles.dayGrid}>
            {dates.map((date, index) => (
              <View key={date} style={styles.dayItem}>
                 <Text
                  style={[styles.day, index === today && styles.activeDay]}
                >
                  {days[index]}
                </Text>
                <Text
                  style={[styles.date, index === today && styles.activeDate]}
                >
                  {date}
                </Text>
               
              </View>
            ))}
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            {/* <Ionicons name="medical" size={24} color="#4CAF50" /> */}
            <Image source={StethoscopeIcon} style={{ width: 24, height: 24, tintColor: '#4CAF50' }} />
            <Text style={styles.statValue}>13</Text>
            <Text style={styles.statLabel}>Consults</Text>
          </View>
          <View style={styles.statItem}>
            {/* <Ionicons name="cash" size={24} color="#4CAF50" /> */}
            <Image source={today_image} style={{ width: 24, height: 24 }} />

            <Text style={styles.statValue}>₹2,500</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          {/* <View style={styles.statItem}>
            <Image source={total} style={{ width: 24, height: 24 }} />

            <Text style={styles.statValue}>₹12,600</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View> */}
        </View>
      <ScrollView style={styles.scrollView}>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Appointments</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {todayAppointments.map((appointment, index) => (
            <View key={index} style={styles.appointment}>
              <Text style={styles.time}>{appointment.time}</Text>
              <Image source={appointment.image} style={styles.appointmentImage} />
              <Text style={styles.appointmentName}>{appointment.name}</Text>
              <Ionicons name={appointment.icon} size={16} color={getIconColor(appointment.icon)} style={styles.icon} />
              <Text style={[styles.status, { backgroundColor: getStatusColor(appointment.status) },{ color: getStatusTextColor(appointment.status) }]}>
                {validateStatus(appointment.status)}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Slots</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
         

       {upcomingSlots.map(clinic => (
        <View key={clinic.id} style={styles.card}>
          <View style={styles.clinicHeader}>
            <Image source={clinic.image} style={styles.clinicImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>{clinic.name}</Text>
            </View>
            <Text style={styles.price}>{clinic.price}</Text>
          </View>

          <View style={styles.availabilityContainer}>
            {clinic.availability.map((slot, index) => (
              <View key={index} style={styles.availabilityRow}>
                <Text style={styles.day1}>{slot.day} :</Text>
                <Text style={styles.time1}>{slot.time}</Text>
                {index === 1 && (
                  <TouchableOpacity>
                    <Text style={styles.change}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

       
        </View>
        <View style={styles.card2}>
      <View style={styles.header2}>
        <Icon name="flag" size={18} color="#F97316" style={styles.flagIcon} />
        <Text style={styles.headerText}>Follow-ups</Text>
      </View>

      <FlatList
        data={followUpData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
      />
    </View>

     
      </ScrollView>

   
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#DCFCE7' },
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
  daySelector: {
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
});

export default DoctorDashboard;