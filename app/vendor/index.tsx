import { SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { VendorPortal } from '@/components/vendor/vendor-portal';
import { materialTheme } from '@/constants/material-theme';
import { useVendorPortal } from '@/hooks/use-vendor-portal';

export default function VendorPortalScreen() {
  const router = useRouter();
  const vendorPortal = useVendorPortal();

  return (
    <SafeAreaView style={styles.safeArea}>
      <VendorPortal
        {...vendorPortal}
        onBack={() => router.replace('/profile')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: materialTheme.colors.background,
    flex: 1,
  },
});
