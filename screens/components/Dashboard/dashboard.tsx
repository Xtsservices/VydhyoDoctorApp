import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Dashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello Dashboard</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5', // light gray background
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
});

export default Dashboard;
