import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Dimensions, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core'; 
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWPORT_HEIGHT = 380;

export default function DashboardScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // NEW: Prevents crashes during API fetch
  const [result, setResult] = useState(null);
  const [detection, setDetection] = useState(null);
  
  const cameraRef = useRef(null);

  const plugin = useTensorflowModel(require('../assets/model.tflite'));
  const model = plugin.model;

  const device = useCameraDevice('back');
  const { resize } = useResizePlugin();

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
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

  const updateDetectionUI = Worklets.createRunOnJS((x, y, w, h, conf) => {
    // Don't update the box if we are currently frozen and processing
    if (isProcessing) return; 

    if (conf === 0) {
      setDetection(null);
    } else {
      setDetection({ x, y, w, h, conf });
    }
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (model == null || !isScanning) return;

    try {
      const resized = resize(frame, {
        scale: { width: 640, height: 640 },
        pixelFormat: 'rgb',
        dataType: 'float32', 
      });

      const outputs = model.runSync([resized]);
      if (!outputs || outputs.length === 0) return;

      const data = outputs[0]; 
      const numPredictions = 8400; 
      
      let maxConf = 0;
      let bestIdx = -1;

      for (let i = 0; i < numPredictions; i++) {
        const conf = data[4 * numPredictions + i]; 
        if (conf > maxConf) {
          maxConf = conf;
          bestIdx = i;
        }
      }

      if (maxConf > 0.45) {
        updateDetectionUI(
          data[0 * numPredictions + bestIdx],
          data[1 * numPredictions + bestIdx],
          data[2 * numPredictions + bestIdx],
          data[3 * numPredictions + bestIdx],
          maxConf
        );
      } else {
        updateDetectionUI(0, 0, 0, 0, 0);
      }
    } catch (e) {
      console.log("AI ERROR:", e.message);
    }
  }, [model, isScanning, resize]);

  const handleCapture = async () => {
    if (!detection || !cameraRef.current || isProcessing) return;
    
    // 1. Lock UI and show spinner
    setIsProcessing(true);
    
    try {
      // 2. Take photo FIRST while the camera is still safely mounted
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'speed', // Faster capture prevents UI hanging
        flash: 'off', 
      });

      const formData = new FormData();
      formData.append('file', {
        uri: `file://${photo.path}`,
        type: 'image/jpeg',
        name: 'test_strip.jpg',
      });

      // 3. Send to API
      const backendUrl = 'http://10.208.164.240:8000/predict'; 
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const realResult = await response.json(); 
      
      // 4. Set the result FIRST, then switch the screen. This prevents the 'null color' crash.
      setResult(realResult);
      setIsScanning(false);

      // Save to history
      const st = getStatus(realResult.predicted_class);
      const existing = await AsyncStorage.getItem('scan_history');
      const history = existing ? JSON.parse(existing) : [];
      
      await AsyncStorage.setItem('scan_history', JSON.stringify([{
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        label: st.label,
        confidence: realResult.confidence,
      }, ...history]));

    } catch (error) {
      console.log("Upload Error:", error);
      Alert.alert("Analysis Failed", "Could not connect to the server. Check your IP address and ensure the backend is running.");
    } finally {
      // 5. Always turn off the spinner, whether it succeeded or failed
      setIsProcessing(false); 
    }
  };

  if (!hasPermission) return <View style={styles.center}><Text>Grant Camera Permission</Text></View>;
  if (device == null) return <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>;

  const status = result ? getStatus(result.predicted_class) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brandName}>CALIBRAKIDNEY</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.headerSubtitle}>{isScanning ? "Live AI Scanning" : "Analysis Complete"}</Text>
          <View style={[styles.liveIndicator, { backgroundColor: isScanning ? '#00E676' : '#ADB5BD' }]} />
        </View>
      </View>

      <View style={styles.viewport}>
        {isScanning ? (
          <>
            <Camera
              ref={cameraRef}
              photo={true}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              frameProcessor={frameProcessor}
            />
            {detection && (
              <View style={[styles.boundingBox, {
                left: ((detection.x - detection.w / 2) / 640) * (SCREEN_WIDTH * 0.8),
                top: ((detection.y - detection.h / 2) / 640) * VIEWPORT_HEIGHT,
                width: (detection.w / 640) * (SCREEN_WIDTH * 0.8),
                height: (detection.h / 640) * VIEWPORT_HEIGHT,
                borderColor: isProcessing ? '#FBC02D' : '#00E676', // Turns yellow when processing
              }]}>
                <View style={[styles.boxCorner, { borderColor: isProcessing ? '#FBC02D' : '#00E676' }]} />
              </View>
            )}
            <View style={styles.scanTarget} />
            
            {/* Show an overlay spinner if we are uploading */}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                 <ActivityIndicator size="large" color="#ffffff" />
                 <Text style={styles.processingText}>Analyzing Strip...</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.capturedState}>
            <Ionicons name="checkmark-circle" size={80} color="#00C853" />
            <Text style={styles.capturedText}>Sample Locked</Text>
          </View>
        )}
      </View>

      <View style={styles.actionArea}>
        {isScanning ? (
          <TouchableOpacity 
            style={[styles.captureBtn, (!detection || isProcessing) && styles.disabledBtn]} 
            onPress={handleCapture}
            disabled={!detection || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="scan" size={24} color="#fff" />
                <Text style={styles.btnText}>{detection ? "LOCK PAD & ANALYZE" : "ALIGN TEST STRIP"}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.resultDashboard}>
            <View style={[styles.statusTag, { backgroundColor: status.color + '10' }]}>
              <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={styles.descText}>{status.desc}</Text>

            {result?.probabilities && (
              <View style={styles.probContainer}>
                <Text style={styles.probTitle}>Class Probabilities</Text>
                {Object.entries(result.probabilities).map(([key, value]) => (
                  <View key={key} style={styles.probRow}>
                     <Text style={styles.probKey}>G{parseInt(key) + 1}</Text>
                     <View style={styles.probBarBg}>
                        <View style={[styles.probBarFill, { width: `${(value * 100)}%`, backgroundColor: key == result.predicted_class ? status.color : '#ADB5BD' }]} />
                     </View>
                     <Text style={styles.probVal}>{(value * 100).toFixed(1)}%</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.resetBtn} onPress={() => {
              setResult(null);
              setIsScanning(true); 
            }}>
              <Text style={styles.resetBtnText}>NEW SCANNING</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 24, alignItems: 'center' },
  header: { width: '100%', marginBottom: 20 },
  brandName: { color: '#1A1A1A', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  headerSubtitle: { color: '#6C757D', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  liveIndicator: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  viewport: { width: '100%', height: VIEWPORT_HEIGHT, backgroundColor: '#000', borderRadius: 32, overflow: 'hidden' },
  scanTarget: { position: 'absolute', width: 220, height: 220, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignSelf: 'center', top: 80 },
  boundingBox: { position: 'absolute', borderWidth: 2, borderRadius: 8, backgroundColor: 'rgba(0, 230, 118, 0.1)' },
  boxCorner: { position: 'absolute', top: -5, left: -5, width: 15, height: 15, borderLeftWidth: 4, borderTopWidth: 4 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  processingText: { color: '#fff', fontWeight: 'bold', marginTop: 10 },
  capturedState: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  capturedText: { marginTop: 20, fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  actionArea: { width: '100%', marginTop: 30 },
  captureBtn: { backgroundColor: '#007bff', padding: 22, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#ADB5BD' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15, marginLeft: 10 },
  resultDashboard: { width: '100%', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 32, elevation: 2 },
  statusTag: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 15 },
  statusTagText: { fontWeight: '900', fontSize: 12 },
  descText: { color: '#495057', textAlign: 'center', fontSize: 16, marginBottom: 30 },
  probContainer: { marginBottom: 30, padding: 15, backgroundColor: '#F8F9FA', borderRadius: 16 },
  probTitle: { fontSize: 12, fontWeight: '800', color: '#6C757D', marginBottom: 10, textTransform: 'uppercase' },
  probRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  probKey: { width: 30, fontSize: 12, fontWeight: '700', color: '#495057' },
  probBarBg: { flex: 1, height: 6, backgroundColor: '#E9ECEF', borderRadius: 3, marginHorizontal: 10, overflow: 'hidden' },
  probBarFill: { height: '100%', borderRadius: 3 },
  probVal: { width: 45, fontSize: 12, fontWeight: '700', color: '#495057', textAlign: 'right' },
  resetBtn: { backgroundColor: '#F0F7FF', padding: 20, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  resetBtnText: { color: '#007bff', fontWeight: '900' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});