import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';


const AccountsScreen = () => {
  const [showFilters, setShowFilters] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchRevenue = async () => {
    try {
        const token = await AsyncStorage.getItem('authToken');
        const res = await AuthFetch('finance/getDoctorRevenue', token);
        if (res.status === 'success') {
          const revenue = res.data?.data || 0;
          console.log('Revenue fetched:', revenue);
          setTotalRevenue(revenue.totalRevenue || 0);
        } else {
          throw new Error('Failed to fetch revenue data');
        } 
      console.log('Revenue Summary:', res);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }
  };

    useEffect(() => {
          fetchRevenue();
        }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Accounts</Text>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: '#10B981' }]}>
          <Icon name="cash" size={24} color="#10B981" />
          <Text style={styles.summaryAmount}>₹{totalRevenue}</Text>
          <Text>Total Amount Received</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#EF4444' }]}>
          <Icon name="cash-remove" size={24} color="#EF4444" />
          <Text style={styles.summaryAmount}>₹35,000</Text>
          <Text>Total Expenditure</Text>
        </View>
      </View>

      {/* Filter Section */}
      <TouchableOpacity
        onPress={() => setShowFilters(!showFilters)}
        style={styles.filterToggle}
      >
        <Text style={styles.filterTitle}>Filters</Text>
        <Icon
          name={showFilters ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#111"
        />
      </TouchableOpacity>

      {showFilters && (
        <View style={styles.filters}>
          <TextInput
            placeholder="Search by Patient or Transaction ID"
            style={styles.searchInput}
          />

          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateInput}>
              <Icon name="calendar" size={18} color="#6B7280" />
              <Text style={styles.dateText}>mm/dd/yyyy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateInput}>
              <Icon name="calendar" size={18} color="#6B7280" />
              <Text style={styles.dateText}>mm/dd/yyyy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dropdownRow}>
            <TouchableOpacity style={styles.dropdown}>
              <Text>All Services</Text>
              <Icon name="chevron-down" size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdown}>
              <Text>All Status</Text>
              <Icon name="chevron-down" size={18} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.exportBtn}>
            <Icon name="download" size={18} color="#fff" />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transaction History */}
      <ScrollView style={{ marginTop: 16 }}>
        <Text style={styles.sectionTitle}>Transaction History</Text>

        <View style={styles.transactionCard}>
          <View style={styles.txnHeader}>
            <Text style={styles.txnId}>TXN001234</Text>
            <Text style={styles.txnDate}>Dec 15, 2024</Text>
          </View>
          <Text style={styles.txnName}>John Doe</Text>
          <View style={styles.txnRow}>
            <Text style={styles.txnLabel}>Appointment</Text>
            <Text style={styles.txnAmount}>₹500</Text>
          </View>
          <View style={styles.txnRow}>
            <Text style={styles.txnLabel}>UPI</Text>
            <View style={styles.statusRow}>
              <Text style={styles.paidStatus}>Paid</Text>
              <TouchableOpacity>
                <Icon name="eye-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AccountsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 4,
  },
  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTitle: {
    fontWeight: '600',
  },
  filters: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    color: '#6B7280',
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  dropdown: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exportBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  exportText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  txnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  txnId: {
    color: '#6B7280',
    fontSize: 12,
  },
  txnDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  txnName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  txnLabel: {
    color: '#4B5563',
  },
  txnAmount: {
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidStatus: {
    backgroundColor: '#D1FAE5',
    color: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '500',
  },
});
