import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Dimensions, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core'; 
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useIsFocused } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWPORT_HEIGHT = 420;

export default function DashboardScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [result, setResult] = useState(null);
  const [detection, setDetection] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showManualBtn, setShowManualBtn] = useState(false);
  
  const isFocused = useIsFocused();
  const cameraRef = useRef(null);
  const { resize } = useResizePlugin();
  const device = useCameraDevice('back');
  const plugin = useTensorflowModel(require('../assets/model.tflite'));
  const model = plugin.model;

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermission();
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && galleryStatus.granted);
    })();
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
      setIsScanning(false);
    };
  }, []);

  useEffect(() => {
    let timer;
    if (isScanning && isFocused && !detection) {
      timer = setTimeout(() => setShowManualBtn(true), 3500);
    } else {
      setShowManualBtn(false);
    }
    return () => clearTimeout(timer);
  }, [isScanning, isFocused, detection]);

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
    if (isProcessing || !isScanning || !isFocused) return; 
    if (conf < 0.45) {
      setDetection(null);
    } else {
      setDetection({ x, y, w, h, conf });
    }
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (model == null || !isScanning || isProcessing || !isFocused) return;
    try {
      const resized = resize(frame, { scale: { width: 640, height: 640 }, pixelFormat: 'rgb', dataType: 'float32' });
      const outputs = model.runSync([resized]);
      if (!outputs || outputs.length === 0) return;
      const data = outputs[0];
      const numPredictions = 8400;
      let maxConf = 0;
      let bestIdx = -1;
      for (let i = 0; i < numPredictions; i++) {
        const conf = data[4 * numPredictions + i];
        if (conf > maxConf) { maxConf = conf; bestIdx = i; }
      }
      updateDetectionUI(Number(data[0 * numPredictions + bestIdx]), Number(data[1 * numPredictions + bestIdx]), Number(data[2 * numPredictions + bestIdx]), Number(data[3 * numPredictions + bestIdx]), Number(maxConf));
    } catch (e) {}
  }, [model, isScanning, isProcessing, resize, isFocused]);

  // --- SAFE CROP MATH ---
  const processAndUpload = async (uri, width, height) => {
    setIsProcessing(true);
    try {
      // Logic: Crop a square (80% of min dimension) from the center.
      // We use Math.floor to prevent the "x + width <= bitmap.width" error.
      const side = Math.floor(Math.min(width, height) * 0.8);
      const originX = Math.floor((width - side) / 2);
      const originY = Math.floor((height - side) / 2);

      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: side, height: side } }, { resize: { width: 1000 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('file', { uri: manipulated.uri, type: 'image/jpeg', name: 'strip.jpg' });

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
    } catch (error) {
      Alert.alert("Analysis Failed", error.message);
      setIsScanning(true);
      setCapturedImage(null);
    } finally {
      setIsProcessing(false); 
    }
  };

  const handleCapture = async (force = false) => {
    if ((!detection && !force) || !cameraRef.current || isProcessing) return;
    try {
      // 1. Capture Binary
      const photo = await cameraRef.current.takePhoto({ qualityPrioritization: 'quality' });
      const uri = `file://${photo.path}`;
      
      // 2. Switch UI immediately for smoothness
      setCapturedImage(uri);
      setIsScanning(false);
      
      // 3. Process in background
      await processAndUpload(uri, photo.width, photo.height);
    } catch (e) {
      Alert.alert("Camera Error", "Hardware conflict. Please restart.");
    }
  };

  const handlePickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!r.canceled) {
      const asset = r.assets[0];
      setCapturedImage(asset.uri);
      setIsScanning(false);
      await processAndUpload(asset.uri, asset.width, asset.height);
    }
  };

  if (!hasPermission || device == null) return <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>;

  const status = result ? getStatus(result.predicted_class) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brandName}>CALIBRAKIDNEY</Text>
        <Text style={styles.headerSubtitle}>{isScanning ? "Live AI Scanning" : "Analysis Complete"}</Text>
      </View>

      <View style={styles.viewport}>
        {isScanning ? (
          <>
            <Camera 
                ref={cameraRef} 
                photo 
                style={StyleSheet.absoluteFill} 
                device={device} 
                isActive={isFocused && isScanning} 
                frameProcessor={frameProcessor} 
            />
            {detection && (
              <View style={[styles.boundingBox, {
                left: ((detection.x - detection.w / 2) / 640) * (SCREEN_WIDTH * 0.8),
                top: ((detection.y - detection.h / 2) / 640) * VIEWPORT_HEIGHT,
                width: (detection.w / 640) * (SCREEN_WIDTH * 0.8),
                height: (detection.h / 640) * VIEWPORT_HEIGHT,
              }]} />
            )}
            <View style={styles.scanTarget} />
          </>
        ) : (
          <View style={styles.previewContainer}>
            {capturedImage && <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="contain" />}
            {isProcessing && (
                <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.processingText}>Processing...</Text>
                </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.actionArea}>
        {isScanning ? (
          <>
            <TouchableOpacity 
              style={[styles.captureBtn, (!detection && !showManualBtn) && styles.disabledBtn]} 
              onPress={() => handleCapture(showManualBtn)} 
            >
              <Ionicons name={detection ? "scan-outline" : "camera-outline"} size={24} color="#fff" />
              <Text style={styles.btnText}>
                {detection ? "ANALYZE NOW" : (showManualBtn ? "MANUAL CAPTURE" : "ALIGN TEST STRIP")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickImage} disabled={isProcessing}>
              <Ionicons name="images-outline" size={20} color="#007bff" />
              <Text style={styles.galleryBtnText}>CHOOSE FROM FILES</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.resultDashboard}>
            {status && (
              <>
                <View style={[styles.statusTag, { backgroundColor: status.color + '15' }]}><Text style={{ color: status.color, fontWeight: '900' }}>{status.label}</Text></View>
                <Text style={styles.descText}>{status.desc}</Text>
              </>
            )}
            <TouchableOpacity style={styles.resetBtn} onPress={() => {setResult(null); setCapturedImage(null); setIsScanning(true);}}>
              <Text style={styles.resetBtnText}>BACK TO SCANNER</Text>
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
  brandName: { color: '#1A1A1A', fontSize: 32, fontWeight: '900' },
  headerSubtitle: { color: '#6C757D', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  viewport: { width: '100%', height: VIEWPORT_HEIGHT, backgroundColor: '#000', borderRadius: 32, overflow: 'hidden' },
  scanTarget: { position: 'absolute', width: 240, height: 240, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 24, alignSelf: 'center', top: 80 },
  boundingBox: { position: 'absolute', borderWidth: 3, borderColor: '#00E676', borderRadius: 12, backgroundColor: 'rgba(0, 230, 118, 0.15)' },
  previewContainer: { flex: 1, backgroundColor: '#111' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  processingText: { color: '#fff', fontWeight: 'bold', marginTop: 15 },
  actionArea: { width: '100%', marginTop: 30 },
  captureBtn: { backgroundColor: '#007bff', paddingVertical: 20, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', elevation: 4 },
  galleryBtn: { marginTop: 15, paddingVertical: 18, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#007bff' },
  galleryBtnText: { color: '#007bff', fontWeight: '800', marginLeft: 10 },
  disabledBtn: { backgroundColor: '#CED4DA' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16, marginLeft: 10 },
  resultDashboard: { width: '100%', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 32, elevation: 8 },
  statusTag: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, marginBottom: 15 },
  descText: { color: '#495057', textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 30 },
  resetBtn: { backgroundColor: '#F0F7FF', paddingVertical: 18, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  resetBtnText: { color: '#007bff', fontWeight: '900' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});