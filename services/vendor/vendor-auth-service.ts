import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import {
  getFirebaseApp,
  getFirebaseFirestore,
  hasFirebaseConfig,
} from '@/services/firebase/client';

const PREVIEW_VENDOR_SESSION_KEY = '@material_xpress_vendor_preview_session';
const DEFAULT_VENDOR_CITY_ID =
  process.env.EXPO_PUBLIC_MATERIAL_XPRESS_DEFAULT_CITY_ID ?? 'agra';

type VendorProfileDocShape = {
  cityId?: unknown;
  displayName?: unknown;
  role?: unknown;
  shopName?: unknown;
};

export type VendorSession = {
  cityId: string;
  displayName: string;
  email: string;
  role: 'vendor';
  shopName: string;
  source: 'firebase' | 'preview';
  uid: string;
};

let cachedFirebaseAuth: Auth | null | undefined;

export function supportsFirebaseVendorAuth() {
  return hasFirebaseConfig();
}

export function subscribeToVendorSession(
  onChange: (session: VendorSession | null) => void
) {
  if (!supportsFirebaseVendorAuth()) {
    let active = true;

    void readPreviewVendorSession().then((session) => {
      if (active) {
        onChange(session);
      }
    });

    return () => {
      active = false;
    };
  }

  const firebaseAuth = getFirebaseAuth();

  if (!firebaseAuth) {
    onChange(null);
    return () => {};
  }

  return onAuthStateChanged(
    firebaseAuth,
    async (user) => {
      if (!user) {
        onChange(null);
        return;
      }

      const session = await mapFirebaseUserToVendorSession(user);
      onChange(session);
    },
    (error) => {
      console.warn('Vendor auth session failed to resolve.', error);
      onChange(null);
    }
  );
}

export async function signInVendor(params: {
  email: string;
  password: string;
}) {
  const email = params.email.trim().toLowerCase();
  const password = params.password.trim();

  if (!email || !password) {
    throw new Error('Enter both email and password to continue.');
  }

  if (!supportsFirebaseVendorAuth()) {
    const previewSession = buildPreviewVendorSession(email);
    await writePreviewVendorSession(previewSession);
    return previewSession;
  }

  const firebaseAuth = getFirebaseAuth();

  if (!firebaseAuth) {
    throw new Error('Firebase vendor authentication is not configured.');
  }

  const credentials = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password
  );

  return mapFirebaseUserToVendorSession(credentials.user);
}

export async function signOutVendor() {
  if (!supportsFirebaseVendorAuth()) {
    await writePreviewVendorSession(null);
    return;
  }

  const firebaseAuth = getFirebaseAuth();

  if (!firebaseAuth) {
    return;
  }

  await firebaseSignOut(firebaseAuth);
}

// React Native persistence is imported lazily to keep web builds tree-shakable.
type ReactNativeAuthModule = {
  getReactNativePersistence: (storage: unknown) => unknown;
};
let reactNativeAuthModule: ReactNativeAuthModule | null = null;
function loadReactNativeAuthModule(): ReactNativeAuthModule {
  if (reactNativeAuthModule) return reactNativeAuthModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@firebase/auth') as { getReactNativePersistence?: ReactNativeAuthModule['getReactNativePersistence'] };
  reactNativeAuthModule = {
    getReactNativePersistence: (storage) => {
      if (!mod.getReactNativePersistence) {
        throw new Error('React Native persistence is unavailable in this Firebase build.');
      }
      return mod.getReactNativePersistence(storage);
    },
  };
  return reactNativeAuthModule;
}

function getFirebaseAuth() {
  if (cachedFirebaseAuth !== undefined) {
    return cachedFirebaseAuth;
  }

  const firebaseApp = getFirebaseApp();

  if (!firebaseApp) {
    cachedFirebaseAuth = null;
    return cachedFirebaseAuth;
  }

  try {
    if (Platform.OS === 'web') {
      cachedFirebaseAuth = getAuth(firebaseApp);
      return cachedFirebaseAuth;
    }

    const { getReactNativePersistence } = loadReactNativeAuthModule();
    cachedFirebaseAuth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
    return cachedFirebaseAuth;
  } catch {
    cachedFirebaseAuth = getAuth(firebaseApp);
    return cachedFirebaseAuth;
  }
}

async function mapFirebaseUserToVendorSession(user: User): Promise<VendorSession> {
  const fallbackShopName = buildShopNameFromEmail(user.email ?? '');
  let cityId = DEFAULT_VENDOR_CITY_ID;
  let displayName = user.displayName?.trim() || fallbackShopName;
  let shopName = fallbackShopName;

  const firestore = getFirebaseFirestore();

  if (firestore) {
    try {
      const vendorProfileSnapshot = await getDoc(doc(firestore, 'vendors', user.uid));

      if (vendorProfileSnapshot.exists()) {
        const profile = vendorProfileSnapshot.data() as VendorProfileDocShape;

        cityId = readString(profile.cityId) ?? cityId;
        displayName = readString(profile.displayName) ?? displayName;
        shopName = readString(profile.shopName) ?? shopName;
      }
    } catch (error) {
      console.warn('Vendor profile lookup failed, using auth profile fallback.', error);
    }
  }

  return {
    cityId,
    displayName,
    email: user.email?.trim().toLowerCase() ?? 'vendor@materialxpress.in',
    role: 'vendor',
    shopName,
    source: 'firebase',
    uid: user.uid,
  };
}

function buildPreviewVendorSession(email: string): VendorSession {
  const shopName = buildShopNameFromEmail(email);

  return {
    cityId: DEFAULT_VENDOR_CITY_ID,
    displayName: shopName,
    email,
    role: 'vendor',
    shopName,
    source: 'preview',
    uid: `preview-${email.replace(/[^a-z0-9]/g, '-')}`,
  };
}

function buildShopNameFromEmail(email: string) {
  const handle = email.split('@')[0] ?? 'vendor';

  return handle
    .split(/[._-]/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ') || 'Vendor Workspace';
}

async function readPreviewVendorSession() {
  try {
    const storedValue = await AsyncStorage.getItem(PREVIEW_VENDOR_SESSION_KEY);

    if (!storedValue) {
      return null;
    }

    return JSON.parse(storedValue) as VendorSession;
  } catch (error) {
    console.error('Unable to load preview vendor session.', error);
    return null;
  }
}

async function writePreviewVendorSession(session: VendorSession | null) {
  try {
    if (!session) {
      await AsyncStorage.removeItem(PREVIEW_VENDOR_SESSION_KEY);
      return;
    }

    await AsyncStorage.setItem(
      PREVIEW_VENDOR_SESSION_KEY,
      JSON.stringify(session)
    );
  } catch (error) {
    console.error('Unable to persist preview vendor session.', error);
  }
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}
