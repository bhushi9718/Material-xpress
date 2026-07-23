import { Ionicons } from '@expo/vector-icons';
import {
  useDeferredValue,
  useMemo,
  useState,
  type ComponentProps,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { ProductIconBadge, SectionHeading } from '@/components/material-primitives';
import { categories, formatCurrency } from '@/constants/material-data';
import { materialTheme } from '@/constants/material-theme';
import type { VendorSession } from '@/services/vendor/vendor-auth-service';
import {
  getNextVendorOrderStatus,
  type VendorOrder,
  type VendorOrderStatus,
  type VendorProduct,
  type VendorProductInput,
} from '@/services/vendor/vendor-data-service';

type VendorCollectionPaths = {
  vendorOrders: string;
  vendorProducts: string;
  vendorProfile: string;
};

type VendorPortalMetrics = {
  activeProducts: number;
  completedRevenue: number;
  liveOrders: number;
  lowStockCount: number;
};

type VendorPortalProps = {
  authBusy: boolean;
  authLoading: boolean;
  collectionPaths: VendorCollectionPaths | null;
  dataLoading: boolean;
  errorMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  metrics: VendorPortalMetrics;
  onBack: () => void;
  orders: VendorOrder[];
  products: VendorProduct[];
  saveOrderStatus: (orderId: string, status: VendorOrderStatus) => Promise<void>;
  saveProductListing: (
    productId: string,
    updates: Partial<
      Pick<VendorProduct, 'price' | 'stockQuantity' | 'subtitle' | 'unit'>
    >
  ) => Promise<void>;
  saving: boolean;
  session: VendorSession | null;
  supportsFirebaseAuth: boolean;
  uploadProduct: (input: VendorProductInput) => Promise<void>;
};

type ProductDraftState = Record<
  string,
  {
    price: string;
    stockQuantity: string;
    subtitle: string;
    unit: string;
  }
>;

const ORDER_STATUS_LABELS: Record<VendorOrderStatus, string> = {
  accepted: 'Accepted',
  completed: 'Completed',
  new: 'New',
  out_for_delivery: 'Out for delivery',
  packing: 'Packing',
  ready: 'Ready to dispatch',
};

const ORDER_ACTION_LABELS: Partial<Record<VendorOrderStatus, string>> = {
  accepted: 'Start packing',
  new: 'Accept order',
  out_for_delivery: 'Mark delivered',
  packing: 'Mark ready',
  ready: 'Dispatch rider',
};

const PRODUCT_STATUS_STYLES: Record<
  VendorProduct['status'],
  { background: string; text: string }
> = {
  active: {
    background: materialTheme.colors.primarySoft,
    text: materialTheme.colors.primary,
  },
  low_stock: {
    background: materialTheme.colors.accentSoft,
    text: materialTheme.colors.accent,
  },
  out_of_stock: {
    background: materialTheme.colors.terracottaSoft,
    text: materialTheme.colors.terracotta,
  },
};

const ORDER_STATUS_STYLES: Record<
  VendorOrderStatus,
  { background: string; text: string }
> = {
  accepted: {
    background: materialTheme.colors.primarySoft,
    text: materialTheme.colors.primary,
  },
  completed: {
    background: materialTheme.colors.primarySoft,
    text: materialTheme.colors.success,
  },
  new: {
    background: materialTheme.colors.accentSoft,
    text: materialTheme.colors.accent,
  },
  out_for_delivery: {
    background: materialTheme.colors.primarySoft,
    text: materialTheme.colors.primary,
  },
  packing: {
    background: materialTheme.colors.surfaceMuted,
    text: materialTheme.colors.text,
  },
  ready: {
    background: materialTheme.colors.terracottaSoft,
    text: materialTheme.colors.terracotta,
  },
};

export function VendorPortal({
  authBusy,
  authLoading,
  collectionPaths,
  dataLoading,
  errorMessage,
  login,
  logout,
  metrics,
  onBack,
  orders,
  products,
  saveOrderStatus,
  saveProductListing,
  saving,
  session,
  supportsFirebaseAuth,
  uploadProduct,
}: VendorPortalProps) {
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('vendor@materialxpress.in');
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [password, setPassword] = useState('');
  const [productDrafts, setProductDrafts] = useState<ProductDraftState>({});
  const [productForm, setProductForm] = useState({
    categoryId: categories[0]?.id ?? 'hinges',
    name: '',
    price: '',
    stockQuantity: '',
    subtitle: '',
    unit: 'piece',
  });
  const deferredInventoryQuery = useDeferredValue(inventoryQuery);
  const isTabletWidth = width >= 720;

  const resolvedProductDrafts = useMemo(() => {
    const nextDrafts: ProductDraftState = {};

    products.forEach((product) => {
      nextDrafts[product.id] = {
        price: productDrafts[product.id]?.price ?? String(product.price),
        stockQuantity:
          productDrafts[product.id]?.stockQuantity ?? String(product.stockQuantity),
        subtitle: productDrafts[product.id]?.subtitle ?? product.subtitle,
        unit: productDrafts[product.id]?.unit ?? product.unit,
      };
    });

    return nextDrafts;
  }, [productDrafts, products]);

  const filteredProducts = useMemo(() => {
    const query = deferredInventoryQuery.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.category, product.sku, product.subtitle].some((field) =>
        field.toLowerCase().includes(query)
      )
    );
  }, [deferredInventoryQuery, products]);

  async function handleLogin() {
    try {
      await login(email, password);
      setPassword('');
    } catch {}
  }

  async function handleUploadProduct() {
    const price = Number(productForm.price);
    const stockQuantity = Number(productForm.stockQuantity);

    if (!productForm.name.trim()) {
      Alert.alert('Add product name', 'Enter a product name before uploading.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      Alert.alert('Invalid price', 'Enter a valid selling price for the product.');
      return;
    }

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      Alert.alert('Invalid stock', 'Enter a valid inventory quantity.');
      return;
    }

    try {
      await uploadProduct({
        categoryId: productForm.categoryId,
        name: productForm.name,
        price,
        stockQuantity,
        subtitle: productForm.subtitle,
        unit: productForm.unit,
      });
      setProductForm({
        categoryId: productForm.categoryId,
        name: '',
        price: '',
        stockQuantity: '',
        subtitle: '',
        unit: 'piece',
      });
      Alert.alert('Product uploaded', 'The listing is now available in your vendor catalog.');
    } catch {}
  }

  async function handleSaveProduct(product: VendorProduct) {
    const draft = resolvedProductDrafts[product.id];

    if (!draft) {
      return;
    }

    const price = Number(draft.price);
    const stockQuantity = Number(draft.stockQuantity);

    if (!Number.isFinite(price) || price < 0) {
      Alert.alert('Invalid price', `Enter a valid price for ${product.name}.`);
      return;
    }

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      Alert.alert('Invalid stock', `Enter a valid stock count for ${product.name}.`);
      return;
    }

    try {
      await saveProductListing(product.id, {
        price,
        stockQuantity,
        subtitle: draft.subtitle,
        unit: draft.unit,
      });
    } catch {}
  }

  async function handleAdvanceOrder(order: VendorOrder) {
    const nextStatus = getNextVendorOrderStatus(order.status);

    if (!nextStatus) {
      return;
    }

    try {
      await saveOrderStatus(order.id, nextStatus);
    } catch {}
  }

  function handleLogout() {
    Alert.alert('Vendor logout', 'Sign out from the vendor workspace on this device?', [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Logout',
        onPress: () => {
          void logout();
        },
      },
    ]);
  }

  function updateProductDraft(
    productId: string,
    field: keyof ProductDraftState[string],
    value: string
  ) {
    setProductDrafts((currentDrafts) => ({
      ...currentDrafts,
      [productId]: {
        price: currentDrafts[productId]?.price ?? resolvedProductDrafts[productId]?.price ?? '',
        stockQuantity:
          currentDrafts[productId]?.stockQuantity ??
          resolvedProductDrafts[productId]?.stockQuantity ??
          '',
        subtitle:
          currentDrafts[productId]?.subtitle ??
          resolvedProductDrafts[productId]?.subtitle ??
          '',
        unit: currentDrafts[productId]?.unit ?? resolvedProductDrafts[productId]?.unit ?? '',
        [field]: value,
      },
    }));
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTabletWidth && styles.contentTablet,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons color={materialTheme.colors.white} name="arrow-back" size={18} />
            </TouchableOpacity>

            <View
              style={[
                styles.modeBadge,
                session?.source === 'firebase' && styles.modeBadgeLive,
              ]}>
              <Text
                style={[
                  styles.modeBadgeText,
                  session?.source === 'firebase' && styles.modeBadgeTextLive,
                ]}>
                {session?.source === 'firebase' ? 'Live Firebase' : 'Preview mode'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroEyebrow}>Vendor Workspace</Text>
          <Text style={styles.heroTitle}>Manage catalog, pricing, and incoming orders from one mobile hub.</Text>
          <Text style={styles.heroText}>
            Auth lives at the vendor profile layer, while catalog and operations stay city-scoped for future multi-city expansion.
          </Text>

          {!supportsFirebaseAuth ? (
            <View style={styles.heroNotice}>
              <Ionicons color={materialTheme.colors.accent} name="cloud-offline-outline" size={16} />
              <Text style={styles.heroNoticeText}>
                Firebase env vars are missing, so the portal is running in safe preview mode with local persistence.
              </Text>
            </View>
          ) : null}
        </View>

        {authLoading ? (
          <LoadingCard copy="Checking vendor session..." />
        ) : null}

        {!authLoading && !session ? (
          <View style={styles.panel}>
            <SectionHeading title="Vendor login" />
            <Text style={styles.sectionText}>
              Use your vendor credentials to manage stock, pricing, and order flow.
            </Text>

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="vendor@materialxpress.in"
              placeholderTextColor={materialTheme.colors.textMuted}
              style={styles.input}
              value={email}
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder={
                supportsFirebaseAuth ? 'Enter vendor password' : 'Any password in preview mode'
              }
              placeholderTextColor={materialTheme.colors.textMuted}
              secureTextEntry
              style={styles.input}
              value={password}
            />

            <TouchableOpacity
              disabled={authBusy}
              onPress={() => {
                void handleLogin();
              }}
              style={[styles.primaryButton, authBusy && styles.buttonDisabled]}>
              {authBusy ? (
                <ActivityIndicator color={materialTheme.colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Login to vendor dashboard</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionHint}>
              {supportsFirebaseAuth
                ? 'Firebase Authentication is active for this workspace.'
                : 'Preview mode accepts any email and password while you finish Firebase setup.'}
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons color={materialTheme.colors.terracotta} name="alert-circle-outline" size={16} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {session ? (
          <>
            <View style={styles.dashboardCard}>
              <View style={styles.dashboardHeader}>
                <View style={styles.dashboardCopy}>
                  <Text style={styles.dashboardTitle}>{session.shopName}</Text>
                  <Text style={styles.dashboardSubtitle}>
                    {session.email} / City {session.cityId}
                  </Text>
                </View>

                <TouchableOpacity onPress={handleLogout} style={styles.secondaryGhostButton}>
                  <Ionicons color={materialTheme.colors.white} name="log-out-outline" size={16} />
                  <Text style={styles.secondaryGhostButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.metricsRow}>
                <MetricCard
                  accentColor={materialTheme.colors.primary}
                  label="Active products"
                  value={String(metrics.activeProducts)}
                />
                <MetricCard
                  accentColor={materialTheme.colors.accent}
                  label="Low stock"
                  value={String(metrics.lowStockCount)}
                />
                <MetricCard
                  accentColor={materialTheme.colors.terracotta}
                  label="Live orders"
                  value={String(metrics.liveOrders)}
                />
                <MetricCard
                  accentColor={materialTheme.colors.success}
                  label="Delivered revenue"
                  value={formatCurrency(metrics.completedRevenue)}
                />
              </View>
            </View>

            <View style={styles.panel}>
              <SectionHeading title="Product upload" />
              <Text style={styles.sectionText}>
                Add vendor-ready listings with price, stock, and the right unit for contractor ordering.
              </Text>

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryWrap}>
                {categories.map((category) => {
                  const selected = productForm.categoryId === category.id;

                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() =>
                        setProductForm((currentForm) => ({
                          ...currentForm,
                          categoryId: category.id,
                        }))
                      }
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipSelected,
                      ]}>
                      <Ionicons
                        color={selected ? materialTheme.colors.white : materialTheme.colors.primary}
                        name={category.icon as ComponentProps<typeof Ionicons>['name']}
                        size={15}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextSelected,
                        ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Product name</Text>
              <TextInput
                onChangeText={(value) =>
                  setProductForm((currentForm) => ({ ...currentForm, name: value }))
                }
                placeholder="Example: Premium wardrobe handle 320mm"
                placeholderTextColor={materialTheme.colors.textMuted}
                style={styles.input}
                value={productForm.name}
              />

              <Text style={styles.fieldLabel}>Subtitle</Text>
              <TextInput
                onChangeText={(value) =>
                  setProductForm((currentForm) => ({ ...currentForm, subtitle: value }))
                }
                placeholder="Finish, spec, or pack details"
                placeholderTextColor={materialTheme.colors.textMuted}
                style={styles.input}
                value={productForm.subtitle}
              />

              <View style={styles.inlineFieldRow}>
                <View style={styles.inlineField}>
                  <Text style={styles.fieldLabel}>Price</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(value) =>
                      setProductForm((currentForm) => ({ ...currentForm, price: value }))
                    }
                    placeholder="0"
                    placeholderTextColor={materialTheme.colors.textMuted}
                    style={styles.input}
                    value={productForm.price}
                  />
                </View>

                <View style={styles.inlineField}>
                  <Text style={styles.fieldLabel}>Stock</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(value) =>
                      setProductForm((currentForm) => ({
                        ...currentForm,
                        stockQuantity: value,
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor={materialTheme.colors.textMuted}
                    style={styles.input}
                    value={productForm.stockQuantity}
                  />
                </View>

                <View style={styles.inlineField}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setProductForm((currentForm) => ({ ...currentForm, unit: value }))
                    }
                    placeholder="piece"
                    placeholderTextColor={materialTheme.colors.textMuted}
                    style={styles.input}
                    value={productForm.unit}
                  />
                </View>
              </View>

              <TouchableOpacity
                disabled={saving}
                onPress={() => {
                  void handleUploadProduct();
                }}
                style={[styles.primaryButton, saving && styles.buttonDisabled]}>
                {saving ? (
                  <ActivityIndicator color={materialTheme.colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Upload to catalog</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.panel}>
              <SectionHeading title="Inventory management" />
              <Text style={styles.sectionText}>
                Search, edit, and save stock or pricing changes without leaving the dashboard.
              </Text>

              <View style={styles.searchBox}>
                <Ionicons color={materialTheme.colors.textMuted} name="search-outline" size={18} />
                <TextInput
                  onChangeText={setInventoryQuery}
                  placeholder="Search by name, category, or SKU"
                  placeholderTextColor={materialTheme.colors.textMuted}
                  style={styles.searchInput}
                  value={inventoryQuery}
                />
              </View>

              {dataLoading ? (
                <LoadingCard copy="Syncing vendor inventory..." compact />
              ) : filteredProducts.length === 0 ? (
                <EmptyCard
                  description="No vendor products match this search yet."
                  icon="cube-outline"
                  title="Inventory is empty"
                />
              ) : (
                <View style={styles.cardStack}>
                  {filteredProducts.map((product) => {
                    const draft = resolvedProductDrafts[product.id];

                    return (
                      <View key={product.id} style={styles.inventoryCard}>
                        <View style={styles.inventoryHeader}>
                          <ProductIconBadge
                            accent={product.accent}
                            icon={product.icon}
                            size={46}
                          />
                          <View style={styles.inventoryCopy}>
                            <View style={styles.inventoryTitleRow}>
                              <Text style={styles.inventoryName}>{product.name}</Text>
                              <StatusChip
                                backgroundColor={PRODUCT_STATUS_STYLES[product.status].background}
                                color={PRODUCT_STATUS_STYLES[product.status].text}
                                label={formatProductStatus(product.status)}
                              />
                            </View>
                            <Text style={styles.inventoryMeta}>
                              {product.category} / {product.sku}
                            </Text>
                            <Text style={styles.inventoryUpdated}>{product.updatedAtLabel}</Text>
                          </View>
                        </View>

                        <Text style={styles.fieldLabel}>Subtitle</Text>
                        <TextInput
                          onChangeText={(value) => updateProductDraft(product.id, 'subtitle', value)}
                          placeholder="Variant or finish details"
                          placeholderTextColor={materialTheme.colors.textMuted}
                          style={styles.input}
                          value={draft?.subtitle ?? product.subtitle}
                        />

                        <View style={styles.inlineFieldRow}>
                          <View style={styles.inlineField}>
                            <Text style={styles.fieldLabel}>Price</Text>
                            <TextInput
                              keyboardType="numeric"
                              onChangeText={(value) => updateProductDraft(product.id, 'price', value)}
                              placeholder="0"
                              placeholderTextColor={materialTheme.colors.textMuted}
                              style={styles.input}
                              value={draft?.price ?? String(product.price)}
                            />
                          </View>

                          <View style={styles.inlineField}>
                            <Text style={styles.fieldLabel}>Stock</Text>
                            <TextInput
                              keyboardType="numeric"
                              onChangeText={(value) =>
                                updateProductDraft(product.id, 'stockQuantity', value)
                              }
                              placeholder="0"
                              placeholderTextColor={materialTheme.colors.textMuted}
                              style={styles.input}
                              value={draft?.stockQuantity ?? String(product.stockQuantity)}
                            />
                          </View>

                          <View style={styles.inlineField}>
                            <Text style={styles.fieldLabel}>Unit</Text>
                            <TextInput
                              onChangeText={(value) => updateProductDraft(product.id, 'unit', value)}
                              placeholder="piece"
                              placeholderTextColor={materialTheme.colors.textMuted}
                              style={styles.input}
                              value={draft?.unit ?? product.unit}
                            />
                          </View>
                        </View>

                        <TouchableOpacity
                          disabled={saving}
                          onPress={() => {
                            void handleSaveProduct(product);
                          }}
                          style={[styles.secondaryButton, saving && styles.buttonDisabled]}>
                          <Text style={styles.secondaryButtonText}>Save product changes</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.panel}>
              <SectionHeading title="Order management" />
              <Text style={styles.sectionText}>
                Track incoming jobs, move them through fulfillment, and keep delivery updates in step with operations.
              </Text>

              {dataLoading ? (
                <LoadingCard copy="Loading vendor orders..." compact />
              ) : orders.length === 0 ? (
                <EmptyCard
                  description="New vendor orders will appear here as they arrive."
                  icon="receipt-outline"
                  title="No active orders"
                />
              ) : (
                <View style={styles.cardStack}>
                  {orders.map((order) => {
                    const nextStatus = getNextVendorOrderStatus(order.status);
                    const actionLabel = ORDER_ACTION_LABELS[order.status];

                    return (
                      <View key={order.id} style={styles.orderCard}>
                        <View style={styles.orderTopRow}>
                          <View>
                            <Text style={styles.orderId}>{order.id}</Text>
                            <Text style={styles.orderCustomer}>{order.customerName}</Text>
                          </View>

                          <StatusChip
                            backgroundColor={ORDER_STATUS_STYLES[order.status].background}
                            color={ORDER_STATUS_STYLES[order.status].text}
                            label={ORDER_STATUS_LABELS[order.status]}
                          />
                        </View>

                        <View style={styles.orderMetaRow}>
                          <MetaStat label="Received" value={order.createdAtLabel} />
                          <MetaStat label="Zone" value={order.deliveryZone} />
                          <MetaStat
                            label="Value"
                            value={formatCurrency(order.total)}
                          />
                        </View>

                        <Text style={styles.orderItemsTitle}>
                          {order.itemCount} units across {order.items.length} lines
                        </Text>
                        <View style={styles.orderItemsWrap}>
                          {order.items.slice(0, 3).map((item) => (
                            <View key={`${order.id}-${item.productId}`} style={styles.orderItemChip}>
                              <Text style={styles.orderItemChipText}>
                                {item.quantity} x {item.name}
                              </Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.orderFooterRow}>
                          <Text style={styles.orderUpdated}>{order.updatedAtLabel}</Text>

                          {nextStatus && actionLabel ? (
                            <TouchableOpacity
                              disabled={saving}
                              onPress={() => {
                                void handleAdvanceOrder(order);
                              }}
                              style={[styles.primarySmallButton, saving && styles.buttonDisabled]}>
                              <Text style={styles.primarySmallButtonText}>{actionLabel}</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.completedCopy}>Order closed</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {collectionPaths ? (
              <View style={styles.structureCard}>
                <SectionHeading title="Scalable database structure" />
                <PathRow label="Vendor profile" path={collectionPaths.vendorProfile} />
                <PathRow label="Catalog" path={collectionPaths.vendorProducts} />
                <PathRow label="Orders" path={collectionPaths.vendorOrders} />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function LoadingCard({ compact = false, copy }: { compact?: boolean; copy: string }) {
  return (
    <View style={[styles.loadingCard, compact && styles.loadingCardCompact]}>
      <ActivityIndicator color={materialTheme.colors.primary} />
      <Text style={styles.loadingText}>{copy}</Text>
    </View>
  );
}

function EmptyCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ionicons color={materialTheme.colors.primary} name={icon} size={20} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

function MetricCard({
  accentColor,
  label,
  value,
}: {
  accentColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, { backgroundColor: accentColor }]} />
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaStat}>
      <Text style={styles.metaStatLabel}>{label}</Text>
      <Text style={styles.metaStatValue}>{value}</Text>
    </View>
  );
}

function PathRow({ label, path }: { label: string; path: string }) {
  return (
    <View style={styles.pathRow}>
      <Text style={styles.pathLabel}>{label}</Text>
      <Text style={styles.pathValue}>{path}</Text>
    </View>
  );
}

function StatusChip({
  backgroundColor,
  color,
  label,
}: {
  backgroundColor: string;
  color: string;
  label: string;
}) {
  return (
    <View style={[styles.statusChip, { backgroundColor }]}>
      <Text style={[styles.statusChipText, { color }]}>{label}</Text>
    </View>
  );
}

function formatProductStatus(status: VendorProduct['status']) {
  return status.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: materialTheme.colors.background,
    flex: 1,
  },
  content: {
    padding: materialTheme.screenPadding,
    paddingBottom: 40,
  },
  contentTablet: {
    alignSelf: 'center',
    maxWidth: 960,
    width: '100%',
  },
  heroCard: {
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.lg,
    padding: 20,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: materialTheme.radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modeBadge: {
    backgroundColor: materialTheme.colors.accentSoft,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeBadgeLive: {
    backgroundColor: 'rgba(220, 232, 225, 0.2)',
  },
  modeBadgeText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.accent,
  },
  modeBadgeTextLive: {
    color: materialTheme.colors.white,
  },
  heroEyebrow: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.accentSoft,
    marginTop: 20,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.white,
    marginTop: 8,
  },
  heroText: {
    ...materialTheme.typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
  },
  heroNotice: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    padding: 14,
  },
  heroNoticeText: {
    ...materialTheme.typography.caption,
    color: 'rgba(255,255,255,0.82)',
    flex: 1,
  },
  panel: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 18,
    padding: 18,
  },
  dashboardCard: {
    backgroundColor: '#102A20',
    borderRadius: materialTheme.radius.lg,
    marginTop: 18,
    padding: 18,
  },
  dashboardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  dashboardCopy: {
    flex: 1,
  },
  dashboardTitle: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.white,
  },
  dashboardSubtitle: {
    ...materialTheme.typography.caption,
    color: 'rgba(255,255,255,0.76)',
    marginTop: 4,
  },
  secondaryGhostButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryGhostButtonText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.white,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  metricCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: materialTheme.radius.md,
    flexGrow: 1,
    minWidth: 140,
    padding: 14,
  },
  metricAccent: {
    borderRadius: materialTheme.radius.pill,
    height: 4,
    width: 34,
  },
  metricValue: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.white,
    marginTop: 14,
  },
  metricLabel: {
    ...materialTheme.typography.caption,
    color: 'rgba(255,255,255,0.76)',
    marginTop: 6,
  },
  sectionText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginBottom: 4,
  },
  fieldLabel: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    ...materialTheme.typography.body,
    backgroundColor: materialTheme.colors.white,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    color: materialTheme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.md,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.white,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.terracottaSoft,
    borderRadius: materialTheme.radius.md,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.terracotta,
  },
  primarySmallButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.pill,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primarySmallButtonText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sectionHint: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 12,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.terracottaSoft,
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    padding: 14,
  },
  errorBannerText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.terracotta,
    flex: 1,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryChipSelected: {
    backgroundColor: materialTheme.colors.primary,
  },
  categoryChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
  },
  categoryChipTextSelected: {
    color: materialTheme.colors.white,
  },
  inlineFieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inlineField: {
    flex: 1,
    minWidth: 120,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.text,
    flex: 1,
  },
  cardStack: {
    gap: 14,
    marginTop: 16,
  },
  inventoryCard: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    padding: 14,
  },
  inventoryHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  inventoryCopy: {
    flex: 1,
  },
  inventoryTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  inventoryName: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
    flex: 1,
    paddingRight: 8,
  },
  inventoryMeta: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
    marginTop: 6,
  },
  inventoryUpdated: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusChipText: {
    ...materialTheme.typography.caption,
    textTransform: 'capitalize',
  },
  orderCard: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    padding: 14,
  },
  orderTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderId: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
  },
  orderCustomer: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
    marginTop: 6,
  },
  orderMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  metaStat: {
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.md,
    flex: 1,
    minWidth: 120,
    padding: 12,
  },
  metaStatLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  metaStatValue: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
    marginTop: 6,
  },
  orderItemsTitle: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
    marginTop: 16,
  },
  orderItemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  orderItemChip: {
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  orderItemChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  orderFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  orderUpdated: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    flex: 1,
  },
  completedCopy: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.success,
  },
  structureCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 18,
    padding: 18,
  },
  pathRow: {
    borderTopColor: materialTheme.colors.border,
    borderTopWidth: 1,
    gap: 4,
    paddingVertical: 12,
  },
  pathLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  pathValue: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
  },
  loadingCard: {
    ...materialTheme.shadow,
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    gap: 12,
    marginTop: 18,
    padding: 24,
  },
  loadingCardCompact: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    marginTop: 16,
    paddingVertical: 18,
  },
  loadingText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    marginTop: 16,
    padding: 24,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  emptyTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
    marginTop: 14,
  },
  emptyDescription: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
