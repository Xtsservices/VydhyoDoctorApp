import React, { useState, useEffect } from 'react';
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
  Button,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'react-native-image-picker';
import DocumentPicker from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';



// API functions
import { 
  AuthFetch, 
  AuthPut, 
  UploadFiles, 
  AuthPost 
} from '../../auth/auth';

const languageOptions = [
  { label: 'Telugu', value: 'Telugu' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'English', value: 'English' },
  { label: 'Urdu', value: 'Urdu' },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DoctorProfileView = () => {
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [editModalType, setEditModalType] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [degrees, setDegrees] = useState([]);
  const [token, setToken] = useState(null);
  const [panImage, setPanImage] = useState<{ uri: string, name: string, type?: string } | null>(null);
  const [pancardUploaded, setPancardUploaded] = useState(false);
  const [panNumber, setPanNumber] = useState('');

  // Retrieve token from AsyncStorage
  useEffect(() => {
    const getToken = async () => {
      try {
        const userToken = await AsyncStorage.getItem('authToken');
        if (!userToken) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Authentication token not found',
            position: 'top',
            visibilityTime: 3000,
          });
          return;
        }
        setToken(userToken);
      } catch (error) {
        console.error('Error retrieving token:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to retrieve authentication token',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    };
    getToken();
  }, []);

  const fetchDoctorData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await AuthFetch("users/getUser", token);
      
      if (response.status === 'error') {
        throw new Error(response.message || 'Failed to fetch doctor data');
      }

      const userData = response.data?.data;
      console.log("resss", response.data.data);
      if (userData) {
        const specializations = userData.specialization
          ? Array.isArray(userData.specialization)
            ? userData.specialization
            : [userData.specialization]
          : [];

        const certifications = specializations.map((spec) => ({
          name: spec.name || "Specialization",
          registrationNo: spec.id || "N/A",
          image: spec.specializationCertificate || null,
          degreeCertificate: spec.degreeCertificate || null,
        }));

        const bankDetails = userData.bankDetails || {};

        setDoctorData({
          ...userData,
          key: userData._id,
          firstname: userData.firstname || "N/A",
          lastname: userData.lastname || "",
          specialization: specializations,
          email: userData.email || "N/A",
          mobile: userData.mobile || "N/A",
          status: userData.status || "pending",
          medicalRegistrationNumber: userData.medicalRegistrationNumber || "N/A",
          userId: userData.userId || "N/A",
          createdAt: userData.createdAt,
          consultationModeFee: Array.isArray(userData.consultationModeFee)
            ? userData.consultationModeFee
            : [],
          spokenLanguage: Array.isArray(userData.spokenLanguage)
            ? userData.spokenLanguage
            : [],
          gender: userData.gender || "N/A",
          DOB: userData.DOB || "N/A",
          bloodgroup: userData.bloodgroup || "N/A",
          maritalStatus: userData.maritalStatus || "N/A",
          workingLocations: Array.isArray(userData.addresses)
            ? userData.addresses.map((addr) => ({
                name: addr.clinicName || "Clinic",
                address: `${addr.address}, ${addr.city}, ${addr.state}, ${addr.country} - ${addr.pincode}`,
                startTime: addr.startTime,
                endTime: addr.endTime,
                color: getLocationColor(addr.clinicName || `Clinic ${addr._id}`), // Assign a unique color
              }))
            : [],
          bankDetails: bankDetails,
          kycDetails: {
            panNumber: userData.kycDetails?.pan?.number || "N/A",
            panImage: userData.kycDetails?.pan?.attachmentUrl || null,
          },
          certifications: certifications,
          profilepic: userData.profilePicture || null,
        });
      }
    } catch (error) {
      console.error("Error fetching doctor data:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to load doctor data',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDegrees = async () => {
    if (!token) return;
    try {
      const response = await AuthFetch('catalogue/degree/getAllDegrees', token);
      
      if (response.status === 'error') {
        throw new Error(response.message || 'Failed to fetch degrees');
      }
      
      const data = response?.data?.data || [];
      setDegrees(data);
    } catch (error) {
      console.error('Error fetching degrees:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to fetch degrees',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  useEffect(() => {
    if (token) {
      fetchDoctorData();
      fetchDegrees();
    }
  }, [token]);

  const showModal = (doc) => {
    setSelectedDocument(doc);
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
    setSelectedDocument(null);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedDocument(null);
  };

  const getImageSrc = (image) => {
    if (typeof image === 'string') {
      return image;
    }
    if (image?.data && image?.mimeType) {
      return `data:${image.mimeType};base64,${image.data}`;
    }
    return null;
  };

  const handleEditModalOpen = (type) => {
    setEditModalType(type);
    setFormValues(getInitialFormValues(type));
  };

  const handleEditModalClose = () => {
    setEditModalType(null);
    setFormValues({});
  };

  const getInitialFormValues = (type) => {
    switch (type) {
      case 'personal':
        return {
          firstname: doctorData?.firstname,
          lastname: doctorData?.lastname,
          email: doctorData?.email,
          DOB: doctorData?.DOB,
          bloodgroup: doctorData?.bloodgroup,
          maritalStatus: doctorData?.maritalStatus,
          medicalRegistrationNumber: doctorData?.medicalRegistrationNumber,
          spokenLanguage: doctorData?.spokenLanguage || [],
        };
      case 'professional':
        return {
          specialization: doctorData?.specialization?.map(s => s.name)?.join(','),
          experience: doctorData?.specialization?.[0]?.experience || 0,
          certifications: doctorData?.certifications || [],
        };
      case 'bank':
        return {
          bankDetails: doctorData?.bankDetails || {},
        };
      default:
        return {};
    }
  };

  const handleFormChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedFormChange = (parent, field, value) => {
    setFormValues(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleSaveProfile = async () => {
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Authentication token not found',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      let response;
      
      switch (editModalType) {
        case 'personal':
          response = await AuthPut("/users/updateUser", {
            ...formValues,
            spokenLanguage: formValues.spokenLanguage || []
          }, token);
          break;
        case 'professional':
          const formData = new FormData();
          formData.append('id', doctorData?.userId);
          formData.append('name', formValues.specialization);
          formData.append('experience', formValues.experience);
          formData.append('degree', doctorData.specialization[0]?.degree || '');
          formData.append('bio', '');
          
          response = await UploadFiles("/users/updateSpecialization", formData, token);
          break;
        case 'bank':
          response = await AuthPost("/users/updateBankDetails", formValues.bankDetails, token);
          break;
        case 'kyc':
           try {
       setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      console.log("userId", userId)
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        return;
      }
      if (!userId) {
        Alert.alert('Error', 'User ID is missing. Please log in again.');
        return;
      }

      if (!panImage?.uri) {
        Alert.alert('Error', 'Please upload a Pancard document.');
        return;
      }

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('panNumber', panNumber);
     
      if (panImage?.uri) {
        formData.append('panFile', {
          uri: panImage.uri,
          name: panImage.name,
          type: panImage.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        } as any);
      }

      console.log('Submitting KYC data: addKYCDetails', formData);
       const response = await UploadFiles('users/addKYCDetails', formData, token); 
       
       console.log(response, "response for upload")
      if (response.status === 'success') {

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile updated successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setTimeout(async () => {
          setLoading(false)
          await AsyncStorage.setItem('currentStep', 'ConfirmationScreen');
        }, 2000);
      } else {


      Alert.alert(response?.message?.message ||'Error', 'Failed to submit KYC details. Please try again.');


      handleEditModalClose();
      setLoading(false); // 👉 Hide loader on failure
      
    }
 } catch (error: any) {
  console.log(error, "1234")
  setLoading(false);
  const errorMessage =
    (error?.response?.data?.message as string) ||
    (error?.message as string) ||
    'Failed to submit KYC details. Please try again.';
  Alert.alert('Error', errorMessage);
  console.error('KYC submission error:', error);
}
break;
      }
      
      if (response.status === 'error') {
        throw new Error(response.message || 'Failed to update profile');
      }
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully',
        position: 'top',
        visibilityTime: 3000,
      });
      handleEditModalClose();
      fetchDoctorData();
    } catch (error) {
      console.error("Error updating profile:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update profile',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const pickImage = () => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: true,
        maxHeight: 200,
        maxWidth: 200,
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.log('ImagePicker Error: ', response.errorMessage);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to pick image',
            position: 'top',
            visibilityTime: 3000,
          });
        } else if (response.assets && response.assets.length > 0) {
          const source = response.assets[0];
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Image uploaded successfully',
            position: 'top',
            visibilityTime: 3000,
          });
          // Handle the uploaded image
        }
      }
    );
  };

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf],
      });
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Document picked successfully',
        position: 'top',
        visibilityTime: 3000,
      });
      return res;
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled document picker');
      } else {
        console.log('DocumentPicker Error: ', err);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to pick document',
          position: 'top',
          visibilityTime: 3000,
        });
        throw err;
      }
    }
  };

  // Function to generate a unique color for each location
  const getLocationColor = (name) => {
    const colors = ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1', '#955251', '#B565A7'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Loading doctor details...</Text>
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

   const handlePancardUpload = async () => {
    Alert.alert(
      'Upload PAN Card',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              const result = await launchCamera({
                mediaType: 'photo',
                includeBase64: false,
              });
  
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
  
                setPanImage({
                  uri: asset.uri!,
                  name: asset.fileName || 'pan_camera.jpg',
                  type: asset.type || 'image/jpeg',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('No image selected from camera');
              }
            } catch (error) {
              Alert.alert('Error', 'Camera access failed.');
              console.error('Camera error:', error);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                includeBase64: false,
              });
  
              if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
  
                setPanImage({
                  uri: asset.uri!,
                  name: asset.fileName || 'pan_gallery.jpg',
                  type: asset.type || 'image/jpeg',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('No image selected from gallery');
              }
            } catch (error) {
              Alert.alert('Error', 'Gallery access failed.');
              console.error('Gallery error:', error);
            }
          },
        },
        {
          text: 'Upload PDF',
          onPress: async () => {
            try {
              const [res] = await pick({
                type: [types.pdf, types.images],
              });
  
              if (res && res.uri && res.name) {
                setPanImage({
                  uri: res.uri,
                  name: res.name,
                  type: res.type || 'application/pdf',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('Error', 'Invalid file selected. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'PDF selection failed.');
              console.error('PDF error:', error);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.row}>
          {/* Personal Information */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="user" size={16} color="#1E88E5" />
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>
              <TouchableOpacity onPress={() => handleEditModalOpen('personal')}>
                <Icon name="edit" size={16} color="#1E88E5" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.avatarContainer}>
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
                <Text style={{ color: '#FFFFFF', fontSize: SCREEN_WIDTH * 0.08, fontWeight: 'bold' }}>
                  {doctorData.firstname?.charAt(0)?.toUpperCase() || 'D'}
                </Text>
              </View>
              <Text style={styles.doctorName}>Dr. {doctorData.firstname} {doctorData.lastname}</Text>
              <Text style={styles.doctorMeta}>Medical Registration: {doctorData.medicalRegistrationNumber}</Text>
              <Text style={styles.doctorMeta}>Mobile Number: {doctorData.mobile}</Text>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Icon name="man" size={16} color="#333333" />
                <Text style={styles.infoText}><Text style={styles.bold}>Gender:</Text> {doctorData.gender}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={[styles.infoText, { marginLeft: 24 }]}><Text style={styles.bold}>Marital Status:</Text> {doctorData.maritalStatus}</Text>
              </View>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Icon name="mail" size={16} color="#333333" />
                <Text style={styles.infoText}><Text style={styles.bold}>Email:</Text> {doctorData.email}</Text>
              </View>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={[styles.infoText, styles.bold]}>Languages:</Text>
              <View style={styles.tagsContainer}>
                {doctorData.spokenLanguage.length > 0 ? (
                  doctorData.spokenLanguage.map((lang, index) => (
                    <View key={index} style={styles.tag}>
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
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="medicinebox" size={16} color="#1E88E5" />
                <Text style={styles.cardTitle}>Professional Summary</Text>
              </View>
              <TouchableOpacity onPress={() => handleEditModalOpen('professional')}>
                <Icon name="edit" size={16} color="#1E88E5" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.section}>
              <Text style={[styles.infoText, styles.bold, styles.sectionTitle]}>Specializations</Text>
              <View style={styles.tagsContainer}>
                {doctorData.specialization.length > 0 ? (
                  doctorData.specialization.map((spec, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{spec.name || "Not specified"}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No specializations added</Text>
                )}
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={[styles.infoText, styles.bold, styles.sectionTitle]}>Work Experience</Text>
              <View style={styles.experienceContainer}>
                <Text style={styles.experienceYears}>{doctorData.specialization[0]?.experience || 0} Years</Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={[styles.infoText, styles.bold, styles.sectionTitle]}>Certifications</Text>
              {doctorData.certifications.length > 0 ? (
                doctorData.certifications.map((cert, index) => (
                  <View key={index} style={styles.certificationItem}>
                    <View style={styles.certificationInfo}>
                      <Text style={styles.certificationName}>{cert.name || "N/A"}</Text>
                      <Text style={styles.certificationNumber}>{cert.registrationNo || "N/A"}</Text>
                    </View>
                    <View style={styles.certificationActions}>
                      {cert.image && (
                        <TouchableOpacity 
                          style={styles.viewButton}
                          onPress={() => showModal({ type: "Specialization Certificate", data: cert.image })}
                        >
                          <Text style={styles.viewButtonText}>View Certificate</Text>
                        </TouchableOpacity>
                      )}
                      {cert.degreeCertificate && (
                        <TouchableOpacity 
                          style={styles.viewButton}
                          onPress={() => showModal({ type: "Degree Certificate", data: cert.degreeCertificate })}
                        >
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
        </View>

        <View style={styles.row}>
          {/* Working Locations */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="enviroment" size={16} color="#1E88E5" />
                <Text style={styles.cardTitle}>Working Locations</Text>
              </View>
            </View>

            {doctorData.addresses?.map((each) => (
              <View key={each._id} style={styles.locationCard}>
                <View style={styles.locationInfo}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: getLocationColor(each.clinicName || `Clinic ${each._id}`),
                      marginRight: SCREEN_WIDTH * 0.02,
                      
                    }}
                  />
                  <View style={styles.locationDetails}>
                    <Text style={[styles.infoText, styles.bold]}>
                      {each.clinicName || "N/A"}
                    </Text>
                    <Text style={styles.locationAddress}>
                      {`${each.address}, ${each.city}, ${each.state}, ${each.country} - ${each.pincode}` || "N/A"}
                    </Text>
                    <Text style={styles.locationTimings}>
                      <Text style={styles.bold}>Timings:</Text>{" "}
                      {each.startTime || "N/A"} - {each.endTime || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            
            {/* {doctorData.addresses?.length > 0 ? (
              <Picker
                selectedValue={doctorData.selectedLocationIndex}
                onValueChange={(itemValue) => {
                  setDoctorData(prev => ({
                    ...prev,
                    selectedLocationIndex: itemValue
                  }));
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select a location" value="" />
                {doctorData?.addresses?.map((clinic, index) => (
                  <Picker.Item 
                    key={index} 
                    label={
                      <View style={styles.pickerItem}>
                        <View style={[styles.colorDot, { backgroundColor: clinic.color }]} />
                        <Text>{clinic.clinicName || "N/A"}</Text>
                      </View>
                    } 
                    value={index} 
                  />
                ))}
              </Picker>
            ) : null}
            
            {(doctorData.selectedLocationIndex !== undefined || doctorData.workingLocations.length === 1) && (
              <View style={styles.locationCard}>
                <View style={styles.locationInfo}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: doctorData.workingLocations[doctorData.selectedLocationIndex || 0].color,
                      marginRight: SCREEN_WIDTH * 0.02,
                    }}
                  />
                  <View style={styles.locationDetails}>
                    <Text style={[styles.infoText, styles.bold]}>
                      {doctorData.workingLocations[doctorData.selectedLocationIndex || 0].name || "N/A"}
                    </Text>
                    <Text style={styles.locationAddress}>
                      {doctorData.workingLocations[doctorData.selectedLocationIndex || 0].address || "N/A"}
                    </Text>
                    <Text style={styles.locationTimings}>
                      <Text style={styles.bold}>Timings:</Text>{" "}
                      {doctorData.workingLocations[doctorData.selectedLocationIndex || 0].startTime || "N/A"} -{" "}
                      {doctorData.workingLocations[doctorData.selectedLocationIndex || 0].endTime || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            )} */}
          </View>

          {/* KYC Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="idcard" size={16} color="#1E88E5" />
                <Text style={styles.cardTitle}>KYC Details</Text>
              </View>
              <TouchableOpacity onPress={() => handleEditModalOpen('kyc')}>
                <Icon name="edit" size={16} color="#1E88E5" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.kycItem}>
              <View style={styles.kycInfo}>
                <Icon name="idcard" size={16} color="#333333" />
                <Text style={styles.infoText}><Text style={styles.bold}>PAN Number:</Text> {doctorData.kycDetails.panNumber || "N/A"}</Text>
              </View>
              {doctorData?.kycDetails?.panImage && (
                <TouchableOpacity
                  onPress={() => showModal({ type: "pan", data: doctorData.kycDetails.panImage })}
                >
                  <Icon name="eye" size={16} color="#1E88E5" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          {/* Consultation Charges */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="dollar" size={16} color="#1E88E5" />
                <Text style={styles.cardTitle}>Consultation Charges</Text>
              </View>
            </View>
            
            {doctorData.consultationModeFee.map((mode, index) => (
              <View key={index} style={styles.consultationCard}>
                <View style={styles.consultationInfo}>
                  {mode.type === "In-Person" && <Icon name="user" size={16} color="#1E88E5" />}
                  {mode.type === "Video" && <Icon name="videocamera" size={16} color="#2E7D32" />}
                  {mode.type === "Home Visit" && <Icon name="car" size={16} color="#7B1FA2" />}
                  <View>
                    <Text style={[styles.infoText, styles.bold]}>{mode.type}</Text>
                    <Text style={styles.consultationDescription}>{mode.description || "N/A"}</Text>
                  </View>
                </View>
                <Text style={styles.consultationPrice}>{mode.currency}{mode.fee}</Text>
              </View>
            ))}
          </View>

          {/* Bank Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Icon name="bank" size={16} color="#1E88E5" />
                <Text style={styles.cardTitle}>Bank Details</Text>
              </View>
              <TouchableOpacity onPress={() => handleEditModalOpen('bank')}>
                <Icon name="edit" size={16} color="#1E88E5" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.bankDetails}>
              <View style={styles.bankItem}>
                <Icon name="bank" size={16} color="#333333" />
                <Text style={styles.infoText}><Text style={styles.bold}>Bank:</Text> {doctorData.bankDetails.bankName || "N/A"}</Text>
              </View>
              
              <View style={styles.bankItem}>
                <Icon name="user" size={16} color="#333333" />
                <Text style={styles.infoText}><Text style={styles.bold}>Account Holder:</Text> {doctorData.bankDetails.accountHolderName || "N/A"}</Text>
              </View>
              
              <View style={styles.bankItem}>
                <View style={styles.accountNumberContainer}>
                  <Text style={styles.infoText}><Text style={styles.bold}>Account Number:</Text> {doctorData.bankDetails.accountNumber || "N/A"}</Text>
                </View>
                {doctorData.bankDetails.accountProof && (
                  <TouchableOpacity
                    onPress={() => showModal({ type: "accountProof", data: doctorData.bankDetails.accountProof })}
                  >
                    <Icon name="eye" size={16} color="#1E88E5" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.bankItem}>
                <Text style={styles.infoText}><Text style={styles.bold}>Bank IFSC:</Text> {doctorData.bankDetails.ifscCode || "N/A"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Document Modal */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedDocument?.type || "Document"}</Text>
              {selectedDocument && selectedDocument.data ? (
                <Image
                  source={{ uri: getImageSrc(selectedDocument.data) }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.noDataText}>No image available for this document.</Text>
              )}
              <TouchableOpacity style={styles.modalButton} onPress={handleCancel}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Modal */}
        <Modal
          visible={!!editModalType}
          transparent={true}
          animationType="slide"
          onRequestClose={handleEditModalClose}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Edit {editModalType ? editModalType.charAt(0).toUpperCase() + editModalType.slice(1) : ''} Details
              </Text>
              
              <ScrollView style={styles.formContainer}>
                {editModalType === 'personal' && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>First Name</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.firstname}
                        onChangeText={(text) => handleFormChange('firstname', text)}
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Last Name</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.lastname}
                        onChangeText={(text) => handleFormChange('lastname', text)}
                      />
                    </View>
                    
                    {/* <View style={styles.formGroup}>
                      <Text style={styles.label}>Medical Registration Number</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.medicalRegistrationNumber}
                        onChangeText={(text) => handleFormChange('medicalRegistrationNumber', text)}
                      />
                    </View> */}
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.email}
                        onChangeText={(text) => handleFormChange('email', text)}
                        keyboardType="email-address"
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Languages</Text>
                      {formValues.spokenLanguage?.map((lang, index) => (
                        <View key={index} style={styles.languageItem}>
                          <Picker
                            selectedValue={lang}
                            onValueChange={(value) => {
                              const newLanguages = [...formValues.spokenLanguage];
                              newLanguages[index] = value;
                              handleFormChange('spokenLanguage', newLanguages);
                            }}
                            style={styles.picker}
                          >
                            {languageOptions.map(option => (
                              <Picker.Item key={option.value} label={option.label} value={option.value} />
                            ))}
                          </Picker>
                          <TouchableOpacity
                            onPress={() => {
                              const newLanguages = formValues.spokenLanguage.filter((_, i) => i !== index);
                              handleFormChange('spokenLanguage', newLanguages);
                            }}
                          >
                            <Icon name="close" size={16} color="#D32F2F" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      
                      {formValues.spokenLanguage?.length < languageOptions.length && (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => {
                            const newLanguages = [...formValues.spokenLanguage, languageOptions[0].value];
                            handleFormChange('spokenLanguage', newLanguages);
                          }}
                        >
                          <Text style={styles.addButtonText}>Add Language</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
                
                {editModalType === 'professional' && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Specializations (comma-separated)</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.specialization}
                        onChangeText={(text) => handleFormChange('specialization', text)}
                        editable={false}
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Experience</Text>
                      <TextInput
                        style={styles.input}
                        value={String(formValues.experience)}
                        onChangeText={(text) => handleFormChange('experience', text)}
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}

                 {editModalType === 'kyc' && (
                  <>
                   <Text style={styles.label}>Enter PAN Number </Text>
                            <TextInput
                              style={styles.input}
                              value={panNumber}
                              onChangeText={setPanNumber}
                              placeholder="Enter 10-character PAN Number"
                              keyboardType="default"
                              maxLength={10}
                              autoCapitalize="characters"
                            />
                     <Text style={styles.label}>Upload Pancard Proof</Text>
                              <TouchableOpacity style={styles.uploadBox} onPress={handlePancardUpload}>
                                <Icon name="card" size={SCREEN_WIDTH * 0.08} color="#00203F" style={styles.icon} />
                                <Text style={styles.uploadText}>Upload</Text>
                                <Text style={styles.acceptedText}>Accepted: PDF, JPG, PNG</Text>
                              </TouchableOpacity>
                              {pancardUploaded && (
                                <Text style={styles.successText}>
                                  File uploaded: {panImage?.name || 'Pancard uploaded successfully!'}
                                </Text>
                              )}
                  </>
                )}
                
                {editModalType === 'bank' && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Bank Name</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.bankDetails?.bankName}
                        onChangeText={(text) => handleNestedFormChange('bankDetails', 'bankName', text)}
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Account Holder Name</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.bankDetails?.accountHolderName}
                        onChangeText={(text) => handleNestedFormChange('bankDetails', 'accountHolderName', text)}
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Account Number</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.bankDetails?.accountNumber}
                        onChangeText={(text) => handleNestedFormChange('bankDetails', 'accountNumber', text)}
                        keyboardType="numeric"
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>IFSC Code</Text>
                      <TextInput
                        style={styles.input}
                        value={formValues.bankDetails?.ifscCode}
                        onChangeText={(text) => handleNestedFormChange('bankDetails', 'ifscCode', text)}
                      />
                    </View>
                  </>
                )}
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleEditModalClose}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveProfile}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray background for main container
  },
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    paddingVertical: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SCREEN_WIDTH * 0.04,
    paddingHorizontal: SCREEN_WIDTH * 0.02,
  },
  card: {
    backgroundColor: '#FFFFFF', // White background for cards
    borderRadius: 8,
    padding: SCREEN_WIDTH * 0.04,
    marginBottom: SCREEN_WIDTH * 0.04,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: SCREEN_WIDTH < 600 ? '100%' : '48%', // Full width on small screens, half on larger
    minWidth: SCREEN_WIDTH < 600 ? 'auto' : 300, // Minimum width for larger screens
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SCREEN_WIDTH * 0.04,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Light gray border
    paddingBottom: SCREEN_WIDTH * 0.02,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: SCREEN_WIDTH * 0.04,
    fontWeight: 'bold',
    color: '#1E88E5', // Blue for titles
    marginLeft: 8,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: SCREEN_WIDTH * 0.04,
  },
  doctorName: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    color: '#212121', // Dark gray for high contrast
    marginBottom: 4,
  },
  doctorMeta: {
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#424242', // Slightly lighter dark gray for meta text
    marginBottom: 2,
  },
  infoSection: {
    marginBottom: SCREEN_WIDTH * 0.04,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SCREEN_WIDTH * 0.02,
  },
  infoText: {
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#333333', // Darker gray for better readability
    marginLeft: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#212121', // Dark gray for bold text
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SCREEN_WIDTH * 0.02,
  },
  tag: {
    backgroundColor: '#E3F2FD', // Light blue background for tags
    borderRadius: 16,
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    paddingVertical: SCREEN_WIDTH * 0.01,
    marginRight: SCREEN_WIDTH * 0.02,
    marginBottom: SCREEN_WIDTH * 0.02,
  },
  tagText: {
    fontSize: SCREEN_WIDTH * 0.03,
    color: '#1565C0', // Darker blue for tag text
  },
  noDataText: {
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#616161', // Medium gray for no data text
    fontStyle: 'italic',
  },
  section: {
    marginBottom: SCREEN_WIDTH * 0.05,
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#2E7D32', // Green for section titles
    fontWeight: 'bold',
    marginBottom: SCREEN_WIDTH * 0.02,
  },
  experienceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SCREEN_WIDTH * 0.02,
  },
  experienceYears: {
    fontSize: SCREEN_WIDTH * 0.06,
    fontWeight: 'bold',
    color: '#1E88E5', // Blue for experience years
  },
  certificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SCREEN_WIDTH * 0.03,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Light gray border
  },
  certificationInfo: {
    flex: 1,
  },
  certificationName: {
    fontWeight: '500',
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#212121', // Dark gray for certification name
    marginBottom: 2,
  },
  certificationNumber: {
    fontSize: SCREEN_WIDTH * 0.03,
    color: '#424242', // Slightly lighter gray for certification number
  },
  certificationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  viewButton: {
    backgroundColor: '#1E88E5', // Blue for view buttons
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    paddingVertical: SCREEN_WIDTH * 0.015,
    borderRadius: 4,
    marginLeft: SCREEN_WIDTH * 0.02,
    marginBottom: SCREEN_WIDTH * 0.01,
  },
  viewButtonText: {
    color: '#FFFFFF', // White for button text
    fontSize: SCREEN_WIDTH * 0.03,
  },
  picker: {
    height: SCREEN_WIDTH * 0.12,
    width: '100%',
    marginBottom: SCREEN_WIDTH * 0.04,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  locationCard: {
    backgroundColor: '#E8EAF6', // Light indigo background for location card
    borderRadius: 8,
    padding: SCREEN_WIDTH * 0.03,
    marginBottom: SCREEN_WIDTH * 0.02,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDetails: {
    marginLeft: SCREEN_WIDTH * 0.02,
    flex: 1,
  },
  locationAddress: {
    fontSize: SCREEN_WIDTH * 0.03,
    color: '#424242', // Darker gray for address
    marginBottom: SCREEN_WIDTH * 0.01,
  },
  locationTimings: {
    fontSize: SCREEN_WIDTH * 0.03,
    color: '#424242', // Darker gray for timings
  },
  kycItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SCREEN_WIDTH * 0.04,
  },
  kycInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9', // Light green background for consultation card
    borderRadius: 8,
    padding: SCREEN_WIDTH * 0.03,
    marginBottom: SCREEN_WIDTH * 0.02,
  },
  consultationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultationDescription: {
    fontSize: SCREEN_WIDTH * 0.03,
    color: '#424242', // Darker gray for description
    marginLeft: SCREEN_WIDTH * 0.02,
  },
  consultationPrice: {
    fontSize: SCREEN_WIDTH * 0.04,
    fontWeight: 'bold',
    color: '#1E88E5', // Blue for price
  },
  bankDetails: {
    marginTop: SCREEN_WIDTH * 0.02,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SCREEN_WIDTH * 0.03,
  },
  accountNumberContainer: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker semi-transparent background
  },
  modalContent: {
    backgroundColor: '#FFFFFF', // White background for modal
    borderRadius: 8,
    padding: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.9,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    color: '#212121', // Dark gray for modal title
    marginBottom: SCREEN_WIDTH * 0.04,
    textAlign: 'center',
  },
  modalImage: {
    width: '100%',
    height: SCREEN_WIDTH * 0.7,
    marginBottom: SCREEN_WIDTH * 0.04,
  },
  modalButton: {
    backgroundColor: '#1E88E5', // Blue for modal buttons
    padding: SCREEN_WIDTH * 0.03,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF', // White for button text
    fontWeight: 'bold',
    fontSize: SCREEN_WIDTH * 0.035,
  },
  formContainer: {
    maxHeight: SCREEN_WIDTH * 1.0,
    marginBottom: SCREEN_WIDTH * 0.04,
  },
  formGroup: {
    marginBottom: SCREEN_WIDTH * 0.04,
  },
  label: {
    fontSize: SCREEN_WIDTH * 0.035,
    fontWeight: 'bold',
    color: '#212121', // Dark gray for labels
    marginBottom: SCREEN_WIDTH * 0.02,
  },
  input: {
    borderWidth: 1,
    borderColor: '#B0BEC5', // Light blue-gray for input border
    borderRadius: 4,
    padding: SCREEN_WIDTH * 0.025,
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#333333', // Darker gray for input text
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SCREEN_WIDTH * 0.02,
  },
  addButton: {
    backgroundColor: '#E3F2FD', // Light blue for add button
    padding: SCREEN_WIDTH * 0.025,
    borderRadius: 4,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#1565C0', // Darker blue for add button text
    fontWeight: 'bold',
    fontSize: SCREEN_WIDTH * 0.035,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#757575', // Gray for cancel button
    flex: 1,
    marginRight: SCREEN_WIDTH * 0.02,
  },
  saveButton: {
    backgroundColor: '#2E7D32', // Green for save button
    flex: 1,
    marginLeft: SCREEN_WIDTH * 0.02,
  },
  loadingText: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#333333', // Darker gray for loading text
    marginTop: 8,
  },
    acceptedText: {
    fontSize: SCREEN_WIDTH * 0.03,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  successText: {
    color: '#00203F',
    fontSize: SCREEN_WIDTH * 0.035,
    marginTop: 4, // Replace height * 0.005 with a fixed value or use SCREEN_WIDTH if needed
    marginBottom: 8, // Replace height * 0.01 with a fixed value or use SCREEN_WIDTH if needed
    textAlign: 'center',
  },
   uploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: SCREEN_WIDTH * 0.04,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: SCREEN_HEIGHT * 0.01,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
    uploadText: {
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#00203F',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default DoctorProfileView;