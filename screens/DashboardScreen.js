import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function DashboardScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [detection, setDetection] = useState(null);

  // 1. Load the INT8 Model from assets
  const plugin = useTensorflowModel(require('../assets/model.tflite'));
  const model = plugin.model;

  const device = useCameraDevice('back');

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

  // 2. The AI Brain (Runs at ~30 FPS)
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (model == null || !isScanning) return;

    // Run YOLO inference
    const outputs = model.run([frame.toArrayBuffer()]);
    
    // YOLOv11 Logic: Extracting the top detection
    // Note: Coordinates are usually normalized 0-1
    const data = outputs[0]; 
    const confidence = data[4];

    if (confidence > 0.75) {
      runOnJS(setDetection)({
        x: data[0],
        y: data[1],
        w: data[2],
        h: data[3],
        conf: confidence
      });
    } else {
      runOnJS(setDetection)(null);
    }
  }, [model, isScanning]);

  const handleCapture = async () => {
    if (!detection) return;
    
    // Simulate high-speed colorimetric analysis
    setIsScanning(false);
    setDetection(null);
    
    // In a real scenario, you'd crop the 'detection' area and 
    // run it through your classifier. For now, we simulate a result:
    const mockResult = { predicted_class: 0, confidence: 0.98 };
    setResult(mockResult);

    // Save to History
    const st = getStatus(mockResult.predicted_class);
    const existing = await AsyncStorage.getItem('scan_history');
    const history = existing ? JSON.parse(existing) : [];
    await AsyncStorage.setItem('scan_history', JSON.stringify([{
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      label: st.label,
      confidence: mockResult.confidence,
    }, ...history]));
  };

  if (!hasPermission) return <View style={styles.center}><Text>Grant Camera Permission</Text></View>;
  if (device == null) return <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>;

  const status = result ? getStatus(result.predicted_class) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandName}>CalibraKidney</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.headerSubtitle}>{isScanning ? "Live AI Scanning" : "Analysis Complete"}</Text>
          <View style={[styles.liveIndicator, { backgroundColor: isScanning ? '#00E676' : '#ADB5BD' }]} />
        </View>
      </View>

      {/* Viewport */}
      <View style={styles.viewport}>
        {isScanning ? (
          <>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              frameProcessor={frameProcessor}
              pixelFormat="rgb"
            />
            {/* Bounding Box Overlay */}
            {detection && (
              <View style={[styles.boundingBox, {
                left: (detection.x - detection.w / 2) * width * 0.8,
                top: (detection.y - detection.h / 2) * 380,
                width: detection.w * width * 0.8,
                height: detection.h * 380,
              }]}>
                <View style={styles.boxCorner} />
              </View>
            )}
            <View style={styles.scanTarget} />
          </>
        ) : (
          <View style={styles.capturedState}>
            <Ionicons name="checkmark-circle" size={80} color="#00C853" />
            <Text style={styles.capturedText}>Sample Locked</Text>
          </View>
        )}
      </View>

      {/* UI Logic Area */}
      {isScanning ? (
        <View style={styles.actionArea}>
          <TouchableOpacity 
            style={[styles.captureBtn, !detection && styles.disabledBtn]} 
            onPress={handleCapture}
            disabled={!detection}
          >
            <Ionicons name="scan" size={24} color="#fff" />
            <Text style={styles.btnText}>{detection ? "LOCK PAD & ANALYZE" : "ALIGN TEST STRIP"}</Text>
          </TouchableOpacity>
          <Text style={styles.hintText}>The AI will automatically highlight the reagent pad when detected.</Text>
        </View>
      ) : (
        /* Result Dashboard (Your Original UI) */
        <View style={styles.resultDashboard}>
          <View style={[styles.statusTag, { backgroundColor: status.color + '10' }]}>
            <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.descText}>{status.desc}</Text>

          <View style={styles.meterContainer}>
             <View style={styles.meterHeader}>
                <Text style={styles.meterTitle}>Reliability Index</Text>
                <Text style={[styles.meterVal, {color: status.color}]}>{(result.confidence * 100).toFixed(1)}%</Text>
             </View>
             <View style={styles.track}>
                <View style={[styles.fill, { width: `${result.confidence * 100}%`, backgroundColor: status.color }]} />
             </View>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={() => {setIsScanning(true); setResult(null);}}>
            <Ionicons name="refresh-outline" size={18} color="#007bff" style={{marginRight: 10}} />
            <Text style={styles.resetBtnText}>NEW SCANNING</Text>
          </TouchableOpacity>
        </View>
      )}
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

  viewport: { width: '100%', height: 380, backgroundColor: '#000', borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: '#E9ECEF' },
  scanTarget: { position: 'absolute', width: 220, height: 220, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignSelf: 'center', top: 80 },
  
  boundingBox: { position: 'absolute', borderWidth: 2, borderColor: '#00E676', borderRadius: 8, backgroundColor: 'rgba(0, 230, 118, 0.1)' },
  boxCorner: { position: 'absolute', top: -5, left: -5, width: 15, height: 15, borderColor: '#00E676', borderLeftWidth: 4, borderTopWidth: 4 },
  
  capturedState: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  capturedText: { marginTop: 20, fontSize: 18, fontWeight: '800', color: '#1A1A1A' },

  actionArea: { width: '100%', marginTop: 30 },
  captureBtn: { backgroundColor: '#007bff', padding: 22, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#ADB5BD' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15, marginLeft: 10 },
  hintText: { textAlign: 'center', color: '#ADB5BD', marginTop: 15, fontSize: 12, fontWeight: '600' },

  resultDashboard: { width: '100%', marginTop: 20, backgroundColor: '#FFFFFF', padding: 24, borderRadius: 32, elevation: 2 },
  statusTag: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 15 },
  statusTagText: { fontWeight: '900', fontSize: 12 },
  descText: { color: '#495057', textAlign: 'center', fontSize: 16, marginBottom: 30, fontWeight: '500' },
  meterContainer: { width: '100%', marginBottom: 30 },
  meterHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  meterTitle: { color: '#ADB5BD', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  meterVal: { fontSize: 16, fontWeight: '800' },
  track: { height: 6, backgroundColor: '#F1F3F5', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%' },
  resetBtn: { backgroundColor: '#F0F7FF', padding: 20, borderRadius: 24, flexDirection: 'row', justifyContent: 'center' },
  resetBtnText: { color: '#007bff', fontWeight: '900', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});