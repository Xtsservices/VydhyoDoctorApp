import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Modal,
  Image,
  Keyboard
} from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import { AuthFetch, AuthPost } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNFS from "react-native-fs";
import FileViewer from "react-native-file-viewer";
import RNHTMLtoPDF from "react-native-html-to-pdf";

interface PatientsTabProps {
  status: "pending" | "completed";
  searchQuery: string;
  updateCount: () => void;
  onTabChange?: (tab: string) => void;
  refreshTrigger?: any;
}

interface Medicine {
  _id: string;
  medName: string;
  dosage: string;
  price: number | null;
  quantity: number;
  gst: number;
  cgst: number;
  status: string;
  patientId: string;
  pharmacyMedID?: string;
}

interface Patient {
  key: string;
  patientId: string;
  doctorId: string;
  name: string;
  medicines: Medicine[];
  totalMedicines: number;
  totalAmount: number;
  status: string;
  originalData: any;
  pharmacyData: any;
  addressId: string | null;
  mobile?: string;
}

export default function PatientsTab({
  status,
  searchQuery,
  updateCount,
  onTabChange,
  refreshTrigger,
}: PatientsTabProps) {
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId =
    currentuserDetails?.role === "doctor"
      ? currentuserDetails?.userId
      : currentuserDetails?.createdBy;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState<Record<string, boolean>>({});
  const [editablePrices, setEditablePrices] = useState<string[]>([]);
  const [isPaymentDone, setIsPaymentDone] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
 const listRef = useRef<FlatList<any>>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // QR code states
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [currentPatientForQr, setCurrentPatientForQr] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Record<string, "cash" | "upi" | null>>(
    {}
  );
  const [showUpiQr, setShowUpiQr] = useState<Record<string, boolean>>({});
  const [qrLoading, setQrLoading] = useState(false);

  async function filterPatientsData(data: any[]) {
    return data
      .map((patient) => {
        const filteredMeds = patient.medicines.filter((med: any) => med.status === status);
        return filteredMeds.length > 0 ? { ...patient, medicines: filteredMeds } : null;
      })
      .filter(Boolean);
  }

  async function fetchPatients() {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");

      const response = await AuthFetch(
        `pharmacy/getAllPharmacyPatientsByDoctorID?doctorId=${doctorId}&status=${status}&searchText=${searchQuery}&page=${page}&limit=${pageSize}`,
        token
      );

      let dataArray: any[] = [];
      if (response.status === "success" && response?.data?.data) {
        dataArray = await filterPatientsData(response.data.data.patients);

        dataArray.sort((a: any, b: any) => {
          const getIdNumber = (id: string) => parseInt(id.replace(/\D/g, "")) || 0;
          return getIdNumber(b.patientId) - getIdNumber(a.patientId);
        });

        if (searchQuery?.trim()) {
          const lowerSearch = searchQuery.toLowerCase();
          dataArray = dataArray.filter((patient: any) =>
            patient.patientId?.toLowerCase().includes(lowerSearch)
          );
        }
      }

      if (dataArray.length > 0) {
        const formattedData = dataArray.map((patient: any, index: number) => {
          const totalAmount = patient.medicines.reduce(
            (sum: number, med: any) => sum + (med.price || 0) * (med.quantity || 1),
            0
          );

          return {
            key: patient.patientId || `patient-${index}`,
            patientId: patient.patientId || `PAT-${index}`,
            doctorId: patient.doctorId || "N/A",
            name: patient.patientName || "Unknown Patient",
            medicines:
              patient.medicines.map((med: any) => ({
                ...med,
                patientId: patient.patientId,
              })) || [],
            totalMedicines: patient.medicines?.length || 0,
            totalAmount: totalAmount,
            status: status,
            originalData: patient,
            pharmacyData: patient.pharmacyData || null,
            addressId: patient.addressId || null,
            mobile: patient.mobile || "Not Provided",
          };
        });

        setPatients(formattedData);
        setTotalPatients(response.data.data.pagination.totalPatients);

        const payState: Record<string, boolean> = {};
        formattedData.forEach((p) => {
          payState[p.patientId] = !p.medicines.some((med) => med.status === "pending");
        });
        setIsPaymentDone((prev) => ({ ...prev, ...payState }));

        const paymentMethods: Record<string, "cash" | "upi" | null> = {};
        formattedData.forEach((p) => {
          paymentMethods[p.patientId] = null;
        });
        setSelectedPaymentMethod((prev) => ({ ...prev, ...paymentMethods }));
      } else {
        setPatients([]);
        setTotalPatients(0);
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to fetch patients",
      });
      setPatients([]);
      setTotalPatients(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(patientId: string) {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await AuthPost(`/pharmacy/updateStatus`, { patientId, status: "completed" }, token, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === "success") {
        Toast.show({ type: "success", text1: "Status updated successfully" });
        fetchPatients();
        updateCount();
        if (onTabChange) onTabChange("2");
      } else {
        throw new Error(response.message || "Failed to update status");
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to update status",
      });
    }
  }

  const handlePriceChange = (patientId: string, medicineId: string, value: number | null) => {
    setPatients((prev) =>
      prev.map((patient) =>
        patient.patientId === patientId
          ? {
              ...patient,
              medicines: patient.medicines.map((med) => (med._id === medicineId ? { ...med, price: value } : med)),
            }
          : patient
      )
    );
  };

  const enableEdit = (medicineId: string) => {
    setEditablePrices((prev) => [...prev, medicineId]);
  };

  const handlePriceSave = async (patientId: string, medicineId: string) => {
    try {
      setSaving((prev) => ({ ...prev, [medicineId]: true }));
      const patient = patients.find((p) => p.patientId === patientId);
      const medicine = patient?.medicines.find((m) => m._id === medicineId);
      const price = medicine?.price;

      if (price === null || price === undefined) {
        Toast.show({
          type: "error",
          text1: "Please enter a valid price",
        });
        return;
      }

      const token = await AsyncStorage.getItem("authToken");
      await AuthPost(
        `pharmacy/updatePatientMedicinePrice`,
        {
          medicineId,
          patientId,
          price,
          doctorId,
        },
        token
      );

      Toast.show({
        type: "success",
        text1: "Price updated successfully",
      });
      setEditablePrices((prev) => prev.filter((id) => id !== medicineId));
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to update price",
      });
    } finally {
      setSaving((prev) => ({ ...prev, [medicineId]: false }));
    }
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = async (patientId: string, method: "cash" | "upi") => {
    setSelectedPaymentMethod((prev) => ({ ...prev, [patientId]: method }));

    if (method === "upi") {
      setCurrentPatientForQr(patientId);

      const patient = patients.find((p) => p.patientId === patientId);
      const addressId = patient?.addressId;

      if (!addressId) {
        Toast.show({
          type: "error",
          text1: "No clinic address found for QR code",
        });
        setSelectedPaymentMethod((prev) => ({ ...prev, [patientId]: null }));
        return;
      }

      const success = await fetchPharmacyQRCode(addressId);
      if (success) {
        setShowUpiQr((prev) => ({ ...prev, [patientId]: true }));
        setQrModalVisible(true);
      } else {
        setSelectedPaymentMethod((prev) => ({ ...prev, [patientId]: null }));
      }
    } else {
      setShowUpiQr((prev) => ({ ...prev, [patientId]: false }));
    }
  };

  const fetchPharmacyQRCode = async (addressId: string) => {
    try {
      setQrLoading(true);
      const token = await AsyncStorage.getItem("authToken");

      const response = await AuthFetch(`users/getClinicsQRCode/${addressId}?userId=${doctorId}`, token);

      if (response?.data?.status === "success" && response?.data?.data) {
        const qrCodeUrl = response.data.data.pharmacyQrCode || response.data.data.qrCodeUrl;
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

  // Handle UPI payment confirmation
  const handleUpiPaymentConfirm = (patientId: string) => {
    setQrModalVisible(false);
    setShowUpiQr((prev) => ({ ...prev, [patientId]: false }));
    handlePayment(patientId, "upi");
  };

  const handlePayment = async (patientId: string, method: "cash" | "upi" = "cash") => {
    try {
      setPaying((prev) => ({ ...prev, [patientId]: true }));
      const patient = patients.find((p) => p.patientId === patientId);
      const totalAmount =
        patient?.medicines.reduce((sum, med) => sum + (med.price || 0) * (med.quantity || 1), 0) || 0;

      if (totalAmount <= 0) {
        Toast.show({
          type: "error",
          text1: "No valid prices set for payment",
        });
        return;
      }

      const hasUnconfirmedPrices = patient?.medicines.some(
        (med) => editablePrices.includes(med._id) && med.price !== null && med.price !== undefined
      );

      if (hasUnconfirmedPrices) {
        Toast.show({
          type: "error",
          text1: "Please confirm all medicine prices before payment",
        });
        return;
      }

      const token = await AsyncStorage.getItem("authToken");
      const response = await AuthPost(
        `pharmacy/pharmacyPayment`,
        {
          patientId,
          doctorId,
          amount: totalAmount,
          paymentMethod: method,
          medicines: patient?.medicines.map((med) => ({
            medicineId: med._id,
            price: med.price,
            quantity: med.quantity,
            pharmacyMedID: med.pharmacyMedID || null,
          })),
        },
        token
      );

      if (response.status === "success") {
        setIsPaymentDone((prev) => ({ ...prev, [patientId]: true }));
        updateCount();
        Toast.show({
          type: "success",
          text1: `Payment processed via ${method.toUpperCase()}`,
        });
        setSelectedPaymentMethod((prev) => ({ ...prev, [patientId]: null }));
        setShowUpiQr((prev) => ({ ...prev, [patientId]: false }));
        if (onTabChange) onTabChange("2");
        await fetchPatients();
      }
    } catch (error: any) {
      setIsPaymentDone((prev) => ({ ...prev, [patientId]: false }));
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to process payment",
      });
    } finally {
      setPaying((prev) => ({ ...prev, [patientId]: false }));
    }
  };

  // Android storage permission helper
  const ensureAndroidWritePermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: "Storage permission",
        message: "Allow saving invoices to your Downloads folder.",
        buttonPositive: "Allow",
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED || granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: err?.message || "Failed to request storage permission",
      });
      return false;
    }
  };

  const downloadInvoice = async (patient: Patient) => {
    try {
      setDownloading((prev) => ({ ...prev, [patient.patientId]: true }));

      if (Platform.OS === "android") {
        const hasPermission = await ensureAndroidWritePermission();
        if (!hasPermission) {
          throw new Error("Storage permission denied");
        }
      }

      const invoiceHTML = generateInvoiceHTML(patient);
      const fileName = `Invoice_${patient.patientId}_${Date.now()}.pdf`;

      const options = {
        html: invoiceHTML,
        fileName: fileName,
        directory: "Documents",
      };

      const file = await RNHTMLtoPDF.convert(options);

      if (Platform.OS === "android" && file.filePath) {
        const downloadsPath = RNFS.DownloadDirectoryPath;
        const destinationPath = `${downloadsPath}/${fileName}`;

        const fileExists = await RNFS.exists(destinationPath);
        if (fileExists) {
          await RNFS.unlink(destinationPath);
        }

        await RNFS.moveFile(file.filePath, destinationPath);

        Toast.show({
          type: "success",
          text1: "Invoice saved to Downloads",
        });

        try {
          await FileViewer.open(destinationPath);
        } catch (error: any) {
          Toast.show({
            type: "error",
            text1: error?.message || "Failed to open invoice",
          });
        }
      } else if (file.filePath) {
        Toast.show({
          type: "success",
          text1: "Invoice generated successfully",
        });

        try {
          await FileViewer.open(file.filePath);
        } catch (error: any) {
          Toast.show({
            type: "error",
            text1: error?.message || "Failed to open invoice",
          });
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to download invoice",
      });
    } finally {
      setDownloading((prev) => ({ ...prev, [patient.patientId]: false }));
    }
  };

  const generateInvoiceHTML = (patient: Patient) => {
    const completedMedicines = patient.medicines.filter((med) => med.status === "completed");
    const total = completedMedicines.reduce(
      (sum, med) => sum + (med.price || 0) * (med.quantity || 1),
      0
    );

    const firstName = patient.name.split(" ")[0] || "Unknown";
    const lastName = patient.name.split(" ").slice(1).join(" ") || "Patient";
    const itemDate = new Date().toLocaleDateString();
    const invoiceNumber = `INV-${patient.patientId}-${Date.now()}`;

    const pharmacyData = patient.pharmacyData || {};
    const providerName = pharmacyData.pharmacyName || "Pharmacy";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice</title>
          <meta charset="utf-8" />
          <style>
            html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #fff; font-size: 14px; }
            @page { margin: 0; size: A4; }
            .invoice-container { padding: 15px; max-width: 210mm; margin: 0 auto; min-height: calc(100vh - 30px); display: flex; flex-direction: column; }
            .invoice-content { flex: 1; }
            .invoice-header-image-only { width: 100%; margin-bottom: 12px; page-break-inside: avoid; }
            .invoice-header-image-only img { display: block; width: 100%; height: auto; max-height: 220px; object-fit: contain; background: #fff; }
            .provider-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 6px; }
            .section { margin-bottom: 20px; }
            .patient-info { display: flex; justify-content: space-between; background-color: #f8f9fa; padding: 12px; border-radius: 5px; }
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .data-table th { background-color: #f8f9fa; font-weight: bold; }
            .price-column { text-align: right; }
            .grand-total-section { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; }
            .grand-total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #333; border-top: 2px solid #333; padding-top: 8px; margin-top: 10px; }
            .footer { text-align: center; padding: 15px 0; border-top: 1px solid #ddd; color: #666; background: #fff; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="invoice-content">
              <div class="provider-details">
                <div class="provider-name">${providerName}</div>
                <p>${pharmacyData?.pharmacyAddress || "N/A"}</p>
                <p>GST: ${pharmacyData?.pharmacyGst || "N/A"}</p>
                <p>PAN: ${pharmacyData?.pharmacyPan || "N/A"}</p>
                <p>Registration No: ${pharmacyData?.pharmacyRegistrationNo || "N/A"}</p>
              </div>
              <div class="section">
                <h3>Patient Information</h3>
                <div class="patient-info">
                  <div>
                    <p><strong>Patient ID:</strong> ${patient.patientId}</p>
                    <p><strong>First Name:</strong> ${firstName}</p>
                    <p><strong>Last Name:</strong> ${lastName}</p>
                    <p><strong>Mobile:</strong> ${patient.mobile || "Not Provided"}</p>
                  </div>
                  <div>
                    <p><strong>Referred by Dr.</strong> ${currentuserDetails?.firstname || "N/A"} ${
      currentuserDetails?.lastname || "N/A"
    }</p>
                    <p><strong>Appointment Date&Time:</strong> ${itemDate}</p>
                    <div><strong>Invoice No:</strong> #${invoiceNumber}</div>
                  </div>
                </div>
              </div>
              <div class="section">
                <h3>Medicines</h3>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>SL No.</th>
                      <th>Name</th>
                      <th>Price (₹)</th>
                      <th>Quantity</th>
                      <th>SGST (%)</th>
                      <th>CGST (%)</th>
                      <th>Subtotal (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${completedMedicines
                      .map(
                        (med, idx) => {
                          const subtotal = (Number(med.price) || 0) * (Number(med.quantity) || 1);
                          return `
                          <tr>
                            <td>${idx + 1}.</td>
                            <td>${med.medName || ""}</td>
                            <td class="price-column">${Number(med.price || 0).toFixed(2)}</td>
                            <td>${Number(med.quantity || 1)}</td>
                            <td>${Number(med.gst || 0)}</td>
                            <td>${Number(med.cgst || 0)}</td>
                            <td class="price-column">${subtotal.toFixed(2)}</td>
                          </tr>
                        `;
                        }
                      )
                      .join("")}
                  </tbody>
                </table>
                <div>
                  <p style="margin:0; font-size:13px; color:#000000ff;">GST included</p>
                  <p style="font-weight:bold; font-size:14px;">Medicines Total: ₹${total.toFixed(2)}</p>
                </div>
              </div>
              <div class="grand-total-section">
                <div class="grand-total-row">
                  <span>Grand Total:</span>
                  <span>₹${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for choosing Vydhyo</p>
              <div>Powered by Vydhyo</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const statusTag = (status: string) => {
    const norm = (status || "").toLowerCase();
    const color =
      norm === "completed" ? "#16a34a" : norm === "pending" ? "#d97706" : norm === "cancelled" ? "#dc2626" : norm === "in_progress" ? "#2563eb" : "#6b7280";
    const label =
      norm === "completed" ? "Completed" : norm === "pending" ? "Pending" : norm === "cancelled" ? "Cancelled" : norm === "in_progress" ? "In Progress" : "Unknown";

    return (
      <View style={[styles.tag, { backgroundColor: color + "22", borderColor: color }]}>
        <Text style={{ color, fontWeight: "600", fontSize: 12 }}>{label}</Text>
      </View>
    );
  };

  const renderMedicineRow = (patient: Patient, medicine: Medicine) => {
    const isEditable = editablePrices.includes(medicine._id);
    const isPriceInitiallyNull = medicine.price === null || medicine.price === undefined;

    return (
      <View key={medicine._id} style={styles.medicineRow}>
        <Text style={styles.medicineName}>
          {medicine.medName} {medicine.dosage}
        </Text>

        <View style={styles.medicineDetails}>
          <View style={styles.priceRow}>
            <TextInput
              keyboardType="numeric"
              placeholder="Enter Price/Unit"
              placeholderTextColor="#94a3b8"
              value={medicine.price?.toString() || ""}
              editable={medicine.status === "pending" && (isEditable || isPriceInitiallyNull)}
              onFocus={() => !isEditable && enableEdit(medicine._id)}
              onChangeText={(value) => handlePriceChange(patient.patientId, medicine._id, value ? parseFloat(value) : null)}
              style={[styles.priceInput, !(medicine.status === "pending" && (isEditable || isPriceInitiallyNull)) && styles.priceInputDisabled]}
            />
            <TouchableOpacity
              onPress={() => handlePriceSave(patient.patientId, medicine._id)}
              disabled={
                medicine.price === null ||
                medicine.price === undefined ||
                saving[medicine._id] ||
                (!isEditable && !isPriceInitiallyNull)
              }
              style={[
                styles.saveBtn,
                (medicine.price == null || saving[medicine._id] || !(medicine.status === "pending" && (isEditable || isPriceInitiallyNull))) && styles.btnDisabled,
              ]}
            >
              <Text style={styles.saveBtnText}>{saving[medicine._id] ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
            {statusTag(medicine.status)}
          </View>

          <View style={styles.medicineInfoRow}>
            <Text style={styles.medicineInfo}>Quantity: {medicine.quantity} units</Text>
            <Text style={styles.medicineInfo}>SGST: {medicine.gst}%</Text>
            <Text style={styles.medicineInfo}>CGST: {medicine.cgst}%</Text>
          </View>

          <Text style={styles.medicineTotal}>Total: ₹{((medicine.price || 0) * medicine.quantity).toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  const calcTotal = (patient: Patient) =>
    patient.medicines.reduce((sum, med) => sum + (med.price || 0) * (med.quantity || 1), 0);

  const patientStatus = (patient: Patient) => {
    const allCompleted = patient.medicines.every((med) => med.status === "completed");
    const anyPending = patient.medicines.some((med) => med.status === "pending");
    if (allCompleted) return { label: "Completed", color: "#16a34a" };
    if (anyPending && !patient.medicines.some((med) => med.status === "completed")) return { label: "Pending", color: "#d97706" };
    return { label: "Partial", color: "#f59e0b" };
  };

  const renderPatient = ({ item }: { item: Patient, index:number }) => {
    const total = calcTotal(item);
    const hasPending = item.medicines.some((med) => med.status === "pending");
    const paid = isPaymentDone[item.patientId];
    const paymentMethod = selectedPaymentMethod[item.patientId];
    const showUpi = showUpiQr[item.patientId];

    const filteredMedicines = status === "pending" ? item.medicines.filter((med) => med.status === "pending") : item.medicines.filter((med) => med.status === "completed");

    return (
      <View style={styles.rowCard}>
        <View style={styles.rowHeader}>
          <View>
            <Text style={styles.pid}>Patient ID: {item.patientId}</Text>
            <Text style={styles.pname}>{item.name}</Text>
          </View>
        </View>

        <View style={styles.medicinesBox}>
          {filteredMedicines.length > 0 ? filteredMedicines.map((med) => renderMedicineRow(item, med)) : <Text style={{ color: "black" }}>{status === "pending" ? "No Pending Medicines" : "No Completed Medicines"}</Text>}
        </View>

        {!paid && hasPending && paymentMethod !== null && (
          <View style={styles.paymentMethodContainer}>
            <Text style={styles.paymentMethodTitle}>Select Payment Method:</Text>

            <View style={styles.paymentOptions}>
              <TouchableOpacity style={styles.paymentOption} onPress={() => handlePaymentMethodSelect(item.patientId, "cash")}>
                <View style={styles.radioButton}>{paymentMethod === "cash" && <View style={styles.radioButtonSelected} />}</View>
                <Text style={styles.paymentOptionText}>Cash</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.paymentOption} onPress={() => handlePaymentMethodSelect(item.patientId, "upi")}>
                <View style={styles.radioButton}>{paymentMethod === "upi" && <View style={styles.radioButtonSelected} />}</View>
                <Text style={styles.paymentOptionText}>UPI</Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === "cash" && (
              <TouchableOpacity style={[styles.confirmButton, paying[item.patientId] && styles.btnDisabled]} disabled={paying[item.patientId]} onPress={() => handlePayment(item.patientId, "cash")}>
                <Text style={styles.confirmButtonText}>{paying[item.patientId] ? "Processing..." : "Confirm Cash Payment"}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Modal
          visible={paymentMethod === "upi" && showUpi && qrModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setQrModalVisible(false);
            setShowUpiQr((prev) => ({ ...prev, [item.patientId]: false }));
            setSelectedPaymentMethod((prev) => ({ ...prev, [item.patientId]: null }));
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.qrText}>Scan QR Code to Pay</Text>

              {qrLoading ? (
                <ActivityIndicator size="large" color="#007bff" />
              ) : qrCodeImage ? (
                <Image source={{ uri: qrCodeImage }} style={styles.qrImage} resizeMode="contain" />
              ) : (
                <Text style={styles.errorText}>QR code not available</Text>
              )}

              <Text style={styles.upiId}>Total Amount: ₹ {total.toFixed(2)}</Text>

              <TouchableOpacity style={[styles.confirmButton, paying[item.patientId] && styles.btnDisabled]} disabled={paying[item.patientId]} onPress={() => handleUpiPaymentConfirm(item.patientId)}>
                <Text style={styles.confirmButtonText}>{paying[item.patientId] ? "Processing..." : "Confirm UPI Payment"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setQrModalVisible(false);
                  setShowUpiQr((prev) => ({ ...prev, [item.patientId]: false }));
                  setSelectedPaymentMethod((prev) => ({ ...prev, [item.patientId]: null }));
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.footerBar}>
          <Text style={styles.totalText}>Total: ₹ {total.toFixed(2)}</Text>

          {status === "completed" ? (
            <TouchableOpacity style={[styles.primaryBtn, downloading[item.patientId] && styles.btnDisabled]} onPress={() => downloadInvoice(item)} disabled={downloading[item.patientId]}>
              <Text style={styles.primaryBtnText}>{downloading[item.patientId] ? "Downloading..." : "Download Invoice"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, (total <= 0 || !hasPending || paid || paying[item.patientId]) && styles.btnDisabled]}
              disabled={total <= 0 || !hasPending || paid || paying[item.patientId]}
              onPress={() => {
                if (paymentMethod === null) {
                  setSelectedPaymentMethod((prev) => ({ ...prev, [item.patientId]: "cash" }));
                  handlePaymentMethodSelect(item.patientId, "cash");
                } else {
                  handlePayment(item.patientId, paymentMethod);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>{paid ? "Paid" : paying[item.patientId] ? "Processing..." : "Process Payment"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (doctorId) fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, status, searchQuery, refreshTrigger, page, pageSize]);


   useEffect(() => {
    const showEvt = Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
    const hideEvt = Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";
    const sh = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    });
    const hi = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      sh.remove();
      hi.remove();
    };
  }, []);


  const loadMore = () => {
    const maxPages = Math.ceil(totalPatients / pageSize);
    if (!loading && page < maxPages) {
      setPage((p) => p + 1);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={styles.spinningContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={{ color: "black" }}>Loading List...</Text>
        </View>
      ) : patients?.length === 0 ? (
        <View style={styles.spinningContainer}>
          <Text style={{ color: "black" }}>No Data Found</Text>
        </View>
      ) : (
        <FlatList
        ref={listRef}
          data={patients}
          keyExtractor={(x) => x.patientId}
          renderItem={renderPatient}
           contentContainerStyle={{ paddingBottom: 24 + keyboardHeight }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshing={loading}
          onRefresh={() => {
            setPage(1);
            fetchPatients();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  pid: { color: "#334155", fontWeight: "600" },
  pname: { color: "#111827", fontWeight: "800", fontSize: 16, marginTop: 2 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  medicinesBox: { backgroundColor: "#f9fafb", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", padding: 8 },
  medicineRow: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", padding: 10, marginBottom: 8 },
  medicineName: { fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  medicineDetails: { marginLeft: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, justifyContent: "space-between" },
  priceInput: { flex: 0, width: 120, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#fff", color: "#000000" },
  priceInputDisabled: { backgroundColor: "#f3f4f6", color: "#94a3b8" },
  saveBtn: { backgroundColor: "#1f2937", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  medicineInfoRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, marginBottom: 8, flexWrap: "wrap" },
  medicineInfo: { fontSize: 12, color: "#666", marginRight: 12 },
  medicineTotal: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  footerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  totalText: { fontWeight: "800", color: "#0f172a" },
  primaryBtn: { backgroundColor: "#1A3C6A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  spinningContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 10 },

  // Payment method styles
  paymentMethodContainer: { marginTop: 10, padding: 10, backgroundColor: "#f8f9fa", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  paymentMethodTitle: { fontWeight: "600", marginBottom: 10, color: "#334155" },
  paymentOptions: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  paymentOption: { flexDirection: "row", alignItems: "center" },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#1A3C6A", alignItems: "center", justifyContent: "center", marginRight: 8 },
  radioButtonSelected: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1A3C6A" },
  paymentOptionText: { color: "#334155" },
  confirmButton: { backgroundColor: "#1A3C6A", padding: 10, borderRadius: 8, alignItems: "center", marginTop: 10 },
  confirmButtonText: { color: "white", fontWeight: "600" },

  // Modal styles
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 10, alignItems: "center", width: "80%" },
  qrText: { fontSize: 16, marginBottom: 10, color: "#334155", fontWeight: "600" },
  qrImage: { width: 150, height: 150, marginBottom: 10 },
  upiId: { fontSize: 14, color: "#666", marginBottom: 10 },
  errorText: { color: "red", marginBottom: 10 },
  closeButton: { marginTop: 10, padding: 10 },
  closeButtonText: { color: "#1A3C6A", fontWeight: "600" },
});
