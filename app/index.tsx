import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { materialTheme } from '@/constants/material-theme';

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<AuthMode>('login');

  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  function isValidPhone(value: string) {
    return /^[0-9]{10}$/.test(value);
  }

  function sendOtp(target: 'login' | 'signup') {
    const phone = target === 'login' ? loginPhone : signupPhone;

    if (!isValidPhone(phone)) {
      Alert.alert('Invalid phone', 'Enter a valid 10-digit phone number.');
      return;
    }

    const nextOtp = `${Math.floor(100000 + Math.random() * 900000)}`;

    if (target === 'login') {
      setLoginOtpCode(nextOtp);
      setLoginOtp(nextOtp);
    } else {
      setSignupOtpCode(nextOtp);
      setSignupOtp(nextOtp);
    }

    Alert.alert('OTP ready', `Demo OTP: ${nextOtp}`);
  }

  function handleLogin() {
    if (!isValidPhone(loginPhone)) {
      Alert.alert('Missing details', 'Enter a valid phone number to continue.');
      return;
    }

    if (!loginOtpCode || loginOtp !== loginOtpCode) {
      Alert.alert('OTP mismatch', 'Send OTP first, then use the same code to login.');
      return;
    }

    if (loginPassword.trim().length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters for your password.');
      return;
    }

    router.replace('/(tabs)');
  }

  function handleSignup() {
    if (!signupName.trim()) {
      Alert.alert('Name required', 'Enter your full name before signing up.');
      return;
    }

    if (!isValidPhone(signupPhone)) {
      Alert.alert('Invalid phone', 'Enter a valid 10-digit phone number.');
      return;
    }

    if (!signupOtpCode || signupOtp !== signupOtpCode) {
      Alert.alert('OTP mismatch', 'Please verify the OTP before creating your account.');
      return;
    }

    if (signupPassword.trim().length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters for your password.');
      return;
    }

    Alert.alert('Account created', 'Your account is ready. Please login to continue.', [
      {
        text: 'Continue',
        onPress: () => {
          setActiveMode('login');
          setLoginPhone(signupPhone);
          setLoginPassword(signupPassword);
          setLoginOtp(signupOtp);
          setLoginOtpCode(signupOtpCode);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.logoMark}>
              <View style={styles.logoRail} />
              <Text style={styles.logoX}>X</Text>
            </View>
            <Text style={styles.brand}>Material Xpress</Text>
            <Text style={styles.tagline}>
              Hardware and fittings delivered with cleaner procurement.
            </Text>
            <View style={styles.heroHighlights}>
              <View style={styles.highlightChip}>
                <Text style={styles.highlightChipText}>18k+ SKUs</Text>
              </View>
              <View style={styles.highlightChip}>
                <Text style={styles.highlightChipText}>Same-day dispatch</Text>
              </View>
              <View style={styles.highlightChip}>
                <Text style={styles.highlightChipText}>GST invoices</Text>
              </View>
            </View>
          </View>

          <View style={styles.authCard}>
            <View style={styles.authToggle}>
              <TouchableOpacity
                onPress={() => setActiveMode('login')}
                style={[
                  styles.authToggleButton,
                  activeMode === 'login' && styles.authToggleButtonActive,
                ]}>
                <Text
                  style={[
                    styles.authToggleText,
                    activeMode === 'login' && styles.authToggleTextActive,
                  ]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveMode('signup')}
                style={[
                  styles.authToggleButton,
                  activeMode === 'signup' && styles.authToggleButtonActive,
                ]}>
                <Text
                  style={[
                    styles.authToggleText,
                    activeMode === 'signup' && styles.authToggleTextActive,
                  ]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {activeMode === 'login' ? (
              <>
                <Text style={styles.sectionTitle}>Welcome back</Text>
                <Text style={styles.sectionText}>
                  Pick up where your last order left off.
                </Text>

                <FieldLabel label="Phone Number" />
                <PhoneField value={loginPhone} onChangeText={setLoginPhone} />

                <FieldLabel label="OTP" />
                <OtpRow
                  onSend={() => sendOtp('login')}
                  value={loginOtp}
                  onChangeText={setLoginOtp}
                />

                <FieldLabel label="Password" />
                <PasswordField
                  onChangeText={setLoginPassword}
                  onToggleVisibility={() => setShowLoginPassword((current) => !current)}
                  secureTextEntry={!showLoginPassword}
                  value={loginPassword}
                />

                <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
                  <Text style={styles.primaryButtonText}>Login</Text>
                  <Ionicons
                    color={materialTheme.colors.white}
                    name="arrow-forward"
                    size={18}
                  />
                </TouchableOpacity>

                <Text style={styles.helperText}>
                  Demo OTP auto-fills after tapping Send OTP.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Create your trade account</Text>
                <Text style={styles.sectionText}>
                  Save addresses, repeat orders, and manage site deliveries.
                </Text>

                <FieldLabel label="Full Name" />
                <TextInput
                  onChangeText={setSignupName}
                  placeholder="Rahul Kumar"
                  placeholderTextColor={materialTheme.colors.textMuted}
                  style={styles.textInput}
                  value={signupName}
                />

                <FieldLabel label="Phone Number" />
                <PhoneField value={signupPhone} onChangeText={setSignupPhone} />

                <FieldLabel label="OTP" />
                <OtpRow
                  onSend={() => sendOtp('signup')}
                  value={signupOtp}
                  onChangeText={setSignupOtp}
                />

                <FieldLabel label="Password" />
                <PasswordField
                  onChangeText={setSignupPassword}
                  onToggleVisibility={() => setShowSignupPassword((current) => !current)}
                  secureTextEntry={!showSignupPassword}
                  value={signupPassword}
                />

                <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <Ionicons
                    color={materialTheme.colors.white}
                    name="checkmark"
                    size={18}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function PhoneField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.compoundField}>
      <View style={styles.leadingSegment}>
        <Ionicons color={materialTheme.colors.primary} name="call-outline" size={18} />
        <Text style={styles.leadingSegmentText}>+91</Text>
      </View>
      <TextInput
        keyboardType="number-pad"
        maxLength={10}
        onChangeText={onChangeText}
        placeholder="9876543210"
        placeholderTextColor={materialTheme.colors.textMuted}
        style={styles.compoundInput}
        value={value}
      />
    </View>
  );
}

function OtpRow({
  value,
  onChangeText,
  onSend,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <View style={styles.otpRow}>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={onChangeText}
        placeholder="Enter 6-digit OTP"
        placeholderTextColor={materialTheme.colors.textMuted}
        style={[styles.textInput, styles.otpInput]}
        value={value}
      />
      <TouchableOpacity onPress={onSend} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Send OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

function PasswordField({
  value,
  onChangeText,
  secureTextEntry,
  onToggleVisibility,
}: {
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <View style={styles.compoundField}>
      <View style={styles.leadingSegment}>
        <Ionicons color={materialTheme.colors.primary} name="lock-closed-outline" size={18} />
      </View>
      <TextInput
        onChangeText={onChangeText}
        placeholder="Enter your password"
        placeholderTextColor={materialTheme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={styles.compoundInput}
        value={value}
      />
      <TouchableOpacity onPress={onToggleVisibility} style={styles.trailingButton}>
        <Ionicons
          color={materialTheme.colors.textMuted}
          name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
          size={18}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: materialTheme.colors.background,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  glowOne: {
    backgroundColor: materialTheme.colors.accentSoft,
    borderRadius: 220,
    height: 220,
    opacity: 0.8,
    position: 'absolute',
    right: -80,
    top: -40,
    width: 220,
  },
  glowTwo: {
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: 180,
    bottom: 80,
    height: 180,
    left: -60,
    opacity: 0.7,
    position: 'absolute',
    width: 180,
  },
  scrollContent: {
    padding: materialTheme.screenPadding,
    paddingBottom: 32,
  },
  heroCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 12,
    padding: 24,
  },
  logoMark: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  logoRail: {
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.pill,
    height: 12,
    width: 58,
  },
  logoX: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.accent,
    letterSpacing: 1.2,
  },
  brand: {
    ...materialTheme.typography.display,
    color: materialTheme.colors.primary,
    textTransform: 'uppercase',
  },
  tagline: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 10,
  },
  heroHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  highlightChip: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  highlightChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  authCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 20,
    padding: 20,
  },
  authToggle: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    padding: 4,
  },
  authToggleButton: {
    alignItems: 'center',
    borderRadius: materialTheme.radius.pill,
    flex: 1,
    paddingVertical: 12,
  },
  authToggleButtonActive: {
    backgroundColor: materialTheme.colors.primary,
  },
  authToggleText: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
  },
  authToggleTextActive: {
    color: materialTheme.colors.white,
  },
  sectionTitle: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.text,
    marginTop: 20,
  },
  sectionText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 6,
  },
  fieldLabel: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
    marginBottom: 8,
    marginTop: 18,
  },
  textInput: {
    ...materialTheme.typography.body,
    backgroundColor: materialTheme.colors.white,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    color: materialTheme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  compoundField: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.white,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  leadingSegment: {
    alignItems: 'center',
    borderRightColor: materialTheme.colors.border,
    borderRightWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  leadingSegmentText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.primary,
  },
  compoundInput: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.text,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  otpRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  otpInput: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.accentSoft,
    borderRadius: materialTheme.radius.md,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
  },
  trailingButton: {
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  primaryButtonText: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.white,
  },
  helperText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 14,
    textAlign: 'center',
  },
});
