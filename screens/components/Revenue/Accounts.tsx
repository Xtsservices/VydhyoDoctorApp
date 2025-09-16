import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  Linking,
} from 'react-native';
import { ActivityIndicator } from 'react-native';
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
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const navigation = useNavigation<any>();
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [serviceModalVisible, setServiceModalVisible] = useState(false); // Replaced Menu with Modal

  const handleViewTxn = (txn) => {
    setSelectedTxn(txn);
    setShowTxnModal(true);
  };
  const capitalizeFirstLetter = (string) => {
    if (!string) return '-';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  const [accountSummary, setAccountSummary] = useState({
    totalReceived: 0,
    totalExpenditure: 0,
    pendingTransactions: 0,
    recentTransactions: [],
  });

  const fetchRevenue = async () => {
    try {
      setLoadingRevenue(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(`finance/getDoctorRevenue?doctorId=${doctorId}`, token);

      if (response.status === 'success') {
        const apiData = response.data.data;

        setAccountSummary((prev) => ({
          ...prev,
          totalReceived: apiData.totalRevenue,
          totalExpenditure: apiData.totalExpenditure,
          pendingTransactions: apiData.pendingTransactions || 0,
        }));

        if (apiData.lastThreeTransactions) {
          setRecentTransactions(apiData.lastThreeTransactions.map((txn) => ({
            name: txn.username,
            amount: txn.finalAmount,
          })));
        }
      } else {
        throw new Error('Failed to fetch revenue data');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch revenue data');
    } finally {
      setLoadingRevenue(false);
    }
  };

  const fetchTransactions = useCallback(async () => {
    if (!doctorId) return;

    setLoadingTransactions(true);

    const payload = {
      service: filterService,
      status: filterStatus,
      search: searchText,
      page: currentPage,
      limit: 10,
      doctorId: doctorId,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : '',
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : '',
    };

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthPost('finance/getTransactionHistory', payload, token);

      if (response?.data?.status === 'success') {
        setTransactions(response.data.data || []);
        setTotalItems(response.data.totalResults || 0);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch transactions');
    } finally {
      setLoadingTransactions(false);
    }
  }, [doctorId, startDate, endDate, searchText, filterService, filterStatus, currentPage]);

  useEffect(() => {
    fetchTransactions();
    fetchRevenue();
  }, [fetchTransactions]);

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

  const exportTransactionsToPDF = async () => {
    try {
      setExportingPdf(true);

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

      const pdf = await RNHTMLtoPDF.convert({
        html: htmlContent,
        fileName: `Transaction_Report_${timestamp}`,
        base64: false,
      });

      const downloadsPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      await RNFS.moveFile(pdf.filePath!, downloadsPath);

      Alert.alert('Success', `PDF saved in Files > Downloads as ${fileName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const renderPagination = () => {
    const totalPages = Math.ceil(totalItems / 10);
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <Text style={styles.paginationText}>Previous</Text>
        </TouchableOpacity>

        <Text style={styles.paginationInfo}>
          Page {currentPage} of {totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.paginationText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.receivedCard]}>
          {loadingRevenue ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <>
              <View style={styles.cardIconContainer}>
                <View style={[styles.cardIcon, styles.greenIcon]}>
                  <Icon name="cash" size={20} color="#fff" />
                </View>
              </View>
              <Text style={styles.summaryAmount}>₹{accountSummary.totalReceived.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Amount Received</Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.summaryCard, styles.expenditureCard]}
          onPress={() => navigation.navigate('expenditure')}
        >
          {loadingRevenue ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <View style={styles.cardIconContainer}>
                <View style={[styles.cardIcon, styles.redIcon]}>
                  <Icon name="cash-remove" size={20} color="#fff" />
                </View>
              </View>
              <Text style={styles.summaryAmount}>₹{accountSummary.totalExpenditure.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Expenditure</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.summaryCard, styles.recentCard]}>
          <View style={styles.cardIconContainer}>
            <View style={[styles.cardIcon, styles.blueIcon]}>
              <Icon name="sync" size={20} color="#fff" />
            </View>
          </View>
          <Text style={styles.summaryLabel}>Recent Transactions</Text>
          <ScrollView style={styles.recentTransactionsContainer}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction, index) => (
                <View key={index} style={styles.transactionItem}>
                  <Text style={styles.transactionName} numberOfLines={1}>
                    {transaction.name}
                  </Text>
                  <Text style={styles.transactionAmount}>₹{transaction.amount}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTransactionsText}>No recent transactions</Text>
            )}
          </ScrollView>
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
            placeholder="Search by Patient Name"
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
                {startDate ? moment(startDate).format('DD/MM/YYYY') : 'Start Date'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndPicker(true)}
            >
              <Icon name="calendar" size={18} color="#6B7280" />
              <Text style={styles.dateText}>
                {endDate ? moment(endDate).format('DD/MM/YYYY') : 'End Date'}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onStartChange}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={onEndChange}
              />
            )}
          </View>

          {/* Service Selection Modal */}
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setServiceModalVisible(true)}
          >
            <Text style={styles.dropdownText}>
              {filterService
                ? filterService.charAt(0).toUpperCase() + filterService.slice(1)
                : 'All Services'}
            </Text>
            <Icon name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          <Modal
            visible={serviceModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setServiceModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.serviceModalContent}>
                <Text style={[styles.modalTitle, { alignSelf: 'flex-start' }]}>Select Service</Text>

                {/* Change each TouchableOpacity to have left alignment */}
                <TouchableOpacity
                  style={[styles.serviceOption, { alignItems: 'flex-start' }]}
                  onPress={() => {
                    setFilterService('');
                    setServiceModalVisible(false);
                  }}
                >
                  <Text style={styles.serviceOptionText}>All Services</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.serviceOption, { alignItems: 'flex-start' }]}
                  onPress={() => {
                    setFilterService('appointment');
                    setServiceModalVisible(false);
                  }}
                >
                  <Text style={styles.serviceOptionText}>Appointments</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.serviceOption, { alignItems: 'flex-start' }]}
                  onPress={() => {
                    setFilterService('lab');
                    setServiceModalVisible(false);
                  }}
                >
                  <Text style={styles.serviceOptionText}>Lab</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.serviceOption, { alignItems: 'flex-start' }]}
                  onPress={() => {
                    setFilterService('pharmacy');
                    setServiceModalVisible(false);
                  }}
                >
                  <Text style={styles.serviceOptionText}>Pharmacy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setServiceModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* Transaction History */}
      <View style={styles.transactionSection}>
        <Text style={styles.sectionTitle}>Transaction History</Text>

        {loadingTransactions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length > 0 ? (
          <>
            {transactions.map((item, index) => (
              <View key={item.paymentId || index} style={styles.transactionCard}>
                <View style={styles.txnHeader}>
                  <Text style={styles.txnId}>{item?.paymentId}</Text>
                  <Text style={styles.txnDate}>
                    {dayjs(item?.paidAt || item?.updatedAt).format('DD MMM, YYYY')}
                  </Text>
                </View>
                <View style={styles.txnRow}>
                  <Text style={styles.txnName}>{item.patientName}</Text>
                  <Text style={styles.txnName}>
                    {dayjs(item?.paidAt || item?.updatedAt).format('h:mm A')}
                  </Text>
                </View>
                <View style={styles.txnRow}>
                  <Text style={styles.txnLabel}>{capitalizeFirstLetter(item?.paymentFrom)}</Text>
                  <Text style={styles.txnAmount}>₹{item.finalAmount}</Text>
                </View>
                <View style={styles.txnRow}>
                  <Text style={styles.txnLabel}>{item?.paymentMethod}</Text>
                  <View style={styles.statusRow}>
                    <Text
                      style={[
                        styles.paidStatus,
                        item.paymentStatus === 'paid'
                          ? styles.paidStatusSuccess
                          : item.paymentStatus === 'pending'
                            ? styles.paidStatusPending
                            : styles.paidStatusRefunded,
                      ]}
                    >
                      {item.paymentStatus === 'paid'
                        ? 'Paid'
                        : item.paymentStatus === 'pending'
                          ? 'Pending'
                          : 'Refunded'}
                    </Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: '#3B82F6',
                        borderRadius: 6,
                      }}
                      onPress={() => handleViewTxn(item)}
                    >
                      <Icon name="information-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                        View Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {renderPagination()}
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="file-document-outline" size={40} color="#9CA3AF" />
            <Text style={styles.noDataText}>No transactions found</Text>
          </View>
        )}
      </View>

      {/* Transaction Details Modal */}
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
              <ScrollView>
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
                    <Text style={styles.modalValue}>{selectedTxn.paymentMethod || "Cash"}</Text>
                  </View>
                  <View style={styles.column}>
                    <Text style={styles.modalLabel}>Status:</Text>
                    <Text style={styles.modalValue}>
                      {selectedTxn.paymentStatus === 'refund_pending'
                        ? 'Refunded'
                        : selectedTxn.paymentStatus}
                    </Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.column}>
                    <Text style={styles.modalLabel}>Paid At:</Text>
                    <Text style={styles.modalValue}>
                      {dayjs(selectedTxn.paidAt).format('YY-MMM-YYYY h:mm A')}
                    </Text>
                  </View>
                  <View style={styles.column}>
                    <Text style={styles.modalLabel}>Created At:</Text>
                    <Text style={styles.modalValue}>
                      {dayjs(selectedTxn?.createdAt).format('YY-MMM-YYYY h:mm A')}
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
              </ScrollView>
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
  );
};

export default AccountsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receivedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  expenditureCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  recentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  cardIconContainer: {
    marginBottom: 8,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenIcon: {
    backgroundColor: '#10B981',
  },
  redIcon: {
    backgroundColor: '#EF4444',
  },
  blueIcon: {
    backgroundColor: '#3B82F6',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  recentTransactionsContainer: {
    maxHeight: 120, // Increased maxHeight to prevent overlap
    marginTop: 12, // Added more spacing
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8, // Increased spacing between items
    paddingVertical: 4, // Added padding for better touch area
  },
  transactionName: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  noTransactionsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12, // Added margin to prevent overlap with summary cards
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTitle: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 16,
  },
  filters: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 24, // Added more padding to ensure spacing
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: {
    color: '#6B7280',
  },
  dropdown: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  dropdownText: {
    color: '#6B7280',
  },
  exportBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  exportText: {
    color: '#fff',
    fontWeight: '600',
  },
  transactionSection: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 16,
    color: '#111827',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  txnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    marginBottom: 4,
    color: '#111827',
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  txnLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  txnAmount: {
    fontWeight: '600',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  paidStatusSuccess: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  paidStatusPending: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  paidStatusRefunded: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  paginationButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  paginationText: {
    color: '#fff',
    fontWeight: '600',
  },
  paginationInfo: {
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  serviceModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
    alignSelf: 'flex-start', // Add this
  },
  modalLabel: {
    fontWeight: '600',
    marginTop: 8,
    color: '#374151',
    fontSize: 14,
  },
  modalValue: {
    marginBottom: 4,
    color: '#000000',
    fontSize: 14,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
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
  serviceOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'flex-start', // Change from 'center' to 'flex-start'
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  serviceOptionText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },

});