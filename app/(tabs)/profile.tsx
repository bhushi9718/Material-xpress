import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { profileQuickLinks } from '@/constants/material-data';
import { materialTheme } from '@/constants/material-theme';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = '@material_xpress_profile';

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('Rajesh Kumar');
  const [email, setEmail] = useState('rajesh@materialxpress.in');
  const [imageUri, setImageUri] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const savedProfile = await AsyncStorage.getItem(STORAGE_KEY);

        if (savedProfile) {
          const profile = JSON.parse(savedProfile);
          setName(profile.name || 'Rajesh Kumar');
          setEmail(profile.email || 'rajesh@materialxpress.in');
          setImageUri(profile.imageUri || '');
        }
      } catch (error) {
        console.error('Unable to load profile', error);
      }
    }

    loadProfile();
  }, []);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow gallery access to update your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function saveProfile() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ email, imageUri, name })
      );
      Alert.alert('Profile saved', 'Your account details have been updated.');
    } catch (error) {
      console.error('Unable to save profile', error);
      Alert.alert('Save failed', 'Please try again in a moment.');
    }
  }

  function logout() {
    Alert.alert('Logout', 'Sign out of Material Xpress on this device?', [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Logout',
        onPress: () => router.replace('/'),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons color={materialTheme.colors.white} name="camera-outline" size={16} />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>

          <View style={styles.statsRow}>
            <StatChip label="Orders" value="24" />
            <StatChip label="Saved" value="12" />
            <StatChip label="Wishlist" value="08" />
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <Text style={styles.sectionText}>
            Keep contact details updated for invoices and site delivery coordination.
          </Text>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <Input
            onChangeText={setName}
            placeholder="Your name"
            value={name}
          />

          <Text style={styles.fieldLabel}>Email Address</Text>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@example.com"
            value={email}
          />

          <Button
            label="Save profile"
            onPress={saveProfile}
            style={{ marginTop: materialTheme.spacing.xl }}
          />
        </Card>

        <Card style={styles.menuCard}>
          <TouchableOpacity
            onPress={() => router.push('/vendor')}
            style={styles.vendorPortalCard}>
            <View style={styles.vendorPortalIcon}>
              <Ionicons color={materialTheme.colors.white} name="storefront-outline" size={20} />
            </View>
            <View style={styles.vendorPortalCopy}>
              <Text style={styles.vendorPortalTitle}>Vendor portal</Text>
              <Text style={styles.vendorPortalSubtitle}>
                Manage inventory, pricing, and incoming vendor orders.
              </Text>
            </View>
            <Ionicons color={materialTheme.colors.white} name="arrow-forward" size={18} />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Quick access</Text>
          {profileQuickLinks.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons
                    color={materialTheme.colors.primary}
                    name={item.icon as ComponentProps<typeof Ionicons>['name']}
                    size={18}
                  />
                </View>
                <View style={styles.menuCopy}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Ionicons
                color={materialTheme.colors.textMuted}
                name="chevron-forward"
                size={18}
              />
            </TouchableOpacity>
          ))}
        </Card>

        <Button
          label="Logout"
          onPress={logout}
          icon={<Ionicons color={materialTheme.colors.danger} name="log-out-outline" size={18} />}
          variant="outline"
          style={styles.logoutButton}
          labelStyle={{ color: materialTheme.colors.danger }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: materialTheme.colors.background,
    flex: 1,
  },
  content: {
    padding: materialTheme.screenPadding,
    paddingBottom: materialTheme.spacing.xxxl,
  },
  profileCard: {
    alignItems: 'center',
    padding: materialTheme.spacing.xxl,
  },
  avatarWrap: {
    marginBottom: materialTheme.spacing.md,
    position: 'relative',
  },
  avatarImage: {
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  avatarLetter: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.primary,
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: 16,
    bottom: -4,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 32,
  },
  name: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.text,
  },
  email: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: materialTheme.spacing.sm,
    marginTop: materialTheme.spacing.xl,
  },
  statChip: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    flex: 1,
    paddingHorizontal: materialTheme.spacing.lg,
    paddingVertical: materialTheme.spacing.md,
  },
  statValue: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.primary,
    textAlign: 'center',
  },
  statLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
    textAlign: 'center',
  },
  formCard: {
    marginTop: materialTheme.spacing.lg,
    padding: materialTheme.spacing.lg,
  },
  menuCard: {
    marginTop: materialTheme.spacing.lg,
    padding: materialTheme.spacing.lg,
  },
  vendorPortalCard: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.lg,
    flexDirection: 'row',
    gap: materialTheme.spacing.md,
    marginBottom: materialTheme.spacing.lg,
    padding: materialTheme.spacing.lg,
  },
  vendorPortalIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 24,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  vendorPortalCopy: {
    flex: 1,
  },
  vendorPortalTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.white,
  },
  vendorPortalSubtitle: {
    ...materialTheme.typography.caption,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 4,
  },
  sectionTitle: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.text,
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
  menuItem: {
    alignItems: 'center',
    borderBottomColor: materialTheme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: materialTheme.spacing.lg,
  },
  menuItemLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: materialTheme.spacing.md,
  },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  menuCopy: {
    flex: 1,
  },
  menuTitle: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
  },
  menuSubtitle: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 4,
  },
  logoutButton: {
    borderColor: materialTheme.colors.danger,
    marginTop: materialTheme.spacing.lg,
  },
});
