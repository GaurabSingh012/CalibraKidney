import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Image } from 'react-native';

import DashboardScreen from './screens/DashboardScreen';
import HistoryScreen from './screens/HistoryScreen';
import AboutScreen from './screens/AboutScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              
              // Correct Ionicons names for solid (focused) vs outline (unfocused)
              if (route.name === 'Dashboard') {
                iconName = focused ? 'camera' : 'camera-outline';
              } else if (route.name === 'History') {
                // 'archive' is the correct name for the solid version of 'archive-outline'
                iconName = focused ? 'archive' : 'archive-outline'; 
              } else if (route.name === 'About') {
                // 'information-circle' is the correct name for the solid version
                iconName = focused ? 'information-circle' : 'information-circle-outline';
              }

              return (
                <View style={focused ? styles.activeIconContainer : null}>
                  <Ionicons name={iconName} size={size - 2} color={color} />
                </View>
              );
            },
            
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.5,
              marginBottom: 10,
            },
            tabBarStyle: { 
              backgroundColor: '#FFFFFF', 
              borderTopWidth: 1,
              borderTopColor: '#E5E5EA',
              height: 75,
              paddingTop: 12,
              elevation: 0,
              shadowOpacity: 0,
            },

            headerStyle: { 
              backgroundColor: '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5EA',
            },
            headerLeft: () => (
              <Image 
                source={require('./assets/icon.png')} 
                style={{ width: 28, height: 28, marginLeft: 20, marginRight: -5 }} 
                resizeMode="contain" 
              />
            ),
            headerTitle: 'CALIBRAKIDNEY',
            headerTintColor: '#1C1C1E',
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
            options={{ tabBarLabel: 'CALIBRAKIDNEY' }} 
          />
          <Tab.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ tabBarLabel: 'ARCHIVES' }} 
          />
          <Tab.Screen 
            name="About" 
            component={AboutScreen} 
            options={{ tabBarLabel: 'PROTOCOL' }} 
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  }
});