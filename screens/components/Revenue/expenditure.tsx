import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { AuthPost, AuthFetch } from '../../auth/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';


interface Expense {
  _id: string;
  description: string;
  date: string;
  amount: number;
  paymentMethod: string;
  notes: string;
}

interface UserState {
  currentUserData: { userId: string } | null;
}

const TotalExpenditureScreen: React.FC = () => {
  const user = useSelector((state: UserState) => state.currentUserData);
  const userId = user?.userId;
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState(moment());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [transactionType, setTransactionType] = useState('Transaction Type');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState({
    date: moment(),
    description: '',
    amount: '',
    paymentMethod: 'cash',
    notes: '',
  });

  // Fetch expenses data
  const fetchExpenses = async (start: moment.Moment | null = null) => {
    try {
      setFetching(true);
      let startDate, endDate;

      if (start) {
        startDate = start.format('YYYY-MM-DD');
        endDate = startDate;
      }
      const token = await AsyncStorage.getItem('authToken');

      const response = await AuthFetch(`finance/getExpense?startDate=${startDate}&endDate=${endDate}`, token);
      console.log(response, "expenditure response")
      
      if (response.data.success) {
        setExpenses(response.data.data);
        setTotalExpenses(response.data.data.length);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch expenses. Please try again.',
      });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    const today = moment();
    fetchExpenses(today);
    setSelectedDate(today);
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value) {
      const filtered = expenses.filter(expense =>
        expense._id?.toLowerCase().includes(value.toLowerCase()) ||
        expense.description?.toLowerCase().includes(value.toLowerCase()) ||
        expense.notes?.toLowerCase().includes(value.toLowerCase())
      );
      setExpenses(filtered);
    } else {
      fetchExpenses();
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const momentDate = moment(date);
      setSelectedDate(momentDate);
      fetchExpenses(momentDate);
    }
  };

  const showModal = () => {
    setFormData({
      date: moment(),
      description: '',
      amount: '',
      paymentMethod: 'cash',
      notes: '',
    });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !/^[0-9]+$/.test(formData.amount)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all required fields with valid data.',
      });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        userId,
        date: formData.date.format('YYYY-MM-DD'),
        description: formData.description,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
      };
      const token = await AsyncStorage.getItem('authToken');

      const response = await AuthPost('finance/createExpense', payload, token);
      console.log(response, )
      
      if (response?.data?.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Expense created successfully!',
        });
        await fetchExpenses(selectedDate);
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create expense. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.card}>
      <Text style={styles.cardText}><Text style={styles.label}>Transaction ID:</Text> {item._id || 'N/A'}</Text>
      <Text style={styles.cardText}><Text style={styles.label}>Description:</Text> {item.description || 'N/A'}</Text>
      <Text style={styles.cardText}><Text style={styles.label}>Date:</Text> {moment(item.date).format('DD-MMM-YYYY') || 'N/A'}</Text>
      <Text style={styles.cardText}><Text style={styles.label}>Amount:</Text> ₹{item.amount || 'N/A'}</Text>
      <Text style={styles.cardText}><Text style={styles.label}>Payment Method:</Text> {item.paymentMethod ? item.paymentMethod.charAt(0).toUpperCase() + item.paymentMethod.slice(1) : 'N/A'}</Text>
      <Text style={styles.cardText}><Text style={styles.label}>Notes:</Text> {item.notes || 'N/A'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Expenditures</Text>
        <TouchableOpacity style={styles.addButton} onPress={showModal}>
          <Text style={styles.addButtonText}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Transaction ID, Description or Notes"
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>
            {selectedDate.format('MM/DD/YYYY')}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate.toDate()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>

      {fetching ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <FlatList
          data={expenses.slice((currentPage - 1) * 10, currentPage * 10)}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          style={styles.list}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing 1 to {Math.min(currentPage * 10, totalExpenses)} of {totalExpenses} entries
        </Text>
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={currentPage === 1}
            onPress={() => setCurrentPage(prev => prev - 1)}
            style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageText}>{currentPage}</Text>
          <TouchableOpacity
            disabled={currentPage * 10 >= totalExpenses}
            onPress={() => setCurrentPage(prev => prev + 1)}
            style={[styles.pageButton, currentPage * 10 >= totalExpenses && styles.disabledButton]}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Add New Expense</Text>
              <Text style={styles.formLabel}>Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {formData.date.format('MM/DD/YYYY')}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.date.toDate()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) {
                      setFormData({ ...formData, date: moment(date) });
                    }
                  }}
                />
              )}

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Rent, Salary, Supplies"
                value={formData.description}
                onChangeText={text => setFormData({ ...formData, description: text })}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.formLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                value={formData.amount}
                onChangeText={text => setFormData({ ...formData, amount: text })}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.formLabel}>Payment Method</Text>
              <Picker
                selectedValue={formData.paymentMethod}
                onValueChange={value => setFormData({ ...formData, paymentMethod: value })}
                style={styles.picker}
              >
                <Picker.Item label="Cash" value="cash" />
                <Picker.Item label="Card" value="card" />
                <Picker.Item label="UPI" value="upi" />
                <Picker.Item label="Bank Transfer" value="bank transfer" />
              </Picker>

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes (optional)"
                value={formData.notes}
                onChangeText={text => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>
                    {loading ? 'Submitting...' : 'Submit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filters: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    marginBottom: 8,
  },
  datePickerButton: {
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    marginBottom: 8,
  },
  datePickerText: {
    color: '#1977F3',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#111827',
  },
  label: {
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  pageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  pageText: {
    fontSize: 16,
    color: '#111827',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
  },
  picker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TotalExpenditureScreen;