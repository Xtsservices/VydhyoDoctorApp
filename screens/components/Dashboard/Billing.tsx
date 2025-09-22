import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import { AuthFetch, AuthPost } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNHTMLtoPDF from "react-native-html-to-pdf";

type RootState = any;

type RawAppointment = {
  appointmentId: string;
  appointmentType?: string;
  addressId?: string;
  createdAt?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  feeDetails?: { finalAmount?: number; paidAt?: string };
};

type RawTest = {
  _id?: string;
  testId?: string;
  labTestID?: string;
  testName?: string;
  status?: string;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
};

type RawMedicine = {
  medicineId?: string;
  pharmacyMedID?: string;
  medName?: string;
  name?: string;
  dosage?: string;
  quantity?: number;
  price?: number;
  gst?: number;
  cgst?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  pharmacyDetails?: any;
};

type RawPatient = {
  patientId: string;
  firstname?: string;
  lastname?: string;
  gender?: string;
  age?: number;
  DOB?: string;
  mobile?: string;
  bloodgroup?: string;
  appointments?: RawAppointment[];
  tests?: RawTest[];
  medicines?: RawMedicine[];
  labDetails?: any;
  pharmacyDetails?: any;
  prescriptionId?: string;
  prescriptionCreatedAt?: string;
  addresses?: any[];
};

type TransformedAppointment = {
  id: string;
  appointmentId: string;
  appointmentType?: string;
  appointmentFees: number;
  addressId?: string;
  updatedAt: string;
  clinicName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  clinicHeaderUrl: string;
  feeDetails?: { finalAmount?: number; paidAt?: string };
};

type TransformedTest = {
  id: string;
  testId?: string;
  labTestID?: string;
  name?: string;
  price: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  createdDate: string;
  updatedDate: string;
};

type TransformedMedicine = {
  id: string;
  medicineId?: string;
  pharmacyMedID?: string;
  name?: string;
  dosage?: string;
  quantity: number;
  price: number;
  gst: number;
  cgst: number;
  updatedAt?: string;
  status: string;
  createdDate: string;
};

type TransformedPatient = {
  id: number;
  patientId: string;
  name: string;
  firstname?: string;
  lastname?: string;
  age: string | number;
  gender?: string;
  mobile: string;
  bloodgroup: string;
  prescriptionId?: string;
  prescriptionCreatedAt?: string;
  appointmentDetails: TransformedAppointment[];
  tests: TransformedTest[];
  medicines: TransformedMedicine[];
  totalTestAmount: number;
  totalMedicineAmount: number;
  totalAppointmentFees: number;
  grandTotal: number;
  labDetails?: any;
  pharmacyDetails?: any;
  appointments?: any[];
};

const currency = (n: number | undefined | null) =>
  typeof n === "number" ? n.toFixed(2) : "0.00";

const calculateAge = (dob?: string) => {
  if (!dob) return "N/A";
  try {
    const [day, month, year] = dob.split("-").map(Number);
    const dobDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) age--;
    return age >= 0 ? age : "N/A";
  } catch {
    return "N/A";
  }
};

const transformPatientData = (result: RawPatient[], user: any): TransformedPatient[] => {
  if (!user || !result) return [];
  return result.map((patient, index) => {
    const appointments = Array.isArray(patient.appointments) ? patient.appointments : [];
    const tests = Array.isArray(patient.tests) ? patient.tests : [];
    const medicines = Array.isArray(patient.medicines) ? patient.medicines : [];
    const formatTime12Hour = (time24: string) => {
      if (!time24) return "N/A";
      try {
        const [hours, minutes] = time24.split(":");
        const hourNum = parseInt(hours, 10);
        const period = hourNum >= 12 ? "PM" : "AM";
        const hour12 = hourNum % 12 || 12;
        return `${hour12}:${minutes || "00"} ${period}`;
      } catch {
        return time24;
      }
    };

    const appointmentDetails: TransformedAppointment[] = appointments.map((appointment, idx) => {
      const addr = appointment.addressId
        ? (user?.addresses || []).find((a: any) => a.addressId === appointment.addressId)
        : undefined;
      return {
        id: `A${index}${idx}`,
        appointmentId: appointment.appointmentId,
        appointmentType: appointment.appointmentType,
        appointmentFees: appointment?.feeDetails?.finalAmount || 0,
        addressId: appointment.addressId,
        feeDetails: appointment.feeDetails,
        updatedAt: appointment.createdAt
          ? new Date(appointment.createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",
        clinicName: addr?.clinicName || "N/A",
        appointmentDate: appointment.appointmentDate
          ? new Date(appointment.appointmentDate)
              .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
              .replace(/(\w+) (\d+), (\d+)/, "$2-$1-$3")
          : "N/A",
        appointmentTime: formatTime12Hour(appointment.appointmentTime) || "N/A",
        status: "Completed",
        clinicHeaderUrl: addr?.headerImage || "N/A",
      };
    });

    const totalTestAmount = tests.reduce((sum, t) => sum + (t?.price || 0), 0);
    const totalMedicineAmount = medicines.reduce(
      (sum, m) => sum + ((m?.price || 0) * (m?.quantity || 0)),
      0
    );
    const totalAppointmentFees = appointmentDetails.reduce(
      (sum, a) => sum + (a?.appointmentFees || 0),
      0
    );

    return {
      id: index + 1,
      patientId: patient.patientId,
      name: `${patient.firstname || ""} ${patient.lastname || ""}`.trim(),
      firstname: patient.firstname,
      lastname: patient.lastname,
      age: patient?.age ?? calculateAge(patient.DOB),
      gender: patient.gender,
      mobile: patient.mobile || "Not Provided",
      bloodgroup: patient.bloodgroup || "Not Specified",
      prescriptionId: patient.prescriptionId,
      prescriptionCreatedAt: patient.prescriptionCreatedAt
        ? (() => {
            const date = new Date(patient.prescriptionCreatedAt);
            const day = date.getDate();
            const month = date.toLocaleString("en-US", { month: "short" });
            const year = date.getFullYear();
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? "PM" : "AM";
            const formattedHours = hours % 12 || 12;
            const formattedMinutes = minutes.toString().padStart(2, "0");
            return `${day}-${month}-${year} ${formattedHours}:${formattedMinutes} ${ampm}`;
          })()
        : "N/A",
      appointmentDetails,
      tests: tests.map((test, idx) => ({
        id: `T${index}${idx}`,
        testId: test.testId,
        labTestID: test.labTestID,
        name: test.testName,
        price: test?.price || 0,
        status: test.status
          ? test.status.charAt(0).toUpperCase() + test.status.slice(1)
          : "Unknown",
        createdAt: test.createdAt,
        updatedAt: test.updatedAt,
        createdDate: test.createdAt
          ? new Date(test.createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",
        updatedDate: test.updatedAt
          ? new Date(test.updatedAt).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",
      })),
      medicines: medicines.map((med, idx) => ({
        id: `M${index}${idx}`,
        medicineId: med.medicineId,
        pharmacyMedID: med.pharmacyMedID,
        name: med.name || med.medName,
        dosage: med.dosage,
        quantity: med.quantity || 1,
        price: med.price || 0,
        gst: med.gst || 0,
        cgst: med.cgst || 0,
        updatedAt: med.updatedAt,
        status: med.status
          ? med.status.charAt(0).toUpperCase() + med.status.slice(1)
          : "Unknown",
        createdDate: med.createdAt
          ? new Date(med.createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",
      })),
      totalTestAmount,
      totalMedicineAmount,
      totalAppointmentFees,
      grandTotal: totalTestAmount + totalMedicineAmount + totalAppointmentFees,
      labDetails: patient.labDetails || {},
      pharmacyDetails:
        patient.pharmacyDetails ||
        (patient.medicines && patient.medicines[0]?.pharmacyDetails) ||
        {},
      appointments: patient.appointments || [],
    };
  });
};

const isCompletedLike = (s?: string) => {
  const v = String(s || "").toLowerCase();
  return v === "completed" || v === "complete" || v === "paid";
};

const Billing: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const doctorId = user?.role === "doctor" ? user?.userId : user?.createdBy;

  const [patientsRaw, setPatientsRaw] = useState<RawPatient[]>([]);
  const transformedPatients = useMemo(() => transformPatientData(patientsRaw, user), [patientsRaw, user]);

  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
    totalItems: 0,
  });

  const [viewModePatientId, setViewModePatientId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [isPaymentInProgress, setIsPaymentInProgress] = useState<Record<string, boolean>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"pharmacy" | "lab" | "appointment" | "">("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalPatientId, setModalPatientId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm.trim() === "" || searchTerm.trim().length >= 2) {
        setDebouncedSearch(searchTerm.trim());
      }
    }, 450);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchPatients = useCallback(
    async (page = 1, pageSize = 5, search = "") => {
      if (!user || !doctorId) {
        setError("User or doctor ID not available");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          doctorId,
          page: String(page),
          limit: String(pageSize),
        });
        if (search) query.append("search", search);
        const token = await AsyncStorage.getItem("authToken");
        const res = await AuthFetch(`receptionist/fetchMyDoctorPatients/${doctorId}?${query.toString()}`, token);

        const ok = res?.status === "success" || res?.data?.status === "success";
        const payload = res?.data?.data || res?.data;
        const paginationInfo = res?.data?.pagination || {};

        if (ok && payload) {
          setPatientsRaw(payload);
          setPagination({
            current: page,
            pageSize,
            total: paginationInfo?.totalPages || 0,
            totalItems: paginationInfo?.totalItems || 0,
          });
        } else {
          throw new Error("API response unsuccessful");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to fetch patient data.");
      } finally {
        setLoading(false);
      }
    },
    [doctorId, user]
  );

  const fetchPatientsWithoutLoading = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize, search = debouncedSearch) => {
      if (!user || !doctorId) return;
      try {
        const query = new URLSearchParams({
          doctorId,
          page: String(page),
          limit: String(pageSize),
        });
        if (search) query.append("search", search);
        const token = await AsyncStorage.getItem("authToken");
        const res = await AuthFetch(`receptionist/fetchMyDoctorPatients/${doctorId}?${query.toString()}`, token);
        const ok = res?.status === "success" || res?.data?.status === "success";
        const payload = res?.data?.data || res?.data;
        const paginationInfo = res?.data?.pagination || {};
        if (ok && payload) {
          setPatientsRaw(payload);
          setPagination({
            current: page,
            pageSize,
            total: paginationInfo?.totalPages || 0,
            totalItems: paginationInfo?.totalItems || 0,
          });
        }
      } catch {
        // silent
      }
    },
    [doctorId, user, pagination.current, pagination.pageSize, debouncedSearch]
  );

  useEffect(() => {
    if (user && doctorId) fetchPatients(1, pagination.pageSize, debouncedSearch);
  }, [user, doctorId, fetchPatients, debouncedSearch]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, current: page }));
    fetchPatients(page, pagination.pageSize, debouncedSearch);
  };

  const handleViewClick = async (patientKeyId: number) => {
    const isCurrentlyExpanded = viewModePatientId === patientKeyId;
    setViewModePatientId(isCurrentlyExpanded ? null : patientKeyId);

    if (isCurrentlyExpanded) {
      setExpandedSections((prev) => {
        const newState = { ...prev };
        delete newState[`${patientKeyId}-pharmacy`];
        delete newState[`${patientKeyId}-labs`];
        delete newState[`${patientKeyId}-appointments`];
        return newState;
      });
      return;
    }

    const patient = transformedPatients.find((p) => p.id === patientKeyId);
    if (!patient) {
      Toast.show({ type: "error", text1: "Patient not found." });
      return;
    }

    setLoadingPatients((prev) => ({ ...prev, [patientKeyId]: true }));
    try {
      const prescriptionId = patient.prescriptionId;
      const token = await AsyncStorage.getItem("authToken");

      const res = await AuthFetch(
        `receptionist/fetchDoctorPatientDetails/${doctorId}/${patient.patientId}/${prescriptionId}`,
        token
      );

      const ok = res?.status === "success" || res?.data?.status === "success";
      const arr = res?.data?.data || [];
      if (ok && Array.isArray(arr) && arr.length > 0) {
        const detailed = arr[0] as RawPatient;
        setPatientsRaw((prev) =>
          prev.map((p) => (p.patientId === patient.patientId ? { ...p, ...detailed } : p))
        );

        setExpandedSections((prev) => ({
          ...prev,
          [`${patientKeyId}-pharmacy`]: detailed.medicines && detailed.medicines.length > 0,
          [`${patientKeyId}-labs`]: detailed.tests && detailed.tests.length > 0,
          [`${patientKeyId}-appointments`]: detailed.appointments && detailed.appointments.length > 0,
        }));
      } else {
        throw new Error("No detailed patient data found.");
      }
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.message || "Failed to load details." });
      setExpandedSections((prev) => ({
        ...prev,
        [`${patientKeyId}-pharmacy`]: patient.medicines.length > 0,
        [`${patientKeyId}-labs`]: patient.tests.length > 0,
        [`${patientKeyId}-appointments`]: patient.appointmentDetails.length > 0,
      }));
    } finally {
      setLoadingPatients((prev) => ({ ...prev, [patientKeyId]: false }));
    }
  };

  const handleSectionExpand = (patientKeyId: number, section: "pharmacy" | "labs" | "appointments") => {
    const key = `${patientKeyId}-${section}`;
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sectionTotals = (p: TransformedPatient) => {
    const medicineTotal = (p.medicines || []).reduce(
      (sum, m) =>
        sum + (String(m.status || "").toLowerCase() === "pending" && m.price ? m.quantity * m.price : 0),
      0
    );
    const testTotal = (p.tests || []).reduce(
      (sum, t) => sum + (String(t.status || "").toLowerCase() === "pending" && t.price ? t.price : 0),
      0
    );
    const appointmentTotal = (p.appointmentDetails || []).reduce(
      (sum, a: any) =>
        sum + (String(a.status || "").toLowerCase() === "pending" && a.appointmentFees ? a.appointmentFees : 0),
      0
    );
    return { medicineTotal, testTotal, appointmentTotal };
  };

  const applyOptimisticPayment = (p: TransformedPatient, type: "pharmacy" | "labs" | "all") => {
    setPatientsRaw((prev) =>
      prev.map((raw) => {
        if (raw.patientId !== p.patientId) return raw;
        const updated: RawPatient = { ...raw };

        if (type === "pharmacy" || type === "all") {
          updated.medicines = (updated.medicines || []).map((m) =>
            String(m.status || "").toLowerCase() === "pending" && (m.price || 0) > 0
              ? { ...m, status: "completed", updatedAt: new Date().toISOString() }
              : m
          );
        }
        if (type === "labs" || type === "all") {
          updated.tests = (updated.tests || []).map((t) =>
            String(t.status || "").toLowerCase() === "pending" && (t.price || 0) > 0
              ? { ...t, status: "completed", updatedAt: new Date().toISOString() }
              : t
          );
        }
        return updated;
      })
    );
  };

  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<string, Record<"pharmacy" | "labs", "cash" | "upi" | null>>>({});
  const [showUpiQrs, setShowUpiQrs] = useState<Record<string, Record<"pharmacy" | "labs", boolean>>>({});
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [currentPatientIdForQr, setCurrentPatientIdForQr] = useState<string | null>(null);
  const [currentTypeForQr, setCurrentTypeForQr] = useState<"pharmacy" | "labs" | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const handlePaymentMethodSelect = async (patientId: string, type: "pharmacy" | "labs", method: "cash" | "upi") => {
    setSelectedPaymentMethods((prev) => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [type]: method,
      },
    }));

    if (method === "upi") {
      setCurrentPatientIdForQr(patientId);
      setCurrentTypeForQr(type);

      const patient = transformedPatients.find((p) => p.patientId === patientId);
      const appt0 = patient?.appointments?.[0];
      const addressId = appt0?.addressId;

      if (!addressId) {
        Toast.show({
          type: "error",
          text1: "No clinic address found for QR code",
        });
        setSelectedPaymentMethods((prev) => ({
          ...prev,
          [patientId]: {
            ...prev[patientId],
            [type]: null,
          },
        }));
        return;
      }

      const success = await fetchQRCode(addressId, type);
      if (success) {
        setShowUpiQrs((prev) => ({
          ...prev,
          [patientId]: {
            ...prev[patientId],
            [type]: true,
          },
        }));
        setQrModalVisible(true);
      } else {
        setSelectedPaymentMethods((prev) => ({
          ...prev,
          [patientId]: {
            ...prev[patientId],
            [type]: null,
          },
        }));
      }
    } else {
      setShowUpiQrs((prev) => ({
        ...prev,
        [patientId]: {
          ...prev[patientId],
          [type]: false,
        },
      }));
    }
  };

  const fetchQRCode = async (addressId: string, type: "pharmacy" | "labs") => {
    try {
      setQrLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await AuthFetch(`users/getClinicsQRCode/${addressId}?userId=${doctorId}`, token);

      if (res?.data?.status === "success" && res?.data?.data) {
        const qrCodeUrl = type === "labs" ? res.data.data.labQrCode : res.data.data.pharmacyQrCode || res.data.data.qrCodeUrl;
        if (qrCodeUrl) {
          setQrCodeImage(qrCodeUrl);
          return true;
        } else {
          Toast.show({
            type: "error",
            text1: "QR code not available",
          });
          return false;
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Failed to fetch QR code",
        });
        return false;
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Failed to fetch QR code",
      });
      return false;
    } finally {
      setQrLoading(false);
    }
  };

  const handleUpiPaymentConfirm = (patientId: string, type: "pharmacy" | "labs") => {
    setQrModalVisible(false);
    setShowUpiQrs((prev) => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [type]: false,
      },
    }));
    handlePayment(
      transformedPatients.find((p) => p.patientId === patientId)?.id || 0,
      type,
      "upi"
    );
  };

  const handlePayment = async (patientKeyId: number, type: "pharmacy" | "labs" | "all", method: "cash" | "upi") => {
    const key = `${patientKeyId}-${type}`;
    if (isPaymentInProgress[key]) return;

    const p = transformedPatients.find((x) => x.id === patientKeyId);
    if (!p) return;

    const markPending = (s?: string) => String(s || "").toLowerCase() === "pending";
    const pendingTests =
      type === "labs" || type === "all" ? (p.tests || []).filter((t) => markPending(t.status)) : [];
    const pendingMeds =
      type === "pharmacy" || type === "all" ? (p.medicines || []).filter((m) => markPending(m.status)) : [];

    if (pendingTests.length === 0 && pendingMeds.length === 0) {
      Toast.show({ type: "error", text1: `No pending ${type === "all" ? "items" : type} to pay for.` });
      return;
    }

    const payload = {
      patientId: p.patientId,
      doctorId,
      tests: pendingTests
        .filter((t) => Number(t.price) > 0)
        .map((t) => ({ testId: t.testId, labTestID: t.labTestID, status: "pending", price: t.price })),
      medicines: pendingMeds
        .filter((m) => Number(m.price) > 0)
        .map((m) => ({
          medicineId: m.medicineId,
          pharmacyMedID: m.pharmacyMedID,
          quantity: m.quantity,
          status: "pending",
          price: m.price,
        })),
      paymentMethod: method,
    };

    if (payload.tests.length === 0 && payload.medicines.length === 0) {
      Toast.show({ type: "error", text1: "At least one test or medicine must be provided." });
      return;
    }

    try {
      setIsPaymentInProgress((prev) => ({ ...prev, [key]: true }));

      const token = await AsyncStorage.getItem("authToken");
      const res = await AuthPost("receptionist/totalBillPayFromReception", payload, token);
      const ok = res?.data?.status === "success" || res?.status === "success";

      if (ok) {
        applyOptimisticPayment(p, type);
        Toast.show({ type: "success", text1: "Payment processed successfully." });
        fetchPatientsWithoutLoading();
        setSelectedPaymentMethods((prev) => ({
          ...prev,
          [p.patientId]: {
            ...prev[p.patientId],
            [type]: null,
          },
        }));
        setShowUpiQrs((prev) => ({
          ...prev,
          [p.patientId]: {
            ...prev[p.patientId],
            [type]: false,
          },
        }));
      } else {
        throw new Error("Failed to process payment");
      }
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.message || "Failed to process payment." });
      setSelectedPaymentMethods((prev) => ({
        ...prev,
        [p.patientId]: {
          ...prev[p.patientId],
          [type]: null,
        },
      }));
    } finally {
      setIsPaymentInProgress((prev) => ({ ...prev, [key]: false }));
    }
  };

   const showMissingDetailsModal = (which: "pharmacy" | "lab" | "appointment", patientKeyId: number, clinicName: string) => {
    setModalType(which);
    setModalPatientId(patientKeyId);
    const subject = which === "pharmacy" ? "Pharmacy" : which === "lab" ? "Lab" : "Clinic";
    setModalMessage(`Please go to Clinic Management and add the ${subject.toLowerCase()} details for the clinic "${clinicName}".`);
    setModalOpen(true);
  };

  const isCompleted = (s?: string) => {
    const v = String(s || "").toLowerCase();
    return v === "completed" || v === "complete" || v === "paid";
  };

  const buildInvoiceHTML = (
    type: "pharmacy" | "labs" | "appointments",
    patient: TransformedPatient,
    userObj: any
  ) => {
    let itemDate = "N/A";
    let sectionHTML = "";
    let total = 0;
    let headerUrl = "";
    let providerName = "N/A";
    let contactInfoHTML = "";

    const patientNumber = String(patient.patientId || "").replace(/\D/g, "");
    const invoiceNumber = `INV-${patientNumber.padStart(3, "0")}`;

    if (type === "pharmacy") {
      const completedMeds = (patient.medicines || []).filter((m) => isCompleted(m.status));
      if (!completedMeds.length) {
        Toast.show({ type: "error", text1: "No completed medicines to download." });
        return null;
      }
      const firstMed = completedMeds[0];
      itemDate = firstMed.updatedAt
        ? new Date(firstMed.updatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "N/A";

      const pharmacyDetails = patient.pharmacyDetails || {};
      const isPharmEmpty =
        !pharmacyDetails || Object.keys(pharmacyDetails).length === 0 ||
        (!pharmacyDetails.pharmacyName && !pharmacyDetails.pharmacyAddress);

      if (isPharmEmpty) {
        const appt0 = (patient.appointments || [])[0];
        const clinicName = appt0?.addressId
          ? (userObj?.addresses || []).find((a: any) => a.addressId === appt0.addressId)?.clinicName
          : "this clinic";
      }

      headerUrl = pharmacyDetails.pharmacyHeaderUrl || "";
      providerName = pharmacyDetails.pharmacyName || "N/A";
      contactInfoHTML = `
        <div class="provider-name">${providerName}</div>
        <p>${pharmacyDetails.pharmacyAddress || "N/A"}</p>
        <p>GST: ${pharmacyDetails.pharmacyGst || "N/A"}</p>
        <p>PAN: ${pharmacyDetails.pharmacyPan || "N/A"}</p>
        <p>Registration No: ${pharmacyDetails.pharmacyRegistrationNo || "N/A"}</p>
      `;

      total = completedMeds.reduce(
        (sum, m) => sum + (Number(m.price) || 0) * (Number(m.quantity) || 0),
        0
      );

      sectionHTML = `
        <div class="section compact-spacing">
          <h3 class="section-title">Medicines</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>SL No.</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Unit Price (₹)</th>
                <th>Subtotal (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${completedMeds
                .map(
                  (med, idx) => `
                <tr>
                  <td>${idx + 1}.</td>
                  <td>${(med.name || "")}${med.dosage ? ` ${med.dosage}` : ""}</td>
                  <td>${med.quantity}</td>
                  <td>${Number(med.price || 0).toFixed(2)}</td>
                  <td>${((Number(med.price) || 0) * (Number(med.quantity) || 0)).toFixed(2)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="section-total" style="display:flex;justify-content:space-between;align-items:center;">
            <p class="gst-text" style="margin:0;font-size:13px;">GST included</p>
            <p class="total-text" style="margin:0;">Medicine Total: ₹${total.toFixed(2)}</p>
          </div>
        </div>`;
    } else if (type === "labs") {
      const completedTests = (patient.tests || []).filter((t) => isCompleted(t.status));
      if (!completedTests.length) {
        Toast.show({ type: "error", text1: "No completed tests to download." });
        return null;
      }
      const firstTest = completedTests[0];
      itemDate = firstTest.updatedAt
        ? new Date(firstTest.updatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "N/A";

      const labDetails = patient.labDetails || {};
       const isLabEmpty =
        !labDetails ||
        Object.keys(labDetails).length === 0 ||
        Object.values(labDetails).every((v) => v == null);

      if (isLabEmpty) {
        const appt0 = (patient.appointments || [])[0];
        const clinicName = appt0?.addressId
          ? (userObj?.addresses || []).find((a: any) => a.addressId === appt0.addressId)?.clinicName
          : "this clinic";
      }

      headerUrl = labDetails.labHeaderUrl || "";
      providerName = labDetails.labName || "N/A";
      contactInfoHTML = `
        <div class="provider-name">${providerName}</div>
        <p>${labDetails.labAddress || "N/A"}</p>
        <p>GST: ${labDetails.labGst || "N/A"}</p>
        <p>PAN: ${labDetails.labPan || "N/A"}</p>
        <p>Registration No: ${labDetails.labRegistrationNo || "N/A"}</p>
      `;

      total = completedTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);

      sectionHTML = `
        <div class="section compact-spacing">
          <h3 class="section-title">Tests</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>SL No.</th>
                <th>Name</th>
                <th>Price (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${completedTests
                .map(
                  (t, idx) => `
                <tr>
                  <td>${idx + 1}.</td>
                  <td>${t.name || ""}</td>
                  <td class="price-column">${Number(t.price || 0).toFixed(2)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="section-total">
            <p class="total-text">Test Total: ₹${total.toFixed(2)}</p>
          </div>
        </div>`;
    } else {
      const appts = patient.appointmentDetails || [];
      const completed = appts.filter((a: any) => isCompleted(a?.status));
      const firstAppt = completed[0] || appts[0];
      if (!firstAppt) {
        Toast.show({ type: "error", text1: "No appointment to download." });
        return null;
      }
      const addr =
        (userObj?.addresses || []).find((a: any) => a.addressId === firstAppt.addressId) || {};
         const isAddrEmpty =
        !addr || Object.keys(addr).length === 0 || Object.values(addr).every((v: any) => v == null);
      if (isAddrEmpty) {
        const appt0 = (patient.appointments || [])[0];
        const clinicName =
          appt0?.addressId
            ? (userObj?.addresses || []).find((a: any) => a.addressId === appt0.addressId)?.clinicName
            : "this clinic";
      }
      
      headerUrl = addr.headerImage || "";
      providerName = firstAppt.clinicName || addr.clinicName || "N/A";
      contactInfoHTML = `
        <div class="provider-name">Name: ${providerName}</div>
        <p>${addr.address || "N/A"}</p>
        <p>${addr.city || "N/A"}, ${addr.state || "N/A"} ${addr.pincode || "N/A"}</p>
        <p>Phone: ${addr.mobile || "N/A"}</p>
      `;

      const totalFromFees = firstAppt?.feeDetails?.finalAmount || 0;
      total = totalFromFees;

      itemDate = firstAppt?.feeDetails?.paidAt
        ? new Date(firstAppt.feeDetails.paidAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "N/A";

      sectionHTML = `
        <div class="section compact-spacing">
          <h3 class="section-title">Appointments</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>SL No.</th>
                <th>Service</th>
                <th>Total Amount</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${((patient.appointments as any[]) || [])
                .map((appt: any, idx: number) => {
                  const amt = totalFromFees;
                  return `
                    <tr>
                      <td>${idx + 1}.</td>
                      <td>Consultation Bill</td>
                      <td class="price-column">${Number(amt || 0).toFixed(2)}</td>
                      <td>${appt?.appointmentType || ""}</td>
                    </tr>`;
                })
                .join("")}
            </tbody>
          </table>
          <div class="section-total">
            <p class="total-text">Appointment Total: ₹${total.toFixed(2)}</p>
          </div>
        </div>`;
    }

    const headerSectionHTML = headerUrl
      ? `<div class="invoice-header-image-only"><img src="${headerUrl}" alt="Header" /></div>`
      : "";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Invoice</title>
<style>
  html, body { margin:0; padding:0; font-family: Arial, sans-serif; background:#fff; font-size:14px; }
  .invoice-container { padding: 15px; max-width: 800px; margin: 0 auto; display:flex; flex-direction:column; }
  .invoice-content { flex:1; }
  .invoice-header-image-only img { width:100%; height:auto; max-height:220px; object-fit:contain; }
  .provider-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 6px; }
  .section { margin: 16px 0; }
  .section-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; }
  .patient-info { display:flex; justify-content:space-between; background:#f8f9fa; padding:12px; border-radius:5px; }
  .data-table { width:100%; border-collapse: collapse; }
  .data-table th, .data-table td { border:1px solid #ddd; padding:8px; text-align:left; }
  .data-table th { background:#f8f9fa; }
  .price-column { text-align:right; }
  .section-total { text-align:right; margin-top:8px; }
  .total-text { font-weight: bold; font-size: 14px; color:#333; }
  .grand-total-section { margin-top: 16px; padding: 12px; background:#f8f9fa; border-radius:5px; }
  .grand-total-row { display:flex; justify-content:space-between; font-size:16px; font-weight:bold; color:#333; border-top:2px solid #333; padding-top:8px; margin-top:10px; }
  .compact-spacing { margin-bottom: 15px; }
  .footer { text-align:center; color:#666; margin-top: 16px; }
</style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-content">
      ${headerSectionHTML || `<div class="provider-details">${contactInfoHTML}</div>`}
      <div class="section compact-spacing">
        <h3 class="section-title">Patient Information</h3>
        <div class="patient-info">
          <div>
            <p><strong>Patient ID:</strong> ${patient.patientId}</p>
            <p><strong>First Name:</strong> ${patient.firstname || ""}</p>
            <p><strong>Last Name:</strong> ${patient.lastname || ""}</p>
            <p><strong>Mobile:</strong> ${patient.mobile}</p>
          </div>
          <div>
            <p><strong>Age:</strong> ${patient.age}</p>
            <p><strong>Gender:</strong> ${patient.gender || ""}</p>
            <p><strong>Referred by Dr.</strong> ${userObj?.firstname || "N/A"} ${userObj?.lastname || "N/A"}</p>
            <p><strong>Date Time:</strong> ${itemDate}</p>
            <div><strong>Invoice No:</strong> #${invoiceNumber}</div>
          </div>
        </div>
      </div>
      ${sectionHTML}
      <div class="grand-total-section">
        <div class="grand-total-row">
          <span>Grand Total:</span>
          <span>₹${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Thank you for choosing Vydhyo</p>
      <p>Powered by Vydhyo</p>
    </div>
  </div>
</body>
</html>`;
    return html;
  };

  const generateAndSavePDF = async (filenameBase: string, html: string) => {
    try {
      const fileName = filenameBase.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const options = {
        html,
        fileName,
        directory: Platform.OS === "android" ? "Download" : "Documents",
        base64: false,
      };
      const result = await RNHTMLtoPDF.convert(options);
      if (result?.filePath) {
        Toast.show({ type: "success", text1: "Invoice saved (PDF)", text2: result.filePath });
        return result.filePath;
      } else {
        throw new Error("No file path returned.");
      }
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Failed to save PDF", text2: e?.message || "" });
      return null;
    }
  };

  const handleDownloadInvoice = async (
    type: "pharmacy" | "labs" | "appointments",
    patientId: string
  ) => {
    const p = transformedPatients.find((x) => x.patientId === patientId);
    if (!p) return;
    const html = buildInvoiceHTML(type, p, user);
    if (!html) return;

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const base =
      type === "pharmacy" ? "Pharmacy"
        : type === "labs" ? "Lab"
          : "Consultation";

    const filenameBase = `Invoice_${base}_${p.patientId}_${ts}`;
    await generateAndSavePDF(filenameBase, html);
  };

  if (loading && !error) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: "#000000" }}>Loading patients...</Text>
      </View>
    );
  }

  if (!user || !doctorId) {
    return (
      <View style={styles.centerFill}>
        <Text style={{ color: "#374151" }}>Waiting for user data to load...</Text>
      </View>
    );
  }

  const renderSectionHeader = (color: string, emoji: string, title: string) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.iconSquare, { backgroundColor: color }]}>
        <Text style={{ color: "#fff", fontSize: 16 }}>{emoji}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const Chip = ({ label, value }: { label: string; value?: string | number }) => (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}:</Text>
      <Text style={styles.chipValue}>{String(value ?? "-")}</Text>
    </View>
  );

  const SectionPill = ({ text, tone }: { text: string; tone: "pending" | "done" | "danger" }) => {
    const style =
      tone === "pending" ? styles.pillPending : tone === "done" ? styles.pillDone : styles.pillDanger;
    return <Text style={[styles.statusPill, style]}>{text}</Text>;
  };

  const renderPatient = ({ item }: { item: TransformedPatient }) => {
    const totals = sectionTotals(item);
    const isViewMode = viewModePatientId === item.id;

    const hasCompletedPharmacy = item.medicines.some((m) => isCompletedLike(m.status));
    const hasCompletedLab = item.tests.some((t) => isCompletedLike(t.status));
    const appointmentDownloadDisabled = (item.appointmentDetails || []).length === 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name || "Unknown Patient"}</Text>
          <View style={styles.badgeRow}>
            <Chip label="Patient ID" value={item.patientId} />
            <Chip label="Last Visit" value={item.prescriptionCreatedAt || "-"} />
          </View>
          <View style={styles.badgeRow}>
            <Chip label="Age" value={String(item.age)} />
            <Chip label="Gender" value={item.gender || "-"} />
            <Chip label="Mobile" value={item.mobile || "-"} />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: loadingPatients[item.id] ? "#ffffff" : "#007bff" }]}
              disabled={loadingPatients[item.id]}
              onPress={() => handleViewClick(item.id)}
            >
              <Text style={styles.smallButtonText}>
                {loadingPatients[item.id] ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : isViewMode ? (
                  "Hide"
                ) : (
                  "View Details"
                )}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isViewMode && (
          <View style={{ padding: 12, paddingTop: 0 }}>
            {/* Pharmacy */}
            {item.medicines.length > 0 && (
              <View style={styles.sectionCard}>
                <TouchableOpacity onPress={() => handleSectionExpand(item.id, "pharmacy")} style={styles.sectionHeaderRow}>
                  {renderSectionHeader("#3b82f6", "💊", "Pharmacy")}
                  <Text style={styles.expandIcon}>{expandedSections[`${item.id}-pharmacy`] ? "−" : "›"}</Text>
                </TouchableOpacity>

                {expandedSections[`${item.id}-pharmacy`] && (
                  <View style={{ padding: 12, paddingTop: 8 }}>
                    {item.medicines.map((m) => {
                      const tone =
                        String(m.status).toLowerCase() === "pending"
                          ? "pending"
                          : String(m.status).toLowerCase() === "completed"
                            ? "done"
                            : "danger";
                      return (
                        <View key={m.id} style={styles.rowCard}>
                          <View style={styles.rowCardHeader}>
                            <Text style={styles.rowCardTitle}>{m.name} {m.dosage ? `• ${m.dosage}` : ""}</Text>
                            <SectionPill text={m.status} tone={tone as any} />
                          </View>
                          <View style={styles.rowChips}>
                            <Chip label="Qty" value={m.quantity} />
                            <Chip label="Unit (₹)" value={m.price ? currency(m.price) : "N/A"} />
                            <Chip label="SGST" value={m.gst ?? 0} />
                            <Chip label="CGST" value={m.cgst ?? 0} />
                            <Chip label="Created" value={m.createdDate || "-"} />
                            <Chip label="Subtotal (₹)" value={m.price ? currency(m.price * m.quantity) : "N/A"} />
                          </View>
                        </View>
                      );
                    })}

                    {totals.medicineTotal !== 0 && (
                      <View style={styles.balanceRow}>
                        <Text style={styles.balanceLabel}>Balance Amount</Text>
                        <Text style={styles.balanceValue}>₹{currency(totals.medicineTotal)}</Text>
                      </View>
                    )}

                    {totals.medicineTotal > 0 && (
                      <View style={styles.paymentMethodContainer}>
                        <Text style={styles.paymentMethodTitle}>Select Payment Method:</Text>
                        <View style={styles.paymentOptions}>
                          <TouchableOpacity
                            style={styles.paymentOption}
                            onPress={() => handlePaymentMethodSelect(item.patientId, "pharmacy", 'cash')}
                          >
                            <View style={styles.radioButton}>
                              {selectedPaymentMethods[item.patientId]?.pharmacy === 'cash' && <View style={styles.radioButtonSelected} />}
                            </View>
                            <Text style={styles.paymentOptionText}>Cash</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.paymentOption}
                            onPress={() => handlePaymentMethodSelect(item.patientId, "pharmacy", 'upi')}
                          >
                            <View style={styles.radioButton}>
                              {selectedPaymentMethods[item.patientId]?.pharmacy === 'upi' && <View style={styles.radioButtonSelected} />}
                            </View>
                            <Text style={styles.paymentOptionText}>UPI</Text>
                          </TouchableOpacity>
                        </View>
                        {selectedPaymentMethods[item.patientId]?.pharmacy === 'cash' && (
                          <TouchableOpacity
                            style={[styles.confirmButton, isPaymentInProgress[`${item.id}-pharmacy`] && styles.btnDisabled]}
                            disabled={isPaymentInProgress[`${item.id}-pharmacy`]}
                            onPress={() => handlePayment(item.id, "pharmacy", 'cash')}
                          >
                            <Text style={styles.confirmButtonText}>
                              {isPaymentInProgress[`${item.id}-pharmacy`] ? "Processing..." : "Confirm Cash Payment"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.secondary, { opacity: hasCompletedPharmacy ? 1 : 0.6 }]}
                        disabled={!hasCompletedPharmacy}
                        onPress={() => handleDownloadInvoice("pharmacy", item.patientId)}
                      >
                        <Text style={styles.secondaryText}>⬇️ Download Invoice</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.success,
                          {
                            opacity:
                              totals.medicineTotal === 0 || isPaymentInProgress[`${item.id}-pharmacy`] ? 0.6 : 1,
                          },
                        ]}
                        disabled={totals.medicineTotal === 0 || !!isPaymentInProgress[`${item.id}-pharmacy`]}
                        onPress={() => {
                          const method = selectedPaymentMethods[item.patientId]?.pharmacy || "cash";
                          if (!selectedPaymentMethods[item.patientId]?.pharmacy) {
                            setSelectedPaymentMethods((prev) => ({
                              ...prev,
                              [item.patientId]: {
                                ...prev[item.patientId],
                                pharmacy: "cash",
                              },
                            }));
                            handlePaymentMethodSelect(item.patientId, "pharmacy", "cash");
                          }
                          handlePayment(item.id, "pharmacy", method);
                        }}
                      >
                        {isPaymentInProgress[`${item.id}-pharmacy`] ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.successText}>Pay Pharmacy</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Labs */}
            {item.tests.length > 0 && (
              <View style={styles.sectionCard}>
                <TouchableOpacity onPress={() => handleSectionExpand(item.id, "labs")} style={styles.sectionHeaderRow}>
                  {renderSectionHeader("#10b981", "🧪", "Labs")}
                  <Text style={styles.expandIcon}>{expandedSections[`${item.id}-labs`] ? "−" : "›"}</Text>
                </TouchableOpacity>

                {expandedSections[`${item.id}-labs`] && (
                  <View style={{ padding: 12, paddingTop: 8 }}>
                    {item.tests.map((t) => {
                      const tone =
                        t.status === "Completed" ? "done" : t.status === "Pending" ? "pending" : "danger";
                      return (
                        <View key={t.id} style={styles.rowCard}>
                          <View style={styles.rowCardHeader}>
                            <Text style={styles.rowCardTitle}>{t.name}</Text>
                            <SectionPill text={t.status} tone={tone as any} />
                          </View>
                          <View style={styles.rowChips}>
                            <Chip label="Price (₹)" value={t.price ? currency(t.price) : "N/A"} />
                            <Chip label="Created" value={t.createdDate || "-"} />
                          </View>
                        </View>
                      );
                    })}

                    {totals.testTotal !== 0 && (
                      <View style={styles.balanceRow}>
                        <Text style={styles.balanceLabel}>Balance Amount</Text>
                        <Text style={styles.balanceValue}>₹{currency(totals.testTotal)}</Text>
                      </View>
                    )}

                    {totals.testTotal > 0 && (
                      <View style={styles.paymentMethodContainer}>
                        <Text style={styles.paymentMethodTitle}>Select Payment Method:</Text>
                        <View style={styles.paymentOptions}>
                          <TouchableOpacity
                            style={styles.paymentOption}
                            onPress={() => handlePaymentMethodSelect(item.patientId, "labs", 'cash')}
                          >
                            <View style={styles.radioButton}>
                              {selectedPaymentMethods[item.patientId]?.labs === 'cash' && <View style={styles.radioButtonSelected} />}
                            </View>
                            <Text style={styles.paymentOptionText}>Cash</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.paymentOption}
                            onPress={() => handlePaymentMethodSelect(item.patientId, "labs", 'upi')}
                          >
                            <View style={styles.radioButton}>
                              {selectedPaymentMethods[item.patientId]?.labs === 'upi' && <View style={styles.radioButtonSelected} />}
                            </View>
                            <Text style={styles.paymentOptionText}>UPI</Text>
                          </TouchableOpacity>
                        </View>
                        {selectedPaymentMethods[item.patientId]?.labs === 'cash' && (
                          <TouchableOpacity
                            style={[styles.confirmButton, isPaymentInProgress[`${item.id}-labs`] && styles.btnDisabled]}
                            disabled={isPaymentInProgress[`${item.id}-labs`]}
                            onPress={() => handlePayment(item.id, "labs", 'cash')}
                          >
                            <Text style={styles.confirmButtonText}>
                              {isPaymentInProgress[`${item.id}-labs`] ? "Processing..." : "Confirm Cash Payment"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.secondary, { opacity: hasCompletedLab ? 1 : 0.6 }]}
                        disabled={!hasCompletedLab}
                        onPress={() => handleDownloadInvoice("labs", item.patientId)}
                      >
                        <Text style={styles.secondaryText}>⬇️ Download Invoice</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.success,
                          { opacity: totals.testTotal === 0 || isPaymentInProgress[`${item.id}-labs`] ? 0.6 : 1 },
                        ]}
                        disabled={totals.testTotal === 0 || !!isPaymentInProgress[`${item.id}-labs`]}
                        onPress={() => {
                          const method = selectedPaymentMethods[item.patientId]?.labs || "cash";
                          if (!selectedPaymentMethods[item.patientId]?.labs) {
                            setSelectedPaymentMethods((prev) => ({
                              ...prev,
                              [item.patientId]: {
                                ...prev[item.patientId],
                                labs: "cash",
                              },
                            }));
                            handlePaymentMethodSelect(item.patientId, "labs", "cash");
                          }
                          handlePayment(item.id, "labs", method);
                        }}
                      >
                        {isPaymentInProgress[`${item.id}-labs`] ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.successText}>Pay Labs</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Appointments */}
            {item.appointmentDetails.length > 0 && (
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  onPress={() => handleSectionExpand(item.id, "appointments")}
                  style={styles.sectionHeaderRow}
                >
                  {renderSectionHeader("#8b5cf6", "📅", "Consultation Bill")}
                  <Text style={styles.expandIcon}>{expandedSections[`${item.id}-appointments`] ? "−" : "›"}</Text>
                </TouchableOpacity>

                {expandedSections[`${item.id}-appointments`] && (
                  <View style={{ padding: 12, paddingTop: 8 }}>
                    {item.appointmentDetails.map((a) => (
                      <View key={a.id} style={styles.rowCard}>
                        <View style={styles.rowCardHeader}>
                          <Text style={styles.rowCardTitle}>Consultation • {a.appointmentType || "-"}</Text>
                          <SectionPill
                            text={["Completed", "Paid"].includes(a.status) ? "Completed" : "Pending"}
                            tone={["Completed", "Paid"].includes(a.status) ? "done" : "pending"}
                          />
                        </View>
                        <View style={styles.rowChips}>
                          <Chip label="Appt ID" value={a.appointmentId} />
                          <Chip label="Date" value={a.appointmentDate} />
                          <Chip label="Time" value={a.appointmentTime} />
                          <Chip label="Fees (₹)" value={currency(a.appointmentFees)} />
                        </View>
                      </View>
                    ))}

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.secondary, { opacity: !appointmentDownloadDisabled ? 1 : 0.6 }]}
                        disabled={appointmentDownloadDisabled}
                        onPress={() => handleDownloadInvoice("appointments", item.patientId)}
                      >
                        <Text style={styles.secondaryText}>⬇️ Download Invoice</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const footer = (
    <View style={styles.paginationBar}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <TouchableOpacity
          style={[styles.pagBtn, pagination.current === 1 && styles.pagBtnDisabled]}
          disabled={pagination.current === 1}
          onPress={() => handlePageChange(Math.max(1, pagination.current - 1))}
        >
          <Text style={[styles.pagBtnText, pagination.current === 1 && styles.pagBtnTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => i + 1).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.pageNum, pagination.current === p && styles.pageNumActive]}
            onPress={() => handlePageChange(p)}
          >
            <Text style={[styles.pageNumText, pagination.current === p && styles.pageNumTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}

        {pagination.total > 5 && (
          <>
            <Text style={{ paddingHorizontal: 4 }}>…</Text>
            <TouchableOpacity
              style={[styles.pageNum, pagination.current === pagination.total && styles.pageNumActive]}
              onPress={() => handlePageChange(pagination.total)}
            >
              <Text
                style={[
                  styles.pageNumText,
                  pagination.current === pagination.total && styles.pageNumTextActive,
                ]}
              >
                {pagination.total}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.pagBtn, pagination.current >= pagination.total && styles.pagBtnDisabled]}
          disabled={pagination.current >= pagination.total}
          onPress={() => handlePageChange(Math.min(pagination.total, pagination.current + 1))}
        >
          <Text
            style={[
              styles.pagBtnText,
              pagination.current >= pagination.total && styles.pagBtnTextDisabled,
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <View style={styles.searchInner}>
          <TextInput
            placeholder="Search patient by name or ID"
            placeholderTextColor={"#9ca3af"}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => setDebouncedSearch(searchTerm.trim())}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
      </View>

      <FlatList
        data={transformedPatients}
        keyExtractor={(x) => `${x.id}`}
        renderItem={renderPatient}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListFooterComponent={footer}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No patients found</Text>
              {debouncedSearch && (
                <Text style={styles.emptyStateSubtext}>
                  No results for "{debouncedSearch}"
                </Text>
              )}
            </View>
          )
        }
      />

      <Modal transparent visible={modalOpen} animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modalType === "pharmacy"
                ? "No Pharmacy Details Are Found"
                : modalType === "lab"
                  ? "No Lab Details Are Found"
                  : "No Clinic Details Are Found"}
            </Text>
            <Text style={{ marginBottom: 16, color: "#374151" }}>{modalMessage}</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              <TouchableOpacity style={styles.outlined} onPress={() => setModalOpen(false)}>
                <Text style={styles.outlinedText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primary}
                onPress={() => {
                  setModalOpen(false);
                }}
              >
                <Text style={styles.primaryText}>Go to Clinic Management</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setQrModalVisible(false);
          if (currentPatientIdForQr && currentTypeForQr) {
            setShowUpiQrs((prev) => ({
              ...prev,
              [currentPatientIdForQr]: {
                ...prev[currentPatientIdForQr],
                [currentTypeForQr]: false,
              },
            }));
            setSelectedPaymentMethods((prev) => ({
              ...prev,
              [currentPatientIdForQr]: {
                ...prev[currentPatientIdForQr],
                [currentTypeForQr]: null,
              },
            }));
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.qrText}>Scan QR Code to Pay</Text>
            {qrLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : qrCodeImage ? (
              <Image
                source={{ uri: qrCodeImage }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.errorText}>QR code not available</Text>
            )}
            {currentPatientIdForQr && currentTypeForQr && (
              (() => {
                const patient = transformedPatients.find((p) => p.patientId === currentPatientIdForQr);
                if (patient) {
                  const totals = sectionTotals(patient);
                  const total = currentTypeForQr === "labs" ? totals.testTotal : totals.medicineTotal;
                  return <Text style={styles.upiId}>Total Amount: ₹ {currency(total)}</Text>;
                }
                return null;
              })()
            )}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                currentPatientIdForQr &&
                currentTypeForQr &&
                isPaymentInProgress[`${viewModePatientId}-${currentTypeForQr}`] &&
                styles.btnDisabled,
              ]}
              disabled={
                !!(currentPatientIdForQr && currentTypeForQr && isPaymentInProgress[`${viewModePatientId}-${currentTypeForQr}`])
              }
              onPress={() => {
                if (currentPatientIdForQr && currentTypeForQr && viewModePatientId) {
                  handleUpiPaymentConfirm(currentPatientIdForQr, currentTypeForQr);
                }
              }}
            >
              <Text style={styles.confirmButtonText}>
                {currentPatientIdForQr && currentTypeForQr && isPaymentInProgress[`${viewModePatientId}-${currentTypeForQr}`]
                  ? "Processing..."
                  : "Confirm UPI Payment"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setQrModalVisible(false);
                if (currentPatientIdForQr && currentTypeForQr) {
                  setShowUpiQrs((prev) => ({
                    ...prev,
                    [currentPatientIdForQr]: {
                      ...prev[currentPatientIdForQr],
                      [currentTypeForQr]: false,
                    },
                  }));
                  setSelectedPaymentMethods((prev) => ({
                    ...prev,
                    [currentPatientIdForQr]: {
                      ...prev[currentPatientIdForQr],
                      [currentTypeForQr]: null,
                    },
                  }));
                }
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
};

export default Billing;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  searchWrap: {
    marginBottom: 16,
    alignItems: "center",
  },
  searchInner: {
    width: "100%",
    maxWidth: 420,
    position: "relative",
  },
  searchInput: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingRight: 40,
    borderWidth: 1,
    borderColor: "#e1e5e9",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  searchIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -10,
    color: "#9ca3af",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  sectionHeaderRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontWeight: "600", color: "#1f2937" },
  expandIcon: { color: "#6b7280", fontSize: 18 },
  rowCard: {
    borderWidth: 1,
    borderColor: "#eef2f7",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  rowCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowCardTitle: {
    fontWeight: "700",
    color: "#1f2937",
  },
  rowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#f9fafb",
  },
  chipLabel: { fontSize: 11, color: "#6b7280", marginRight: 4 },
  chipValue: { fontSize: 12, color: "#111827", fontWeight: "600" },
  statusPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
  },
  pillPending: { backgroundColor: "#fef3c7", color: "#92400e" },
  pillDone: { backgroundColor: "#dcfce7", color: "#166534" },
  pillDanger: { backgroundColor: "#fee2e2", color: "#dc2626" },

  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  balanceLabel: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  balanceValue: { fontSize: 16, fontWeight: "700", color: "#10b981" },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  primary: {
    backgroundColor: "#007bff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryText: { color: "#fff", fontWeight: "700" },

  secondary: {
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 140,
  },
  secondaryText: { color: "#3b82f6", fontWeight: "700" },

  success: {
    backgroundColor: "#28a745",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  successText: { color: "#fff", fontWeight: "700" },

  outlined: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  outlinedText: { color: "#374151", fontWeight: "700" },

  paginationBar: {
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  paginationText: { color: "#6b7280", fontSize: 13 },
  pagBtn: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pagBtnDisabled: { backgroundColor: "#f3f4f6" },
  pagBtnText: { color: "#374151", fontSize: 13 },
  pagBtnTextDisabled: { color: "#9ca3af" },

  pageNum: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pageNumActive: { backgroundColor: "#3b82f6" },
  pageNumText: { color: "#374151", fontSize: 13 },
  pageNumTextActive: { color: "#fff", fontWeight: "700" },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
  },
  modalTitle: { fontWeight: "800", fontSize: 16, marginBottom: 8, color: "#111827" },

  paymentMethodContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentMethodTitle: {
    fontWeight: '600',
    marginBottom: 10,

    color: '#334155',
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  paymentOptionText: {
    color: '#334155',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  qrText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#334155',
    fontWeight: '600',
  },
  qrImage: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  upiId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
  },
  closeButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
