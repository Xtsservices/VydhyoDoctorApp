import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import { AuthFetch, AuthPost, authDelete } from "../../auth/auth";
import Icon from "react-native-vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pick, types } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
import * as XLSX from "xlsx";

interface Medicine {
  key: string;
  id: string;
  medName: string;
  quantity: number;
  price: number;
  category?: string;
  expiryDate?: string;
  manufacturer?: string;
  doctorId?: string;
  createdAt?: string;
}

interface MedicinesTabProps {
  refreshTrigger: number;
  showModal: () => void;
  showBulkModal: () => void;
}

const MedicinesTab: React.FC<MedicinesTabProps> = ({
  refreshTrigger,
  showModal,
  showBulkModal,
}) => {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [form, setForm] = useState({ medName: "", quantity: "", price: "" });

  // Bulk import states
  const [bulkPreview, setBulkPreview] = useState<{ 
    medName: string; 
    quantity: number; 
    price: number; 
    row: number 
  }[]>([]);
  const [uploading, setUploading] = useState(false);

  const currentuserDetails = useSelector((state: any) => state.currentUser);
  const doctorId =
    currentuserDetails?.role === "doctor"
      ? currentuserDetails?.userId
      : currentuserDetails?.createdBy;
  const userId = currentuserDetails?.userId;
  const token = currentuserDetails?.token;

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      const response = await AuthFetch(
        `pharmacy/getAllMedicinesByDoctorID?doctorId=${doctorId}&page=${pagination.current}&limit=${pagination.pageSize}`,
        token
      );
      
      if (response.status === "success" && response?.data?.success && response?.data?.data) {
        const dataArray = Array.isArray(response.data.data) ? response.data.data : [];
        const formattedData = dataArray.map((medicine: any, index: number) => ({
          key: medicine._id || `medicine-${index}`,
          id: medicine._id || `MED-${index}`,
          medName: medicine.medName || "Unknown Medicine",
          quantity: medicine.quantity || 0,
          price: parseFloat(medicine.price) || 0,
          category: medicine.category || "N/A",
          expiryDate: medicine.expiryDate || "N/A",
          manufacturer: medicine.manufacturer || "N/A",
          doctorId: medicine.doctorId || "N/A",
          createdAt: medicine.createdAt || "N/A",
        }));

        setMedicines(formattedData);
        setPagination((prev) => ({
          ...prev,
          total: response.data.totalRecords || formattedData.length,
        }));
      } else {
        throw new Error(response.message || "Error fetching medicines");
      }
    } catch (error: any) {
      console.error("Error fetching medicines:", error);
      Toast.show({
        type: "error",
        text1: error.message || "Error fetching medicines",
      });
      setMedicines([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctorId) fetchMedicines();
  }, [doctorId, refreshTrigger, pagination.current, pagination.pageSize]);

  const handleUpdateMedicine = async () => {
    if (!form.medName || !form.quantity || !form.price) {
      Toast.show({ type: "error", text1: "Please fill all fields" });
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await AuthPost(
        "pharmacy/updateMedicine",
        {
          id: editingMedicine?.id,
          medName: form.medName,
          quantity: Number(form.quantity),
          price: Number(form.price),
          doctorId,
        },
        token,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === "success") {
        const updatedMedicines = medicines.map((m) =>
          m.key === editingMedicine?.key
            ? {
                ...m,
                medName: form.medName,
                quantity: Number(form.quantity),
                price: Number(form.price),
              }
            : m
        );

        setMedicines(updatedMedicines);
        setEditModalVisible(false);
        setEditingMedicine(null);
        setForm({ medName: "", quantity: "", price: "" });
        Toast.show({ type: "success", text1: "Medicine updated successfully" });
      } else {
        throw new Error(response.message || "Failed to update medicine");
      }
    } catch (error: any) {
      console.error("Error updating medicine:", error);
      Toast.show({
        type: "error",
        text1: error.message || "Failed to update medicine",
      });
    }
  };

  const handleTableChange = (page: number, pageSize: number) => {
    setPagination({
      ...pagination,
      current: page,
      pageSize: pageSize,
    });
  };

  const handleInputChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleNumberChange = (name: string, value: string) => {
    const regex = /^[0-9]*\.?[0-9]*$/;
    if (regex.test(value)) {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCancel = () => {
    setEditModalVisible(false);
    setEditingMedicine(null);
    setForm({ medName: "", quantity: "", price: "" });
  };

  // Bulk import functionality
  const pickExcel = async () => {
    try {
      const result = await pick({
        allowMultiSelection: false,
        type: [types.allFiles],
        copyTo: "cachesDirectory",
      });

      const file = Array.isArray(result) ? result[0] : result;
      const uri = (file as any)?.fileCopyUri || (file as any)?.uri;
      if (!uri) throw new Error("No file path returned by picker");

      const path =
        Platform.OS === "ios"
          ? decodeURIComponent(uri.replace("file://", ""))
          : uri;

      const fileData = await RNFS.readFile(path, "base64");
      const wb = XLSX.read(fileData, { type: "base64" });
      const sheet = wb.SheetNames[0];
      const ws = wb.Sheets[sheet];
      const json = XLSX.utils.sheet_to_json(ws) as any[];

      const processed = json.map((row, idx) => {
        if (row.medName == null || row.quantity == null || row.price == null) {
          throw new Error('Excel must contain "medName", "quantity", and "price" columns');
        }
        return { 
          medName: String(row.medName), 
          quantity: Number(row.quantity), 
          price: Number(row.price), 
          row: idx + 2 
        };
      });

      setBulkPreview(processed);
      Toast.show({ type: "success", text1: "Parsed file. Review preview below." });
    } catch (e: any) {
      if (e?.code && String(e.code).toLowerCase().includes("cancel")) return;
      if (e?.message && String(e.message).toLowerCase().includes("cancel")) return;
      Toast.show({ type: "error", text1: e?.message || "Could not read file" });
    }
  };

  const uploadBulk = async () => {
    if (!bulkPreview.length) return Toast.show({ type: "error", text1: "No data to upload" });
    try {
      setUploading(true);
      const token = await AsyncStorage.getItem('authToken');

      const resp = await AuthPost("pharmacy/addMedicine/bulkMobileJson", {
        doctorId,
        medicines: bulkPreview.map((x) => ({ 
          medName: x.medName, 
          quantity: x.quantity, 
          price: x.price 
        })),
      }, token);

      if (resp?.data?.status === "success") {
        Toast.show({ type: "success", text1: `${bulkPreview.length} medicines added successfully` });
        setBulkPreview([]);
        fetchMedicines();
      } else {
        throw new Error(resp?.data?.message || "Failed to upload medicines");
      }
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.message || "Bulk upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const renderMedicineItem = ({ item }: { item: Medicine }) => (
    <View style={styles.row}>
      <View>
        <Text style={styles.medName}>{item.medName}</Text>
        <Text style={styles.medId}>ID: {item.id}</Text>
      </View>
      <Text style={styles.price}>₹ {Number(item.price).toLocaleString("en-IN")}</Text>
    </View>
  );

  const startIndex = pagination.total > 0 ? (pagination.current - 1) * pagination.pageSize + 1 : 0;
  const endIndex = Math.min(
    pagination.current * pagination.pageSize,
    pagination.total
  );

  const pageSizeOptions = [10, 20, 50];

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        {/* <TouchableOpacity style={styles.outlined} onPress={pickExcel}>
          <Text style={styles.outlinedText}>Bulk Import</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.primary} onPress={showModal}>
          <Text style={styles.primaryText}>Add Medicine</Text>
        </TouchableOpacity>
      </View>

      {loading  ? (
        <View style={styles.spinningContainer}>
                                        <ActivityIndicator size="large" color="#007bff" />
                                        <Text style={{color:'black'}}>Loading List...</Text>
                                        </View>
      ) : (
         medicines?.length === 0 ? (
                          <View style={styles.spinningContainer}>
                  <Text style={{color:'black'}}>No Data Found</Text>
                          </View>
                        
                        ) : (
                             <FlatList
          data={medicines}
          keyExtractor={(item) => item.key}
          renderItem={renderMedicineItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={loading}
          onRefresh={() => handleTableChange(1, pagination.pageSize)}
        />
                        )
     
      )}

      {/* Bulk preview panel */}
      {bulkPreview.length > 0 && (
        <View style={styles.bulkPanel}>
          <Text style={styles.bulkTitle}>Preview ({bulkPreview.length})</Text>
          <ScrollView style={{ maxHeight: 220 }}>
            {bulkPreview.map((r) => (
              <View key={r.row} style={styles.previewRow}>
                <Text style={{ flex: 1 }}>{r.medName}</Text>
                <Text style={{ width: 60, textAlign: "right" }}>Qty: {r.quantity}</Text>
                <Text style={{ width: 90, textAlign: "right" }}>₹ {r.price}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.outlined, { flex: 1 }]} onPress={() => setBulkPreview([])}>
              <Text style={styles.outlinedText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.primary, { flex: 1, opacity: uploading ? 0.6 : 1 }]} 
              disabled={uploading} 
              onPress={uploadBulk}
            >
              <Text style={styles.primaryText}>{uploading ? "Uploading..." : "Upload Medicines"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pagination */}
      {pagination.total > 0 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationText}>
            {pagination.total > 0 
              ? `Showing ${startIndex} to ${endIndex} of ${pagination.total} results`
              : 'No results found'
            }
          </Text>
          
          {pagination.total > pagination.pageSize && (
            <View style={styles.paginationControls}>
              <TouchableOpacity
                disabled={pagination.current === 1}
                onPress={() => handleTableChange(pagination.current - 1, pagination.pageSize)}
                style={[styles.pageBtn, pagination.current === 1 && styles.disabledBtn]}
              >
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              
              <View style={styles.pageSizeContainer}>
                <Text style={styles.pageSizeText}>Show:</Text>
                <ScrollView horizontal style={styles.pageSizeOptions}>
                  {pageSizeOptions.map((size) => (
                    <TouchableOpacity
                      key={size}
                      onPress={() => handleTableChange(1, size)}
                      style={[
                        styles.pageSizeBtn,
                        pagination.pageSize === size && styles.activePageSizeBtn
                      ]}
                    >
                      <Text style={pagination.pageSize === size ? styles.activePageSizeText : styles.pageSizeText}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <TouchableOpacity
                disabled={endIndex >= pagination.total}
                onPress={() => handleTableChange(pagination.current + 1, pagination.pageSize)}
                style={[styles.pageBtn, endIndex >= pagination.total && styles.disabledBtn]}
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={handleCancel}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Medicine</Text>

            <TextInput
              placeholder="Medicine Name"
              value={form.medName}
              onChangeText={(val) => handleInputChange("medName", val)}
              style={styles.input}
            />

            <TextInput
              placeholder="Quantity"
              keyboardType="numeric"
              value={form.quantity}
              onChangeText={(val) => handleNumberChange("quantity", val)}
              style={styles.input}
            />

            <TextInput
              placeholder="Price (₹)"
              keyboardType="decimal-pad"
              value={form.price}
              onChangeText={(val) => handleNumberChange("price", val)}
              style={styles.input}
            />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={[styles.outlined, { flex: 1 }]} onPress={handleCancel}>
                <Text style={styles.outlinedText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primary, { flex: 1 }]} onPress={handleUpdateMedicine}>
                <Text style={styles.primaryText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  loader: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  row: { 
    backgroundColor: "#fff", 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: "#e5e7eb", 
    flexDirection: "row", 
    justifyContent: "space-between" 
  },
  medName: { 
    fontWeight: "800", 
    color: "#0f172a" 
  },
  medId: { 
    color: "#475569", 
    marginTop: 2 
  },
  price: { 
    fontWeight: "800", 
    color: "#111827" 
  },
  topBar: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    gap: 8, 
    marginBottom: 10 
  },
  outlined: { 
    borderWidth: 1, 
    borderColor: "#1A3C6A", 
    borderRadius: 10, 
    paddingVertical: 10, 
    paddingHorizontal: 14 
  },
  outlinedText: { 
    color: "#1A3C6A", 
    fontWeight: "700" 
  },
  primary: { 
    backgroundColor: "#1A3C6A", 
    borderRadius: 10, 
    paddingVertical: 10, 
    paddingHorizontal: 14 
  },
  primaryText: { 
    color: "#fff", 
    fontWeight: "700" 
  },
  modalWrap: { 
    flex: 1, 
    backgroundColor: "#0006", 
    alignItems: "center", 
    justifyContent: "center", 
    padding: 16 
  },
  modalCard: { 
    width: "100%", 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    padding: 16, 
    gap: 10 
  },
  modalTitle: { 
    fontWeight: "800", 
    fontSize: 18, 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 1, 
    borderColor: "#e5e7eb", 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    backgroundColor: "#fff" 
  },
  paginationContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  paginationText: {
    marginBottom: 12,
    textAlign: 'center'
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pageBtn: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4
  },
  disabledBtn: {
    opacity: 0.5
  },
  pageBtnText: {
    color: '#1A3C6A'
  },
  pageSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pageSizeText: {
    marginRight: 8,
    color: '#666'
  },
  pageSizeOptions: {
    flexDirection: 'row'
  },
  pageSizeBtn: {
    padding: 4,
    marginHorizontal: 4,
    borderRadius: 4
  },
  activePageSizeBtn: {
    backgroundColor: '#1A3C6A'
  },
  activePageSizeText: {
    color: '#fff'
  },
  bulkPanel: { 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: "#e5e7eb", 
    padding: 12, 
    marginBottom: 10 
  },
  bulkTitle: { 
    fontWeight: "800", 
    marginBottom: 8, 
    color: "#0f172a" 
  },
  previewRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    borderBottomWidth: 1, 
    borderBottomColor: "#f1f5f9", 
    paddingVertical: 8 
  },
     spinningContainer : {
 flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
 padding: 10,
  },
});

export default MedicinesTab;