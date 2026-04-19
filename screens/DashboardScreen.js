import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    const activateAwake = async () => {
      try { await activateKeepAwakeAsync(); } catch (e) {}
    };
    activateAwake();

    return () => {
      const deactivateAwake = async () => {
        try { await deactivateKeepAwake(); } catch (e) {}
      };
      deactivateAwake();
    };
  }, []);

  const getStatus = (num) => {
    const map = {
      0: { label: "G1 - NORMAL", color: "#00C853", desc: "Kidney filtration is within healthy range." },
      1: { label: "G2 - MILD", color: "#FBC02D", desc: "Early indicators of protein leakage detected." },
      2: { label: "G3 - MODERATE", color: "#FF5252", desc: "Significant leak: Microalbuminuria detected." },
      3: { label: "G4 - SEVERE", color: "#D50000", desc: "High protein leak: Urgent consultation advised." }
    };
    return map[num] || { label: "ERROR", color: "#8E8E93", desc: "Unable to determine status." };
  };

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

      try {
        const statusData = getStatus(apiResponse.class_index);
        
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
        
        historyArray.unshift(newRecord); 
        
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

  if (!hasPermission) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  const status = result ? getStatus(result.predicted_class) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brandName}>Scan/Upload your strip</Text>
        <Text style={styles.headerSubtitle}>{capturedImage ? "Analysis Complete" : "Ready for Analysis"}</Text>
      </View>

      <View style={styles.viewport}>
        {!capturedImage ? (
          <View style={styles.emptyViewport}>
             <Image 
               source={require('../assets/sample_Img.png')} 
               style={styles.sampleImage} 
               resizeMode="contain" 
             />
             <Text style={styles.instructionText}>Take a photo of the test strip or upload an existing image to begin analysis as shown.</Text>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {isProcessing && (
                <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
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
              <Ionicons name="camera" size={22} color="#FFFFFF" />
              <Text style={styles.btnText}>TAKE PHOTO</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickImage}>
              <Ionicons name="images" size={22} color="#007AFF" />
              <Text style={styles.galleryBtnText}>CHOOSE FROM FILES</Text>
            </TouchableOpacity>
          </>
        ) : (
          result && (
          <View style={styles.resultDashboard}>
            {status && (
              <>
                <View style={[styles.statusTag, { backgroundColor: status.color + '1A' }]}>
                  <Text style={{ color: status.color, fontWeight: '800', fontSize: 14 }}>{status.label}</Text>
                </View>
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
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  content: { 
    padding: 20, 
    alignItems: 'center' 
  },
  header: { 
    width: '100%', 
    marginBottom: 24,
    marginTop: 10 
  },
  brandName: { 
    color: '#1C1C1E', 
    fontSize: 28, 
    fontWeight: '800',
    letterSpacing: -0.5
  },
  headerSubtitle: { 
    color: '#8E8E93', 
    fontSize: 13, 
    fontWeight: '600', 
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4
  },
  viewport: { 
    width: '100%', 
    height: 400, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3
  },
  emptyViewport: { 
    flex: 1, 
    backgroundColor: '#FAFAFC', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 32, 
    borderWidth: 2, 
    borderColor: '#E5E5EA', 
    borderStyle: 'dashed', 
    borderRadius: 24 
  },
  sampleImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
    borderRadius: 8,
    opacity: 0.9,
  },
  instructionText: { 
    marginTop: 8, 
    textAlign: 'center', 
    color: '#8E8E93', 
    fontSize: 15, 
    lineHeight: 22,
    fontWeight: '500'
  },
  previewContainer: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  processingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  processingText: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    marginTop: 16,
    fontSize: 16,
    letterSpacing: 0.5
  },
  actionArea: { 
    width: '100%', 
    marginTop: 24 
  },
  captureBtn: { 
    backgroundColor: '#007AFF', 
    height: 56, 
    borderRadius: 16, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  galleryBtn: { 
    marginTop: 12, 
    height: 56, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, 
    borderColor: '#007AFF' 
  },
  galleryBtnText: { 
    color: '#007AFF', 
    fontWeight: '700', 
    fontSize: 15,
    marginLeft: 8,
    letterSpacing: 0.5
  },
  btnText: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    fontSize: 15, 
    marginLeft: 8,
    letterSpacing: 0.5
  },
  resultDashboard: { 
    width: '100%', 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3
  },
  statusTag: { 
    alignSelf: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 12, 
    marginBottom: 16 
  },
  descText: { 
    color: '#3A3A3C', 
    textAlign: 'center', 
    fontSize: 15, 
    lineHeight: 22, 
    marginBottom: 24,
    fontWeight: '500'
  },
  resetBtn: { 
    backgroundColor: '#F2F2F7', 
    height: 52, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  resetBtnText: { 
    color: '#007AFF', 
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  }
});