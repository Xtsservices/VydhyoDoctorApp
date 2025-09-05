import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from "../components/splashScreen";
import { RootStackParamList } from "./navigationTypes";
import DoctorLoginScreen from "../components/login";
import PersonalInfoScreen from "../components/PersonalInfo/personalInfo";
import SpecializationDetails from "../components/PersonalInfo/specialization";
import PracticeScreen from "../components/PersonalInfo/practice";
import ConsultationPreferences from "../components/PersonalInfo/consultationPreferences";
import FinancialSetupScreen from "../components/PersonalInfo/financialSetup";
import KYCDetailsScreen from "../components/PersonalInfo/KYCDetails";
import ConfirmationScreen from "../components/PersonalInfo/confirmationScreen";
import ProfileReview from "../components/PersonalInfo/profileReview";
import AccountVerified from "../components/PersonalInfo/accountVerified";
import DoctorDashboard from "../components/Dashboard/dashboard";
import Sidebar from "../components/Dashboard/sidebar";
import AddAppointment from "../components/appointments/AddAppointment";
import Availability from "../components/Dashboard/Availability";
import StaffManagement from "../components/Dashboard/StaffManagement";
import AddStaffScreen from "../components/Dashboard/AddStaff";
import MyPatient from "../components/Dashboard/MyPatient";
import Appointments from "../components/Dashboard/Appointments";
// import dashboard from "../components/Dashboard/dashboard";
import Accounts from "../components/Revenue/Accounts";
import expenditure from "../components/Revenue/expenditure";
// import Labs from "../components/Dashboard/Labs";
import Pharmacy from "../components/Dashboard/Pharmacy";
import PharmacyPatientsTab from "../components/Dashboard/PharmacyMedicinesTab";
import PharmacyMedicinesTab from "../components/Dashboard/PharmacyMedicinesTab"
import Clinic from "../components/Dashboard/Clinic";
import AddClinic from "../components/Dashboard/AddClinic";
import Reviews from "../components/Dashboard/Reviews";
import DoctorDetails from "../components/DegitalPrescription/DoctorDetails";
import PatientDetails from "../components/DegitalPrescription/PatientDetails";
import Vitals from "../components/DegitalPrescription/Vitals";
import DiagnosisMedication from "../components/DegitalPrescription/DiagnosisMedication";
import AdviceFollowup from "../components/DegitalPrescription/AdviceFollowup";
import Profile from "../components/PersonalInfo/Profile";
import PrescriptionPreview from "../components/DegitalPrescription/PrescriptionPreview";
import Authloader from "../components/Authloader";
import EPrescriptionList from "../components/DegitalPrescription/EPrescriptionList";
import PreviousPrescription from "../components/DegitalPrescription/PreviousPrescription";
import labs from "../components/Dashboard/labs";
import LabPatientManagement from "../components/Dashboard/LabPatientManagement";
import Billing from "../components/Dashboard/Billing";

// import Appointments from "../components/appointments/appointments";
// import MyPatient from "../components/Dashboard/MyPatient";

const Stack = createNativeStackNavigator<RootStackParamList>();

const Routing = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Authloader" component={Authloader} options={{ headerShown: false }} />

        <Stack.Screen name="Login" component={DoctorLoginScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Specialization" component={SpecializationDetails} options={{ headerShown: false }}/>
        <Stack.Screen name="Practice" component={PracticeScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ConsultationPreferences" component={ConsultationPreferences} options={{ headerShown: false }}/>
        <Stack.Screen name="FinancialSetupScreen" component={FinancialSetupScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="KYCDetailsScreen" component={KYCDetailsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ConfirmationScreen" component={ConfirmationScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ProfileReview" component={ProfileReview} options={{ headerShown: false }}/>
        <Stack.Screen name="AccountVerified" component={AccountVerified} options={{ headerShown: false }}/>
        <Stack.Screen name="DoctorDashboard" component={DoctorDashboard} options={{ headerShown: false }}/>
        <Stack.Screen name="Sidebar" component={Sidebar} options={{ headerShown: false }}/>
        <Stack.Screen name="AddAppointment" component={AddAppointment}  options={{ title: "Walk-in Consultation", headerTitleAlign: "center", }}  />
        <Stack.Screen name="Availability" component={Availability} />
        <Stack.Screen name="StaffManagement" component={StaffManagement} />
        <Stack.Screen name="AddStaff" component={AddStaffScreen} />
        <Stack.Screen name="MyPatient" component={MyPatient} />
        <Stack.Screen name="Appointments" component={Appointments} />
        {/* <Stack.Screen name="Dashboard" component={dashboard} /> */}
        <Stack.Screen name="Accounts" component={Accounts} />
        <Stack.Screen name="expenditure" component={expenditure} />

        <Stack.Screen name="Clinic" component={Clinic} />
        <Stack.Screen name="labs" component={labs} />
        <Stack.Screen name="LabPatientManagement" component={LabPatientManagement} />
        
        <Stack.Screen name="Billing" component={Billing} />
        <Stack.Screen name="Pharmacy" component={Pharmacy} />
        <Stack.Screen name="PharmacyPatientsTab" component={PharmacyPatientsTab} />
        <Stack.Screen name="PharmacyMedicinesTab" component={PharmacyMedicinesTab} />

        <Stack.Screen name="AddClinic" component={AddClinic} options={{ title: "Clinic Management", headerTitleAlign: "center", }}/>
        <Stack.Screen name="Reviews" component={Reviews} options={{ headerShown: false }}/>
        <Stack.Screen name="DoctorDetails" component={DoctorDetails} options={{ title: "Consulting Physician", headerTitleAlign: "center", }}/>
        <Stack.Screen name="PatientDetails" component={PatientDetails} options={{ title: "Patient Details", headerTitleAlign: "center", }}/>
        <Stack.Screen name="Vitals" component={Vitals} options={{ title: "Vitals & Investigation", headerTitleAlign: "center", }}/>
        <Stack.Screen name="DiagnosisMedication" component={DiagnosisMedication} options={{ title: "Diagnosis & Medication", headerTitleAlign: "center", }}/>
        <Stack.Screen name="AdviceFollowup" component={AdviceFollowup} options={{ title: "Advice & Followup", headerTitleAlign: "center", }}/>
        <Stack.Screen name="PrescriptionPreview" component={PrescriptionPreview} options={{ title: "Prescription Preview", headerTitleAlign: "center", }}/>
        <Stack.Screen name="Profile" component={Profile} options={{ title: "Profile", headerTitleAlign: "center", }}/>
        <Stack.Screen name="PreviousPrescription" component={PreviousPrescription} options={{ title: "Previous Prescription", headerTitleAlign: "center", }}/>
        <Stack.Screen name="EPrescriptionList" component={EPrescriptionList} options={{ title: "E-Prescriptions", headerTitleAlign: "center", }}/>


      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Routing