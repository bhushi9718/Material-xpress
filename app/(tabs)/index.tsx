// =============================================
// LOGIN APP - Updated Version
// Phone Number + Login/Signup Tabs
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

// ✅ HOME SCREEN IMPORT - Ye naya add kiya hai
import HomeScreen from './home';

// =============================================
// MAIN SCREEN - Login + Signup Tabs
// =============================================
export default function LoginScreen() {

  // Active tab: 'login' ya 'signup'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login fields
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupOtp, setSignupOtp] = useState('');
  const [generatedSignupOtp, setGeneratedSignupOtp] = useState('');
  const [signupOtpSent, setSignupOtpSent] = useState(false);

  // Login status
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ---- Phone number validation ----
  const isValidPhone = (phone: string) => {
    return phone.length === 10 && /^[0-9]+$/.test(phone);
  };

  const handleSendOtp = () => {
    if (!isValidPhone(loginPhone)) {
      Alert.alert('Error', 'Valid 10 digit phone number dalo!');
      return;
    }
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    setOtp(randomOtp);
    setOtpSent(true);
    Alert.alert('OTP Sent ✅', `Demo OTP: ${randomOtp}`);
  };

  const handleSignupOtp = () => {
    if (!isValidPhone(signupPhone)) {
      Alert.alert('Error', 'Valid 10 digit phone number dalo!');
      return;
    }
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedSignupOtp(randomOtp);
    setSignupOtp(randomOtp);
    setSignupOtpSent(true);
    Alert.alert('OTP Sent ✅');
  };

  // ---- Login Handler ----
  const handleLogin = () => {
    if (!loginPhone.trim() || !loginPassword.trim()) {
      Alert.alert('Error', 'Phone number aur password dono bharo!');
      return;
    }
    if (!isValidPhone(loginPhone)) {
      Alert.alert('Error', '10 digit ka valid phone number dalo!');
      return;
    }
    if (loginPassword.length < 6) {
      Alert.alert('Error', 'Password kam se kam 6 characters ka hona chahiye!');
      return;
    }
    if (!otpSent) {
      Alert.alert('Error', 'Pehle OTP send karo!');
      return;
    }
    if (otp !== generatedOtp) {
      Alert.alert('Error', 'Galat OTP!');
      return;
    }
    setIsLoggedIn(true);
  };

  // ---- Signup Handler ----
  const handleSignup = () => {
    if (!signupName.trim() || !signupPhone.trim() || !signupPassword.trim()) {
      Alert.alert('Error', 'Sare fields bharo!');
      return;
    }
    if (!isValidPhone(signupPhone)) {
      Alert.alert('Error', '10 digit ka valid phone number dalo!');
      return;
    }
    if (signupPassword.length < 6) {
      Alert.alert('Error', 'Password kam se kam 6 characters ka hona chahiye!');
      return;
    }
    Alert.alert('Success!', 'Account ban gaya! Ab login karo.', [
      { text: 'OK', onPress: () => setActiveTab('login') }
    ]);
  };

  // ---- Logout Handler ----
  const handleLogout = () => {
    setLoginPhone('');
    setLoginPassword('');
    setOtp('');
    setGeneratedOtp('');
    setOtpSent(false);
    setIsLoggedIn(false);
  };

  // ✅ LOGIN HONE KE BAAD - Home Screen dikhao (home.tsx wali)
  if (isLoggedIn) {
    return <HomeScreen onLogout={handleLogout} />;
  }

  // =============================================
  // LOGIN / SIGNUP FORM
  // =============================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.container}>

          {/* ---- Logo ---- */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <Text style={styles.appTitle}>Material Xpress</Text>
          </View>

          {/* ---- Tab Buttons: Login / Sign Up ---- */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'login' && styles.tabButtonActive]}
              onPress={() => setActiveTab('login')}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'signup' && styles.tabButtonActive]}
              onPress={() => setActiveTab('signup')}
            >
              <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* ---- Card ---- */}
          <View style={styles.card}>

            {/* ================== LOGIN FORM ================== */}
            {activeTab === 'login' && (
              <View>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneContainer}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="10 digit number"
                    placeholderTextColor="#aaa"
                    value={loginPhone}
                    onChangeText={setLoginPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <Text style={styles.label}>6 Digit OTP</Text>
                <View style={styles.otpRow}>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Enter OTP"
                    placeholderTextColor="#aaa"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity style={styles.otpButton} onPress={handleSendOtp}>
                    <Text style={styles.otpButtonText}>
                      {otpSent ? 'Resend' : 'Send OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor="#aaa"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showLoginPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowLoginPassword(!showLoginPassword)}
                  >
                    <Text style={styles.eyeText}>{showLoginPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.mainButton} onPress={handleLogin}>
                  <Text style={styles.mainButtonText}>Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================== SIGNUP FORM ================== */}
            {activeTab === 'signup' && (
              <View>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Rahul Kumar"
                  placeholderTextColor="#aaa"
                  value={signupName}
                  onChangeText={setSignupName}
                />

                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneContainer}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="10 digit number"
                    placeholderTextColor="#aaa"
                    value={signupPhone}
                    onChangeText={setSignupPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <Text style={styles.label}>6 Digit OTP</Text>
                <View style={styles.otpRow}>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Enter OTP"
                    placeholderTextColor="#aaa"
                    value={signupOtp}
                    onChangeText={setSignupOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity style={styles.otpButton} onPress={handleSignupOtp}>
                    <Text style={styles.otpButtonText}>
                      {signupOtpSent ? 'Resend' : 'Send OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor="#aaa"
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                    secureTextEntry={!showSignupPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowSignupPassword(!showSignupPassword)}
                  >
                    <Text style={styles.eyeText}>{showSignupPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.mainButton} onPress={handleSignup}>
                  <Text style={styles.mainButtonText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>

          <Text style={styles.footerText}>
            {activeTab === 'login'
              ? "Account nahi hai? Sign Up tab pe jao!"
              : "Pehle se account hai? Login tab pe jao!"}
          </Text>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =============================================
// STYLES
// =============================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4ff' },
  keyboardView: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  otpInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    paddingHorizontal: 15,
    color: '#161616',
    marginRight: 10,
  },
  otpButton: {
    backgroundColor: '#007BFF',
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  otpButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#4f46e5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  appTitle: { fontSize: 26, fontWeight: 'bold', color: '#1e1b4b' },
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#e0e7ff',
    borderRadius: 14, padding: 4, marginBottom: 20,
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#4f46e5' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#4f46e5' },
  tabTextActive: { color: '#ffffff' },
  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 24,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#1f2937',
  },
  phoneContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1,
    borderColor: '#e5e7eb', borderRadius: 12,
  },
  countryCode: {
    paddingHorizontal: 14, fontSize: 15, fontWeight: '600',
    color: '#4f46e5', borderRightWidth: 1,
    borderRightColor: '#e5e7eb', paddingVertical: 12,
  },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1f2937' },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1,
    borderColor: '#e5e7eb', borderRadius: 12,
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1f2937' },
  eyeButton: { padding: 12 },
  eyeText: { fontSize: 18 },
  mainButton: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 24, elevation: 4,
  },
  mainButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  footerText: { textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 16 },
  homeContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  welcomeCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 32, alignItems: 'center', elevation: 5 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e1b4b', marginBottom: 8 },
  welcomeSubtitle: { fontSize: 15, color: '#6b7280' },
  logoutButton: { backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  logoutButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});