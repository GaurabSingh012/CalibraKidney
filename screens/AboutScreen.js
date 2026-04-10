import React from 'react';
import { StyleSheet, Text, ScrollView, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AboutScreen() {
  
  const HealthStage = ({ label, color, title, desc, isLast }) => (
    <View style={styles.stageTile}>
      <View style={styles.indicatorContainer}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        {!isLast && <View style={styles.verticalLink} />}
      </View>
      <View style={styles.stageContent}>
        <View style={styles.stageHeaderRow}>
          <Text style={[styles.stageLabel, { color: color }]}>{label}</Text>
          <Text style={styles.stageTitle}>{title}</Text>
        </View>
        <Text style={styles.stageDesc}>{desc}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* 1. CLINICAL STAGING - THE "TIMELINE" LAYOUT */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>CLINICAL INDICATORS</Text>
        <View style={styles.labelUnderline} />
      </View>

      <View style={styles.whiteCard}>
        <HealthStage 
          label="G1" 
          color="#00C853" 
          title="Optimal" 
          desc="Kidney filtration is functioning normally. No protein leakage detected." 
        />
        <HealthStage 
          label="G2" 
          color="#FBC02D" 
          title="Mild Change" 
          desc="Microalbuminuria detected. Damage is reversible at this stage.Medical Consulatation required." 
        />
        <HealthStage 
          label="G3" 
          color="#FF5252" 
          title="Moderate" 
          desc="Significant leak. Urgent medical consultation required."  
        />
        <HealthStage 
          label="G4" 
          color="#D50000" 
          title="Severe" 
          desc="Excessive Amount Leakage detected.Visit Doctor Immediately."
          isLast={true}
        />
      </View>

      {/* 2. SCANNING PROTOCOL */}
      <View style={[styles.sectionHeader, { marginTop: 40 }]}>
        <Text style={styles.sectionLabel}>SCANNING PROTOCOL</Text>
        <View style={styles.labelUnderline} />
      </View>

      <View style={styles.protocolGrid}>
        <View style={styles.stepCard}>
          <View style={styles.iconCircle}>
             <Ionicons name="document-text-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.stepCardTitle}>Baseline</Text>
          <Text style={styles.stepCardText}>Use plain white paper as background.</Text>
        </View>
        <View style={styles.stepCard}>
          <View style={styles.iconCircle}>
             <Ionicons name="sunny-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.stepCardTitle}>Lighting</Text>
          <Text style={styles.stepCardText}>Neutral indoor light. No flash.</Text>
        </View>
      </View>
      
      <View style={styles.fullStepCard}>
         <View style={styles.iconCircle}>
            <Ionicons name="scan-outline" size={20} color="#007bff" />
         </View>
         <View style={{marginLeft: 15, flex: 1}}>
            <Text style={styles.stepCardTitle}>Alignment</Text>
            <Text style={styles.stepCardText}>Hold parallel and crop tightly to the pad.</Text>
         </View>
      </View>

      {/* 3. INTELLIGENT ENGINE */}
      <View style={styles.engineCard}>
        <View style={styles.engineHeader}>
          <Ionicons name="shield-checkmark" size={18} color="#007bff" />
          <Text style={styles.engineTitle}>Intelligent Diagnostics</Text>
        </View>
        <Text style={styles.enginePara}>
          Utilizing colorimetric analysis, the platform normalizes variables against a white reference point to ensure consistency.
        </Text>
      </View>

      {/* 4. DISCLAIMER */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          <Text style={{fontWeight: '800', color: '#D50000'}}>MEDICAL NOTICE: </Text> 
          This is a screening prototype. Results must be verified by a professional.
        </Text>
      </View>

      <Text style={styles.footer}>CALIBRAKIDNEY • v1.3.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 25, paddingBottom: 80 },
  
  sectionHeader: { marginBottom: 20 },
  sectionLabel: { color: '#1A1A1A', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  labelUnderline: { width: 30, height: 3, backgroundColor: '#007bff', marginTop: 6 },

  whiteCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  stageTile: { flexDirection: 'row' },
  indicatorContainer: { alignItems: 'center', width: 20, marginRight: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, zIndex: 2 },
  verticalLink: { width: 2, flex: 1, backgroundColor: '#E9ECEF', marginVertical: 4 },
  stageContent: { flex: 1, paddingBottom: 25 },
  stageHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stageLabel: { fontSize: 11, fontWeight: '900', marginRight: 8 },
  stageTitle: { color: '#1A1A1A', fontSize: 17, fontWeight: '800' },
  stageDesc: { color: '#6C757D', fontSize: 13, lineHeight: 18, fontWeight: '500' },

  protocolGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stepCard: { backgroundColor: '#FFFFFF', width: '48%', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  fullStepCard: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },
  stepCardTitle: { color: '#1A1A1A', fontWeight: '800', marginTop: 12, fontSize: 14 },
  stepCardText: { color: '#6C757D', fontSize: 12, marginTop: 4, lineHeight: 16 },

  engineCard: { marginTop: 40, backgroundColor: '#E7F1FF', padding: 25, borderRadius: 24 },
  engineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  engineTitle: { color: '#0056b3', fontSize: 16, fontWeight: '800', marginLeft: 10 },
  enginePara: { color: '#495057', fontSize: 13, lineHeight: 20, fontWeight: '500' },

  disclaimerContainer: { marginTop: 30, paddingHorizontal: 10 },
  disclaimerText: { color: '#ADB5BD', fontSize: 11, textAlign: 'center', lineHeight: 16 },

  footer: { color: '#DEE2E6', textAlign: 'center', marginTop: 50, fontSize: 10, fontWeight: '900', letterSpacing: 2 }
});