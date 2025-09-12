import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Modal, TextInput,
  TouchableOpacity, ActivityIndicator, Platform, ScrollView,
  Alert
} from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import { pick, types } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
import * as XLSX from "xlsx";
import { AuthFetch, AuthPost } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

type RootState = any;

type TestRow = {
  testId: string;
  testName: string;
  price: number;
};

export default function TestManagement() {
  const user = useSelector((s: RootState) => s.currentUser);
  const doctorId = user?.role === "doctor" ? user?.userId : user?.createdBy;

  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // add modal
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");

  // bulk modal-like flow (inline)
  const [bulkPreview, setBulkPreview] = useState<{ testName: string; testPrice: number; row: number }[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchTests = useCallback(async (pg = 1) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      setLoading(true);
      const res = await AuthFetch(`lab/getTestsByDoctorId/${doctorId}?page=${pg}&limit=${pageSize}`, token);
      console.log(res, "rest response")
      const fetched = (res?.data?.data?.tests || []).map((t: any) => ({
        testId: t.id,
        testName: t.testName,
        price: t.testPrice,
      }));
      if (pg === 1) setTests(fetched);
      else setTests((prev) => [...prev, ...fetched]);

      setTotal(res?.data?.data?.pagination?.totalTests || 0);
      setPage(pg);
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.message || "Failed to fetch tests" });
    } finally {
      setLoading(false);
    }
  }, [doctorId, pageSize]);

  useEffect(() => { if (doctorId) fetchTests(1); }, [doctorId, fetchTests]);

  const loadMore = () => {
    const max = Math.ceil(total / pageSize);
    if (!loading && page < max) fetchTests(page + 1);
  };

  const openAdd = () => { setAddOpen(true); setName(""); setPrice(""); };

  const addTest = async () => {
    if (!name.trim()) return Toast.show({ type: "error", text1: "Enter test name" });
    const p = Number(price);
    if (isNaN(p) || p < 0) return Toast.show({ type: "error", text1: "Enter valid price" });

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      const resp = await AuthPost("lab/addtest", { testName: name.trim(), testPrice: p, doctorId }, token);
      console.log("response of test", resp)
      if (resp?.status === 'success') {
        Toast.show({ type: "success", text1: "Test added" });
        setAddOpen(false);
        fetchTests(1);
      } else {
        Alert.alert("Error", resp?.message?.message)
        // throw new Error(resp?.message?.message);
      }
    } catch (e: any) {
      console.log(e?.response, "error response")
      const msg = e?.response?.status === 400 && e?.response?.data?.message?.message === "A test with this name already exists"
        ? "A test with this name already exists"
        : (e?.response?.data?.message?.message || "Failed to   ");
      Alert.alert("Error", e)
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  const pickExcel = async () => {
    try {
      // @react-native-documents/picker
      const result = await pick({
        allowMultiSelection: false,
        // Using allFiles covers both .xlsx & .xls; add more if your lib exposes them
        type: [types.allFiles],
        // ensure we get a real file:// path we can read with RNFS
        copyTo: "cachesDirectory",
      });

      const file = Array.isArray(result) ? result[0] : result;
      const uri = (file as any)?.fileCopyUri || (file as any)?.uri;
      if (!uri) throw new Error("No file path returned by picker");

      // normalize path for RNFS
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
        if (row.testName == null || row.testPrice == null) {
          throw new Error('Excel must contain exactly "testName" and "testPrice" columns');
        }
        return { testName: String(row.testName), testPrice: Number(row.testPrice), row: idx + 2 };
      });

      setBulkPreview(processed);
      Toast.show({ type: "success", text1: "Parsed file. Review preview below." });
    } catch (e: any) {
      // treat user cancel silently
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

      // JSON-based bulk endpoint for mobile (as discussed)
      const resp = await AuthPost("lab/addtest/bulkMobileJson", {
        doctorId,
        tests: bulkPreview.map((x) => ({ testName: x.testName, testPrice: x.testPrice })),
      }, token);

      if (resp?.data?.data?.insertedCount > 0) {
        Toast.show({ type: "success", text1: `${resp.data.data.insertedCount} tests added` });
        setBulkPreview([]);
        fetchTests(1);
      } else if (resp?.data?.data?.errors?.length) {
        Toast.show({ type: "error", text1: "All tests already exist" });
      }
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.message || "Bulk upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item }: { item: TestRow }) => (
    <View style={styles.row}>
      <View>
        <Text style={styles.tname}>{item.testName}</Text>
        <Text style={styles.tsub}>ID: {item.testId}</Text>
      </View>
      <Text style={styles.price}>₹ {Number(item.price).toLocaleString("en-IN")}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        {/* <TouchableOpacity style={styles.outlined} onPress={pickExcel}>
          <Text style={styles.outlinedText}>Bulk Import</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.primary} onPress={openAdd}>
          <Text style={styles.primaryText}>Add Test</Text>
        </TouchableOpacity>
      </View>

      {loading && tests.length === 0 ? (
        <View style={styles.spinningContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={{ color: 'black' }}>Loading List...</Text>
        </View>
      ) : (
        tests?.length === 0 ? (
          <View style={styles.spinningContainer}>
            <Text style={{ color: 'black' }}>No Data Found</Text>
          </View>

        ) : (
          <FlatList
            data={tests}
            keyExtractor={(x) => x.testId}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            refreshing={loading}
            onRefresh={() => fetchTests(1)}
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
                <Text style={{ flex: 1 }}>{r.testName}</Text>
                <Text style={{ width: 90, textAlign: "right" }}>₹ {r.testPrice}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.outlined, { flex: 1 }]} onPress={() => setBulkPreview([])}>
              <Text style={styles.outlinedText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primary, { flex: 1, opacity: uploading ? 0.6 : 1 }]} disabled={uploading} onPress={uploadBulk}>
              <Text style={styles.primaryText}>{uploading ? "Uploading..." : "Upload Tests"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Test Modal */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Test</Text>
            <TextInput
              placeholder="Test Name"
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: "#000000" }]} // Add color here
              placeholderTextColor="#999999" // Optional: style placeholder text
            />
            <TextInput
              placeholder="Test Price (₹)"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              style={[styles.input, { color: "#000000" }]} // Add color here
              placeholderTextColor="#999999" // Optional: style placeholder text
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={[styles.outlined, { flex: 1 }]} onPress={() => setAddOpen(false)}>
                <Text style={styles.outlinedText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primary, { flex: 1 }]} onPress={addTest}>
                <Text style={styles.primaryText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", justifyContent: "space-between" },
  tname: { fontWeight: "800", color: "#0f172a" },
  tsub: { color: "#475569", marginTop: 2 },
  price: { fontWeight: "800", color: "#111827" },
  topBar: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 10 },
  outlined: { borderWidth: 1, borderColor: "#1A3C6A", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  outlinedText: { color: "#1A3C6A", fontWeight: "700" },
  primary: { backgroundColor: "#1A3C6A", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  primaryText: { color: "#fff", fontWeight: "700" },
  modalWrap: { flex: 1, backgroundColor: "#0006", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 10 },
  modalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 8 ,color: "#0f172a" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff" },
  bulkPanel: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12, marginBottom: 10 },
  bulkTitle: { fontWeight: "800", marginBottom: 8, color: "#0f172a" },
  previewRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 8 },
  spinningContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },

});
