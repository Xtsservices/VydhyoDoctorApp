import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  PermissionsAndroid,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import { AuthFetch, AuthPost } from "../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// NEW: for PDF and saving to Downloads
import RNHTMLtoPDF from "react-native-html-to-pdf";
import RNFS from "react-native-fs";

type RootState = any;

type TestItem = {
  _id: string;
  testName: string;
  price?: number | null;
  status: "pending" | "completed" | "cancelled" | "in_progress" | string;
  createdAt?: string;
  updatedAt?: string;
  labTestID?: string;
};

type PatientRow = {
  patientId: string;
  patientName: string;
  DOB?: string; // dd-mm-yyyy
  gender?: string;
  mobile?: string;
  tests: TestItem[];
  labData?: Record<string, any>;
};

type Props = {
  status: "pending" | "completed";
  updateCount: () => void;
  searchValue: string;
};

const PAGE_SIZE_DEFAULT = 5;

export default function LabPatientManagement({ status, updateCount, searchValue }: Props) {
  const user = useSelector((state: any) => state.currentUser);
  const doctorId = user?.role === "doctor" ? user?.userId : user?.createdBy;

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState<Record<string, boolean>>({});
  const [editable, setEditable] = useState<string[]>([]);
  const [isPaymentDone, setIsPaymentDone] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const mounted = useRef(false);

  const fetchPatients = useCallback(
    async (pg = 1, limit = pageSize) => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        setLoading(true);
        const res = await AuthFetch(
          `lab/getAllTestsPatientsByDoctorID/${doctorId}?searchValue=${searchValue || ""}&status=${status}&page=${pg}&limit=${limit}`,
          token
        );

        if (res?.data?.status === "success" && res?.data?.data) {
          let data: PatientRow[] = res?.data?.data?.patients || [];

          // Client-side status guard (same logic as web)
          data = data.filter((p) => {
            if (status === "completed") {
              return p.tests.every((t) => t.status === "completed");
            } else {
              return p.tests.some((t) => t.status === "pending");
            }
          });

          if (pg === 1) setPatients(data);
          else setPatients((prev) => [...prev, ...data]);

          setTotalPatients(res?.data?.data?.pagination?.totalPatients || 0);
          setPage(pg);

          const payState: Record<string, boolean> = {};
          data.forEach((p) => {
            payState[p.patientId] = !p.tests.some((t) => t.status === "pending");
          });
          setIsPaymentDone((prev) => ({ ...prev, ...payState }));
        }
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: e?.response?.data?.message || "Failed to load patients",
        });
      } finally {
        setLoading(false);
      }
    },
    [doctorId, pageSize, searchValue, status]
  );

  useEffect(() => {
    if (!doctorId) return;
    mounted.current = true;
    fetchPatients(1, PAGE_SIZE_DEFAULT);
    return () => {
      mounted.current = false;
    };
  }, [doctorId, status, searchValue, fetchPatients]);

  const loadMore = () => {
    const maxPages = Math.ceil(totalPatients / pageSize);
    if (!loading && page < maxPages) {
      fetchPatients(page + 1, pageSize);
    }
  };

  const enableEdit = (testId: string) => {
    setEditable((prev) => (prev.includes(testId) ? prev : [...prev, testId]));
  };

  const handlePriceChange = (patientId: string, testId: string, value?: string) => {
    const num = value ? Number(value.replace(/[^\d.]/g, "")) : 0;
    setPatients((prev) =>
      prev.map((p) =>
        p.patientId === patientId
          ? {
              ...p,
              tests: p.tests.map((t) => (t._id === testId ? { ...t, price: isNaN(num) ? 0 : num } : t)),
            }
          : p
      )
    );
  };

  const handlePriceSave = async (patientId: string, testId: string, testName?: string) => {
    try {
      setSaving((s) => ({ ...s, [testId]: true }));
      const p = patients.find((x) => x.patientId === patientId);
      const t = p?.tests.find((x) => x._id === testId);
      if (!p || !t) return Toast.show({ type: "error", text1: "Test not found" });

      const price = t.price;
      if (price == null || isNaN(Number(price)) || Number(price) < 0) {
        return Toast.show({ type: "error", text1: "Please enter a valid price" });
      }
      const token = await AsyncStorage.getItem("authToken");
      const body = {
        testId,
        patientId,
        price: Number(price),
        doctorId,
        testName: (testName || "").trim(),
      };

      const resp = await AuthPost(`lab/updatePatientTestPrice`, body, token);

      if (resp?.data?.status === "success") {
        Toast.show({ type: "success", text1: "Price updated" });
        setEditable((prev) => prev.filter((id) => id !== testId));
      } else {
        throw new Error(resp?.message || "Unknown error");
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message || e?.message || "Failed to update price",
      });
    } finally {
      setSaving((s) => ({ ...s, [testId]: false }));
    }
  };

  const handlePayment = async (patientId: string) => {
    try {
      setPaying((p) => ({ ...p, [patientId]: true }));
      const patient = patients.find((x) => x.patientId === patientId);
      if (!patient) return;

      const totalAmount = patient.tests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
      if (totalAmount <= 0) {
        Toast.show({ type: "error", text1: "No valid prices set for payment" });
        return;
      }
      // block if any edited but not saved
      const hasUnconfirmed = patient.tests.some((t) => editable.includes(t._id) && t.price != null);
      if (hasUnconfirmed) {
        Toast.show({ type: "error", text1: "Confirm all prices before payment" });
        return;
      }
      const token = await AsyncStorage.getItem("authToken");
      const body = {
        patientId,
        doctorId,
        amount: totalAmount,
        tests: patient.tests.map((t) => ({ testId: t._id, price: t.price, labTestID: t.labTestID })),
      };
      const resp = await AuthPost(`lab/processPayment`, body, token);

      if (resp?.data?.status === "success") {
        Toast.show({ type: "success", text1: "Payment processed" });
        setIsPaymentDone((prev) => ({ ...prev, [patientId]: true }));
        updateCount();
        fetchPatients(1, pageSize);
      }
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.message || "Payment failed" });
    } finally {
      setPaying((p) => ({ ...p, [patientId]: false }));
    }
  };

  // ============ NEW: Build invoice HTML (same format you had) ============
  const buildInvoiceHTML = (patient: PatientRow, tests: TestItem[]) => {
    const total = tests.reduce((s, t) => s + (Number(t.price) || 0), 0);
    const patientNumber = String(patient.patientId || "").replace(/\D/g, "");
    const invoiceNumber = `INV-${patientNumber.padStart(3, "0")}`;
    const now = new Date();
    const billingDate = now.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const firstName = (patient.patientName || "").split(" ")[0] || "";
    const lastName = (patient.patientName || "").split(" ").slice(1).join(" ");

    const lab = patient.labData || {};
    const headerUrl = lab.labHeaderUrl || "";

    const itemDate =
      tests.length === 1
        ? tests[0].updatedAt
          ? new Date(tests[0].updatedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : new Date(tests[0].createdAt || Date.now()).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
        : new Date(tests[0].createdAt || Date.now()).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

    const contactInfoHTML = `
      <div class="provider-name">${lab.labName || "Diagnostic Lab"}</div>
      <p>${lab.labAddress || "N/A"}</p>
      <p>GST: ${lab.labGst || "N/A"}</p>
      <p>PAN: ${lab.labPan || "N/A"}</p>
      <p>Registration No: ${lab.labRegistrationNo || "N/A"}</p>
    `;

    const rows = tests
      .map(
        (t, i) => `
        <tr>
          <td>${i + 1}.</td>
          <td>${t.testName || ""}</td>
          <td class="price-column">${Number(t.price || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice</title>
        <style>
          html, body { margin:0; padding:0; font-family: Arial, sans-serif; }
          .container { padding: 15px; }
          .header-img img { width: 100%; max-height: 220px; object-fit: contain; }
          .provider-name { font-size: 18px; font-weight: 700; }
          .section { margin-top: 10px; }
          .patient-info { display:flex; justify-content: space-between; background:#f8f9fa; padding:10px; border-radius:6px; }
          .data-table { width:100%; border-collapse: collapse; margin-top:8px; }
          .data-table th, .data-table td { border:1px solid #ddd; padding: 8px; text-align:left; }
          .data-table th { background:#f8f9fa; }
          .price-column { text-align:right; }
          .total { text-align:right; font-weight:700; margin-top:8px; }
          .footer { text-align:center; color:#666; margin-top:16px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${headerUrl ? `<div class="header-img"><img src="${headerUrl}" /></div>` : `<div>${contactInfoHTML}</div>`}
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
                <p><strong>Referred by Dr.</strong> ${user?.firstname || "N/A"} ${user?.lastname || ""}</p>
                <p><strong>Appointment Date&Time:</strong> ${itemDate}</p>
                <p><strong>Invoice No:</strong> #${invoiceNumber}</p>
                <p><strong>Billing Date:</strong> ${billingDate}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Tests</h3>
            <table class="data-table">
              <thead><tr><th>SL No.</th><th>Name</th><th>Price (₹)</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="total">Grand Total: ₹ ${total.toFixed(2)}</div>
          </div>

          <div class="footer">
            <p>Thank you for choosing Vydhyo</p>
            <p>Powered by Vydhyo</p>
          </div>
        </div>
      </body>
    </html>`;

    const fileBaseName = `Vydhyo_Invoice_${invoiceNumber}`;
    return { html, fileBaseName };
  };

  // ============ NEW: Permission helper for Android ============
  const ensureAndroidWritePermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: "Storage permission",
          message: "Allow saving invoices to your Downloads folder.",
          buttonPositive: "Allow",
        }
      );
      return (
        granted === PermissionsAndroid.RESULTS.GRANTED ||
        granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      );
    } catch {
      return false;
    }
  };

  // ============ NEW: Download (replaces print) ============
  const downloadInvoicePdf = async (p: PatientRow) => {
    // Include only completed items (same as your print rule)
    const completed = p.tests.filter((t) =>
      ["completed", "complete", "paid"].includes(String(t.status).toLowerCase())
    );
    if (!completed.length) {
      return Toast.show({ type: "error", text1: "No completed tests to download" });
    }

    const isLabEmpty =
      !p.labData ||
      Object.keys(p.labData).length === 0 ||
      Object.values(p.labData).every((v) => v == null);

    try {
      if (Platform.OS === "android") {
        const ok = await ensureAndroidWritePermission();
        if (!ok) {
          Toast.show({ type: "error", text1: "Storage permission denied" });
          return;
        }
      }

      const { html, fileBaseName } = buildInvoiceHTML(p, completed);

      // 1) Create PDF from HTML
      const { filePath } = await RNHTMLtoPDF.convert({
        html,
        fileName: fileBaseName,
        base64: false,
      });

      let finalPath = filePath;

      // 2) Move/copy into Downloads on Android
      if (Platform.OS === "android" && RNFS.DownloadDirectoryPath) {
        const dest = `${RNFS.DownloadDirectoryPath}/${fileBaseName}.pdf`;
        try {
          // ensure we overwrite if exists
          const exists = await RNFS.exists(dest);
          if (exists) {
            await RNFS.unlink(dest);
          }
          await RNFS.copyFile(filePath!, dest);
          finalPath = dest;
          Toast.show({ type: "success", text1: "Saved to Downloads", text2: finalPath });
        } catch (e) {
          // fallback: keep original location but still inform path
          Toast.show({
            type: "info",
            text1: "Saved (fallback path)",
            text2: finalPath,
          });
        }
      } else {
        // iOS or other platforms
        Toast.show({
          type: "success",
          text1: "PDF saved",
          text2: finalPath,
        });
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Could not generate PDF",
        text2: e?.message || "Unknown error",
      });
    }
  };

  // UI helpers
  const statusTag = (sts: string) => {
    const norm = (sts || "").toLowerCase();
    const color =
      norm === "completed"
        ? "#16a34a"
        : norm === "pending"
        ? "#d97706"
        : norm === "cancelled"
        ? "#dc2626"
        : norm === "in_progress"
        ? "#2563eb"
        : "#6b7280";
    const label =
      norm === "completed"
        ? "Completed"
        : norm === "pending"
        ? "Pending"
        : norm === "cancelled"
        ? "Cancelled"
        : norm === "in_progress"
        ? "In Progress"
        : "Unknown";
    return (
      <View style={[styles.tag, { backgroundColor: color + "22", borderColor: color }]}>
        <Text style={{ color, fontWeight: "600" }}>{label}</Text>
      </View>
    );
  };

  const renderTestRow = (p: PatientRow, t: TestItem) => {
    const isEditable = editable.includes(t._id);
    const initiallyNull = t.price == null;

    return (
      <View key={t._id} style={styles.testRow}>
        <Text style={styles.testName}>{t.testName}</Text>

        <View style={styles.priceRow}>
          <TextInput
            keyboardType="numeric"
            placeholder="Enter price"
            value={t.price != null ? String(t.price) : ""}
            onFocus={() => {
              if (!isEditable) enableEdit(t._id);
            }}
            editable={t.status === "pending" && (isEditable || initiallyNull)}
            onChangeText={(val) => handlePriceChange(p.patientId, t._id, val)}
            style={[
              styles.priceInput,
              !(t.status === "pending" && (isEditable || initiallyNull)) && styles.priceInputDisabled,
            ]}
          />
          <TouchableOpacity
            onPress={() => handlePriceSave(p.patientId, t._id, t.testName)}
            disabled={t.price == null || saving[t._id] || !(t.status === "pending" && (isEditable || initiallyNull))}
            style={[
              styles.saveBtn,
              (t.price == null || saving[t._id] || !(t.status === "pending" && (isEditable || initiallyNull))) &&
                styles.btnDisabled,
            ]}
          >
            <Text style={styles.saveBtnText}>{saving[t._id] ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
          <View>{statusTag(t.status)}</View>
        </View>

        {t.createdAt && (
          <Text>
            {new Date(t.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
        )}
      </View>
    );
  };

  const calcTotal = (p: PatientRow) => p.tests.reduce((s, t) => s + (Number(t.price) || 0), 0);

  const patientStatus = (p: PatientRow) => {
    const allCompleted = p.tests.every((t) => t.status === "completed");
    const anyPending = p.tests.some((t) => t.status === "pending");
    if (allCompleted) return { label: "Completed", color: "#16a34a" };
    if (anyPending && !p.tests.some((t) => t.status === "completed")) return { label: "Pending", color: "#d97706" };
    return { label: "Partial", color: "#f59e0b" };
  };

  const renderPatient = ({ item }: { item: PatientRow }) => {
    const total = calcTotal(item);
    const sts = patientStatus(item);
    const hasPending = item.tests.some((t) => t.status === "pending");
    const paid = isPaymentDone[item.patientId];

    // Filter tests based on status
    const filteredTests =
      status === "pending"
        ? item.tests.filter((t) => t.status === "pending")
        : item.tests.filter((t) => t.status === "completed");

    return (
      <View style={styles.rowCard}>
        <View style={styles.rowHeader}>
          <View>
            <Text style={styles.pid}>Patient ID: {item.patientId}</Text>
            <Text style={styles.pname}>{item.patientName}</Text>
          </View>
          {/* <View style={[styles.tag, { backgroundColor: sts.color + "22", borderColor: sts.color }]}>
            <Text style={{ color: sts.color, fontWeight: "700" }}>{sts.label}</Text>
          </View> */}
        </View>

        {/* Tests */}
        <View style={styles.testsBox}>
          {filteredTests.length > 0 ? (
            filteredTests.map((t) => renderTestRow(item, t))
          ) : (
            <Text style={{ color: "black" }}>{status === "pending" ? "No Pending Tests" : "No Completed Tests"}</Text>
          )}
        </View>

        <View style={styles.footerBar}>
          <Text style={styles.totalText}>Total: ₹ {total.toFixed(2)}</Text>

          {status === "completed" ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => downloadInvoicePdf(item)}>
              <Text style={styles.primaryBtnText}>Download PDF</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (total <= 0 || !hasPending || paid || paying[item.patientId]) && styles.btnDisabled,
              ]}
              disabled={total <= 0 || !hasPending || paid || paying[item.patientId]}
              onPress={() => handlePayment(item.patientId)}
            >
              <Text style={styles.primaryBtnText}>
                {paid ? "Paid" : paying[item.patientId] ? "Processing..." : "Process Payment"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={styles.spinningContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={{color:'black'}}>Loading List...</Text>
                </View>
      ) : (
        patients?.length === 0 ? (
          <View style={styles.spinningContainer}>
  <Text style={{color:'black'}}>No Data Found</Text>
          </View>
        
        ) : (
          <FlatList
            data={patients}
            keyExtractor={(x) => x.patientId}
            renderItem={renderPatient}
            contentContainerStyle={{ paddingBottom: 24 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            refreshing={loading}
            onRefresh={() => fetchPatients(1, pageSize)}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  testsBox: { backgroundColor: "#f9fafb", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", padding: 8 },
  testRow: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", padding: 10, marginBottom: 8 },
  testName: { fontWeight: "700", color: "#0f172a" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, justifyContent: "space-between" },
  priceInput: {
    flex: 0,
    width: 120,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 1,
    backgroundColor: "#fff",
    color: "#000000", 
  },
  priceInputDisabled: { backgroundColor: "#f3f4f6", color: "#94a3b8" },
  saveBtn: { backgroundColor: "#1f2937", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  footerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  totalText: { fontWeight: "800", color: "#0f172a" },
  primaryBtn: { backgroundColor: "#1A3C6A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
   spinningContainer : {
 flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
 padding: 10,
  },
});
