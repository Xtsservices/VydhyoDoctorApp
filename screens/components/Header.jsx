import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const Header = () => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>Dashboard</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: '#1DA1F2',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: width,
  },
  headerText: {
    color: '#fff',
    fontSize: width > 768 ? 24 : 18,
    fontWeight: 'bold',
  },
});

export default Header;