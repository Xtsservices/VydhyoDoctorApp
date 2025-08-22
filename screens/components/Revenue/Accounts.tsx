import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  PermissionsAndroid,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { AuthPost, AuthFetch } from '../../auth/auth';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import { useNavigation } from '@react-navigation/native';


const AccountsScreen = () => {
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId = currentuserDetails.role === 'doctor' ? currentuserDetails.userId : currentuserDetails.createdBy;
  const [showFilters, setShowFilters] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showTxnModal, setShowTxnModal] = useState(false);
    const navigation = useNavigation<any>();
   

  const handleViewTxn = (txn) => {
    setSelectedTxn(txn);
    setShowTxnModal(true);
  };

   const [accountSummary, setAccountSummary] = useState({
    totalReceived: 0,
    totalExpenditure: 0,
    pendingTransactions: 0,
    recentTransactions: [],
  });

  const fetchRevenue = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`finance/getDoctorRevenue?${doctorId}`, token);
      console.log(response, 'revenue summery')
      if (response.status === 'success') {
         const apiData = response.data.data;

        setAccountSummary((prev) => ({
          ...prev,
          totalReceived: apiData.totalRevenue,
          totalExpenditure: apiData.totalExpenditure,
          recentTransactions: apiData.lastThreeTransactions.map((txn) => ({
            name: txn.username,
            amount: txn.finalAmount,
          })),
        }));
        // const revenue = res?.data?.data || 0;
        // console.log('Revenue fetched:', revenue);
        // setTotalRevenue(revenue.totalRevenue || 0);
      } else {
        throw new Error('Failed to fetch revenue data');
      }
      console.log('Revenue Summary:', res);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }
  };
  const fetchTransactions = async () => {
    if (!doctorId) return;

    console.log(doctorId, 'selectedDoctor Id');

    const payload = {
      service: '',
      status: '',
      search: searchText,
      limit: 100,
      doctorId: doctorId,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : '',
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : '',
    };

    console.log(payload, 'payload to be sent');

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthPost('finance/getTransactionHistory', payload, token) as TransactionResponse;
      console.log(response, 'total transactions history');
      const data = response?.data;
      if (data?.status === 'success') {
        setTransactions(data.data || []);
        setTotalItems(data.totalResults || 0);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  // const fetchTransactions = useCallback(async () => {
  //   if (!doctorId) return;

  //   console.log(doctorId, 'selectedDoctor Id');

  //   const payload = {
  //     service: '',
  //     status: '',
  //     search: searchText,
  //     limit: 100,
  //     doctorId: doctorId,
  //     startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : '',
  //     endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : '',
  //   };

  //   console.log(payload, 'payload to be sent');

  //   try {
  //     const token = await AsyncStorage.getItem('authToken');
  //     const response = await AuthPost('finance/getTransactionHistory', payload, token);
  //     console.log(response, 'total transactions history');
  //     const data = response?.data;
  //     if (data?.status === 'success') {
  //       setTransactions(data.data || []);
  //       setTotalItems(data.totalResults || 0);
  //     }
  //   } catch (err) {
  //     console.error('Error fetching transactions:', err);
  //   }
  // }, [doctorId, startDate, endDate, searchText]);

  useEffect(() => {
    fetchTransactions();
    fetchRevenue();
  }, [doctorId, startDate, endDate, searchText]);

  const onStartChange = (_: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndChange = (_: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

 const exportTransactionsToPDF = async (transactions: any[]) => {
  try {
    if (Platform.OS === 'android' && Platform.Version < 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted === PermissionsAndroid.RESULTS.DENIED) {
        Alert.alert('Permission Denied', 'Storage permission is required to save the PDF.');
        return;
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Permission Required',
          'Storage permission is required to save the PDF. Please enable it in Settings > Apps > Your App > Permissions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Transaction Report</h1>
          <table>
            <tr>
              <th>Patient Name</th>
              <th>Payment ID</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
            ${transactions
              .map(
                (txn) => `
                  <tr>
                    <td>${txn.patientName || '-'}</td>
                    <td>${txn.paymentId || '-'}</td>
                    <td>₹${txn.finalAmount}</td>
                    <td>${dayjs(txn.paidAt || txn.updatedAt).format('YYYY-MM-DD')}</td>
                    <td>${dayjs(txn.paidAt || txn.updatedAt).format('HH:mm')}</td>
                  </tr>
                `
              )
              .join('')}
          </table>
        </body>
      </html>
    `;


   const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const fileName = `Transaction_Report_${timestamp}.pdf`;

    // Step 1: Generate PDF in temporary path
    const pdf = await RNHTMLtoPDF.convert({
      html: htmlContent,
      fileName: `Transaction_Report_${timestamp}`,
      base64: false,
    });

    // Step 2: Move it to the actual Downloads folder
    const downloadsPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
    await RNFS.moveFile(pdf.filePath!, downloadsPath);

    Alert.alert('Success', `PDF saved in Files > Downloads as ${fileName}`);
    console.log('Saved at:', downloadsPath);
 
  } catch (error) {
    console.error('PDF export failed:', error);
    Alert.alert('Error', 'Failed to generate PDF.');
  }
};

  console.log(searchText, 'patient id or transaction id');

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.header}>Accounts</Text>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: '#10B981' }]}>
            <Icon name="cash" size={24} color="#10B981" />
            <Text style={styles.summaryAmount}>₹{accountSummary.totalReceived}</Text>
            <Text style={{ color: '#333' }}>Total Amount Received</Text>
          </View>
          <TouchableOpacity
  style={[styles.summaryCard, { borderColor: '#EF4444' }]}
  onPress={() => navigation.navigate('expenditure')}
>
  <Icon name="cash-remove" size={24} color="#EF4444" />
  <Text style={styles.summaryAmount}>{accountSummary.totalExpenditure}</Text>
  <Text style={{ color: '#333' }}>Total Expenditure</Text>
</TouchableOpacity>
          {/* <View style={[styles.summaryCard, { borderColor: '#EF4444' }]}>
            <Icon name="cash-remove" size={24} color="#EF4444" />
            <Text style={styles.summaryAmount}>{accountSummary.totalExpenditure}</Text>
            <Text>Total Expenditure</Text>
          </View> */}
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
              placeholder="Search by Patient"
              style={styles.searchInput}
              value={searchText}
              onChangeText={(text) => setSearchText(text)}
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartPicker(true)}
              >
                <Icon name="calendar" size={18} color="#6B7280" />
                <Text style={styles.dateText}>
                  {startDate ? moment(startDate).format('MM/DD/YYYY') : 'mm/dd/yyyy'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndPicker(true)}
              >
                <Icon name="calendar" size={18} color="#6B7280" />
                <Text style={styles.dateText}>
                  {endDate ? moment(endDate).format('MM/DD/YYYY') : 'mm/dd/yyyy'}
                </Text>
              </TouchableOpacity>

              {showStartPicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={onStartChange}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={onEndChange}
                />
              )}
            </View>

            {/* <View style={styles.dropdownRow}>
              <TouchableOpacity style={styles.dropdown}>
                <Text>All Services</Text>
                <Icon name="chevron-down" size={18} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdown}>
                <Text>All Status</Text>
                <Icon name="chevron-down" size={18} />
              </TouchableOpacity>
            </View> */}

            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => exportTransactionsToPDF(transactions)}
            >
              <Icon name="download" size={18} color="#fff" />
              <Text style={styles.exportText}>Export</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction History */}
        <ScrollView style={{ marginTop: 16, marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>Transaction History</Text>

          {transactions.length > 0 &&
            transactions.map((item, index) => (
              <View key={item.paymentId || index} style={styles.transactionCard}>
                <View style={styles.txnHeader}>
                  <Text style={styles.txnId}>{item?.paymentId}</Text>
                  <Text style={styles.txnDate}>
                    {dayjs(item?.paidAt || item?.updatedAt).format('YYYY-MM-DD')}
                  </Text>
                </View>
                <View style={styles.txnRow}>
                  <Text style={styles.txnName}>{item.patientName}</Text>
                  <Text style={styles.txnName}>
                    {' '}
                    {dayjs(item?.paidAt || item?.updatedAt).format('HH:mm')}
                  </Text>
                </View>
                <View style={styles.txnRow}>
                  <Text style={styles.txnLabel}>{item?.paymentFrom}</Text>
                  <Text style={styles.txnAmount}>₹{item.finalAmount}</Text>
                </View>
                <View style={styles.txnRow}>
                  <Text style={styles.txnLabel}>{item?.paymentMethod}</Text>
                  <View style={styles.statusRow}>
                    <Text style={styles.paidStatus}>{item.paymentStatus}</Text>
                    <TouchableOpacity onPress={() => handleViewTxn(item)}>
                      <Icon name="eye-outline" size={18} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

          {showTxnModal && selectedTxn && (
            <Modal
              visible={showTxnModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowTxnModal(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Transaction Details</Text>
                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Patient Name:</Text>
                      <Text style={styles.modalValue}>{selectedTxn.patientName}</Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Transaction ID:</Text>
                      <Text style={styles.modalValue}>{selectedTxn.paymentId}</Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>User ID:</Text>
                      <Text style={styles.modalValue}>{selectedTxn.userId}</Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Payment From:</Text>
                      <Text style={styles.modalValue}>{selectedTxn.paymentFrom}</Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Payment Method:</Text>
                      <Text style={styles.modalValue}>{selectedTxn.paymentMethod}</Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Status:</Text>
                      <Text style={styles.modalValue}>{selectedTxn.paymentStatus}</Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Paid At:</Text>
                      <Text style={styles.modalValue}>
                        {dayjs(selectedTxn.paidAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Created At:</Text>
                      <Text style={styles.modalValue}>
                        {dayjs(selectedTxn?.createdAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Actual Amount:</Text>
                      <Text style={styles.modalValue}>₹{selectedTxn?.actualAmount}</Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Final Amount:</Text>
                      <Text style={styles.modalValue}>₹{selectedTxn?.finalAmount}</Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Discount:</Text>
                      <Text style={styles.modalValue}>
                        {selectedTxn.discount} ({selectedTxn.discountType})
                      </Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.modalLabel}>Currency:</Text>
                      <Text style={styles.modalValue}>{selectedTxn.currency}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowTxnModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

export default AccountsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#0A2342',
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
    color: '#0A2342',
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
    color: '#0A2342',
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
    color: '#0A2342',
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
    color: '#6B7280',
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
    color: '#0A2342',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalLabel: {
    fontWeight: '600',
    marginTop: 8,
    color: '#374151',
  },
  modalValue: {
    marginBottom: 4,
    color: '#374151',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  column: {
    width: '48%',
  },
});