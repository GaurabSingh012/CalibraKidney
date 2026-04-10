import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, Share, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const isFocused = useIsFocused();

  const load = async () => {
    const data = await AsyncStorage.getItem('scan_history');
    if (data) setHistory(JSON.parse(data));
  };
  
  useEffect(() => { if (isFocused) load(); }, [isFocused]);

  const getTheme = (label) => {
    if (label.includes('G1')) return { color: '#00C853', bg: '#00C85310' }; 
    if (label.includes('G2')) return { color: '#FBC02D', bg: '#FBC02D10' }; 
    if (label.includes('G3')) return { color: '#FF5252', bg: '#FF525210' }; 
    if (label.includes('G4')) return { color: '#D50000', bg: '#D5000010' }; 
    return { color: '#6C757D', bg: '#F8F9FA' };
  };

  const deleteItem = (id) => {
    Alert.alert("Delete Record", "Remove this diagnostic from your local vault?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          const updated = history.filter(i => i.id !== id);
          await AsyncStorage.setItem('scan_history', JSON.stringify(updated));
          setHistory(updated);
      }}
    ]);
  };

  const clearAllHistory = () => {
    if (history.length === 0) return;
    Alert.alert("Wipe Database", "Permanently delete every saved diagnostic? This cannot be undone.", [
      { text: "Keep Records", style: "cancel" },
      { text: "Wipe All", style: "destructive", onPress: async () => {
            await AsyncStorage.removeItem('scan_history');
            setHistory([]);
      }}
    ]);
  };

  const shareReport = async (item) => {
    try {
      const msg = `CalibraKidney Diagnostic Report\n\nDate: ${item.date}\nResult: ${item.label}\n\nStored via CalibraKidney Mobile Platform.`;
      await Share.share({ message: msg });
    } catch (e) { console.log(e); }
  };

  const renderItem = ({ item }) => {
    const theme = getTheme(item.label);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={12} color="#6C757D" />
            <Text style={styles.dateText}>{item.date.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
            <Ionicons name="close-circle-outline" size={22} color="#DEE2E6" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.imageFrame}>
            <Image source={{ uri: item.image }} style={styles.imageThumb} />
          </View>
          
          <View style={styles.resultInfo}>
            <View style={[styles.badge, { backgroundColor: theme.bg }]}>
              <Text style={[styles.badgeText, { color: theme.color }]}>{item.label}</Text>
            </View>
            <Text style={[styles.reliabilityText, { color: theme.color }]}>
              {(item.confidence * 100).toFixed(1)}% RELIABILITY
            </Text>
          </View>
          
          <TouchableOpacity onPress={() => shareReport(item)} style={styles.shareCircle}>
            <Ionicons name="share-social-outline" size={20} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Archives</Text>
          <Text style={styles.screenSubtitle}>Local Clinical Data</Text>
        </View>
        
        {history.length > 0 && (
          <TouchableOpacity onPress={clearAllHistory} style={styles.wipeBtn}>
            <Ionicons name="trash-outline" size={16} color="#FF5252" />
            <Text style={styles.wipeText}>Wipe</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="file-tray-outline" size={44} color="#DEE2E6" />
            </View>
            <Text style={styles.emptyTitle}>Vault Empty</Text>
            <Text style={styles.emptySub}>Diagnostic history will be securely stored here.</Text>
          </View>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 20, marginBottom: 15 },
  screenTitle: { color: '#1A1A1A', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  screenSubtitle: { color: '#ADB5BD', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  
  wipeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFE3E3' },
  wipeText: { color: '#FF5252', fontSize: 11, fontWeight: '800', marginLeft: 6, textTransform: 'uppercase' },

  listContainer: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#F1F3F5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  dateChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateText: { color: '#6C757D', fontSize: 10, fontWeight: '800', marginLeft: 6 },
  deleteBtn: { padding: 2 },
  
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  imageFrame: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#F8F9FA', overflow: 'hidden', borderWidth: 1, borderColor: '#E9ECEF' },
  imageThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  resultInfo: { flex: 1, marginLeft: 18 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  reliabilityText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  
  shareCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', marginTop: 120 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  emptyTitle: { color: '#DEE2E6', fontSize: 22, fontWeight: '900' },
  emptySub: { color: '#DEE2E6', fontSize: 14, marginTop: 5, textAlign: 'center', width: '70%', lineHeight: 20, fontWeight: '600' }
});