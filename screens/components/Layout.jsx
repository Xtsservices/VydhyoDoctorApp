import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';

const { width, height } = Dimensions.get('window');

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarAnim = useState(new Animated.Value(-width * 0.8))[0];

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: isSidebarOpen ? -width * 0.8 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsSidebarOpen(!isSidebarOpen));
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
        <TouchableOpacity style={styles.menuItem} onPress={toggleSidebar}>
          <Text style={styles.menuText}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
      </Animated.View>
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar}>
            <Text style={styles.headerText}>Menu</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {children}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 xAI. All rights reserved.</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: width * 0.8,
    backgroundColor: '#1DA1F2',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    paddingTop: 20,
    zIndex: 10,
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
  mainContent: {
    flex: 1,
    marginLeft: 0,
  },
  header: {
    height: 60,
    backgroundColor: '#1DA1F2',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  headerText: {
    color: '#fff',
    fontSize: width > 768 ? 18 : 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: width > 768 ? 24 : 18,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    marginTop: 60,
    marginBottom: 50,
  },
  bodyContent: {
    paddingBottom: 20,
  },
  footer: {
    height: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  footerText: {
    color: '#fff',
    fontSize: width > 768 ? 14 : 10,
  },
});

export default Layout;