import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import ProgressBar from '../progressBar/progressBar';
import { getCurrentStepIndex, TOTAL_STEPS } from '../../utility/registrationSteps';
import { UploadFiles, AuthFetch } from '../../auth/auth';
import WebView from 'react-native-webview';
 
const voter_icon = require('../../assets/aadhar.png');
const pancard_icon = require('../../assets/pan.png');
 
const { width, height } = Dimensions.get('window');
 
const KYCDetailsScreen = () => {
  const [voterImage, setVoterImage] = useState<{ uri: string; name: string; type?: string } | null>(null);
  const [panImage, setPanImage] = useState<{ uri: string; name: string; type?: string } | null>(null);
  const [voterUploaded, setVoterUploaded] = useState(false);
  const [pancardUploaded, setPancardUploaded] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [voterNumber, setVoterNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [fileViewModalVisible, setFileViewModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; type?: string } | null>(null);
  const navigation = useNavigation<any>();
 
  const termsAndConditionsHTML = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            font-size: 24px;
            color: #00203F;
            text-align: center;
          }
          .effective-date {
            text-align: center;
            font-size: 16px;
            margin-bottom: 20px;
          }
          p, li {
            font-size: 16px;
            margin-bottom: 10px;
            text-align: justify;
          }
          h2 {
            font-size: 20px;
            color: #00203F;
            margin-top: 20px;
            text-align: left;
          }
          ul {
            padding-left: 20px;
            text-align: justify;
          }
        </style>
      </head>
      <body>
        <h1>Vydhyo Healthcare Platform</h1>
        <p class="effective-date"><strong>Effective Date:</strong> September 1st, 2025 | <strong>Last Updated:</strong> August 30th, 2025 | <strong>Version:</strong> 1.0</p>
 
        <h2>1. Definitions and Interpretation</h2>
        <p><strong>Vydhyo:</strong> Vydhyo Health Care Pvt. Ltd., a company incorporated under the Companies Act, 2013, with its registered office at E 602, Hallmark Sunnyside, Manchirevula, Hyderabad, operating the Platform (www.vydhyo.com and Vydhyo mobile application).</p>
        <p><strong>User:</strong> Any individual accessing or using the Platform, including patients, healthcare providers, caregivers, and their authorized representatives.</p>
        <p><strong>Patient:</strong> An individual seeking healthcare services or their parent/legal guardian for minors or persons with disabilities.</p>
        <p><strong>Healthcare Provider:</strong> Registered medical practitioners, hospitals, clinics, diagnostic centers, ambulance services, home care providers, physiotherapists, nutritionists, mental health professionals, and others listed on the Platform.</p>
        <p><strong>Services:</strong> Appointment booking, teleconsultation facilitation, ambulance services, home care services, diagnostic services, AI-powered guidance, health information, and related offerings.</p>
        <p><strong>Personal Data:</strong> Information relating to an identifiable person as defined under the Digital Personal Data Protection Act, 2023.</p>
        <p><strong>Sensitive Personal Data:</strong> Includes passwords, financial information, health information, biometric data, etc.</p>
        <p><strong>ABDM:</strong> Ayushman Bharat Digital Mission ecosystem.</p>
        <p><strong>Clinical Establishment:</strong> Healthcare facilities registered under the Clinical Establishments Act, 2010.</p>
        <p><strong>Telemedicine:</strong> Practice of medicine using electronic communication as per Telemedicine Practice Guidelines, 2020.</p>
 
        <h2>2. Acceptance and Modification</h2>
        <p><strong>Acceptance:</strong> By using the Platform, you agree to these Terms and applicable laws. If you do not agree, you must not use the Platform.</p>
        <p><strong>Modifications:</strong> Vydhyo may modify these Terms, with material changes notified 30 days prior unless required by law for immediate implementation.</p>
        <p><strong>Continued Use:</strong> Continued use after modifications constitutes acceptance.</p>
        <p><strong>Language:</strong> English version prevails in case of translation conflicts.</p>
 
        <h2>3. Eligibility and Registration</h2>
        <p><strong>Age:</strong> Users must be 18 or older; minors require parental/guardian consent.</p>
        <p><strong>Legal Capacity:</strong> Users must have the legal capacity to enter contracts under Indian law.</p>
        <p><strong>Registration:</strong></p>
        <ul>
          <li>Provide accurate, complete, and current information.</li>
          <li>Verify mobile number and email via OTP.</li>
          <li>Healthcare Providers must provide valid registration numbers.</li>
          <li>Clinical Establishments must provide valid registrations.</li>
          <li>Vydhyo may verify credentials and reject applications.</li>
        </ul>
        <p><strong>ABDM Integration:</strong> Optional integration with ABHA ID, HIP/HIU systems, and consent manager framework.</p>
        <ul>
          <li>Creation of ABHA (Ayushman Bharat Health Account) ID.</li>
          <li>Integration with Health Information Provider (HIP) and Health Information User (HIU) systems.</li>
          <li>Consent manager framework compliance.</li>
          <li>Digital health records interoperability.</li>
        </ul>
        <p><strong>Account Security:</strong></p>
        <ul>
          <li>Users are responsible for credential confidentiality and must notify Vydhyo of unauthorized use.</li>
          <li>Users are liable for all activities conducted through their account.</li>
          <li>Multi-factor authentication is strongly recommended.</li>
        </ul>
        <p><strong>Prohibited Users:</strong></p>
        <ul>
          <li>Those barred by law, with revoked licenses, or previously violating Terms.</li>
        </ul>
 
        <h2>4. Platform Role and Disclaimers</h2>
        <p><strong>Role:</strong> Vydhyo is a technology platform facilitating connections, not a healthcare provider.</p>
        <p><strong>No Medical Practice:</strong></p>
        <ul>
          <li>Vydhyo does not diagnose, treat, or provide medical advice; medical decisions are between patients and providers.</li>
          <li>Vydhyo does not endorse any particular healthcare provider or treatment.</li>
        </ul>
        <p><strong>Facilitation:</strong> Limited to appointment booking, communication, payment processing, and AI-powered informational tools.</p>
        <p><strong>Provider Independence:</strong> Providers are independent contractors, not Vydhyo employees.</p>
        <p><strong>Emergency Disclaimer:</strong> Platform is not for emergencies; contact 108/102 or visit emergency facilities.</p>
 
        <h2>5. Services</h2>
        <h3>5.1 Doctor Consultations</h3>
        <p><strong>Appointment Scheduling:</strong> Subject to provider availability; confirmation required.</p>
        <p><strong>Telemedicine Compliance:</strong> Complies with 2020 Guidelines; providers maintain valid registrations.</p>
        <p><strong>Payment Processing:</strong> Vydhyo acts as a payment aggregator; taxes and fees apply.</p>
        <p><strong>Rescheduling:</strong> Allowed with 2-hour notice; multiple rescheduling may incur fees.</p>
        <p><strong>Cancellation:</strong> Full refund (>24 hours), no refund (no-show).</p>
        <h3>5.2 Ambulance Services</h3>
        <p>Facilitates connection with independent providers.</p>
        <p>Vydhyo is not liable for quality, timing, or disputes.</p>
        <p>Suitable for non-critical transport; emergencies should use 108/102.</p>
        <h3>5.3 Home Care Services</h3>
        <p>Includes nursing, elder care, physiotherapy, etc.</p>
        <p>Providers undergo verification; comply with Biomedical Waste Management Rules, 2016.</p>
        <p>Vydhyo is not liable for disputes.</p>
        <h3>5.4 Specialized Consultations</h3>
        <p>Includes physiotherapy, nutrition, mental health, and second opinions.</p>
        <p>Mental health services ensure confidentiality; nutrition services integrate with treatment plans.</p>
        <h3>5.5 AI-Powered Tools</h3>
        <p>Symptom assessment for informational purposes only, not diagnostic.</p>
        <p>Recommends consulting qualified providers.</p>
 
        <h2>6. Payment Terms</h2>
        <p><strong>Methods:</strong> Credit/debit cards, net banking, UPI, digital wallets, Vydhyo wallet, insurance integration.</p>
        <p><strong>Security:</strong> PCI-DSS compliant, end-to-end encryption, tokenization, fraud detection.</p>
        <p><strong>Pricing:</strong> Set by providers; platform fees disclosed.</p>
        <p><strong>Taxes:</strong> GST, TDS, etc., apply unless specified.</p>
        <p><strong>Refunds:</strong> Per service-specific policies; processed in 5-10 days (card/bank) or immediately (wallet).</p>
        <p><strong>Disputes:</strong> Raised within 30 days; resolved within 60 days.</p>
 
        <h2>7. User Responsibilities</h2>
        <h3>7.1 Patient Responsibilities</h3>
        <p>Provide accurate information, respect providers, use Platform for legitimate purposes.</p>
        <h3>7.2 Healthcare Provider Responsibilities</h3>
        <p>Maintain licenses, provide quality care, comply with ethics, maintain insurance.</p>
        <h3>7.3 Clinical Establishment Compliance</h3>
        <p>Comply with registration, infrastructure, and waste management regulations.</p>
        <h3>7.4 Prohibited Activities</h3>
        <p>Misrepresentation, unauthorized access, illegal activities, harassment, etc.</p>
        <h3>7.5 Professional Conduct</h3>
        <p>Respectful interactions, confidentiality, conflict disclosure.</p>
 
        <h2>8. Intellectual Property</h2>
        <p><strong>Vydhyo’s IP:</strong> Trademarks, patents, software, content, and data.</p>
        <p><strong>User License:</strong> Limited, non-exclusive, non-transferable for personal use.</p>
        <p><strong>User-Generated Content:</strong> Users retain ownership but grant Vydhyo a license for operations.</p>
        <p><strong>Provider Content:</strong> Providers retain ownership; Vydhyo uses for listings and analytics.</p>
        <p><strong>Third-Party IP:</strong> Licensed components; DMCA compliance.</p>
        <p><strong>Violations:</strong> Takedown, suspension, or legal action for infringement.</p>
 
        <h2>9. Limitation of Liability</h2>
        <p><strong>Limitations:</strong> Vydhyo is not liable for medical errors, provider negligence, technical failures, or force majeure.</p>
        <p><strong>Liability Cap:</strong> Limited to fees paid for the specific service in the past 12 months.</p>
        <p><strong>Consequential Damages:</strong> No liability for indirect or punitive damages.</p>
        <p><strong>Exceptions:</strong> Gross negligence, fraud, data protection violations, or statutory liabilities.</p>
        <p><strong>Indemnification:</strong> Users indemnify Vydhyo for breaches, misuse, or violations.</p>
 
        <h2>10. Governing Law and Dispute Resolution</h2>
        <p><strong>Governing Law:</strong> Laws of India (e.g., Consumer Protection Act, 2019; Digital Personal Data Protection Act, 2023).</p>
        <p><strong>Jurisdiction:</strong> Courts in Hyderabad, Telangana.</p>
        <p><strong>Dispute Resolution:</strong></p>
        <ul>
          <li>Informal resolution (30 days).</li>
          <li>Formal grievance process (30 days).</li>
          <li>Mediation (60 days) under Mediation Act, 2023.</li>
          <li>Arbitration under Arbitration and Conciliation Act, 2015 (Hyderabad, English).</li>
        </ul>
        <p><strong>Specialized Disputes:</strong> Medical malpractice, data protection, consumer protection via respective mechanisms.</p>
 
        <h2>11. Miscellaneous</h2>
        <p><strong>Entire Agreement:</strong> Includes Privacy Policy, Refund Policy, and referenced agreements.</p>
        <p><strong>Severability:</strong> Invalid provisions modified to be enforceable.</p>
        <p><strong>Waiver:</strong> Must be written; no implied waivers.</p>
        <p><strong>Assignment:</strong> Users cannot assign without consent; Vydhyo may assign with notice.</p>
        <p><strong>Notices:</strong> Written, via registered email/address or electronic means.</p>
        <p><strong>Language:</strong> English controls; translations provided in Hindi, Telugu, etc.</p>
        <p><strong>Survival:</strong> IP, liability, data protection, and dispute resolution provisions survive termination.</p>
 
        <h2>12. Acknowledgment</h2>
        <p>By using the Platform, you acknowledge that you have read, understood, and agree to these Terms, have legal capacity, and understand your rights and obligations.</p>
 
        <h2>13. Declaration of Compliance</h2>
        <p>Vydhyo complies with:</p>
        <ul>
          <li>Digital Personal Data Protection Act, 2023</li>
          <li>Consumer Protection Act, 2019</li>
          <li>Ayushman Bharat Digital Mission guidelines</li>
          <li>Telemedicine Practice Guidelines, 2020</li>
          <li>Clinical Establishments Act</li>
          <li>Accessibility and insurance regulations</li>
        </ul>
        <p><strong>Contact:</strong> Vydhyo@gmail.com, 9666955501, E 602, Hallmark Sunnyside, Manchirevula, Hyderabad-500075.</p>
      </body>
    </html>
  `;
 
 
 
  const handleVoterUpload = async () => {
    try {
      const [result] = await pick({
        mode: 'open',
        type: [types.images], // Restrict to images only (PNG, JPG)
      });
      if (result.uri && result.name) {
        setVoterImage({
          uri: result.uri,
          name: result.name,
          type: result.type || 'image/jpeg',
        });
        setVoterUploaded(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick Voter ID image. Please try again.');
    }
  };
 
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
            }
          },
        },
        {
          text: '',
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
            }
          },
        },
        {
          text: 'Upload File',
          onPress: async () => {
            try {
              const [res] = await pick({
                type: [types.images], // Restrict to images only (PNG, JPG)
              });
 
              if (res && res.uri && res.name) {
                setPanImage({
                  uri: res.uri,
                  name: res.name,
                  type: res.type || 'image/jpeg',
                });
                setPancardUploaded(true);
              } else {
                Alert.alert('Error', 'Invalid image selected. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'Image selection failed.');
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
 
  const removeVoterFile = () => {
    setVoterImage(null);
    setVoterUploaded(false);
  };
 
  const removePanFile = () => {
    setPanImage(null);
    setPancardUploaded(false);
  };
 
  const viewFile = (file: { uri: string; type?: string }) => {
    if (file.type?.includes('image')) {
      setSelectedFile(file);
      setFileViewModalVisible(true);
    } else {
      Alert.alert('Error', 'Unsupported file type.');
    }
  };
 
  const validateVoterNumber = (number: string) => {
    const voterRegex = /^[A-Z]{3}[0-9]{7}$/;
    return voterRegex.test(number);
  };
 
  const validatePanNumber = (number: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(number);
  };
 
  const handleNext = async () => {
    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept the Terms & Conditions.');
      return;
    }
 
    if (!panNumber && !pancardUploaded) {
      try {
        setLoading(true);
        await AsyncStorage.setItem('currentStep', 'ConfirmationScreen');
        Toast.show({
          type: 'info',
          text1: 'Skipped',
          text2: 'KYC details skipped',
          position: 'top',
          visibilityTime: 3000,
        });
 
        navigation.navigate('ConfirmationScreen');
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to skip. Please try again.',
          position: 'top',
          visibilityTime: 3000,
        });
      } finally {
        setLoading(false);
      }
      return;
    }
 
    if (!panNumber || !validatePanNumber(panNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-character PAN number (e.g., ABCDE1234F).');
      return;
    }
 
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
 
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }
 
      if (!userId) {
        Alert.alert('Error', 'User ID is missing. Please log in again.');
        setLoading(false);
        return;
      }
 
      if (!prefill ) {
if (!panImage?.uri || prefill) {
        Alert.alert('Error', 'Please upload a Pancard image12.');
        setLoading(false);
        return;
      }
      }
 
     
 
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('panNumber', panNumber);
 
      if (prefill || panImage?.uri) {
        formData.append('panFile', {
          uri: panImage?.uri || panImage,
          name: panImage?.name || 'pan.jpg',
          type: panImage?.type || 'image/jpeg',
        } as any);
      }
      const response = await UploadFiles('users/addKYCDetails', formData, token);
      if (response.status === 'success') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile updated successfully',
          position: 'top',
          visibilityTime: 3000,
        });
 
        setTimeout(async () => {
          setLoading(false);
          await AsyncStorage.setItem('currentStep', 'ConfirmationScreen');
          navigation.navigate('ConfirmationScreen');
        }, 2000);
      } else {
        Alert.alert(response?.message?.error || 'Error', 'Failed to submit KYC details. Please try again.');
        setLoading(false);
      }
    } catch (error: any) {
      setLoading(false);
      const errorMessage =
        (error?.response?.data?.message as string) ||
        (error?.message as string) ||
        'Failed to submit KYC details. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };
const [prefill, setPrefill] = useState(false);
  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        navigation.navigate('/Login');
      }
      const response = await AuthFetch('users/getKycByUserId', token);
      if (response?.data?.status === 'success') {
        const userData = response?.data?.data;
        if (userData?.pan?.number) {
          setPanNumber(userData.pan.number);
          setPanImage(userData?.pan?.attachmentUrl);
          setPrefill(true)
    setPancardUploaded(true);
 
        }
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch user data.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };
 
  useEffect(() => {
    fetchUserData();
  }, []);
 
  const handleBack = () => {
    navigation.navigate('FinancialSetupScreen');
  };
 
  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00203F" />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}
 
      {/* Terms and Conditions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={termsModalVisible}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms and Conditions</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Icon name="close" size={width * 0.06} color="#00203F" />
              </TouchableOpacity>
            </View>
            <WebView
              originWhitelist={['*']}
              source={{ html: termsAndConditionsHTML }}
              style={styles.webview}
            />
          </View>
        </View>
      </Modal>
 
      {/* File View Modal for Images */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={fileViewModalVisible}
        onRequestClose={() => setFileViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fileModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>View File</Text>
              <TouchableOpacity onPress={() => setFileViewModalVisible(false)}>
                <Icon name="close" size={width * 0.06} color="#00203F" />
              </TouchableOpacity>
            </View>
            {selectedFile && (
              <>
                {selectedFile.type?.includes('image') ? (
                  <Image
                    source={{ uri: selectedFile.uri }}
                    style={styles.fileImage}
                    resizeMode="contain"
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>
 
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Details</Text>
      </View>
 
      <ProgressBar currentStep={getCurrentStepIndex('KYCDetailsScreen')} totalSteps={TOTAL_STEPS} />
 
      {/* Form Content */}
      <ScrollView style={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Upload PAN card Proof</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handlePancardUpload}>
            <Icon name="card" size={width * 0.08} color="#00203F" style={styles.icon} />
            <Text style={styles.uploadText}>Upload</Text>
            <Text style={styles.acceptedText}>Accepted: JPG, PNG</Text>
          </TouchableOpacity>
 
          {pancardUploaded && panImage && (
            <View style={styles.uploadedFileContainer}>
              <View style={styles.fileInfo}>
                <Icon
                  name="image"
                  size={20}
                  color="#00203F"
                />
                {prefill && (
                  <Text style={{color: 'green', marginLeft: 5, fontWeight: 'bold'}}>Uploaded</Text>
                )}
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {panImage.name}
                </Text>
              </View>
 
              <View style={styles.fileActions}>
{!prefill && (
 
 
                <TouchableOpacity onPress={() => viewFile(panImage)} style={styles.actionButton}>
                  <Icon name="eye" size={20} color="#007AFF" />
                </TouchableOpacity>
                )}
 
                <TouchableOpacity onPress={removePanFile} style={styles.actionButton}>
                  <Icon name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}
 
          <Text style={styles.label}>Enter PAN Number</Text>
          <TextInput
            style={styles.input}
            value={panNumber}
            onChangeText={setPanNumber}
            placeholder="Enter 10-character PAN Number"
            placeholderTextColor="#9aa0a6"
            keyboardType="default"
            maxLength={10}
            autoCapitalize="characters"
          />
 
          <View style={styles.termsContainer}>
            <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Icon name="check" size={width * 0.04} color="#fff" />}
              </View>
            </TouchableOpacity>
 
            <TouchableOpacity onPress={() => setTermsModalVisible(true)}>
              <Text style={styles.linkText}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </View>
 
        {/* Spacer to ensure content is not hidden by the Next button */}
        <View style={styles.spacer} />
      </ScrollView>
 
      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DCFCE7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    padding: width * 0.02,
  },
  headerTitle: {
    flex: 1,
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginRight: width * 0.06,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.03,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: width * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#000',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: width * 0.03,
    fontSize: width * 0.035,
    marginBottom: height * 0.02,
    color: '#333',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: width * 0.04,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: height * 0.01,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginBottom: height * 0.01,
  },
  uploadText: {
    fontSize: width * 0.035,
    color: '#00203F',
    textAlign: 'center',
    fontWeight: '500',
  },
  acceptedText: {
    fontSize: width * 0.03,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  uploadedFileContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    marginLeft: 10,
    color: '#495057',
    flexShrink: 1,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: height * 0.015,
    marginBottom: height * 0.02,
  },
  checkbox: {
    width: width * 0.06,
    height: width * 0.06,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.03,
  },
  checkboxChecked: {
    backgroundColor: '#00203F',
    borderColor: '#00203F',
  },
  linkText: {
    color: '#007BFF',
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  nextButton: {
    backgroundColor: '#00203F',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: width * 0.05,
    marginBottom: height * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  nextText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
  spacer: {
    height: height * 0.1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderText: {
    color: '#fff',
    fontSize: width * 0.04,
    marginTop: height * 0.02,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  fileModalContent: {
    width: width * 0.9,
    height: height * 0.6,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: width *  0.04,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#00203F',
  },
  webview: {
    flex: 1,
  },
  fileImage: {
    width: '100%',
    height: '100%',
  },
});
 
export default KYCDetailsScreen;