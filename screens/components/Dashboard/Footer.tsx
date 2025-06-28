import React from 'react';
import { View, TouchableOpacity, StyleSheet,Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Footer = () => {
  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.footerItem}>
        <Ionicons name="home" size={24} color="#1E90FF" />
        <Text style={styles.footerText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerItem}>
        <Ionicons name="calendar" size={24} color="#666" />
        <Text style={styles.footerText}>Calendar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerItem}>
        <Ionicons name="people" size={24} color="#666" />
        <Text style={styles.footerText}>Patients</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerItem}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
        <Text style={styles.footerText}>More</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E6F3E6',
  },
  footerItem: { alignItems: 'center' },
  footerText: { fontSize: 12, color: '#666' },
});

export default Footer;