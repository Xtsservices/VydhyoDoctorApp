import React from 'react';
import { View, StyleSheet } from 'react-native';
import Sidebar from '../Sidebar';
import Header from '../Header';
import VerificationScreen from '../VerificationScreen';
import Footer from '../Footer';
// import Sidebar from './Sidebar';
// import Header from './Header';
// import Footer from './Footer';
// import VerificationScreen from './VerificationScreen';

const Dashboard = () => {
  return (
    <View style={styles.container}>
      <Sidebar />
      <View style={styles.mainContent}>
        <Header />
        <VerificationScreen />
        <Footer />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    marginLeft: 60, // Adjust based on sidebar width
  },
});

export default Dashboard;