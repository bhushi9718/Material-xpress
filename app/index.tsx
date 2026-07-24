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
  TouchableOpacity,
  View,
} from 'react-native';

import { materialTheme } from '@/constants/material-theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

                <Button
                  label="Login"
                  onPress={handleLogin}
                  icon={<Ionicons color={materialTheme.colors.white} name="arrow-forward" size={18} />}
                  iconPosition="right"
                  style={{ marginTop: materialTheme.spacing.xl }}
                />

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
                <Input
                  onChangeText={setSignupName}
                  placeholder="Rahul Kumar"
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

                <Button
                  label="Create Account"
                  onPress={handleSignup}
                  icon={<Ionicons color={materialTheme.colors.white} name="checkmark" size={18} />}
                  iconPosition="right"
                  style={{ marginTop: materialTheme.spacing.xl }}
                />
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
    <Input
      keyboardType="number-pad"
      maxLength={10}
      onChangeText={onChangeText}
      placeholder="9876543210"
      value={value}
      leftIcon={
        <View style={styles.phonePrefixContainer}>
          <Ionicons color={materialTheme.colors.primary} name="call-outline" size={18} />
          <Text style={styles.phonePrefixText}>+91</Text>
        </View>
      }
    />
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
      <Input
        containerStyle={styles.otpInput}
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={onChangeText}
        placeholder="Enter 6-digit OTP"
        value={value}
      />
      <Button label="Send OTP" onPress={onSend} variant="secondary" />
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
    <Input
      onChangeText={onChangeText}
      placeholder="Enter your password"
      secureTextEntry={secureTextEntry}
      value={value}
      leftIcon={<Ionicons color={materialTheme.colors.primary} name="lock-closed-outline" size={18} />}
      rightIcon={
        <TouchableOpacity onPress={onToggleVisibility}>
          <Ionicons
            color={materialTheme.colors.textMuted}
            name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
            size={18}
          />
        </TouchableOpacity>
      }
    />
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
    position: 'absolute',
    width: 180,
  },
  scrollContent: {
    padding: materialTheme.screenPadding,
    paddingBottom: materialTheme.spacing.xxxl,
  },
  heroCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: materialTheme.spacing.md,
    padding: materialTheme.spacing.xxl,
  },
  logoMark: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: materialTheme.spacing.lg,
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
    marginTop: materialTheme.spacing.sm,
  },
  heroHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: materialTheme.spacing.xl,
  },
  highlightChip: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: materialTheme.spacing.sm,
    paddingVertical: materialTheme.spacing.xs,
  },
  highlightChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  authCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: materialTheme.spacing.xl,
    padding: materialTheme.spacing.xl,
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
    paddingVertical: materialTheme.spacing.md,
  },
  authToggleButtonActive: {
    backgroundColor: materialTheme.colors.primary,
  },
  authToggleText: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
  },
  authToggleTextActive: {
    color: materialTheme.colors.white,
  },
  sectionTitle: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.text,
    marginTop: materialTheme.spacing.xl,
  },
  sectionText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
  },
  fieldLabel: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
    marginBottom: materialTheme.spacing.sm,
    marginTop: materialTheme.spacing.lg,
  },
  otpRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: materialTheme.spacing.md,
  },
  otpInput: {
    flex: 1,
  },
  phonePrefixContainer: {
    alignItems: 'center',
    borderRightColor: materialTheme.colors.border,
    borderRightWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingRight: materialTheme.spacing.sm,
  },
  phonePrefixText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.primary,
  },
  helperText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.md,
    textAlign: 'center',
  },
});
