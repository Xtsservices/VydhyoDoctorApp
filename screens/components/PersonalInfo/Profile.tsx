import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  SafeAreaView,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import moment from 'moment';
import { Dispatch } from 'redux';

// API functions (keep your implementations)
import { AuthFetch, AuthPut, UploadFiles, AuthPost, UpdateFiles } from '../../auth/auth';
import { useDispatch, useSelector } from 'react-redux';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type LangOption = { label: string; value: string };

const languageOptions: LangOption[] = [
  { label: 'Telugu', value: 'Telugu' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'English', value: 'English' },
  { label: 'Urdu', value: 'Urdu' },
];

type BankDetails = {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountProof?: any;
};

type Address = {
  _id: string;
  clinicName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string | number;
  startTime?: string;
  endTime?: string;
};

type Specialization = {
  name?: string;
  id?: string;
  experience?: number | string;
  degree?: string; // comma-separated degree names
  bio?: string;
  specializationCertificate?: any;
  drgreeCertificate?: any; // typo on backend, keep compatibility
  degreeCertificate?: any;
};

type ConsultationModeFee = {
  type: string;
  fee: number | string;
  currency?: string; // e.g., "₹" or "INR"
};

type KycDetails = {
  pan?: {
    number?: string;
    attachmentUrl?: any;
  };
};

type DoctorData = {
  _id: string;
  key: string;
  firstname: string;
  lastname: string;
  specialization: Specialization[];
  email: string;
  mobile: string;
  status: string;
  medicalRegistrationNumber: string;
  userId: string | number;
  createdAt?: string;
  consultationModeFee: ConsultationModeFee[];
  spokenLanguage: string[];
  gender: string;
  DOB?: string;
  bloodgroup?: string;
  maritalStatus?: string;
  addresses?: Address[];
  bankDetails: BankDetails;
  kycDetails: {
    panNumber?: string;
    panImage?: any;
  };
  certifications: {
    name: string;
    registrationNo: string;
    image?: any;
    degreeCertificate?: any;
  }[];
  profilepic?: any;
};

type EditModalType = 'personal' | 'professional' | 'kyc' | 'consultation' | 'bank' | null;



// Validators (client-side parity with web)
const isValidIFSC = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
const sanitizeIFSC = (v: string) => (v || '').toUpperCase().slice(0, 11);
const isDigits = (v: string) => /^[0-9]+$/.test(v);

const DoctorProfileView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentuserDetails = useSelector((state: any) => state.currentUser);

  // Data
  const [token, setToken] = useState<string | null>(null);
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null);
  const [degrees, setDegrees] = useState<string[]>([]);
  const [kycServer, setKycServer] = useState<KycDetails | null>(null);

  // Document preview modal
  const [isDocModalVisible, setIsDocModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ type: string; data: any } | null>(null);

  // Edit modal
  const [editModalType, setEditModalType] = useState<EditModalType>(null);

  // Forms state (per section)
  const [formPersonal, setFormPersonal] = useState({
    firstname: '',
    lastname: '',
    email: '',
    spokenLanguage: [] as string[],
  });
  const dispatch = useDispatch();
  const [formProfessional, setFormProfessional] = useState({
    selectedDegrees: [] as string[], // multi-select
    experience: '',
    about: '',
  });

  // NEW: degree selection modal state & search
  const [degreeModalVisible, setDegreeModalVisible] = useState(false);
  const [degreeSearchText, setDegreeSearchText] = useState('');

  // KYC form state
  const [panNumber, setPanNumber] = useState('');
  const [panImage, setPanImage] = useState<{ uri: string; name: string; type?: string } | null>(null);
  const [pancardUploaded, setPancardUploaded] = useState(false);

  // Consultation form (list)
  const [formConsultation, setFormConsultation] = useState<ConsultationModeFee[]>([]);
let isFeeInvalid 
  // Bank form
  const [formBank, setFormBank] = useState<BankDetails>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
  });

  // Utilities
  const getLocationColor = (name: string) => {
    const colors = ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1', '#955251', '#B565A7'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  // Init token
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('authToken');
        if (!t) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Authentication token not found' });
          return;
        }
        setToken(t);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to retrieve auth token' });
      }
    })();
  }, []);

  // Fetch data
  const fetchDegrees = async () => {
    if (!token) return;
    try {
      const res = await AuthFetch('catalogue/degree/getAllDegrees', token);

      const data = res?.data?.data || [];
      const names = data.map((d: any) => d?.name || d?.degreeName || d?.title).filter(Boolean);
      setDegrees(names);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch degrees' });
    }
  };

  const fetchDoctorData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await AuthFetch('users/getUser', token);
      if (res?.status === 'error') throw new Error(res?.message || 'Failed to fetch doctor data');

      const userData = res?.data?.data;
      if (!userData) {
        setDoctorData(null);
        return;
      }

      const specializations: Specialization[] = userData.specialization
        ? Array.isArray(userData.specialization)
          ? userData.specialization
          : [userData.specialization]
        : [];

      const certifications = specializations.map((spec: Specialization) => ({
        name: spec?.name || 'Specialization',
        registrationNo: spec?.id || 'N/A',
        image: spec?.specializationCertificateUrl || null,
        degreeCertificate: spec?.degreeCertificateUrl || spec?.drgreeCertificateUrl || null,
      }));

      const bankDetails = userData.bankDetails || {};
      const resolvedProfilePic =
        userData.profilepic ||
        userData.profilePicture ||
        userData.profilepicture ||
        userData.profile_image ||
        userData.profile_image_url ||
        null;

      const dd: DoctorData = {
        _id: userData._id,
        key: userData._id,
        firstname: userData.firstname || 'N/A',
        lastname: userData.lastname || '',
        specialization: specializations,
        email: userData.email || 'N/A',
        mobile: userData.mobile || 'N/A',
        status: userData.status || 'pending',
        medicalRegistrationNumber: userData.medicalRegistrationNumber || 'N/A',
        userId: userData.userId || 'N/A',
        createdAt: userData.createdAt,
        consultationModeFee: Array.isArray(userData.consultationModeFee) ? userData.consultationModeFee : [],
        spokenLanguage: Array.isArray(userData.spokenLanguage) ? userData.spokenLanguage : [],
        gender: userData.gender || 'N/A',
        DOB: userData.DOB || 'N/A',
        bloodgroup: userData.bloodgroup || 'N/A',
        maritalStatus: userData.maritalStatus || 'N/A',
        addresses: Array.isArray(userData.addresses) ? userData.addresses : [],
        bankDetails,
        kycDetails: {
          panNumber: userData.kycDetails?.pan?.number || 'N/A',
          panImage: userData.kycDetails?.pan?.attachmentUrl || null,
        },
        certifications,
        profilepic: resolvedProfilePic,
      };

      setDoctorData(dd);

      // Seed forms
      setFormPersonal({
        firstname: dd.firstname || '',
        lastname: dd.lastname || '',
        email: dd.email || '',
        spokenLanguage: dd.spokenLanguage || [],
      });

      const firstSpec = dd.specialization?.[0] || {};
      const selectedDegrees = (firstSpec?.degree ? String(firstSpec.degree).split(',') : []).map(s => s.trim()).filter(Boolean);

      setFormProfessional({
        selectedDegrees,
        experience: String(firstSpec?.experience ?? ''),
        about: String(firstSpec?.bio ?? ''),
      });

      setFormConsultation(
        (dd.consultationModeFee || []).map((m) => ({
          type: m.type,
          fee: String(m.fee ?? ''),
          currency: m.currency || '₹',
        }))
      );

      setFormBank({
        bankName: dd.bankDetails?.bankName || '',
        accountHolderName: dd.bankDetails?.accountHolderName || '',
        accountNumber: dd.bankDetails?.accountNumber || '',
        ifscCode: dd.bankDetails?.ifscCode || '',
        accountProof: dd.bankDetails?.accountProof,
      });

      setPanNumber(dd.kycDetails?.panNumber === 'N/A' ? '' : dd.kycDetails?.panNumber || '');

    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message || 'Failed to load doctor data' });
    } finally {
      setLoading(false);
    }
  };

  const fetchKyc = async () => {
    if (!token) return;
    try {
      const res = await AuthFetch('users/getKycByUserId', token);
      setKycServer(res?.data?.data || null);
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    if (token) {
      fetchDoctorData();
      fetchDegrees();
      fetchKyc();
    }
  }, [token]);

  // Document modal
  const showDocModal = (doc: { type: string; data: any }) => {
    setSelectedDocument(doc);
    setIsDocModalVisible(true);
  };

  const closeDocModal = () => {
    setIsDocModalVisible(false);
    setSelectedDocument(null);
  };

  // Reset form slices from the latest saved data before opening/closing modals
const seedFormsFromSaved = (type: EditModalType) => {
  if (!doctorData) return;

  if (type === 'personal') {
    setFormPersonal({
      firstname: doctorData.firstname || '',
      lastname: doctorData.lastname || '',
      email: doctorData.email || '',
      spokenLanguage: doctorData.spokenLanguage || [],
    });
    return;
  }

  if (type === 'professional') {
    const firstSpec = doctorData.specialization?.[0] || {};
    const selectedDegrees = (firstSpec?.degree ? String(firstSpec.degree).split(',') : [])
      .map(s => s.trim())
      .filter(Boolean);
    setFormProfessional({
      selectedDegrees,
      experience: String(firstSpec?.experience ?? ''),
      about: String(firstSpec?.bio ?? ''),
    });
    return;
  }

  if (type === 'consultation') {
    setFormConsultation(
      (doctorData.consultationModeFee || []).map(m => ({
        type: m.type,
        fee: String(m.fee ?? ''),
        currency: m.currency || '₹',
      }))
    );
    return;
  }

  if (type === 'bank') {
    setFormBank({
      bankName: doctorData.bankDetails?.bankName || '',
      accountHolderName: doctorData.bankDetails?.accountHolderName || '',
      accountNumber: doctorData.bankDetails?.accountNumber || '',
      ifscCode: doctorData.bankDetails?.ifscCode || '',
      accountProof: doctorData.bankDetails?.accountProof,
    });
    return;
  }

  if (type === 'kyc') {
    const currentPan =
      kycServer?.pan?.number ||
      (doctorData.kycDetails?.panNumber === 'N/A' ? '' : doctorData.kycDetails?.panNumber || '');
    setPanNumber(currentPan);
    setPanImage(null);
    setPancardUploaded(false);
    return;
  }
};


  // Edit modal open/close
// Edit modal open/close
const handleEditOpen = (type: EditModalType) => {
  seedFormsFromSaved(type);        // <-- always seed from saved data on open
  setEditModalType(type);
};

const handleEditClose = () => {
  if (editModalType) seedFormsFromSaved(editModalType); // <-- revert unsaved edits on cancel/close
  setEditModalType(null);
};


  // ---------- Save handlers (match web flows) ----------

  const savePersonal = async () => {
    if (!token) return;
    try {
      if (!formPersonal.firstname || !formPersonal.lastname) {
        Toast.show({ type: 'error', text1: 'Validation', text2: 'First & Last name are required' });
        return;
      }
      if (formPersonal.email && !/^\S+@\S+\.\S+$/.test(formPersonal.email)) {
        Toast.show({ type: 'error', text1: 'Validation', text2: 'Invalid email' });
        return;
      }

      const response = await AuthPut(
        'users/updateUser',
        {
          firstname: formPersonal?.firstname,
          lastname: formPersonal?.lastname,
          email: formPersonal?.email,
          spokenLanguage: formPersonal?.spokenLanguage || [],
        },
        token
      );
      if (response?.status === 'success') {
        const userData = response?.data?.data;

        dispatch({ type: 'currentUser', payload: userData });

        Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
        handleEditClose();
        fetchDoctorData();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: response?.message?.message || 'An unexpected error occurred. Please try again.' });
      } 
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.response?.data?.message?.message || e?.message || 'Failed to update profile' });
    }
  };

  const saveProfessional = async () => {
  // retrieve token inside function (like handleNext)
  const token = await AsyncStorage.getItem('authToken');
  if (!token || !doctorData) return;

  // Validate at least one degree is selected
  if (!formProfessional.selectedDegrees || formProfessional.selectedDegrees.length === 0) {
    Toast.show({ type: 'error', text1: 'Validation', text2: 'Please select at least one degree' });
    return;
  }

  try {

    const firstSpec = doctorData?.specialization?.[0];
    const formData = new FormData();
    formData.append('id', String(doctorData?.userId || ''));
    formData.append('name', String(firstSpec?.name || ''));
    formData.append('experience', String(formProfessional?.experience || ''));
    formData.append('degree', formProfessional?.selectedDegrees?.join(','));
    formData.append('bio', String(formProfessional?.about || ''));

    const response = await UpdateFiles('users/updateSpecialization', formData, token);

    if (response?.status === 'success') {
      const userData = response?.data?.data;
      dispatch({ type: 'currentUser', payload: userData });

      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
      handleEditClose?.();
      await fetchDoctorData?.();
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: response?.message?.message || 'Please try again.' });
    }
  } catch (e: any) {
    Toast.show({ type: 'error', text1: 'Error', text2: e?.response?.data?.message?.message || e?.message || 'Failed to update profile' });
  } finally {
  }
};


  const saveConsultation = async () => {
    if (!token) return;

    // Validate: every row must have both fields filled
    for (let idx = 0; idx < formConsultation.length; idx++) {
    const row = formConsultation[idx] as any;
    const active = row.active ?? Number(row.fee) > 0;

    // Type is always required
    if (!row.type || row.type.trim() === '') {
      Alert.alert('Missing value', `Row ${idx + 1}: Please fill the Type.`);
      return;
    }

    // If checkbox is selected (active), fee must be > 0
    const feeNum = Number(row.fee);
    if (active && (!row.fee || isNaN(feeNum) || feeNum <= 0)) {
      Alert.alert('Invalid fee', `Row ${idx + 1}: Fee must be greater than 0 when enabled.`);
      return;
    }

    // If inactive, normalize to 0 to send
    if (!active) {
      row.fee = '0';
    }
  }

    try {
      const cleaned = formConsultation.map((i) => ({
        type: i.type.trim(),
        fee: Number(i.fee),
        currency: i.currency || "₹",
      }));

      const response = await AuthPost(
        "users/updateConsultationModes",
        { consultationModeFee: cleaned },
        token
      );



      if (response?.status === 'success') {  
      const userData = response?.data?.data;

dispatch({ type: 'currentUser', payload: userData });
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Consultation fees updated",
      });
      handleEditClose();
      fetchDoctorData();
      }else{
        Toast.show({ type: 'error', text1: 'Error', text2: response?.message?.message || 'Please try again.' });
      }
      
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          e?.response?.data?.message?.message ||
          e?.message ||
          "Failed to update fees",
      });
    }
  };


  const saveBank = async () => {
    if (!token) return;
    try {
      if (!formBank.bankName || !formBank.accountHolderName || !formBank.accountNumber || !formBank.ifscCode) {
        Alert.alert('Validation', 'All bank fields are required');
        return;
      }
      if (!isDigits(formBank.accountNumber!)) {
        Alert.alert('Validation', 'Account number must be digits');
        return;
      }
      const ifsc = sanitizeIFSC(formBank.ifscCode!);
      if (!isValidIFSC(ifsc)) {
        Alert.alert('Validation', 'Invalid IFSC (e.g., HDFC0ABCD12)');
        return;
      }

      const response = await AuthPost('users/updateBankDetails', {
        bankDetails: {
          bankName: formBank.bankName,
          accountHolderName: formBank.accountHolderName,
          accountNumber: formBank.accountNumber,
          ifscCode: ifsc,
        },
      }, token);

      if (response?.status === 'success') {  
      const userData = response?.data?.data;

dispatch({ type: 'currentUser', payload: userData });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Bank details updated' });
      handleEditClose();
      fetchDoctorData();
      }else{
        Toast.show({ type: 'error', text1: 'Error', text2: response?.message?.message || 'Please try again.' });
      }
      
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.response?.data?.message?.message || e?.message || 'Failed to update bank details' });
    }
  };

  // KYC file pick (camera/gallery/pdf)
  const handlePancardUpload = async () => {
    Alert.alert('Upload PAN Card', 'Choose an option', [
      {
        text: 'Camera',
        onPress: async () => {
          try {
            const result = await launchCamera({ mediaType: 'photo', includeBase64: false });
            const asset = result?.assets?.[0];
            if (asset?.uri) {
              setPanImage({
                uri: asset.uri,
                name: asset.fileName || 'pan_camera.jpg',
                type: asset.type || 'image/jpeg',
              });
              setPancardUploaded(true);
            } else {
              Alert.alert('No image selected from camera');
            }
          } catch {
            Alert.alert('Error', 'Camera access failed.');
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          try {
            const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: false });
            const asset = result?.assets?.[0];
            if (asset?.uri) {
              setPanImage({
                uri: asset.uri,
                name: asset.fileName || 'pan_gallery.jpg',
                type: asset.type || 'image/jpeg',
              });
              setPancardUploaded(true);
            } else {
              Alert.alert('No image selected from gallery');
            }
          } catch {
            Alert.alert('Error', 'Gallery access failed.');
          }
        },
      },
      {
        text: 'Upload PDF',
        onPress: async () => {
          try {
            const [res] = await pick({ type: [types.pdf, types.images] });
            if (res?.uri && res?.name) {
              setPanImage({ uri: res.uri, name: res.name, type: res.type || 'application/pdf' });
              setPancardUploaded(true);
            } else {
              Alert.alert('Error', 'Invalid file selected.');
            }
          } catch {
            Alert.alert('Error', 'File selection failed.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const saveKYC = async () => {
    if (!token) return;
    try {
      if (!panNumber || panNumber.length !== 10) {
        Toast.show({ type: 'error', text1: 'Validation', text2: 'Enter a valid 10-character PAN' });
        return;
      }
      if (!panImage?.uri) {
        Toast.show({ type: 'error', text1: 'Validation', text2: 'Please upload a PAN file' });
        return;
      }

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Missing userId' });
        return;
      }

      const formData = new FormData();
      formData.append('userId', String(userId));
      formData.append('panNumber', panNumber.toUpperCase());
      formData.append('panFile', {
        uri: panImage.uri,
        name: panImage.name,
        type: panImage.type || (panImage.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      } as any);

      const resp = await UploadFiles('users/addKYCDetails', formData, token);
      const ok = resp?.status === 'success' || resp?.data?.status === 'success';

      if (ok) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'KYC submitted' });
        handleEditClose();
        fetchDoctorData();
        fetchKyc();
      } else {
        Alert.alert('Error', resp?.message?.message || 'Failed to submit KYC');
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.response?.data?.message?.message || e?.message || 'Failed to submit KYC' });
    }
  };

  // ---------- Render helpers ----------
  const degreesDisplay = useMemo(() => {
    const d = doctorData?.specialization?.[0]?.degree || '';
    const list = String(d).split(',').map((s) => s.trim()).filter(Boolean);
    return list;
  }, [doctorData]);

  const specializationsDisplay = useMemo(() => {
    const n = doctorData?.specialization?.[0]?.name || '';
    return String(n).split(',').map((s) => s.trim()).filter(Boolean);
  }, [doctorData]);

  const filteredDegrees = useMemo(() => {
    const q = degreeSearchText.trim().toLowerCase();
    if (!q) return degrees;
    return degrees.filter(d => d.toLowerCase().includes(q));
  }, [degreeSearchText, degrees]);

  // ---------- UI ----------

  if (loading && !doctorData) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Loading Profile details...</Text>
      </SafeAreaView>
    );
  }

  if (!doctorData) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.noDataText}>No doctor data available</Text>
      </SafeAreaView>
    );
  }




  const showEditButtonKYC = !kycServer?.pan?.number;
  const showEditButtonBank = !doctorData.bankDetails?.accountNumber;
  const avatarSrc = currentuserDetails?.profilepic

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>

        {/* Row 1: Personal + Professional */}
        <View style={styles.row}>
          {/* Personal Information */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="user" size={16} color="#3b82f6" />
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>
              <TouchableOpacity onPress={() => handleEditOpen('personal')}>
                <Icon name="edit" size={18} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarContainer}>
              {avatarSrc ? (
                <Image
                  source={{ uri: avatarSrc }}
                  style={{
                    width: SCREEN_WIDTH * 0.15,
                    height: SCREEN_WIDTH * 0.15,
                    borderRadius: SCREEN_WIDTH * 0.075,
                    backgroundColor: '#ccc',
                    marginBottom: 8,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: SCREEN_WIDTH * 0.15,
                    height: SCREEN_WIDTH * 0.15,
                    borderRadius: SCREEN_WIDTH * 0.075,
                    backgroundColor: '#1E88E5',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: SCREEN_WIDTH * 0.08, fontWeight: 'bold' }}>
                    {(doctorData.firstname?.[0] ?? 'D').toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.doctorName}>{currentuserDetails.role === 'doctor' && 'Dr. '}{doctorData.firstname} {doctorData.lastname}</Text>
            </View>

            <View style={styles.infoSection}>

              <View style={styles.infoItem}>
                <Icon name="mobile1" size={16} color="#333" />
                <Text style={styles.infoText}><Text style={styles.bold}>Mobile Number:</Text> {doctorData.mobile}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="man" size={16} color="#333" />
                <Text style={styles.infoText}><Text style={styles.bold}>Gender:</Text> {doctorData.gender}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="mail" size={16} color="#333" />
                <Text style={styles.infoText}><Text style={styles.bold}>Email:</Text> {doctorData.email}</Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.infoText, styles.bold]}>Languages:</Text>
              <View style={styles.tagsContainer}>
                {(doctorData.spokenLanguage || []).length > 0 ? (
                  doctorData.spokenLanguage.map((lang, idx) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>{lang}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No languages added</Text>
                )}
              </View>
            </View>
          </View>

          {/* Professional Summary */}
          {currentuserDetails.role === 'doctor' &&
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Icon name="medicinebox" size={16} color="#3b82f6" />
                  <Text style={styles.cardTitle}>Professional Summary</Text>
                </View>
                <TouchableOpacity onPress={() => handleEditOpen('professional')}>
                  <Icon name="edit" size={18} color="#3b82f6" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoItem}>
                {/* <Icon name="idcard" size={16} color="#333" /> */}
                <Text style={styles.infoText}><Text style={styles.bold}>Medical Registration:</Text> {doctorData.medicalRegistrationNumber}</Text>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoText}><Text style={styles.bold}>State Medical Council:</Text> TSMC</Text>
                </View>

                <Text style={[styles.infoText, styles.bold, styles.sectionTitle]}>Degrees</Text>
                <View style={styles.tagsContainer}>
                  {degreesDisplay.length > 0 ? (
                    degreesDisplay.map((deg, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{deg}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>No degrees added</Text>
                  )}
                </View>

                <Text style={[styles.infoText, styles.bold, styles.sectionTitle]}>Specializations</Text>
                <View style={styles.tagsContainer}>
                  {specializationsDisplay.length > 0 ? (
                    specializationsDisplay.map((spec, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{spec}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>No specializations added</Text>
                  )}
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoText}>
                    <Text style={styles.bold}>Work Experience:</Text> {doctorData.specialization?.[0]?.experience || 0} Years
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoText}>
                    <Text style={styles.bold}>About:</Text> {doctorData.specialization?.[0]?.bio || 'Not Mentioned'}
                  </Text>
                </View>

                <Text style={[styles.infoText, styles.bold, styles.sectionTitle]}>Certifications</Text>
                {doctorData.certifications.length > 0 ? (
                  doctorData.certifications.map((cert, index) => (
                    <View key={index} style={styles.certificationItem}>

                      <View style={styles.certificationActions}>
                        {!!cert.image && (
                          <TouchableOpacity style={styles.viewButton} onPress={() => showDocModal({ type: 'Specialization Certificate', data: cert.image })}>
                            <Text style={styles.viewButtonText}>View Certificate</Text>
                          </TouchableOpacity>
                        )}
                        {!!cert.degreeCertificate && (
                          <TouchableOpacity style={styles.viewButton} onPress={() => showDocModal({ type: 'Degree Certificate', data: cert.degreeCertificate })}>
                            <Text style={styles.viewButtonText}>View Degree</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No certifications added</Text>
                )}
              </View>
            </View>
          }
        </View>

        {/* Row 2: Working Locations + KYC */}
        <View style={styles.row}>
          {/* KYC Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="idcard" size={16} color="#3b82f6" />
                <Text style={styles.cardTitle}>KYC Details</Text>
              </View>
              {showEditButtonKYC && (
                <TouchableOpacity onPress={() => handleEditOpen('kyc')}>
                  <Icon name="edit" size={18} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.kycItem}>
              <View style={styles.kycInfo}>
                <Icon name="idcard" size={16} color="#333" />
                <Text style={styles.infoText}>
                  <Text style={styles.bold}>PAN Number:</Text> {kycServer?.pan?.number || doctorData.kycDetails?.panNumber || 'N/A'}
                </Text>
              </View>
              {!!kycServer?.pan?.attachmentUrl && (
                <View style={styles.kycButtonContainer}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => showDocModal({ type: 'PAN', data: kycServer.pan.attachmentUrl })}
                  >
                    <Text style={styles.viewButtonText}>View PAN</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Row 3: Consultation Charges + Bank Details */}

        <View style={styles.row}>
          {/* Consultation Charges */}
          {currentuserDetails.role === 'doctor' &&
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Icon name="pay-circle-o1" size={16} color="#3b82f6" />
                  <Text style={styles.cardTitle}>Consultation Charges</Text>
                </View>
                <TouchableOpacity onPress={() => handleEditOpen('consultation')}>
                  <Icon name="edit" size={18} color="#3b82f6" />
                </TouchableOpacity>
              </View>

              {(doctorData.consultationModeFee || []).map((mode, idx) => (
                <View key={idx} style={styles.consultationCard}>
                  <View style={styles.consultationInfo}>
                    {mode.type?.toLowerCase() === 'in-person' && <Icon name="user" size={16} color="#3b82f6" />}
                    {mode.type?.toLowerCase() === 'video' && <Icon name="videocamera" size={16} color="#16a34a" />}
                    {mode.type?.toLowerCase() === 'home visit' && <Icon name="car" size={16} color="#9333ea" />}
                    <View>
                      <Text style={[styles.infoText, styles.bold]}>{mode.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.consultationPrice}>
                    {mode.currency || '₹'} {mode.fee}
                  </Text>
                </View>
              ))}
            </View>}

          {/* Bank Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="bank" size={16} color="#3b82f6" />
                <Text style={styles.cardTitle}>Bank Details</Text>
              </View>
              {showEditButtonBank && (
                <TouchableOpacity onPress={() => handleEditOpen('bank')}>
                  <Icon name="edit" size={18} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.bankDetails}>
              <View style={styles.bankItem}>
                {/* <Icon name="bank" size={16} color="#333" /> */}
                <Text style={styles.infoText}><Text style={styles.bold}>Bank:</Text> {doctorData.bankDetails?.bankName || 'N/A'}</Text>
              </View>
              <View style={styles.bankItem}>
                {/* <Icon name="user" size={16} color="#333" /> */}
                <Text style={styles.infoText}><Text style={styles.bold}>Account Holder:</Text> {doctorData.bankDetails?.accountHolderName || 'N/A'}</Text>
              </View>
              <View style={styles.bankItem}>
                <Text style={styles.infoText}><Text style={styles.bold}>Account Number:</Text> {doctorData.bankDetails?.accountNumber || 'N/A'}</Text>
                {!!doctorData.bankDetails?.accountProof && (
                  <TouchableOpacity onPress={() => showDocModal({ type: 'Account Proof', data: doctorData.bankDetails.accountProof })}>
                    <Icon name="eye" size={18} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.bankItem}>
                <Text style={styles.infoText}><Text style={styles.bold}>Bank IFSC:</Text> {doctorData.bankDetails?.ifscCode || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Document Modal */}
        <Modal visible={isDocModalVisible} transparent animationType="fade" onRequestClose={closeDocModal}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedDocument?.type || 'Document'}</Text>
              {selectedDocument?.data ? (
                <Image source={{ uri:(selectedDocument.data) || '' }} style={styles.modalImage} resizeMode="contain" />
              ) : (
                <Text style={styles.noDataText}>No image available for this document.</Text>
              )}
              <TouchableOpacity style={styles.modalButton} onPress={closeDocModal}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Modals */}
        <Modal visible={editModalType === 'personal'} transparent animationType="slide" onRequestClose={handleEditClose}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Personal Details</Text>
              <ScrollView style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formPersonal.firstname}
                    onChangeText={(v) => setFormPersonal((s) => ({ ...s, firstname: v.replace(/[^A-Za-z\s]/g, '') }))}
                    placeholder="Enter first name"
                    placeholderTextColor="#888"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formPersonal.lastname}
                    onChangeText={(v) => setFormPersonal((s) => ({ ...s, lastname: v.replace(/[^A-Za-z\s]/g, '') }))}
                    placeholder="Enter last name"
                    placeholderTextColor="#888"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={formPersonal.email}
                    onChangeText={(v) => setFormPersonal((s) => ({ ...s, email: v }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Enter email address"
                    placeholderTextColor="#888"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Languages</Text>

                  {/* Single dropdown for selecting languages */}
                  <View style={styles.dropdownContainer}>
                    <Picker
                      selectedValue={""}
                      onValueChange={(value) => {
                        if (value && !formPersonal.spokenLanguage.includes(value)) {
                          setFormPersonal((s) => ({
                            ...s,
                            spokenLanguage: [...s.spokenLanguage, value],
                          }));
                        }
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select a language" value="" />
                      {languageOptions.map((opt) => (
                        <Picker.Item
                          key={opt.value}
                          label={opt.label}
                          value={opt.value}
                          enabled={!formPersonal.spokenLanguage.includes(opt.value)}
                        />
                      ))}
                    </Picker>
                  </View>

                  {/* Display selected languages as tags */}
                  {formPersonal.spokenLanguage.length > 0 && (
                    <>
                      <Text style={[styles.label, { marginTop: 10 }]}>Selected Languages:</Text>
                      <View style={styles.tagsContainer}>
                        {formPersonal.spokenLanguage.map((lang, index) => (
                          <View key={index} style={[styles.tag, { marginBottom: 8 }]}>
                            <Text style={styles.tagText}>{lang}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                setFormPersonal((s) => ({
                                  ...s,
                                  spokenLanguage: s.spokenLanguage.filter((l) => l !== lang),
                                }));
                              }}
                              style={{ marginLeft: 6, padding: 2 }}
                            >
                              <Icon name="close" size={14} color="#D32F2F" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleEditClose}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={savePersonal}>
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={editModalType === 'professional'} transparent animationType="slide" onRequestClose={handleEditClose}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Professional Details</Text>
              <ScrollView style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Select Degree</Text>
                  <TouchableOpacity
                    style={[styles.dropdownContainer, { padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                    onPress={() => {
                      setDegreeSearchText('');
                      setDegreeModalVisible(true);
                    }}
                  >
                    <Text style={{ color: formProfessional.selectedDegrees.length ? '#111' : '#888' }}>
                      {formProfessional.selectedDegrees.length > 0 ? `${formProfessional.selectedDegrees.length} selected` : 'Tap to choose degrees'}
                    </Text>
                    <Icon name="down" size={16} color="#333" />
                  </TouchableOpacity>

                  {formProfessional.selectedDegrees.length > 0 && (
                    <>
                      <Text style={[styles.label, { marginTop: 10 }]}>Selected Degrees:</Text>
                      <View style={styles.tagsContainer}>
                        {formProfessional.selectedDegrees.map((deg, index) => (
                          <View key={index} style={[styles.tag, { marginBottom: 8 }]}>
                            <Text style={styles.tagText}>{deg}</Text>
                            {/* Always show remove button - allow removing last degree */}
                            <TouchableOpacity
                              onPress={() => {
                                setFormProfessional((s) => ({
                                  ...s,
                                  selectedDegrees: s.selectedDegrees.filter((d) => d !== deg),
                                }));
                              }}
                              style={{ marginLeft: 6, padding: 2 }}
                            >
                              <Icon name="close" size={14} color="#D32F2F" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Show validation error message when no degrees are selected */}
                  {formProfessional.selectedDegrees.length === 0 && (
                    <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 8 }}>
                      Please select at least one degree
                    </Text>
                  )}
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Experience (Years)</Text>
                  <TextInput
                    style={styles.input}
                    value={formProfessional.experience}
                    onChangeText={(v) => setFormProfessional((s) => ({ ...s, experience: v.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                    placeholder="Enter years of experience"
                    placeholderTextColor="#888"
                    maxLength={2}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>About</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    value={formProfessional.about}
                    onChangeText={(v) => setFormProfessional((s) => ({ ...s, about: v }))}
                    multiline
                    maxLength={500}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="#888"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleEditClose}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveProfessional}>
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={degreeModalVisible} transparent animationType="slide" onRequestClose={() => setDegreeModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <Text style={styles.modalTitle}>Choose Degrees</Text>

              <View style={{ marginBottom: 12 }}>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Search degrees..."
                  value={degreeSearchText}
                  onChangeText={setDegreeSearchText}
                  placeholderTextColor="#888"
                />
              </View>

              <FlatList
                data={filteredDegrees}
                keyExtractor={(item) => item}
                style={{ marginBottom: 12 }}
                ListEmptyComponent={<Text style={styles.noDataText}>No degrees found</Text>}
                renderItem={({ item }) => {
                  const selected = formProfessional.selectedDegrees.includes(item);
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setFormProfessional((s) => {
                          const exists = s.selectedDegrees.includes(item);
                          let next = [...s.selectedDegrees];
                          if (exists) {
                            next = next.filter(d => d !== item);
                          } else {
                            next = [...next, item];
                          }
                          return { ...s, selectedDegrees: next };
                        });
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 14, color: '#111' }}>{item}</Text>
                      {selected ? <Icon name="check" size={18} color="#16a34a" /> : null}
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { flex: 1, marginRight: 8 }]}
                  onPress={() => setDegreeModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { flex: 1 }]}
                  onPress={() => {
                    // Close
                    setDegreeModalVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={editModalType === 'kyc'} transparent animationType="slide" onRequestClose={handleEditClose}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add KYC Details</Text>
              <ScrollView style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>PAN Number</Text>
                  <TextInput
                    style={styles.input}
                    value={panNumber}
                    onChangeText={(v) => setPanNumber(v.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 10))}
                    maxLength={10}
                    autoCapitalize="characters"
                    placeholder="Enter PAN number (e.g., ABCDE1234F)"
                    placeholderTextColor="#888"
                  />
                </View>

                <Text style={styles.label}>Upload Pancard Proof</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={handlePancardUpload}>
                  <Icon name="idcard" size={SCREEN_WIDTH * 0.08} color="#00203F" />
                  <Text style={styles.uploadText}>Upload</Text>
                  <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
                </TouchableOpacity>
                {pancardUploaded && (
                  <Text style={styles.successText}>File: {panImage?.name || 'Pancard uploaded successfully!'}</Text>
                )}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleEditClose}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveKYC}>
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={editModalType === 'consultation'} transparent animationType="slide" onRequestClose={handleEditClose}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Consultation Charges</Text>

              <ScrollView style={styles.formContainer}>
                {(formConsultation || []).map((row, idx) => {
                  const active = row.active ?? Number(row.fee) > 0; // default checked if fee > 0

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.consultationRow,
                        { borderBottomColor: '#eee', borderBottomWidth: 1, flexDirection: 'row', alignItems: 'flex-start' }
                      ]}
                    >
                      {/* Checkbox */}
                      <View style={{ justifyContent: 'center', marginRight: 8, paddingTop: 26 }}>
                        <TouchableOpacity
                          onPress={() => {
                            const next = [...formConsultation];
                            const wasActive = next[idx].active ?? Number(next[idx].fee) > 0;
                            next[idx].active = !wasActive;
                            if (!next[idx].active) {
                              // on uncheck: force fee to "0" and keep input disabled
                              next[idx].fee = '0';
                            } else {
                              // on re-check: optionally clear 0 so user can type a value
                              if (next[idx].fee === '0') next[idx].fee = '';
                            }
                            setFormConsultation(next);
                          }}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: active }}
                          style={{
                            width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: '#666',
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: active ? '#00796B' : '#fff'
                          }}
                        >
                          {active ? <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text> : null}
                        </TouchableOpacity>
                      </View>

                      {/* Type */}
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>Type</Text>
                        <TextInput
                          style={styles.input}
                          value={row.type}
                          onChangeText={(v) => {
                            const next = [...formConsultation];
                            next[idx].type = v;
                            setFormConsultation(next);
                          }}
                          placeholder="e.g., In-Person, Video, Home Visit"
                          placeholderTextColor="#888"
                        />
                      </View>

                      {/* Fee */}
                      {/* Fee */}
                      <View style={{ width: 100, marginRight: 8 }}>
                        <Text style={styles.label}>Fee</Text>
                        {(() => {
                          let isFeeInvalid = active && (!row.fee || Number(row.fee) <= 0);
                          return (
                            <>
                              <TextInput
                                style={[
                                  styles.input,
                                  { opacity: active ? 1 : 0.5, borderColor: isFeeInvalid ? '#D32F2F' : '#E0E0E0', borderWidth: 1 }
                                ]}
                                value={String(row.fee ?? '')}
                                onChangeText={(v) => {
                                  const next = [...formConsultation];
                                  const digits = v.replace(/[^0-9]/g, '');
                                  next[idx].fee = digits;
                                  // active is controlled by checkbox; keep as-is
                                  setFormConsultation(next);
                                }}
                                editable={!!active}           // disabled when unchecked
                                keyboardType="numeric"
                                placeholder="Enter fee"
                                placeholderTextColor="#888"
                              />
                              {isFeeInvalid && (
                                <Text style={{ color: '#D32F2F', marginTop: 4, fontSize: 12 }}>
                                  Enter amount &gt; 0
                                </Text>
                              )}
                            </>
                          );
                        })()}
                      </View>

                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleEditClose}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveConsultation}>
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={editModalType === 'bank'} transparent animationType="slide" onRequestClose={handleEditClose}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Bank Details</Text>
              <ScrollView style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bank Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formBank.bankName}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^A-Za-z\s]/g, '');
                      setFormBank((s) => ({ ...s, bankName: clean }));
                    }}
                    placeholder="Enter bank name"
                    placeholderTextColor="#888"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Account Holder Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formBank.accountHolderName}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^A-Za-z\s]/g, '');
                      setFormBank((s) => ({ ...s, accountHolderName: clean }));
                    }}
                    placeholder="Enter account holder name"
                    placeholderTextColor="#888"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formBank.accountNumber}
                    onChangeText={(v) => setFormBank((s) => ({ ...s, accountNumber: v.replace(/[^0-9]/g, '').slice(0, 18) }))}
                    keyboardType="numeric"
                    maxLength={18}
                    placeholder="Enter account number"
                    placeholderTextColor="#888"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>IFSC Code</Text>
                  <TextInput
                    style={styles.input}
                    value={formBank.ifscCode}
                    onChangeText={(v) => setFormBank((s) => ({ ...s, ifscCode: sanitizeIFSC(v) }))}
                    autoCapitalize="characters"
                    maxLength={11}
                    placeholder="Enter IFSC code (e.g., HDFC0ABCD12)"
                    placeholderTextColor="#888"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleEditClose}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveBank}>
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------- Styles ----------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1, paddingHorizontal: SCREEN_WIDTH * 0.03, paddingVertical: 10 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: SCREEN_WIDTH * 0.04, color: '#333', marginTop: 8 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SCREEN_WIDTH * 0.04,
    paddingHorizontal: SCREEN_WIDTH * 0.02,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: SCREEN_WIDTH * 0.04,
    marginBottom: SCREEN_WIDTH * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    width: SCREEN_WIDTH < 600 ? '100%' : '48%',
    minWidth: SCREEN_WIDTH < 600 ? 'auto' : 300,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SCREEN_WIDTH * 0.04, borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
    paddingBottom: SCREEN_WIDTH * 0.02,
  },
  cardTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: SCREEN_WIDTH * 0.04, fontWeight: 'bold', color: '#1E88E5', marginLeft: 8 },
  avatarContainer: { alignItems: 'center', marginBottom: SCREEN_WIDTH * 0.04 },
  doctorName: { fontSize: SCREEN_WIDTH * 0.045, fontWeight: 'bold', color: '#212121', marginBottom: 4 },
  infoSection: { marginBottom: SCREEN_WIDTH * 0.04 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SCREEN_WIDTH * 0.02 },
  infoText: { fontSize: SCREEN_WIDTH * 0.035, color: '#333', marginLeft: 8 },
  bold: { fontWeight: 'bold', color: '#212121' },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SCREEN_WIDTH * 0.02,
  }, tag: {
    flexDirection: 'row', // Align text and icon horizontally
    alignItems: 'center', // Vertically center the content
    backgroundColor: '#e0e0e0', // Example background for the tag
    borderRadius: 16, // Rounded corners for the tag
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#333', // Text color for degree
  }, noDataText: { fontSize: SCREEN_WIDTH * 0.035, color: '#616161', fontStyle: 'italic' },
  sectionTitle: { fontSize: SCREEN_WIDTH * 0.035, color: '#166534', fontWeight: 'bold', marginTop: 6, marginBottom: SCREEN_WIDTH * 0.02 },
  certificationItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SCREEN_WIDTH * 0.03, borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  certificationInfo: { flex: 1 },
  certificationName: { fontWeight: '500', fontSize: SCREEN_WIDTH * 0.035, color: '#212121', marginBottom: 2 },
  certificationNumber: { fontSize: SCREEN_WIDTH * 0.03, color: '#424242' },
  certificationActions: { flexDirection: 'row', flexWrap: 'wrap' },
  viewButton: {
    backgroundColor: '#1E88E5', paddingHorizontal: SCREEN_WIDTH * 0.03, paddingVertical: SCREEN_WIDTH * 0.015,
    borderRadius: 4, marginLeft: SCREEN_WIDTH * 0.02, marginBottom: SCREEN_WIDTH * 0.01,
  },
  kycButtonContainer: {
    marginTop: SCREEN_WIDTH * 0.02,
    width: '100%',
    alignItems: 'flex-start',
  },
  viewButtonText: { color: '#fff', fontSize: SCREEN_WIDTH * 0.03 },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  locationCard: { backgroundColor: '#E8EAF6', borderRadius: 8, padding: SCREEN_WIDTH * 0.03, marginBottom: SCREEN_WIDTH * 0.02 },
  locationInfo: { flexDirection: 'row', alignItems: 'flex-start' },
  locationDetails: { marginLeft: SCREEN_WIDTH * 0.02, flex: 1 },
  locationAddress: { fontSize: SCREEN_WIDTH * 0.03, color: '#424242', marginBottom: SCREEN_WIDTH * 0.01 },
  locationTimings: { fontSize: SCREEN_WIDTH * 0.03, color: '#424242' },

  kycItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SCREEN_WIDTH * 0.04 },
  kycInfo: { flexDirection: 'row', alignItems: 'center' },

  consultationCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#E8F5E9', borderRadius: 8, padding: SCREEN_WIDTH * 0.03, marginBottom: SCREEN_WIDTH * 0.02,
  },
  consultationInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  consultationPrice: { fontSize: SCREEN_WIDTH * 0.04, fontWeight: 'bold', color: '#1E88E5' },

  bankDetails: { marginTop: SCREEN_WIDTH * 0.02, },
  bankItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SCREEN_WIDTH * 0.03, justifyContent: 'space-between' },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 8, padding: SCREEN_WIDTH * 0.05, width: SCREEN_WIDTH * 0.9, maxHeight: '85%' },
  modalTitle: { fontSize: SCREEN_WIDTH * 0.045, fontWeight: 'bold', color: '#212121', marginBottom: SCREEN_WIDTH * 0.04, textAlign: 'center' },
  modalImage: { width: '100%', height: SCREEN_WIDTH * 0.7, marginBottom: SCREEN_WIDTH * 0.04 },
  modalButton: { backgroundColor: '#3b82f6', padding: SCREEN_WIDTH * 0.03, borderRadius: 6, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: SCREEN_WIDTH * 0.035 },

  formContainer: { maxHeight: SCREEN_WIDTH * 1.2, marginBottom: SCREEN_WIDTH * 0.04 },
  formGroup: { marginBottom: SCREEN_WIDTH * 0.04 },
  label: { fontSize: SCREEN_WIDTH * 0.035, fontWeight: 'bold', color: '#000000', marginBottom: SCREEN_WIDTH * 0.02 },
  input: { borderWidth: 1, borderColor: '#B0BEC5', borderRadius: 6, padding: SCREEN_WIDTH * 0.025, fontSize: SCREEN_WIDTH * 0.035, color: '#333' },

  languageItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SCREEN_WIDTH * 0.02 },
  picker: {
    height: SCREEN_WIDTH * 0.12,
    flex: 1,
    marginRight: 8,
    color: '#333',
  },
  addButton: { backgroundColor: '#E3F2FD', padding: SCREEN_WIDTH * 0.025, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#1565C0', fontWeight: 'bold', fontSize: SCREEN_WIDTH * 0.035 },

  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelButton: { backgroundColor: '#757575', flex: 1, marginRight: SCREEN_WIDTH * 0.02 },
  saveButton: { backgroundColor: '#16a34a', flex: 1, marginLeft: SCREEN_WIDTH * 0.02 },

  acceptedText: { fontSize: SCREEN_WIDTH * 0.03, color: '#666', textAlign: 'center', fontWeight: '500' },
  successText: { color: '#00203F', fontSize: SCREEN_WIDTH * 0.035, marginTop: 6, marginBottom: 8, textAlign: 'center' },
  uploadBox: {
    borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 8, padding: SCREEN_WIDTH * 0.04,
    alignItems: 'center', backgroundColor: '#fff', marginBottom: SCREEN_HEIGHT * 0.01, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  uploadText: { fontSize: SCREEN_WIDTH * 0.035, color: '#00203F', textAlign: 'center', fontWeight: '500' },

  togglePill: {
    borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    marginRight: 8, marginBottom: 8, backgroundColor: '#fff',
  },
  togglePillSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  togglePillText: { color: '#111827' },

  consultationRow: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    // paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#B0BEC5',
    borderRadius: 6,
    marginBottom: SCREEN_WIDTH * 0.02,
    overflow: 'hidden',
  },
});

export default DoctorProfileView;
