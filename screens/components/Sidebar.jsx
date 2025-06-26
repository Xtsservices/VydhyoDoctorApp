import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const Sidebar = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.sidebar}>
      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuText}>Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: width > 768 ? 250 : 60,
    backgroundColor: '#1DA1F2',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    paddingTop: 20,
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#fff',
  },
  menuText: {
    color: '#fff',
    fontSize: width > 768 ? 16 : 12,
  },
});

export default Sidebar;
