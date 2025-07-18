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
import Accounts from "../components/Dashboard/Accounts";
import Clinic from "../components/Dashboard/Clinic";
import AddClinic from "../components/Dashboard/AddClinic";
import Reviews from "../components/Dashboard/Reviews";
// import Appointments from "../components/appointments/appointments";
// import MyPatient from "../components/Dashboard/MyPatient";

const Stack = createNativeStackNavigator<RootStackParamList>();

const Routing = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
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
        <Stack.Screen name="AddAppointment" component={AddAppointment} options={{ headerShown: false }} />
        <Stack.Screen name="Availability" component={Availability} />
        <Stack.Screen name="StaffManagement" component={StaffManagement} />
        <Stack.Screen name="AddStaff" component={AddStaffScreen} />
        <Stack.Screen name="MyPatient" component={MyPatient} />
        <Stack.Screen name="Appointments" component={Appointments} />
        {/* <Stack.Screen name="Dashboard" component={dashboard} /> */}
        <Stack.Screen name="Accounts" component={Accounts} />
        <Stack.Screen name="Clinic" component={Clinic} />
        <Stack.Screen name="AddClinic" component={AddClinic} />
        <Stack.Screen name="Reviews" component={Reviews} options={{ headerShown: false }}/>







      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Routing