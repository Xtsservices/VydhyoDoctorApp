import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Key, ReactNode, use, useEffect, useState } from 'react';
import { AuthPost, AuthFetch } from '../../auth/auth';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
   FlatList,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';

interface Appointment {
  doctorId: string;
  patientId: string;
  label: ReactNode;
  value: Key | null | undefined;
  _id: string;
  appointmentDate: ReactNode;
  appointmentType: ReactNode;
  patientName: ReactNode;
  id: string;
  // name: string;
  phone: string;
  clinic: string;
  type: string;
  date: string;
  status: 'Upcoming' | 'Completed';
  statusColor: string;
  typeIcon: string;
  avatar?: string;
}



// Define the Patient interface


const AppointmentsScreen = () => {

   const currentuserDetails =  useSelector((state: any) => state.currentUser);
      const doctorId = currentuserDetails.role==="doctor"? currentuserDetails.userId : currentuserDetails.createdBy

  const [Appointments , setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [scheduledAppointments, setScheduledAppointments] = useState<Appointment[]>([]);
  const [rescheduledAppointments, setRescheduledAppointments] = useState<Appointment[]>([]);
  const [cancelledAppointments, setCancelledAppointments] = useState<Appointment[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [totalAppointments, setTotalAppointments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

    const userId = useSelector((state: any) => state.currentUserID);
    const [actionModalVisible, setActionModalVisible] = useState(false);
const [selectedAction, setSelectedAction] = useState('');
// const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
const [selected_Id, setSelected_Id] = useState('');
const [reason, setReason] = useState('');
const [newDate, setNewDate] = useState('');
const [newTime, setNewTime] = useState('');
const [medicineName, setMedicineName] = useState('');
const [medicineQty, setMedicineQty] = useState('');
const [medicines, setMedicines] = useState<{ medName: string; quantity: string }[]>([]);

const [testName, setTestName] = useState('');
const [testQty, setTestQty] = useState('');
const [tests, setTests] = useState<{ testName: string;  }[]>([]);
const [selectedName, setSelectedName] = useState<string | null>(null);



const openActionModal = (action: string, id: string, _id: string) => {
  setSelectedAction(action);
  setSelectedAppointmentId(id);
  setSelected_Id(_id);
  setActionModalVisible(true);
};





const fetchAppointments = async () => {
     
      try {
        const token = await AsyncStorage.getItem('authToken');
        console.log('Auth Token:', token);
        const res = await AuthFetch(`appointment/getAppointmentsCountByDoctorID?doctorId=${doctorId}`, token);

        console.log('Response from API:', res);

        let data: any[] = [];
        if ('data' in res && Array.isArray(res.data.data)) {
          data = res.data.data;
        } else {
          console.error('API response does not contain data array:', res);
        }

        console.log('Data fetched:', data);
        if (data && Array.isArray(data)) {
           const filteredData = data.filter((appt: any) => appt.appointmentStatus?.toLowerCase() !== "completed");
          const formattedAppointments = filteredData.map((appt: any) => ({
            label: appt.patientName || '',
            value: appt.appointmentId || '',
            _id: appt._id || appt.appointmentId || '',
            appointmentDate: appt.appointmentDate || '',
            appointmentType: appt.appointmentType || '',
            patientName: appt.patientName || '',
            id: appt.appointmentId || '',
            doctorId: appt.doctorId || '',
            // name: appt.patientName || '',
            phone: appt.phone || '',
            clinic: appt.clinic || 'Unknown Clinic',
            type: appt.appointmentType || 'General',
            date: appt.appointmentDate
              ? appt.appointmentDate.slice(0, 10)
              : 'Unknown Date',
            status: appt.appointmentStatus || '',
            statusColor: appt.appointmentStatus === 'Completed' ? '#E0E7FF' : '#D1FAE5',
            typeIcon: 'video-outline',
            avatar: "https://i.pravatar.cc/150?img=12",
            patientId:appt.userId
          }));


          setAppointments(formattedAppointments);
          setAllAppointments(formattedAppointments);
        }



        setTotalAppointments(data);

        const scheduledAppointments = data.filter((appt: any) => appt.appointmentStatus === 'scheduled');
        setScheduledAppointments(scheduledAppointments);
        const RescheduledAppointments = data.filter((appt: any) => appt.appointmentStatus === 'rescheduled');
        setRescheduledAppointments(RescheduledAppointments);
        const CancelledAppointments = data.filter((appt: any) => appt.appointmentStatus === 'cancelled');
        setCancelledAppointments(CancelledAppointments);
        const CompletedAppointments = data.filter((appt: any) => appt.appointmentStatus === 'completed');
        setCompletedAppointments(CompletedAppointments);

  
        // Simulate fetching data from an API
        console.log('Fetched appointments:', Appointments);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };
  
    useEffect(() => {

      fetchAppointments();
    }, []);

    useEffect(() => {
      console.log('selectedType:', allAppointments);

       let filtered = allAppointments;

  if (selectedType && selectedType !== '') {
    filtered = filtered.filter(
      (appt) =>
        appt.type.toLowerCase() === selectedType.toLowerCase()
    );
  }


  if (search.trim() !== '') {
    console.log(search, 'searching for keyword');
    const keyword = search.toLowerCase();
    filtered = filtered.filter(
      (appt) =>
        appt.patientName.toLowerCase().includes(keyword) ||
        appt.id.toLowerCase().includes(keyword)
    );
  }
  console.log('Filtered Appointments:', filtered);

  setAppointments(filtered);

      if (selectedType !== null && selectedType !== '') {
        const filtered = allAppointments.filter((appt) => appt.status.toLowerCase() === selectedType.toLowerCase());
        console.log('Filtered Appointments:', filtered);
        setAppointments(filtered);
      } else {
        setAppointments(filtered);
      }


    }, [selectedType, search,]);

console.log('Appointments:', Appointments);

    const handleStatusChange = async (id: string, status: string, _id: string, patientName: string, patientId: string, p0: any) => {

const body = {
  appointmentId: id,
  reason:"jhfj"
}


      console.log('Changing status for appointment ID:', _id, 'to', status, body);
  try {
    const token = await AsyncStorage.getItem('authToken');



    if (status === 'Cancel') {



      const response = await AuthPost('appointment/cancelAppointment', body, token);
if (!response || !('data' in response) || response.data.status === 'success') {

   Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Appointment cancelled successfully',
          position: 'top',
          visibilityTime: 3000,
        });
  fetchAppointments();
        return;
      }
console.log('Response from cancelAppointment:', response);
    }else if (status === 'Reschedule') {
      console.log('Rescheduling appointment with ID:', id);

      const Recheduledata = {
        appointmentId: id,
        newDate: newDate,
        newTime: newTime,
        reason: reason,
      }
      console.log('Recheduledata:', Recheduledata);
      const response = await AuthPost('appointment/rescheduleAppointment', Recheduledata, token);
      console.log('Response from rescheduleAppointment:', response);
      if (!response || !('data' in response) || response.data.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Successfully rescheduled appointment',
          position: 'top',
          visibilityTime: 3000,
        });
        fetchAppointments();
        return;
      }else{
        Alert.alert('Error', response.data.message || 'Failed to reschedule appointment');
      }
      // if (!response || !('data' in response) || response.data.status === 'success') {
      //   Toast.show({
      //     type: 'Success',
      //     text1: 'Success',
      //     text2: 'Successfully reschedule appointment',
      //     position: 'top',
      //     visibilityTime: 3000,
      //   });
      //   fetchAppointments();
      //   return;
      // }
    }else if(status === 'Mark as Completed' ){
      console.log('Completing appointment with ID:', id);
        const response = await AuthPost('appointment/completeAppointment', body, token);
        console.log('Response from completeAppointment:', response);
    if (!response || !('data' in response) || response.data.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Successfully appointment completed',
          position: 'top',
          visibilityTime: 3000,
        });
        fetchAppointments();
        return;
      }


    }else if (status === 'Prescription') {
      console.log('Opening prescription modal for appointment ID:1', id);
      const body = {
        patientId: patientId,
        medicines,
        tests,
        doctorId: userId,
      };

      console.log('Adding prescription for appointment ID:', id, body);
     
      const response = await AuthPost('pharmacy/addPrescription', body, token);
      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Prescription added successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      fetchAppointments();
       setActionModalVisible(false);
      }
      console.log('Response from completeAppointment:', response);
      setSelectedAppointmentId(id);
      setActionModalVisible(true);
      return;
  }

  } catch (err) {
    console.error('Update Failed:', err);
  }
};

const handleAddMedicine = () => {
  if (medicineName && medicineQty) {
    setMedicines([...medicines, { medName: medicineName, quantity: medicineQty }]);
    setMedicineName('');
    setMedicineQty('');
  }
};

const handleDeleteMedicine = (index: number) => {
  const updated = [...medicines];
  updated.splice(index, 1);
  setMedicines(updated);
};

const handleAddTest = () => {
  if (testName ) {
    setTests([...tests, { testName: testName, }]);
    setTestName('');
    setTestQty('');
  }
};

const handleDeleteTest = (index: number) => {
  const updated = [...tests]
  updated.splice(index, 1);
  setTests(updated);
};

   
const renderAppointmentCard = ({ item: appt }: { item: Appointment }) => {
  return (
    <View style={styles.apptCard}>
      <View style={styles.row}>
        <Image source={{ uri: appt.avatar }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{appt.patientName}</Text>
          <Text style={styles.phone}>{appt.phone}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setSelectedAppointmentId(appt.id);
            setSelectedName(String(appt.patientName ?? '')); // Set name immediately
            setSelected_Id(appt._id); // Set _id if needed
            setActionMenuVisible(true); // Open dropdown
          }}
        >
          <Icon name="dots-vertical" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <Text style={styles.id}>ID: {appt.id}</Text>
      <Text style={styles.clinic}>{appt.clinic}</Text>

      <View style={styles.row}>
        <View style={styles.tag}>
          <Icon name={appt.typeIcon} size={14} color="#3B82F6" />
          <Text style={styles.tagText}>{appt.type}</Text>
        </View>
        <Text style={styles.date}>{appt.date}</Text>
        <View
          style={[
            styles.status,
            {
              backgroundColor:
                appt.status === 'Upcoming' ? '#DCFCE7' : '#E0E7FF',
            },
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              color: appt.status === 'Upcoming' ? '#16A34A' : '#4338CA',
            }}
          >
            {appt.status}
          </Text>
        </View>
      </View>

      {/* Action Menu Modal */}
    

   

      {/* Action Modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{selectedAction}</Text>

            {selectedAction === 'Cancel' && (
              <TextInput
                placeholder="Enter reason for cancellation"
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                multiline
              />
            )}

            {selectedAction === 'Reschedule' && (
              <>
                <TextInput
                  placeholder="Enter new date (YYYY-MM-DD)"
                  style={styles.input}
                  value={newDate}
                  onChangeText={setNewDate}
                />
                <TextInput
                  placeholder="Enter new time (HH:mm)"
                  style={styles.input}
                  value={newTime}
                  onChangeText={setNewTime}
                />
              </>
            )}

            {selectedAction === 'Mark as Completed' && (
              <Text style={styles.infoText}>
                Are you sure you want to mark this appointment as completed?
              </Text>
            )}

            {selectedAction === 'Prescription' && (
              <View>
                {/* Patient Info */}
                <Text style={styles.sectionTitle}>Patient Details</Text>
                <Text style={styles.infoText}>Name: {selectedName}</Text>
                {/* Add other patient details if available */}
                {/* <Text style={styles.infoText}>Age: {appt.patientAge}</Text>
                <Text style={styles.infoText}>Gender: {appt.patientGender}</Text> */}

                {/* Medicine Input */}
                <Text style={styles.sectionTitle}>Medicines</Text>
                <View style={styles.row}>
                  <TextInput
                    placeholder="Medicine name"
                    value={medicineName}
                    onChangeText={setMedicineName}
                    style={[styles.input, { flex: 2 }]}
                  />
                  <TextInput
                    placeholder="Qty"
                    value={medicineQty}
                    onChangeText={setMedicineQty}
                    keyboardType="number-pad"
                    style={[styles.input, { flex: 1, marginLeft: 8 }]}
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddMedicine}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {/* Added Medicines */}
                {medicines.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemText}>
                      {item.medName} ({item.quantity})
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteMedicine(index)}
                    >
                      <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Test Input */}
                <Text style={styles.sectionTitle}>Tests</Text>
                <View style={styles.row}>
                  <TextInput
                    placeholder="Test name"
                    value={testName}
                    onChangeText={setTestName}
                    style={[styles.input, { flex: 2 }]}
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddTest}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {/* Added Tests */}
                {tests.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemText}>{item.testName}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteTest(index)}
                    >
                      <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  setActionModalVisible(false);
                  if (selectedAppointmentId) {
                    handleStatusChange(
                      selectedAppointmentId,
                      selectedAction,
                      selected_Id,
                      selectedName ?? '',
                      appt.patientId ?? '',
                      appt.doctorId ?? ''
                    ); // Call API with updated data
                  }
                }}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setActionModalVisible(false);
                  setMedicineName('');
                  setMedicineQty('');
                  setTestName('');
                  setTestQty('');
                  setMedicines([]);
                  setTests([]);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

//     const renderAppointmentCard = ({ item: appt }: { item: Appointment }) => {
//       return (
//         <View style={styles.apptCard}>
//           <View style={styles.row}>
//             <Image source={{ uri: appt.avatar }} style={styles.avatar} />
//             <View style={{ flex: 1 }}>
//               <Text style={styles.name}>{appt.patientName}</Text>
//               <Text style={styles.phone}>{appt.phone}</Text>
//             </View>
//             <TouchableOpacity
//   onPress={() => {
//     setSelectedAppointmentId(appt.id);
//     setActionMenuVisible(true);
//   }}
// >
//   <Icon name="dots-vertical" size={20} color="#999" />
// </TouchableOpacity>

//           </View>

//           <Text style={styles.id}>ID: {appt.id}</Text>
//           <Text style={styles.clinic}>{appt.clinic}</Text>

//           <View style={styles.row}>
//             <View style={styles.tag}>
//               <Icon name={appt.typeIcon} size={14} color="#3B82F6" />
//               <Text style={styles.tagText}>{appt.type}</Text>
//             </View>

//             <Text style={styles.date}>{appt.date}</Text>
//             <View
//               style={[
//                 styles.status,
//                 {
//                   backgroundColor:
//                     appt.status === 'Upcoming' ? '#DCFCE7' : '#E0E7FF',
//                 },
//               ]}
//             >
//               <Text
//                 style={{
//                   fontSize: 12,
//                   color: appt.status === 'Upcoming' ? '#16A34A' : '#4338CA',
//                 }}
//               >
//                 {appt.status}
//               </Text>
//             </View>
//           </View>
//           <Modal
//   visible={actionMenuVisible}
//   transparent
//   animationType="fade"
//   onRequestClose={() => setActionMenuVisible(false)}
// >
//   <Pressable
//     style={styles.modalOverlay}
//     onPress={() => setActionMenuVisible(false)}
//   >
//     {/* <View style={styles.dropdown}>
//       {['Prescription', 'Mark as Completed', 'Reschedule', 'Cancel'].map((status) => (
//         <Pressable
//           key={status}
//           style={styles.option}
//           onPress={() => {
//             if (selectedAppointmentId) {
//               // ✅ Send to API
//               handleStatusChange(selectedAppointmentId, status, appt._id);
//             }
//             setActionMenuVisible(false);
//           }}
//         >
//           <Text>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
//         </Pressable>
//       ))}
//     </View> */}
//     <View style={styles.dropdown}>
//   {['Prescription', 'Mark as Completed', 'Reschedule', 'Cancel'].map((status,) => (
//     <Pressable
//       key={status}
//       style={styles.option}
//       onPress={() => {
//         setActionMenuVisible(false); // close dropdown

//         if (selectedAppointmentId) {
//           if (status === '') {
//             // Direct API or navigation logic
//             // handleStatusChange(selectedAppointmentId, status, appt._id);
//           } else {
//             // Show modal for other actions
//             setSelectedAction(status);
//             console.log('Selected Action:', status);
//             setSelectedAppointmentId(selectedAppointmentId);
//             setSelected_Id(appt._id);
//             setActionModalVisible(true);
//             setSelectedName(String(appt.patientName ?? ''));
//               handleStatusChange(selectedAppointmentId, status, appt._id, String(appt.patientName ?? ''));
//               // setSelectedAppointment(appt); 
//           }
//         }
//       }}
//     >
//       <Text>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
//     </Pressable>
//   ))}
// </View>

//   </Pressable>
// </Modal>

// <Modal
//   visible={actionModalVisible}
//   transparent
//   animationType="fade"
//   onRequestClose={() => setActionModalVisible(false)}
// >
//   <View style={styles.modalOverlay}>
//     <View style={styles.modalContainer}>
//       <Text style={styles.modalTitle}>{selectedAction}</Text>

//       {selectedAction === 'Cancel' && (
//         <TextInput
//           placeholder="Enter reason for cancellation"
//           style={styles.input}
//           value={reason}
//           onChangeText={setReason}
//           multiline
//         />
//       )}

//       {selectedAction === 'Reschedule' && (
//         <>
//           <TextInput
//             placeholder="Enter new date (YYYY-MM-DD)"
//             style={styles.input}
//             value={newDate}
//             onChangeText={setNewDate}
//           />
//           <TextInput
//             placeholder="Enter new time (HH:mm)"
//             style={styles.input}
//             value={newTime}
//             onChangeText={setNewTime}
//           />
//         </>
//       )}

//       {selectedAction === 'Mark as Completed' && (
//         console.log('Selected Appointment ID:', ),
//         <Text style={styles.infoText}>Are you sure you want to mark this appointment as completed?</Text>
//       )}

//       {selectedAction === 'Prescription' && (
//         console.log('Selected Appointment ID:', selectedName),
//   <View>
//     {/* Patient Info */}
//     <Text style={styles.sectionTitle}>Patient Details</Text>
//     <Text style={styles.infoText}>Name: {selectedName}</Text>
//     {/* <Text style={styles.infoText}>Age: {appt.patientAge}</Text>
//     <Text style={styles.infoText}>Gender: {appt.patientGender}</Text> */}

//     {/* Medicine Input */}
//     <Text style={styles.sectionTitle}>Medicines</Text>
//     <View style={styles.row}>
//       <TextInput
//         placeholder="Medicine name"
//         value={medicineName}
//         onChangeText={setMedicineName}
//         style={[styles.input, { flex: 2 }]}
//       />
//       <TextInput
//         placeholder="Qty"
//         value={medicineQty}
//         onChangeText={setMedicineQty}
//         keyboardType="number-pad"
//         style={[styles.input, { flex: 1, marginLeft: 8 }]}
//       />
//       <TouchableOpacity style={styles.addButton} onPress={handleAddMedicine}>
//         <Text style={styles.addButtonText}>Add</Text>
//       </TouchableOpacity>
//     </View>

//     {/* Added Medicines */}
//     {medicines.map((item, index) => (
//       <View key={index} style={styles.itemRow}>
//         <Text style={styles.itemText}>{item.name} ({item.qty})</Text>
//         <TouchableOpacity onPress={() => handleDeleteMedicine(index)}>
//           <Text style={styles.deleteText}>🗑️</Text>
//         </TouchableOpacity>
//       </View>
//     ))}

//     {/* Test Input */}
//     <Text style={styles.sectionTitle}>Tests</Text>
//     <View style={styles.row}>
//       <TextInput
//         placeholder="Test name"
//         value={testName}
//         onChangeText={setTestName}
//         style={[styles.input, { flex: 2 }]}
//       />
     
//       <TouchableOpacity style={styles.addButton} onPress={handleAddTest}>
//         <Text style={styles.addButtonText}>Add</Text>
//       </TouchableOpacity>
//     </View>

//     {/* Added Tests */}
//     {tests.map((item, index) => (
//       <View key={index} style={styles.itemRow}>
//         <Text style={styles.itemText}>{item.name} ({item.qty})</Text>
//         <TouchableOpacity onPress={() => handleDeleteTest(index)}>
//           <Text style={styles.deleteText}>🗑️</Text>
//         </TouchableOpacity>
//       </View>
//     ))}
//   </View>
// )}


//       <View style={styles.modalButtons}>
//         <Pressable
//           style={[styles.modalButton, styles.confirmButton]}
//           onPress={() => {
//             setActionModalVisible(false);
//             if (selectedAppointmentId) {
//               handleStatusChange(selectedAppointmentId, selectedAction, selected_Id);
//             }
//           }}
//         >
//           <Text style={styles.buttonText}>Confirm</Text>
//         </Pressable>

//         <Pressable
//           style={[styles.modalButton, styles.cancelButton]}
//           onPress={() => setActionModalVisible(false)}
//         >
//           <Text style={styles.buttonText}>Cancel</Text>
//         </Pressable>
//       </View>
//     </View>
//   </View>
// </Modal>



//         </View>
//       );
//     }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F0FDF4' }}>

    <View style={styles.container}>
      <Text style={styles.header}>Appointments</Text>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}> 
      <View style={styles.summaryContainer}>
        <View style={[styles.card, { borderColor: '#FBBF24' }]}>
          <Text style={[styles.cardTitle, {color:'#FBBF24'}]}>{totalAppointments.length}</Text>
          <Text style={{color:'#FBBF24'}}>Total Appointments</Text>          
        </View>
        <View style={[styles.card, { borderColor: '#10B981' }]}>
          <Text style={[styles.cardTitle, {color:'#10B981'}]}>{scheduledAppointments.length}</Text>
          <Text style={{color:'#10B981'}}>Upcoming</Text>
        </View>
        <View style={[styles.card, { borderColor: '#6366F1' }]}>
          <Text style={[styles.cardTitle ,{color:'#6366F1'} ]}>{completedAppointments.length}</Text>
          <Text style={{color:'#6366F1'}}>Completed</Text>
        </View>
         <View style={[styles.card, { borderColor: 'red' }]}>
          <Text style={[styles.cardTitle, {color:'red'}]}>{cancelledAppointments.length}</Text>
          <Text style={{color:'red'}}>Cancelled</Text>
        </View>
      </View>
      </ScrollView>

      {/* Search + Filter */}

       <View style={{ flex: 1, padding: 16 }}>
      {/* Search & Filter */}
      <View style={styles.searchContainer}>

      <TextInput
  placeholder="Search by Patient ID or Name"
  style={styles.searchInput}
  value={search}
  onChangeText={setSearch}
/>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setDropdownVisible(true)}
        >
          <Icon name="filter-variant" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Filter */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdown}>
            <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedType('scheduled');
                setDropdownVisible(false);

              }}
            >
              <Text>Scheduled</Text>
            </Pressable>
            <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedType('rescheduled');
                setDropdownVisible(false);
              }}
            >
              <Text>Rescheduled</Text>
            </Pressable>
            <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedType('cancelled');
                setDropdownVisible(false);
              }}
            >
              <Text>Cancelled</Text>
            </Pressable>
            {/* <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedType('completed');
                setDropdownVisible(false);

              }}
            >
              <Text>Completed</Text>
            </Pressable> */}
          </View>
        
        </Pressable>
      </Modal>


         <Modal
        visible={actionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActionMenuVisible(false)}
        >
          <View style={styles.dropdown}>
            {['Prescription', 'Mark as Completed', 'Reschedule', 'Cancel'].map(
              (status) => (
                <Pressable
                  key={status}
                  style={styles.option}
                  onPress={() => {
                    setActionMenuVisible(false); // Close dropdown
                    setSelectedAction(status); // Set selected action
                    setActionModalVisible(true); // Open action modal
                    // Call handleStatusChange only when confirming in the action modal
                  }}
                >
                  <Text>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Filtered List */}
      
    </View>
      
      {/* <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search by Patient ID or Name"
          style={styles.searchInput}
        />
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-variant" size={22} color="#fff" />
        </TouchableOpacity>
      </View> */}

      {/* Appointment Cards */}

       <FlatList
              data={Appointments}
              keyExtractor={(item) => item.id}
              renderItem={renderAppointmentCard}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
      
    </View>
    </ScrollView>
  );
};

export default AppointmentsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardSub: {
    fontSize: 12,
    color: 'green',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  filterButton: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  apptCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 14,
    borderRadius: 12,
    shadowColor: '#000',
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  phone: {
    fontSize: 12,
    color: '#6B7280',
  },
  id: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  clinic: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  date: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
    textAlign: 'center',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  
  
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    paddingVertical: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  // modalOverlay: {
  //   flex: 1,
  //   backgroundColor: 'rgba(0,0,0,0.4)',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  modalContainer: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 12,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  confirmButton: {
    backgroundColor: '#10B981', // green
  },
  cancelButton: {
    backgroundColor: '#EF4444', // red
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  marginTop: 20,
  marginBottom: 6,
  color: '#333',
},

addButton: {
  backgroundColor: '#10B981',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
  marginLeft: 8,
},
addButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},
itemRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 6,
  borderBottomColor: '#eee',
  borderBottomWidth: 1,
},
itemText: {
  fontSize: 14,
  color: '#333',
},
deleteText: {
  fontSize: 18,
  color: '#EF4444',
}

  
});
