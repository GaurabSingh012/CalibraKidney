import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added this import

export default function DashboardScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [result, setResult] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    (async () => {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasPermission(cameraStatus.granted && galleryStatus.granted);
    })();
  }, []);

  const getStatus = (num) => {
    const map = {
      0: { label: "G1 - NORMAL", color: "#00C853", desc: "Kidney filtration is within healthy range." },
      1: { label: "G2 - MILD", color: "#FBC02D", desc: "Early indicators of protein leakage detected." },
      2: { label: "G3 - MODERATE", color: "#FF5252", desc: "Significant leak: Microalbuminuria detected." },
      3: { label: "G4 - SEVERE", color: "#D50000", desc: "High protein leak: Urgent consultation advised." }
    };
    return map[num] || { label: "ERROR", color: "#6C757D", desc: "Unable to determine status." };
  };

  // --- STREAMLINED UPLOAD & SAVE TO HISTORY ---
  const uploadToBackend = async (uri) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: uri, type: 'image/jpeg', name: 'strip.jpg' });

      const response = await fetch('http://kidney.cloud-ninja.tech:8000/predict', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) throw new Error(`Backend Error ${response.status}`);
      const apiResponse = await response.json(); 
      
      setResult({
        predicted_class: apiResponse.class_index, 
        confidence: apiResponse.confidence,
        probabilities: apiResponse.probabilities || null 
      });

      // --- NEW: SAVE TO LOCAL VAULT ---
      try {
        const statusData = getStatus(apiResponse.class_index);
        
        // Format date like: "18 Apr 2026, 14:30"
        const dateString = new Date().toLocaleDateString('en-GB', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });

        const newRecord = {
          id: Date.now().toString(),
          date: dateString,
          image: uri, 
          label: statusData.label,
          confidence: apiResponse.confidence
        };

        const existingHistory = await AsyncStorage.getItem('scan_history');
        const historyArray = existingHistory ? JSON.parse(existingHistory) : [];
        
        historyArray.unshift(newRecord); // Add the newest scan to the top of the list
        
        await AsyncStorage.setItem('scan_history', JSON.stringify(historyArray));
      } catch (storageErr) {
        console.error("Failed to save to history: ", storageErr);
      }

    } catch (error) {
      console.error("UPLOAD ERROR: ", error);
      Alert.alert(
        "Connection Error", 
        "Failed to reach the analysis server. Please check your internet connection."
      );
      setCapturedImage(null);
    } finally {
      setIsProcessing(false); 
    }
  };

  // --- NATIVE CAMERA WORKFLOW ---
  const handleCapture = async () => {
    if (isProcessing) return;
    try {
      const r = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], 
        quality: 1,
      });

      if (!r.canceled) {
        const asset = r.assets[0];
        setCapturedImage(asset.uri);
        await uploadToBackend(asset.uri);
      }
    } catch (e) {
      Alert.alert("Camera Error", "Could not launch the device camera.");
    }
  };

  // --- NATIVE GALLERY WORKFLOW ---
  const handlePickImage = async () => {
    if (isProcessing) return;
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], 
        quality: 1,
      });

      if (!r.canceled) {
        const asset = r.assets[0];
        setCapturedImage(asset.uri);
        await uploadToBackend(asset.uri);
      }
    } catch (e) {
      Alert.alert("Gallery Error", "Could not open the device gallery.");
    }
  };

  if (!hasPermission) return <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>;

  const status = result ? getStatus(result.predicted_class) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brandName}>CALIBRAKIDNEY</Text>
        <Text style={styles.headerSubtitle}>{capturedImage ? "Analysis Complete" : "Ready for Analysis"}</Text>
      </View>

      <View style={styles.viewport}>
        {!capturedImage ? (
          <View style={styles.emptyViewport}>
             <Ionicons name="scan-outline" size={80} color="#E9ECEF" />
             <Text style={styles.instructionText}>Take a photo of the test strip or upload an existing image to begin analysis.</Text>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {isProcessing && (
                <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.processingText}>Analyzing Strip...</Text>
                </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.actionArea}>
        {!result && !isProcessing ? (
          <>
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
              <Ionicons name="camera-outline" size={24} color="#fff" />
              <Text style={styles.btnText}>TAKE PHOTO</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickImage}>
              <Ionicons name="images-outline" size={20} color="#007bff" />
              <Text style={styles.galleryBtnText}>CHOOSE FROM FILES</Text>
            </TouchableOpacity>
          </>
        ) : (
          result && (
          <View style={styles.resultDashboard}>
            {status && (
              <>
                <View style={[styles.statusTag, { backgroundColor: status.color + '15' }]}><Text style={{ color: status.color, fontWeight: '900' }}>{status.label}</Text></View>
                <Text style={styles.descText}>{status.desc}</Text>
              </>
            )}
            <TouchableOpacity style={styles.resetBtn} onPress={() => {setResult(null); setCapturedImage(null);}}>
              <Text style={styles.resetBtnText}>SCAN ANOTHER STRIP</Text>
            </TouchableOpacity>
          </View>
          )
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 24, alignItems: 'center' },
  header: { width: '100%', marginBottom: 20 },
  brandName: { color: '#1A1A1A', fontSize: 32, fontWeight: '900' },
  headerSubtitle: { color: '#6C757D', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  viewport: { width: '100%', height: 420, backgroundColor: '#000', borderRadius: 32, overflow: 'hidden' },
  emptyViewport: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 40, borderWidth: 2, borderColor: '#F1F3F5', borderStyle: 'dashed', borderRadius: 32 },
  instructionText: { marginTop: 20, textAlign: 'center', color: '#ADB5BD', fontSize: 16, lineHeight: 24 },
  previewContainer: { flex: 1, backgroundColor: '#111' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  processingText: { color: '#fff', fontWeight: 'bold', marginTop: 15 },
  actionArea: { width: '100%', marginTop: 30 },
  captureBtn: { backgroundColor: '#007bff', paddingVertical: 20, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', elevation: 4 },
  galleryBtn: { marginTop: 15, paddingVertical: 18, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#007bff' },
  galleryBtnText: { color: '#007bff', fontWeight: '800', marginLeft: 10 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16, marginLeft: 10 },
  resultDashboard: { width: '100%', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 32, elevation: 8 },
  statusTag: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, marginBottom: 15 },
  descText: { color: '#495057', textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 30 },
  resetBtn: { backgroundColor: '#F0F7FF', paddingVertical: 18, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  resetBtnText: { color: '#007bff', fontWeight: '900' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});