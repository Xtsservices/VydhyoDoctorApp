import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppointmentCard = ({ name, time, type, status, onStart, onView, onReschedule }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Image source={{ uri: 'https://via.placeholder.com/40' }} style={styles.avatar} />
      <View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.type}>{type}</Text>
      </View>
      <Text style={[styles.status, { color: status === 'Upcoming' ? '#28a745' : status === 'Completed' ? '#007bff' : '#dc3545' }]}>
        {status}
      </Text>
    </View>
    <View style={styles.actions}>
      {status === 'Upcoming' && (
        <TouchableOpacity style={styles.button} onPress={onStart}>
          <Icon name="play-circle-filled" size={20} color="#fff" />
          <Text style={styles.buttonText}>Start Consultation</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.button} onPress={onView}>
        <Icon name="description" size={20} color="#007bff" />
        <Text style={styles.buttonText}>View Details</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onReschedule}>
        <Icon name="event" size={20} color="#6c757d" />
        <Text style={styles.buttonText}>Reschedule</Text>
      </TouchableOpacity>
      {status === 'Completed' && (
        <TouchableOpacity style={styles.cancelButton}>
          <Icon name="close" size={20} color="#dc3545" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const App = () => {
  const [appointments] = useState([
    { name: 'Ravi Kumar', time: '10:30 AM', type: 'Video', status: 'Upcoming' },
    { name: 'Nisha Patel', time: '11:15 AM', type: 'In-Person', status: 'Completed' },
    { name: 'Priya Singh', time: '12:00 PM', type: 'Home Visit', status: 'Cancelled' },
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Appointments</Text>
      {appointments.map((appointment, index) => (
        <AppointmentCard
          key={index}
          name={appointment.name}
          time={appointment.time}
          type={appointment.type}
          status={appointment.status}
          onStart={() => console.log('Start Consultation')}
          onView={() => console.log('View Details')}
          onReschedule={() => console.log('Reschedule')}
        />
      ))}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="home" size={25} color="#007bff" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="calendar-today" size={25} color="#6c757d" />
          <Text style={styles.navText}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="people" size={25} color="#6c757d" />
          <Text style={styles.navText}>Patients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="more-horiz" size={25} color="#6c757d" />
          <Text style={styles.navText}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e9f5e9',
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  time: { fontSize: 14, color: '#666' },
  type: { fontSize: 12, color: '#28a745' },
  status: { fontSize: 12, marginLeft: 'auto' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 5,
  },
  buttonText: { marginLeft: 5, color: '#007bff' },
  cancelButton: { padding: 5 },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 12, color: '#6c757d' },
});

export default App;