import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

// Screen Imports
import DashboardScreen from './screens/DashboardScreen';
import HistoryScreen from './screens/HistoryScreen';
import AboutScreen from './screens/AboutScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* Set status bar to dark icons for light background */}
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Dashboard') {
                iconName = focused ? 'flask' : 'flask-outline';
              } else if (route.name === 'History') {
                iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
              } else if (route.name === 'About') {
                iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
              }

              return (
                <View style={focused ? styles.activeIconContainer : null}>
                  <Ionicons name={iconName} size={size - 2} color={color} />
                </View>
              );
            },
            
            // Tab Bar Styling (Light Medical Aesthetic)
            tabBarActiveTintColor: '#007bff',
            tabBarInactiveTintColor: '#ADB5BD',
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.5,
              marginBottom: 10,
            },
            tabBarStyle: { 
              backgroundColor: '#FFFFFF', 
              borderTopWidth: 1,
              borderTopColor: '#F1F3F5',
              height: 75,
              paddingTop: 12,
              elevation: 0,
              shadowOpacity: 0,
            },

            // Header Styling (Clean, Professional Clinical Look)
            headerStyle: { 
              backgroundColor: '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F3F5',
            },
            headerTintColor: '#37dc00',
            headerTitleAlign: 'left',
            headerTitleStyle: { 
              fontWeight: '900', 
              fontSize: 22,
              letterSpacing: -0.5,
              marginLeft: 10,
            },
          })}
        >
          <Tab.Screen 
            name="Dashboard" 
            component={DashboardScreen} 
            options={{ title: 'CALIBRAKIDNEY' }} 
          />
          <Tab.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ title: 'ARCHIVES' }} 
          />
          <Tab.Screen 
            name="About" 
            component={AboutScreen} 
            options={{ title: 'PROTOCOL' }} 
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: '#F0F7FF', // Soft blue tint for active state
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  }
});