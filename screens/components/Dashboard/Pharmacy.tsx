import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { Card, Button, Divider } from "react-native-paper";
import Toast from "react-native-toast-message";
import { AuthFetch, AuthPost } from "../../auth/auth";
import PatientsTab from "./PharmacyPatientsTab";
import MedicinesTab from "./PharmacyMedicinesTab";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/AntDesign";

export default function Pharmacy() {
  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId =
    currentuserDetails?.role === "doctor"
      ? currentuserDetails?.userId
      : currentuserDetails?.createdBy;
  const userId = currentuserDetails?.userId;
  const token = currentuserDetails?.token;

  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "medicines">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [cardsData, setCardsData] = useState({
    today: { revenue: 0, patients: 0 },
    month: { revenue: 0, patients: 0 },
  });
  const [form, setForm] = useState({
    medName: "",
    dosage: "",
    quantity: "",
    price: "",
    cgst: "",
    gst: "",
  });
  const [errors, setErrors] = useState({});
  const [bulkData, setBulkData] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkResults, setBulkResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);

  const hasFetchedRevenue = useRef(false);

  const handleInputChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const validateForm = () => {
    const newErrors: any = {};
    if (!form.medName.trim()) {
      newErrors.medName = "Medicine name is required";
    }
    if (!form.dosage.trim()) {
      newErrors.dosage = "Dosage is required";
    }
    if (!form.price || parseFloat(form.price) < 0) {
      newErrors.price = "Price must be non-negative";
    }
    if (!form.quantity || parseInt(form.quantity) < 0) {
      newErrors.quantity = "Quantity must be non-negative";
    }
    if (!form.cgst || parseFloat(form.cgst) < 0) {
      newErrors.cgst = "CGST must be non-negative";
    }
    if (!form.gst || parseFloat(form.gst) < 0) {
      newErrors.gst = "GST must be non-negative";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddMedicine = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const body = {
        medName: form.medName,
        dosage: form.dosage,
        price: parseFloat(form.price) || 0,
        quantity: parseInt(form.quantity) || 0,
        cgst: parseFloat(form.cgst) || 0,
        gst: parseFloat(form.gst) || 0,
        doctorId,
      };
      const response = await AuthPost(
        "pharmacy/addMedInventory",
        body,
        token,
        { headers: { "Content-Type": "application/json" } }
      );

      console.log(response, "123")

      if (response.status === "success" || response.data?.status === "success") {
        setForm({ medName: "", dosage: "", quantity: "", price: "", cgst: "", gst: "" });
        setErrors({});
        setIsModalVisible(false);
        Toast.show({ type: "success", text1: "Medicine added successfully" });
        fetchRevenueCount();
        setRefreshTrigger((prev) => prev + 1);
        setActiveTab("medicines");
      } else {
        Alert.alert("Alert", response?.message?.message || response?.data?.message || "Failed to add medicine")
        // throw new Error(response.message || response.data?.message || "Failed to add medicine");
      }
    } catch (error: any) {
      console.error("Error adding medicine:", error);
      if (error.response?.status === 409 && error.response?.data?.message?.message === "Medicine already exists") {
      // Alert.alert("Error", "Medicine already exists")
        Toast.show({ type: "error", text1: "Medicine already exists" });
      } else {
        // Alert.alert("Error",  error.message || "Failed to add medicine")
        Toast.show({
          type: "error",
          text1: error.message || "Failed to add medicine",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({ medName: "", dosage: "", quantity: "", price: "", cgst: "", gst: "" });
    setErrors({});
    setIsModalVisible(false);
  };

  const handleBulkCancel = () => {
    setBulkData([]);
    setBulkErrors([]);
    setBulkResults(null);
    setIsBulkModalVisible(false);
  };

  const handleBulkUpload = async () => {
    if (bulkData.length === 0) {
      Toast.show({ type: "error", text1: "No data to upload" });
      return;
    }

    try {
      setIsProcessing(true);
      const response = await AuthPost(
        "pharmacy/addMedInventory/bulk",
        { medicines: bulkData, doctorId },
        token,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data?.data?.insertedCount > 0) {
        setBulkResults(response.data.data);
        Toast.show({
          type: "success",
          text1: `${response.data.data.insertedCount} medicines added successfully`,
        });
        fetchRevenueCount();
        setRefreshTrigger((prev) => prev + 1);
        if (!response.data.data.errors || response.data.data.errors.length === 0) {
          setTimeout(() => setIsBulkModalVisible(false), 2000);
        }
      } else if (response.data?.data?.errors?.length > 0) {
        setBulkResults(response.data.data);
        Toast.show({ type: "error", text1: "Some medicines already exist in inventory" });
      }
    } catch (error: any) {
      console.error("Error uploading bulk data:", error);
      Toast.show({
        type: "error",
        text1: error.response?.data?.message || "Failed to upload medicines",
      });
      if (error.response?.data?.errors) {
        setBulkResults({
          errors: error.response.data.errors.map((err) => ({
            row: err.row,
            message: err.message,
          })),
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = () => {
    Alert.alert(
      "File Upload",
      "File upload is not fully supported in this React Native version. Please use a server-side endpoint to upload Excel files.",
      [{ text: "OK" }]
    );
  };

  const downloadTemplate = () => {
    Alert.alert(
      "Download Template",
      "Template download is not supported in this React Native version. Please provide a server-side endpoint to download the template.",
      [{ text: "OK" }]
    );
  };

  async function fetchRevenueCount() {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await AuthFetch(
        `finance/getDoctorTodayAndThisMonthRevenue/pharmacy?doctorId=${doctorId}`,
        token
      );

      let revenueData = null;
      if (response.status === "success" && response.data) {
        revenueData = response.data.data;
      } else if (response.data?.status === "success" && response.data.data) {
        revenueData = response.data.data;
      } else if (response.data) {
        revenueData = response.data;
      } else {
        revenueData = response;
      }

      setCardsData({
        today: revenueData.today || { revenue: 0, patients: 0 },
        month: revenueData.month || { revenue: 0, patients: 0 },
      });
    } catch (error: any) {
      console.error("Error fetching revenue:", error);
      Toast.show({
        type: "error",
        text1: error.message || "Failed to fetch revenue",
      });
      setCardsData({
        today: { revenue: 0, patients: 0 },
        month: { revenue: 0, patients: 0 },
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (doctorId && !hasFetchedRevenue.current) {
      hasFetchedRevenue.current = true;
      fetchRevenueCount();
    }
  }, [doctorId]);

  return (
    <View style={styles.container}>
      

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Icon name="medicinebox" size={18} color="#fff" />
          </View>
          <Text style={styles.title}>Pharmacy</Text>
        </View>
        <TextInput
          placeholder="Search by Patient Id"
          value={searchQuery}
          onChangeText={(t) => setSearchQuery(t.trim())}
          style={styles.search}
          placeholderTextColor="#9aa0a6"
        />
      </View>

      {loading && <ActivityIndicator size="large" color="#1890ff" style={styles.loader} />}

      {/* Revenue Cards */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: "#DBEAFE" }]}>
          <Text style={[styles.cardLabel, { color: "#2563EB" }]}>Today Revenue</Text>
          <Text style={[styles.cardValue, { color: "#2563EB" }]}>
            ₹ {cardsData?.today?.revenue || 0}
          </Text>
          <Text style={{ color: "#2563EB" }}>
            Patients: {cardsData?.today?.patients || 0}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: "#DCFCE7" }]}>
          <Text style={[styles.cardLabel, { color: "#16A34A" }]}>This Month Revenue</Text>
          <Text style={[styles.cardValue, { color: "#16A34A" }]}>
            ₹ {cardsData?.month?.revenue || 0}
          </Text>
          <Text style={{ color: "#16A34A" }}>
            Patients: {cardsData?.month?.patients || 0}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveTab("pending")}
          style={[styles.tab, activeTab === "pending" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("completed")}
          style={[styles.tab, activeTab === "completed" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "completed" && styles.tabTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("medicines")}
          style={[styles.tab, activeTab === "medicines" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "medicines" && styles.tabTextActive]}>
            Medicines
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === "pending" && (
          <PatientsTab status="pending" searchQuery={searchQuery} updateCount={fetchRevenueCount} />
        )}
        {activeTab === "completed" && (
          <PatientsTab status="completed" searchQuery={searchQuery} updateCount={fetchRevenueCount} />
        )}
        {activeTab === "medicines" && (
          <MedicinesTab
            showModal={() => setIsModalVisible(true)}
            showBulkModal={() => setIsBulkModalVisible(true)}
            refreshTrigger={refreshTrigger}
          />
        )}
      </View>
 
      {/* Add Medicine Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Medicine to Inventory</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Medicine Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter medicine name"
                value={form.medName}
                onChangeText={(val) => handleInputChange("medName", val)}
              />
              {errors.medName && <Text style={styles.error}>{errors.medName}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Dosage</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter dosage (e.g., 100mg)"
                value={form.dosage}
                onChangeText={(val) => handleInputChange("dosage", val)}
              />
              {errors.dosage && <Text style={styles.error}>{errors.dosage}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Price (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                value={form.price}
                keyboardType="numeric"
                onChangeText={(val) => handleInputChange("price", val)}
              />
              {errors.price && <Text style={styles.error}>{errors.price}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                value={form.quantity}
                keyboardType="numeric"
                onChangeText={(val) => handleInputChange("quantity", val)}
              />
              {errors.quantity && <Text style={styles.error}>{errors.quantity}</Text>}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>CGST (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter CGST"
                  value={form.cgst}
                  keyboardType="numeric"
                  onChangeText={(val) => handleInputChange("cgst", val)}
                />
                {errors.cgst && <Text style={styles.error}>{errors.cgst}</Text>}
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>GST (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter GST"
                  value={form.gst}
                  keyboardType="numeric"
                  onChangeText={(val) => handleInputChange("gst", val)}
                />
                {errors.gst && <Text style={styles.error}>{errors.gst}</Text>}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button onPress={handleCancel} disabled={loading} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Button>
              <Button mode="contained" onPress={handleAddMedicine} loading={loading} disabled={loading} style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal visible={isBulkModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { width: '90%' }]}>
            <Text style={styles.modalTitle}>Bulk Import Medicines</Text>
            <Text style={styles.instructions}>
              Upload an Excel file (.xlsx) with columns: medName, dosage, price, quantity, cgst, gst.
            </Text>
            <Button mode="outlined" onPress={downloadTemplate} style={styles.templateButton}>
              <Text style={styles.templateButtonText}>Download Template</Text>
            </Button>
            <Button mode="outlined" onPress={handleFileUpload} style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>Upload File</Text>
            </Button>
            {bulkData.length > 0 && (
              <View>
                <Divider style={styles.divider}>Preview ({bulkData.length} medicines)</Divider>
                <Text style={styles.previewText}>Preview not fully supported in React Native.</Text>
              </View>
            )}
            {bulkResults && (
              <View style={styles.resultsContainer}>
                {bulkResults.insertedCount > 0 && (
                  <Text style={styles.successText}>
                    Successfully added {bulkResults.insertedCount} medicines
                  </Text>
                )}
                {bulkResults.errors && bulkResults.errors.length > 0 && (
                  <View>
                    <Text style={styles.warningText}>
                      {bulkResults.errors.length} warnings encountered
                    </Text>
                    {bulkResults.errors.map((error, index) => (
                      <Text key={index} style={styles.errorText}>
                        Row {error.row}: {error.message}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
            <View style={styles.modalButtons}>
              <Button onPress={handleBulkCancel} disabled={isProcessing} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Button>
              <Button
                mode="contained"
                onPress={handleBulkUpload}
                loading={isProcessing}
                disabled={isProcessing || bulkData.length === 0}
                style={styles.addButton}
              >
                <Text style={styles.addButtonText}>Upload Medicines</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
     <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f5f5", 
    padding: 16 
  },
  loader: {
    marginVertical: 16,
  },
  headerRow: { 
    // marginTop:50,
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    marginBottom: 16 
  },
  headerLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8 
  },
  iconBox: { 
    width: 32, 
    height: 32, 
    backgroundColor: "#1890ff", 
    borderRadius: 6, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  title: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#262626" 
  },
  search: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardsRow: { 
    flexDirection: "row", 
    gap: 12, 
    marginBottom: 12 
  },
  card: { 
    flex: 1, 
    borderRadius: 10, 
    padding: 12 
  },
  cardLabel: { 
    fontWeight: "600", 
    marginBottom: 6 
  },
  cardValue: { 
    fontWeight: "800", 
    fontSize: 24, 
    marginBottom: 6 
  },
  tabs: { 
    flexDirection: "row", 
    backgroundColor: "#e5e7eb", 
    padding: 4, 
    borderRadius: 10, 
    marginBottom: 10 
  },
  tab: { 
    flex: 1, 
    alignItems: "center", 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  tabActive: { 
    backgroundColor: "#fff" 
  },
  tabText: { 
    color: "#475569", 
    fontWeight: "600" 
  },
  tabTextActive: { 
    color: "#111827" 
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    width: '85%',
    maxWidth: 600,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#595959',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
     color: '#000000', 
  },
  error: {
    color: '#ff4d4f',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    marginRight: 8,
    backgroundColor: '#fff',
    borderColor: '#d9d9d9',
    borderWidth: 1,
  },
  cancelButtonText: {
    color: '#595959',
  },
  addButton: {
    backgroundColor: '#1890ff',
  },
  addButtonText: {
    color: '#fff',
  },
  instructions: {
    fontSize: 14,
    color: '#595959',
    marginBottom: 16,
    textAlign: 'center',
  },
  templateButton: {
    marginVertical: 8,
    borderColor: '#d9d9d9',
  },
  templateButtonText: {
    color: '#595959',
  },
  uploadButton: {
    marginVertical: 8,
    borderColor: '#d9d9d9',
  },
  uploadButtonText: {
    color: '#595959',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#f0f0f0',
  },
  previewText: {
    fontSize: 14,
    color: '#595959',
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 16,
  },
  successText: {
    color: '#52c41a',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  warningText: {
    color: '#fa8c16',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 12,
    marginBottom: 4,
  },
});