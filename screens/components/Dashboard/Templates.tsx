// Templates.tsx — React Native (TypeScript) with inventory dropdowns, onBlur-only errors, RX-like validations & auto-quantity
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { AuthFetch, AuthPost, AuthPut, authDelete } from '../../auth/auth';

// =============================
// Types
// =============================
type Medication = {
  _id?: string;
  medName: string;
  medicineType: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Other';
  quantity: number | string; // string when manual (e.g., "1 bottle")
  dosage: string;
  duration: number | null;
  frequency: '1-0-0' | '0-1-0' | '0-0-1' | '1-1-0' | '1-0-1' | '0-1-1' | '1-1-1' | 'SOS' | 'Other';
  timings: string[];
  notes?: string;
  medInventoryId?: string | null;
  status?: 'active' | 'inactive';
};

type Template = {
  _id?: string;
  uniqueId?: string;
  name: string;
  userId: string;
  doctorId?: string;
  createdBy?: string;
  medications: Medication[];
  createdAt?: string;
  updatedAt?: string;
  status?: 'active' | 'inactive';
};

// Inline error structure per medication
type MedErrors = {
  medName?: string;
  medicineType?: string;
  dosage?: string;
  duration?: string;
  frequency?: string;
  timings?: string;
  quantity?: string;
  notes?: string;
};

// Inventory type (minimal fields we use)
type MedInventoryItem = {
  _id: string;
  medName: string;
  dosage: string;
  price?: number;
};

// =============================
// Constants
// =============================
const MEDICINE_TYPES = ['Tablet','Capsule','Syrup','Injection','Ointment','Other'] as const;
const FREQ = ['1-0-0','0-1-0','0-0-1','1-1-0','1-0-1','0-1-1','1-1-1','SOS','Other'] as const;
const TIMINGS = [
  'Before Breakfast','After Breakfast','Before Lunch','After Lunch','Before Dinner','After Dinner','Bedtime',
] as const;

const PAGE_SIZE = 8;

// Manual quantity types
const MANUAL_QTY_TYPES: Medication['medicineType'][] = ['Syrup', 'Ointment'];

const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDDMonYYYY = (val?: string) => {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const mon = monthShort[d.getMonth()];
  const yr = d.getFullYear();
  return `${day}-${mon}-${yr}`;
};

// Build the same “medications summary” string
const buildMedSummary = (m: Medication) => {
  const parts = [
    m?.medName,
    m?.dosage,
    m?.frequency,
    (m?.timings || []).join(', '),
    m?.medicineType,
    (m?.quantity || m?.duration) ? `Qty ${m?.quantity ?? '-'} • ${m?.duration ?? '-'}d` : undefined,
  ].filter(Boolean);
  return parts.join(' • ');
};

// =============================
// RX-like helpers
// =============================
const validateDosage = (dosage: string) =>
  (/^\d+(\.\d+)?\s*(mg|mcg|g|kg|ml|l|tablet|tab|capsule|cap|tsp|tbsp|tablespoon|teaspoon|spoon|drop|unit|puff|spray|amp|ampoule|vial)s?$/i).test(dosage);

const requiredTimingCount = (frequency: Medication['frequency']) => {
  if (frequency === 'SOS') return 0;
  if (!frequency) return 0 as any;
  return String(frequency).split('-').filter(x => x === '1').length;
};

const isManualQuantityType = (type: Medication['medicineType']) => MANUAL_QTY_TYPES.includes(type);

const calculateQuantity = (
  frequency: Medication['frequency'] | null,
  duration: number | null,
  type: Medication['medicineType'] | null
) => {
  if (!frequency || !duration || !type) return 0;
  if (isManualQuantityType(type)) return 0; // manual entry
  if (frequency === 'SOS') return duration;
  const freqCount = String(frequency).split('-').filter(x => x === '1').length || 0;
  return freqCount * (duration || 0);
};

// Inline validator that returns error strings per field
const getMedicationErrors = (m: Medication): MedErrors => {
  const errors: MedErrors = {};
  if (!m?.medName || !String(m.medName).trim()) errors.medName = 'Enter a valid medicine name';
  if (!m.medicineType) errors.medicineType = 'Select a medicine type';
  if (!m.dosage || !validateDosage(m.dosage)) errors.dosage = 'Enter valid dosage (e.g., 500 mg, 5 ml, 1 tablet)';
  if (m.duration === null || Number(m.duration) <= 0) errors.duration = 'Duration must be greater than 0';
  if (!m.frequency) errors.frequency = 'Select a frequency';
  if (m.frequency !== 'Other') {
    const required = requiredTimingCount(m.frequency);
    if ((m.timings?.length || 0) !== required) errors.timings = `Select ${required} timing(s)`;
  }
  if (isManualQuantityType(m.medicineType)) {
    if (!m.quantity || String(m.quantity).trim().length === 0) errors.quantity = 'Enter quantity (e.g., "1 bottle")';
  } else {
    if (!m.quantity || Number(m.quantity) <= 0) errors.quantity = 'Quantity must be greater than 0';
  }
  return errors;
};

// =============================
// Lightweight Dropdowns (bottom sheets)
// =============================
type Option = { label: string; value: string };

const Select: React.FC<{
  label?: string;
  value?: string;
  placeholder?: string;
  options: Option[];
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
}> = ({ label, value, placeholder = 'Select…', options, onChange, onBlur, error }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label;

  const close = () => {
    setOpen(false);
    onBlur?.();
  };

  return (
    <View style={{ marginBottom: 10 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={[styles.input, error && styles.inputError]} onPress={() => setOpen(true)}>
        <Text style={{ color: selectedLabel ? '#111' : '#9CA3AF' }}>
          {selectedLabel || placeholder}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          <View />
        </TouchableOpacity>
        <View style={styles.dropdownSheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {options.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={styles.dropdownItem}
                onPress={() => {
                  onChange(o.value);
                  close();
                }}
              >
                <Text style={styles.dropdownItemText}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const MultiSelect: React.FC<{
  label?: string;
  values: string[];
  placeholder?: string;
  options: Option[];
  onChange: (v: string[]) => void;
  onBlur?: () => void;
  max?: number;
  error?: string;
}> = ({ label, values, placeholder = 'Select…', options, onChange, max, onBlur, error }) => {
  const [open, setOpen] = useState(false);
  const display = values.length ? options.filter(o => values.includes(o.value)).map(o => o.label).join(', ') : '';

  const toggle = (val: string) => {
    const exists = values.includes(val);
    let next = exists ? values.filter(v => v !== val) : [...values, val];
    if (max !== undefined && max >= 0 && next.length > max) next = next.slice(0, max);
    onChange(next);
  };

  const close = () => {
    setOpen(false);
    onBlur?.();
  };

  return (
    <View style={{ marginBottom: 10 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={[styles.input, error && styles.inputError]} onPress={() => setOpen(true)}>
        <Text style={{ color: display ? '#111' : '#9CA3AF' }}>
          {display || placeholder}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          <View />
        </TouchableOpacity>
        <View style={styles.dropdownSheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {options.map((o) => {
              const active = values.includes(o.value);
              return (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.dropdownItem, active && { backgroundColor: '#eef2ff' }]}
                  onPress={() => toggle(o.value)}
                >
                  <Text style={styles.dropdownItemText}>
                    {active ? '✓ ' : ''}{o.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={close}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

// =============================
// Main component
// =============================
const SEARCH_LIMIT = 50;

const Templates: React.FC = () => {
  const user = useSelector((s: any) => s?.currentUserData ?? s?.currentUser);
  const doctorId: string =
    (user?.role === 'doctor' && user?.userId) || user?.createdBy || user?.userId || '';

  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  // Edit/create state
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = !!editingId;

  // Form state
  const [tplName, setTplName] = useState('');
  const [tplNameTouched, setTplNameTouched] = useState(false);
  const [tplStatus, setTplStatus] = useState<'active' | 'inactive'>('active');
  const [tplNameError, setTplNameError] = useState<string | undefined>(undefined);

  const initialMed: Medication = {
    medName: '',
    medicineType: 'Tablet',
    quantity: 0,
    dosage: '',
    duration: null,
    frequency: '1-0-0',
    timings: [],
    notes: '',
    medInventoryId: null,
    status: 'active',
  };

  const [medications, setMedications] = useState<Medication[]>([initialMed]);

  // Inline error/touched tracking per med
  const [medErrors, setMedErrors] = useState<MedErrors[]>([{}]);
  const [medTouched, setMedTouched] = useState<Record<keyof MedErrors, boolean>[]>([{} as any]);

  // ===== Inventory (pharmacy) =====
  const [medInventory, setMedInventory] = useState<MedInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  // per-med index filtered suggestions
  const [filteredMedicines, setFilteredMedicines] = useState<Record<number, MedInventoryItem[]>>({});
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTplStatus('active');
    setTplName('');
    setTplNameTouched(false);
    setTplNameError(undefined);
    setMedications([initialMed]);
    setMedErrors([getMedicationErrors(initialMed)]);
    setMedTouched([{} as any]);
    setActiveDropdown(null);
    setFilteredMedicines({});
  };

  // recompute quantity & timings trim when certain fields change
  const recomputeFor = (m: Medication): Medication => {
    const type = m.medicineType || null;
    const duration = m.duration !== null ? Number(m.duration) : null;
    const freq = m.frequency || null;

    let newTimings = [...(m.timings || [])];
    if (freq && freq !== 'Other') {
      const req = requiredTimingCount(freq);
      if (req === 0) newTimings = [];
      else if (newTimings.length > req) newTimings = newTimings.slice(0, req);
    }

    let newQty: number | string = m.quantity;
    if (isManualQuantityType(type as any)) {
      if (typeof newQty === 'number') newQty = '';
    } else {
      const calc = calculateQuantity(freq, duration, type);
      newQty = calc || 0;
    }

    return { ...m, timings: newTimings, quantity: newQty };
  };

  // Save button enablement mirrors validations
  const canSubmit = useMemo(() => {
    if (!tplName?.trim() || !medications.length) return false;
    for (const m of medications) {
      const errs = getMedicationErrors(m);
      if (Object.keys(errs).length) return false;
    }
    return true;
  }, [tplName, medications]);

  const fetchTemplates = async () => {
    if (!doctorId) {
      Toast.show({ type: 'error', text1: 'Missing doctorId', text2: 'Please login again.' });
      return;
    }
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await AuthFetch(`template/getTemplatesByDoctorId?doctorId=${doctorId}`, token);
      const data = res?.data?.data || res?.data || [];
      const list: Template[] = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime());
      setItems(list);
      setPage(1);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Failed to load templates' });
    } finally {
      setLoading(false);
    }
  };

  // fetch pharmacy inventory
  const fetchInventory = async () => {
    try {
      setInventoryLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await AuthFetch('pharmacy/getAllMedicinesByDoctorID', token);
      const meds: MedInventoryItem[] = (res?.data?.data || []).map((m: any) => ({
        _id: m?._id,
        medName: m?.medName || '',
        dosage: m?.dosage || '',
        price: m?.price,
      }));
      meds.sort((a, b) => a.medName.localeCompare(b.medName));
      setMedInventory(meds);
    } catch (e) {
      console.log('inventory fetch error', e);
      Toast.show({ type: 'error', text1: 'Failed to load medicine inventory' });
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const onOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  // ------- CREATE / UPDATE -------
  const onSubmit = async () => {
    try {
      if (!doctorId) {
        Toast.show({ type: 'error', text1: 'Missing doctorId', text2: 'Please login again.' });
        return;
      }
      // final inline validation for template name
      if (!tplName?.trim()) {
        setTplNameTouched(true);
        setTplNameError('Template name is required');
        return;
      } else {
        setTplNameError(undefined);
      }

      // Final per-med validation
      const newErrors = medications.map(getMedicationErrors);
      setMedErrors(newErrors);
      const hasAny = newErrors.some(e => Object.keys(e).length);
      if (hasAny) {
        // mark all fields as touched to reveal all errors (will show after this submit attempt)
        setMedTouched(newErrors.map(() => ({
          medName: true,
          medicineType: true,
          dosage: true,
          duration: true,
          frequency: true,
          timings: true,
          quantity: true,
          notes: true,
        } as any)));
        Toast.show({ type: 'error', text1: 'Please fix highlighted errors' });
        return;
      }

      const token = await AsyncStorage.getItem('authToken');

      if (isEditing && editingId) {
        const payload = {
          name: (tplName || '').trim(),
          status: tplStatus,
          medications: medications.map((m) => ({
            ...(m._id ? { _id: m._id } : {}),
            medName: (m.medName || '').trim(),
            medicineType: m.medicineType,
            quantity: isManualQuantityType(m.medicineType) ? String(m.quantity) : Number(m.quantity),
            dosage: (m.dosage || '').trim(),
            duration: Number(m.duration),
            frequency: m.frequency,
            timings: m.timings || [],
            notes: (m.notes || '').trim(),
            status: m.status || 'active',
            ...(m.medInventoryId ? { medInventoryId: m.medInventoryId } : {}),
          })),
        };

        setSubmitting(true);
        const res = await AuthPut(`template/updateTemplate/${editingId}`, payload, token);
        if (res?.status === 'success') {
          Toast.show({ type: 'success', text1: 'Template updated' });
          await fetchTemplates();
          setModalOpen(false);
          resetForm();
        } else {
          Toast.show({ type: 'error', text1: 'Update failed', text2: res?.message || 'Try again' });
        }
      } else {
        const payload = {
          name: (tplName || '').trim(),
          userId: doctorId,
          createdBy: doctorId,
          medications: (medications || []).map((m) => ({
            medName: (m.medName || '').trim(),
            medicineType: m.medicineType,
            quantity: isManualQuantityType(m.medicineType) ? String(m.quantity) : Number(m.quantity),
            dosage: (m.dosage || '').trim(),
            duration: Number(m.duration),
            frequency: m.frequency,
            timings: m.timings || [],
            notes: (m.notes || '').trim(),
            status: m.status || 'active',
            ...(m.medInventoryId ? { medInventoryId: m.medInventoryId } : {}),
          })),
        };

        setSubmitting(true);
        const res = await AuthPost('template/addTemplate', payload, token as any);
        const created = res?.data?.data || res?.data;
        if (created && (created._id || created.name)) {
          setItems(prev => {
            const next = [created, ...(Array.isArray(prev) ? prev : [])];
            next.sort((a, b) => new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime());
            const total = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
            setPage(p => Math.min(p, total));
            return next;
          });
        } else {
          await fetchTemplates();
        }

        setModalOpen(false);
        resetForm();
        Toast.show({ type: 'success', text1: 'Template saved' });
      }
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Failed to save template', text2: err?.response?.data?.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- DELETE (fixed pagination) ----
  const onDeleteTemplate = async (tpl: Template) => {
    if (!tpl?._id) return;
    Alert.alert('Delete Template', `Are you sure you want to delete "${tpl.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('authToken');
            const url = `template/deleteTemplate/${tpl._id}?doctorId=${doctorId}`;
            const res = await authDelete(url, null, token as any);
            if (res?.status === 'success') {
              Toast.show({ type: 'success', text1: 'Template deleted' });
              setItems(prev => {
                const next = prev.filter(p => p._id !== tpl._id);
                const total = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
                setPage(p => Math.min(p, total));
                return next;
              });
            } else {
              Toast.show({ type: 'error', text1: 'Delete failed', text2: res?.message || 'Try again' });
            }
          } catch (e) {
            console.error(e);
            Toast.show({ type: 'error', text1: 'Delete failed' });
          }
        }
      }
    ]);
  };

  // ---- Form helpers ----
  const touchField = (idx: number, field: keyof MedErrors) => {
    setMedTouched(prev => {
      const copy = [...prev];
      copy[idx] = { ...(copy[idx] || {}), [field]: true };
      return copy;
    });
  };

  const validateAndSetErrors = (idx: number, nextMed?: Medication) => {
    setMedErrors(prev => {
      const copy = [...prev];
      const med = nextMed ?? medications[idx];
      copy[idx] = getMedicationErrors(med);
      return copy;
    });
  };

  const recomputeAndSetErrorsForIndex = (next: Medication[], idx: number) => {
    const recalculated = next[idx];
    setMedErrors(prevErr => {
      const copy = [...prevErr];
      copy[idx] = getMedicationErrors(recalculated);
      return copy;
    });
  };

  const updateMed = (idx: number, patch: Partial<Medication>) => {
    setMedications(prev => {
      const next = prev.map((m, i) => {
        if (i !== idx) return m;
        const merged: Medication = { ...m, ...patch };

        // normalize duration to number|null
        if (Object.prototype.hasOwnProperty.call(patch, 'duration')) {
          const raw = (patch as any).duration;
          const num = raw === null || raw === '' ? null : Number(raw);
          merged.duration = Number.isFinite(num as number) ? (num as number) : null;
        }

        // recompute qty and timings if needed
        if (
          Object.prototype.hasOwnProperty.call(patch, 'frequency') ||
          Object.prototype.hasOwnProperty.call(patch, 'duration') ||
          Object.prototype.hasOwnProperty.call(patch, 'medicineType')
        ) {
          return recomputeFor(merged);
        }
        return merged;
      });

      // recalc errors for this idx (without marking touched; errors will show after onBlur)
      recomputeAndSetErrorsForIndex(next, idx);

      return next;
    });
  };

  // Add new medication ABOVE previous ones (prepend)
  const addMedication = () => {
    const nextMed = { ...initialMed };
    const nextErr = getMedicationErrors(nextMed);
    setMedications(prev => [nextMed, ...prev]);
    setMedErrors(prev => [nextErr, ...prev]);
    setMedTouched(prev => [{} as any, ...prev]);
  };

  const removeMedication = (idx: number) => {
    setMedications(prev => {
      const next = prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev;
      if (next.length !== prev.length) {
        setMedErrors(errPrev => errPrev.filter((_, i) => i !== idx));
        setMedTouched(tPrev => tPrev.filter((_, i) => i !== idx));
      }
      return next;
    });
    setFilteredMedicines(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
    if (activeDropdown === idx) setActiveDropdown(null);
  };

  const startEdit = (tpl: Template) => {
    setEditingId(tpl?._id ?? null);
    setTplName(tpl?.name ?? '');
    setTplStatus(tpl?.status ?? 'active');
    const meds = (tpl?.medications || []).map((m) => {
      const base: Medication = {
        _id: m._id,
        medName: m.medName || '',
        medicineType: (m.medicineType as Medication['medicineType']) || 'Tablet',
        quantity: m.quantity as any,
        dosage: m.dosage || '',
        duration: Number(m.duration) || null,
        frequency: (m.frequency as Medication['frequency']) || '1-0-0',
        timings: Array.isArray(m.timings) ? [...m.timings] : [],
        notes: m.notes || '',
        medInventoryId: m.medInventoryId ?? null,
        status: (m.status as 'active' | 'inactive') || 'active',
      };
      return recomputeFor(base);
    });
    const finalMeds = meds.length ? meds : [initialMed];
    setMedications(finalMeds);
    setMedErrors(finalMeds.map(getMedicationErrors));
    setMedTouched(finalMeds.map(() => ({} as any)));
    setTplNameTouched(false);
    setTplNameError(undefined);
    setModalOpen(true);
    setActiveDropdown(null);
    setFilteredMedicines({});
  };

  // helper: filter inventory by name text
  const filterInventory = (text: string) => {
    const t = (text || '').toLowerCase().trim();
    let pool = medInventory;
    if (t) {
      pool = medInventory.filter(m => m.medName.toLowerCase().includes(t));
    }
    return pool.slice(0, SEARCH_LIMIT);
  };

  // ---- rows ----
  const renderRow = ({ item, index }: { item: Template; index: number }) => {
    const absoluteIndex = (page - 1) * PAGE_SIZE + index;
    const meds = Array.isArray(item.medications) ? item.medications : [];
    return (
      <View style={styles.rowCard}>
        <View style={styles.rowTop}>
          <View style={styles.idxBadge}>
            <Text style={styles.idxText}>{absoluteIndex + 1}</Text>
          </View>
          <View style={{ flex: 1, paddingLeft: 8 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSub}>Updated On: {formatDDMonYYYY(item.updatedAt)}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.smallBtn} onPress={() => startEdit(item)}>
              <AntDesign name="edit" size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, { borderColor: '#fecaca' }]} onPress={() => onDeleteTemplate(item)}>
              <AntDesign name="delete" size={16} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          {meds.length ? (
            <View style={styles.medsWrap}>
              {meds.map((m, i) => {
                const label = m?.medName ? `${m.medName}${m?.dosage ? ` (${m.dosage})` : ''}` : `Med ${i + 1}`;
                return (
                  <TouchableOpacity
                    key={`${m?._id || m?.medName || 'med'}-${i}`}
                    style={styles.medTag}
                    onPress={() => {
                      const text = buildMedSummary(m as any);
                      Alert.alert(m.medName || `Medication ${i + 1}`, text || '—');
                    }}
                  >
                    <Text numberOfLines={1} style={styles.medTagText}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: '#94a3b8' }}>No meds</Text>
          )}
        </View>
      </View>
    );
  };

  // options
  const statusOptions: Option[] = [
    { label: 'active', value: 'active' },
    { label: 'inactive', value: 'inactive' },
  ];
  const timingOptions: Option[] = TIMINGS.map(x => ({ label: x, value: x }));

  return (
    <TouchableWithoutFeedback onPress={() => { setActiveDropdown(null); Keyboard.dismiss(); }}>
      <View style={styles.container}>
        {/* Sticky toolbar */}
        <View style={styles.stickyBar}>
          <TouchableOpacity style={styles.addBtn} onPress={onOpenModal}>
            <Icon name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Template</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: '#475569' }}>Loading…</Text>
          </View>
        ) : !items?.length ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No data found</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={pagedItems}
              keyExtractor={(r, i) => r?._id || r?.uniqueId || String((page - 1) * PAGE_SIZE + i)}
              renderItem={renderRow}
              contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
            />

            {/* Paginator */}
            <View style={styles.pager}>
              <TouchableOpacity
                style={[styles.pagerBtn, page <= 1 && styles.pagerBtnDisabled]}
                disabled={page <= 1}
                onPress={() => setPage(p => Math.max(1, p - 1))}
              >
                <AntDesign name="left" size={14} />
                <Text style={styles.pagerBtnText}>Prev</Text>
              </TouchableOpacity>

              <Text style={styles.pagerLabel}>
                Page {page} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.pagerBtn, page >= totalPages && styles.pagerBtnDisabled]}
                disabled={page >= totalPages}
                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <Text style={styles.pagerBtnText}>Next</Text>
                <AntDesign name="right" size={14} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Modal */}
        <Modal
          visible={modalOpen}
          animationType="slide"
          onRequestClose={() => setModalOpen(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Edit Template' : 'Add Template'}</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.modalClose}>
                  <AntDesign name="close" size={18} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* Template Name */}
              <Text style={styles.label}>Template Name (e.g., Fever) *</Text>
              <TextInput
                style={[styles.input, tplNameTouched && tplNameError && styles.inputError]}
                placeholder="e.g., Fever"
                value={tplName}
                onChangeText={(t) => {
                  setTplName(t);
                  if (tplNameTouched) {
                    setTplNameError(t.trim() ? undefined : 'Template name is required');
                  }
                }}
                onBlur={() => {
                  setTplNameTouched(true);
                  setTplNameError(tplName.trim() ? undefined : 'Template name is required');
                }}
                placeholderTextColor="#9CA3AF"
              />
              {tplNameTouched && tplNameError ? <Text style={styles.errorText}>{tplNameError}</Text> : null}

              {/* Status (only while editing) */}
              {isEditing ? (
                <Select
                  label="Status *"
                  value={tplStatus}
                  options={statusOptions}
                  onChange={(v) => setTplStatus(v as 'active' | 'inactive')}
                />
              ) : null}

              {/* Medications header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Medications</Text>
                <TouchableOpacity onPress={addMedication} style={styles.inlineAdd}>
                  <Icon name="add" size={18} color="#4f46e5" />
                  <Text style={styles.inlineAddText}>Add medication</Text>
                </TouchableOpacity>
              </View>

              {/* Medications list (newest at top) */}
              {medications.map((m, idx) => {
                const errs = medErrors[idx] || {};
                const touched = medTouched[idx] || ({} as any);
                const reqTimings = m.frequency === 'Other' ? 4 : requiredTimingCount(m.frequency);
                const manual = isManualQuantityType(m.medicineType);

                const listForIdx = filteredMedicines[idx] || [];
                const showDropdown = activeDropdown === idx;

                return (
                  <View key={idx} style={styles.medBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.medHeading}>#{idx + 1}{m._id ? '  •  existing' : ''}</Text>
                      <TouchableOpacity disabled={medications.length === 1} onPress={() => removeMedication(idx)}>
                        <Text style={[styles.removeText, medications.length === 1 && { opacity: 0.4 }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Name */}
                    <Text style={styles.label}>Medicine Name *</Text>

                    <View style={{ position: 'relative' }}>
                      <TextInput
                        style={[styles.input, touched.medName && errs.medName && styles.inputError]}
                        placeholder={inventoryLoading ? 'Loading medicines…' : 'e.g., Dolo 650'}
                        value={m.medName}
                        onChangeText={(t) => {
                          updateMed(idx, { medName: t });
                          const suggestions = filterInventory(t);
                          setFilteredMedicines(prev => ({ ...prev, [idx]: suggestions }));
                          if (activeDropdown !== idx) setActiveDropdown(idx);
                        }}
                        onFocus={() => {
                          const suggestions = filterInventory(m.medName);
                          setFilteredMedicines(prev => ({ ...prev, [idx]: suggestions }));
                          setActiveDropdown(idx);
                        }}
                        onBlur={() => {
                          touchField(idx, 'medName');
                          validateAndSetErrors(idx);
                          // small delay so tapping a suggestion still selects it
                          setTimeout(() => {
                            if (activeDropdown === idx) setActiveDropdown(null);
                          }, 150);
                        }}
                        placeholderTextColor="#9CA3AF"
                        editable={!inventoryLoading}
                      />

                      {/* Dropdown */}
                      {showDropdown && (
                        <View style={styles.dropdownWrap}>
                          {inventoryLoading ? (
                            <View style={styles.dropdownLoading}>
                              <ActivityIndicator />
                              <Text style={{ marginTop: 8, color: '#475569' }}>Loading inventory…</Text>
                            </View>
                          ) : listForIdx.length > 0 ? (
                            <FlatList
                              data={listForIdx}
                              keyExtractor={(it) => it._id}
                              keyboardShouldPersistTaps="handled"
                              renderItem={({ item: opt }) => (
                                <TouchableOpacity
                                  onPress={() => {
                                    // fill name + dosage + medInventoryId
                                    updateMed(idx, {
                                      medName: opt.medName,
                                      dosage: opt.dosage,
                                      medInventoryId: opt._id,
                                    });
                                    setActiveDropdown(null);
                                    setFilteredMedicines(prev => ({ ...prev, [idx]: [] }));
                                    Toast.show({ type: 'success', text1: 'Medicine selected from inventory' });
                                  }}
                                  style={styles.dropdownItem}
                                >
                                  <Text style={{ color: '#111' }}>
                                    {opt.medName}{opt.dosage ? ` (${opt.dosage})` : ''}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              ListFooterComponent={
                                medInventory.length > listForIdx.length ? (
                                  <View style={styles.dropdownFooter}>
                                    <Text style={styles.dropdownFooterText}>
                                      Showing {listForIdx.length} of {medInventory.length}. Keep typing to narrow down.
                                    </Text>
                                  </View>
                                ) : null
                              }
                              style={{ maxHeight: 220 }}
                            />
                          ) : (
                            <View style={styles.dropdownEmpty}>
                              <Text style={{ color: '#6b7280' }}>No matches</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    {touched.medName && errs.medName ? <Text style={styles.errorText}>{errs.medName}</Text> : null}

                    {/* Type */}
                    <Select
                      label="Type *"
                      value={m.medicineType}
                      options={MEDICINE_TYPES.map(x => ({ label: x, value: x }))}
                      onChange={(v) => updateMed(idx, { medicineType: v as Medication['medicineType'] })}
                      onBlur={() => {
                        touchField(idx, 'medicineType');
                        validateAndSetErrors(idx);
                      }}
                      error={touched.medicineType ? errs.medicineType : undefined}
                    />

                    {/* Dosage */}
                    <Text style={styles.label}>Dosage *</Text>
                    <TextInput
                      style={[styles.input, touched.dosage && errs.dosage && styles.inputError]}
                      placeholder="e.g., 650 mg"
                      value={m.dosage}
                      onChangeText={(t) => updateMed(idx, { dosage: t })}
                      onBlur={() => {
                        touchField(idx, 'dosage');
                        validateAndSetErrors(idx);
                      }}
                      placeholderTextColor="#9CA3AF"
                    />
                    {touched.dosage && errs.dosage ? <Text style={styles.errorText}>{errs.dosage}</Text> : null}

                    {/* Frequency */}
                    <Select
                      label="Frequency *"
                      value={m.frequency}
                      options={FREQ.map(x => ({ label: x, value: x }))}
                      onChange={(v) => updateMed(idx, { frequency: v as Medication['frequency'] })}
                      onBlur={() => {
                        touchField(idx, 'frequency');
                        validateAndSetErrors(idx);
                      }}
                      error={touched.frequency ? errs.frequency : undefined}
                    />

                    {/* Duration (numeric input) */}
                    <Text style={styles.label}>Duration (days) *</Text>
                    <TextInput
                      style={[styles.input, touched.duration && errs.duration && styles.inputError]}
                      placeholder="e.g., 5"
                      keyboardType="numeric"
                      value={m.duration === null ? '' : String(m.duration)}
                      onChangeText={(t) => {
                        const num = t.replace(/[^\d]/g, '');
                        updateMed(idx, { duration: num === '' ? null : Number(num) });
                      }}
                      onBlur={() => {
                        touchField(idx, 'duration');
                        validateAndSetErrors(idx);
                      }}
                      placeholderTextColor="#9CA3AF"
                    />
                    {touched.duration && errs.duration ? <Text style={styles.errorText}>{errs.duration}</Text> : null}

                    {/* Timings multi-select */}
                    <MultiSelect
                      label={`Timings (${m.frequency === 'SOS' ? 'none' : `${reqTimings} required`}) *`}
                      values={m.timings}
                      options={timingOptions}
                      max={m.frequency === 'Other' ? 4 : reqTimings}
                      onChange={(vals) => updateMed(idx, { timings: vals })}
                      onBlur={() => {
                        touchField(idx, 'timings');
                        validateAndSetErrors(idx);
                      }}
                      error={touched.timings ? errs.timings : undefined}
                    />

                    {/* Quantity */}
                    <Text style={styles.label}>Quantity *</Text>
                    {manual ? (
                      <>
                        <TextInput
                          style={[styles.input, touched.quantity && errs.quantity && styles.inputError]}
                          placeholder='e.g., "1 bottle"'
                          value={String(m.quantity ?? '')}
                          onChangeText={(t) => updateMed(idx, { quantity: t })}
                          onBlur={() => {
                            touchField(idx, 'quantity');
                            validateAndSetErrors(idx);
                          }}
                          placeholderTextColor="#9CA3AF"
                        />
                        {touched.quantity && errs.quantity ? <Text style={styles.errorText}>{errs.quantity}</Text> : null}
                      </>
                    ) : (
                      <>
                        <TextInput
                          style={[styles.input, { backgroundColor: '#eaeaea' }]}
                          value={String(m.quantity ?? 0)}
                          editable={false}
                          placeholderTextColor="#9CA3AF"
                        />
                        {touched.quantity && errs.quantity ? <Text style={styles.errorText}>{errs.quantity}</Text> : null}
                      </>
                    )}

                    {/* Notes */}
                    <Text style={styles.label}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      placeholder="e.g., after food"
                      value={m.notes}
                      onChangeText={(t) => updateMed(idx, { notes: t })}
                      onBlur={() => {
                        touchField(idx, 'notes');
                        validateAndSetErrors(idx);
                      }}
                      multiline
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                );
              })}

              <TouchableOpacity
                style={[styles.primaryBtn, { opacity: canSubmit && !submitting ? 1 : 0.6 }]}
                disabled={!canSubmit || submitting}
                onPress={onSubmit}
              >
                {submitting ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>{isEditing ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>

              {isEditing ? (
                <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={resetForm}>
                  <Text style={styles.secondaryBtnText}>Switch to Create New</Text>
                </TouchableOpacity>
              ) : null}

              <View style={{ height: 24 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Templates;

// =============================
// Styles
// =============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  // Sticky bar
  stickyBar: {
    position: 'relative',
    zIndex: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1677ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },

  // Empty / loading
  center: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyBox: {
    margin: 16,
    paddingVertical: 48,
    borderWidth: 1, borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  emptyText: { color: '#475569', fontSize: 16 },

  // Row “cards”
  rowCard: {
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  idxBadge: {
    width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  idxText: { color: '#64748b', fontWeight: '600' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  rowSub: { marginTop: 4, fontSize: 12, color: '#0f172a' },

  medsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  medTag: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
    marginRight: 8, marginTop: 8, maxWidth: '100%',
  },
  medTagText: { color: '#0f172a', fontWeight: '600' },

  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnText: { fontWeight: '600', color: '#0f172a', marginLeft: 4 },

  // Paginator
  pager: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pagerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerBtnText: { fontWeight: '600', color: '#0f172a' },
  pagerLabel: { color: '#475569', fontWeight: '600' },

  // Modal + form
  modalBody: { padding: 16, paddingBottom: 32 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { position: 'absolute', right: 0 },

  sectionHeader: {
    marginTop: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  label: { fontSize: 13, color: '#374151', marginBottom: 6, marginTop: 10 },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', color: '#111827'
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    marginTop: 6,
    fontSize: 12,
    marginBottom: 2,
  },

  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  medBox: {
    borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 12,
    padding: 12, marginBottom: 12, backgroundColor: '#fafafa',
  },
  medHeading: { fontWeight: '700', color: '#111' },
  removeText: { color: '#dc2626', fontWeight: '600' },

  primaryBtn: {
    backgroundColor: '#1677ff', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  secondaryBtn: {
    backgroundColor: '#e5e7eb', paddingVertical: 10, borderRadius: 12, alignItems: 'center',
  },
  secondaryBtnText: { color: '#111827', fontWeight: '700' },

  inlineAdd: { flexDirection: 'row', alignItems: 'center' },
  inlineAddText: { color: '#4f46e5', fontWeight: '700', marginLeft: 6 },

  // Dropdown styles (inventory under med name)
  dropdownWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 50, // a bit below the input
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    zIndex: 1000,
    elevation: 8,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dropdownEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dropdownFooter: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  dropdownFooterText: {
    color: '#6b7280',
    fontSize: 12,
  },

  // Bottom sheet dropdown (Select/MultiSelect)
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdownSheet: {
    position: 'absolute',
    left: 12, right: 12, bottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownItemText: { color: '#111827' },
});
