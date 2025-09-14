import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { AuthFetch } from "../../auth/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import LabPatientManagement from "./LabPatientManagement";
import TestManagement from "./TestManagement";

type RootState = any;

type RevenueCards = {
  today?: { revenue?: number; patients?: number };
  month?: { revenue?: number; patients?: number };
};

const Tabs = ["Patients", "Completed", "Tests"] as const;
type TabKey = typeof Tabs[number];

export default function LabsScreen() {
      const user = useSelector((state: any) => state.currentUser);
    
//   const user = useSelector((state: RootState) => state.currentUserData);
  const doctorId = user?.role === "doctor" ? user?.userId : user?.createdBy;

  const [active, setActive] = useState<TabKey>("Patients");
  const [cardsData, setCardsData] = useState<RevenueCards>({});
  const [searchValue, setSearchValue] = useState("");
  const hasFetched = useRef(false);

  const fetchRevenueCount= async() =>{
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await AuthFetch(
        `finance/getDoctorTodayAndThisMonthRevenue/lab?doctorId=${doctorId}`, token
      );
      if (res?.data?.status === "success" && res?.data?.data) {
        setCardsData(res?.data?.data);
      }
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Failed to load revenue" });
    }
  }

  useEffect(() => {
    if (user && doctorId && !hasFetched.current) {
      hasFetched.current = true;
      fetchRevenueCount();
    }
  }, [user, doctorId]);

  const updateCount = () => fetchRevenueCount();

  return (
    <View style={styles.container}>
     
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}><Text style={styles.iconText}>⚗</Text></View>
          <Text style={styles.title}>Labs</Text>
        </View>
        <TextInput
          placeholder="Search by Patient Id"
          value={searchValue}
          onChangeText={(t) => setSearchValue(t.trim())}
          style={styles.search}
          placeholderTextColor="#9aa0a6"
        />
      </View>

      {/* Revenue Cards */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: "#DBEAFE" }]}>
          <Text style={[styles.cardLabel, { color: "#2563EB" }]}>Today Revenue</Text>
          <Text style={[styles.cardValue, { color: "#2563EB" }]}>
            ₹ {cardsData?.today?.revenue || 0}
          </Text>
          <Text style={{ color: "#2563EB" }}>
            Patient: {cardsData?.today?.patients || 0}
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
        {Tabs.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setActive(t)}
            style={[styles.tab, active === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, active === t && styles.tabTextActive]}>
              {t === "Patients" ? "Pending" : t === "Completed" ? "Completed" : "Tests"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body */}
      <View style={{ flex: 1 }}>
        {active === "Patients" && (
          <LabPatientManagement
            status="pending"
            searchValue={searchValue}
            updateCount={updateCount}
          />
        )}
        {active === "Completed" && (
          <LabPatientManagement
            status="completed"
            searchValue={searchValue}
            updateCount={updateCount}
          />
        )}
        {active === "Tests" && 
        <TestManagement />
        }
      </View>
       <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBox: { width: 32, height: 32, backgroundColor: "#1890ff", borderRadius: 6, alignItems: "center", justifyContent: "center" },
  iconText: { color: "#fff", fontWeight: "bold" },
  title: { fontSize: 22, fontWeight: "700", color: "#262626" },
  search: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  card: { flex: 1, borderRadius: 10, padding: 12 },
  cardLabel: { fontWeight: "600", marginBottom: 6 },
  cardValue: { fontWeight: "800", fontSize: 24, marginBottom: 6 },
  tabs: { flexDirection: "row", backgroundColor: "#e5e7eb", padding: 4, borderRadius: 10, marginBottom: 10 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: "#475569", fontWeight: "600" },
  tabTextActive: { color: "#111827" },
});
