// =============================================
// HOME SCREEN - home.tsx
// Material Xpress - Round Scrollable Categories
// =============================================

import { useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useCart } from '../../contexts/cartcontext';

// ---- Saved Locations ----
const SAVED_LOCATIONS = [
  { id: '1', label: '🏠 Home', address: 'Sector 12, Agra, UP' },
  { id: '2', label: '💼 Office', address: 'MG Road, Agra, UP' },
  { id: '3', label: '👨‍👩‍👧 Family', address: 'Civil Lines, Agra, UP' },
];

// ---- All Categories ----
const CATEGORIES = [
  {
    id: '1', icon: '🔩', name: 'Hinges', color: '#4f46e5',
    sub: ['Butt Hinges', 'Piano Hinge', 'Concealed Hinges', 'Soft Close Hinges', 'Heavy Duty Hinges', 'Butterfly Hinges', 'Spring Hinges', 'Flush Hinges'],
  },
  {
    id: '2', icon: '🔒', name: 'Locks & Latches', color: '#0891b2',
    sub: ['Door Latch (Tower Bolt)', 'Mortise Lock', 'Rim Lock', 'Cabinet Lock', 'Cam Lock', 'Pad Lock Hasp', 'Magnetic Catch', 'Ball Catch', 'Hook Latch', 'Sliding Door Latch'],
  },
  {
    id: '3', icon: '🚪', name: 'Handles & Knobs', color: '#7c3aed',
    sub: ['Door Handles (Lever Handle)', 'Pull Handles', 'Cabinet Knobs', 'Drawer Pulls', 'Wardrobe Handles', 'T Handles', 'Ring Handles'],
  },
  {
    id: '4', icon: '🪛', name: 'Screws & Fasteners', color: '#b45309',
    sub: ['Wood Screws', 'Self Tapping Screws', 'Chipboard Screws', 'Confirmat Screws', 'Dowels (Wooden Pins)', 'Nails (Round, Brad, Panel Pins)', 'Anchor Bolts'],
  },
  {
    id: '5', icon: '📦', name: 'Drawer & Sliding', color: '#065f46',
    sub: ['Drawer Slides (Telescopic)', 'Ball Bearing Slides', 'Undermount Drawer Slides', 'Wardrobe Sliding System', 'Folding Door System'],
  },
  {
    id: '6', icon: '🪑', name: 'Legs & Supports', color: '#9f1239',
    sub: ['Furniture Legs (wooden, metal, plastic)', 'Sofa Legs', 'Table Legs', 'Cabinet Legs', 'Adjustable Levelers'],
  },
  {
    id: '7', icon: '📐', name: 'Brackets & Joints', color: '#1d4ed8',
    sub: ['L Brackets', 'Corner Brackets', 'Mending Plates', 'T Plates', 'Cabinet Corner Brackets', 'Shelf Brackets (Jali wale)'],
  },
  {
    id: '8', icon: '🗄️', name: 'Wardrobe Fittings', color: '#6d28d9',
    sub: ['Wardrobe Rod (hanger pipe)', 'Shelf Pins', 'Mirror Screws / Clips', 'Magnetic Door Catch', 'Push Open System', 'Gas Lift / Lid Support', 'Stay Arm'],
  },
  {
    id: '9', icon: '✨', name: 'Decorative', color: '#be185d',
    sub: ['Bed Fittings / Bedside Connectors', 'Sofa Connectors', 'Table Top Connectors', 'Glass Door Hinges & Clamps', 'Keyhole Escutcheon', 'Chain (door safety chain)', 'Hook (coat hook, J hook)', 'Door Stopper (floor & wall)'],
  },
  {
    id: '10', icon: '🧴', name: 'Adhesives & Filler', color: '#92400e',
    sub: ['Fevicol / Wood Glue', 'Fevikwik', 'Wood Filler', 'Screw Hole Caps / Cover Caps'],
  },
];

// ---- Featured / Popular Products ----
const FEATURED = [
  { id: '1', name: 'Soft Close Hinges', category: 'Hinges', rating: '4.8', price: '₹120/pair', badge: 'Best Seller' },
  { id: '2', name: 'Mortise Lock Set', category: 'Locks & Latches', rating: '4.6', price: '₹450/pc', badge: 'Popular' },
  { id: '3', name: 'Cabinet Knobs (Pack of 10)', category: 'Handles & Knobs', rating: '4.5', price: '₹280/pack', badge: '20% OFF' },
  { id: '4', name: 'Ball Bearing Drawer Slides', category: 'Drawer & Sliding', rating: '4.7', price: '₹350/pair', badge: 'New' },
];

// =============================================
// MAIN COMPONENT
// =============================================
export default function HomeScreen({ onLogout }: { onLogout: () => void }) {

  const [currentLocation, setCurrentLocation] = useState('Sector 12, Agra, UP');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [activeCatId, setActiveCatId] = useState('');
const { cartItems, addToCart, setCartItems } = useCart();

  const handleLocationSelect = (address: string) => {
    setCurrentLocation(address);
    setShowLocationModal(false);
  };

  const handleCategoryPress = (cat: typeof CATEGORIES[0]) => {
    setSelectedCategory(cat);
    setActiveCatId(cat.id);
    setShowSubModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ---- LOCATION BAR ---- */}
      <View style={styles.locationBar}>
        <TouchableOpacity style={styles.locationLeft} onPress={() => setShowLocationModal(true)}>
          <Text style={styles.locationPin}>📍</Text>
          <View>
            <Text style={styles.locationLabel}>Delivering to</Text>
            <Text style={styles.locationAddress} numberOfLines={1}>{currentLocation}</Text>
          </View>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ---- MAIN SCROLL ---- */}
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* ---- SEARCH BAR (sticky) ---- */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search hardware products..."
              placeholderTextColor="#aaa"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ---- ROUND CATEGORIES - Horizontal Scroll ---- */}
        <View style={styles.catSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScrollContent}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.catItem}
                onPress={() => handleCategoryPress(cat)}
              >
                {/* Round Circle */}
                <View style={[
                  styles.catCircle,
                  { backgroundColor: cat.color + '18', borderColor: cat.color },
                  activeCatId === cat.id && { backgroundColor: cat.color }
                ]}>
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                </View>
                {/* Name below circle */}
                <Text
                  style={[styles.catName, activeCatId === cat.id && { color: cat.color, fontWeight: 'bold' }]}
                  numberOfLines={2}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ---- OFFER BANNER ---- */}
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>🎉</Text>
          <Text style={styles.bannerText}>Material Xpress — Quality Hardware, Fast Delivery!</Text>
        </View>

        {/* ---- POPULAR PRODUCTS ---- */}
        <Text style={styles.sectionTitle}>Popular Products</Text>

        {FEATURED.map((item) => (
          <TouchableOpacity key={item.id} style={styles.productCard}>
            {/* Product Image Placeholder */}
            <View style={styles.productImage}>
              <Text style={styles.productEmoji}>🔧</Text>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            </View>
            {/* Product Info */}
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productCategory}>{item.category}</Text>
              <View style={styles.productMeta}>
                <Text style={styles.productRating}>⭐ {item.rating}</Text>
                <Text style={styles.productDot}>•</Text>
                <Text style={styles.productPrice}>{item.price}</Text>
              </View>
             {/* === SMART ADD TO CART BUTTON === */}
              {(() => {
                const cartItem = cartItems.find((c: any) => c.id === item.id);

                if (cartItem) {
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#f0f0ff', borderRadius: 8, alignSelf: 'flex-start' }}>
                      <TouchableOpacity 
                        style={{ paddingHorizontal: 14, paddingVertical: 6 }} 
                        onPress={() => {
                          if (cartItem.quantity > 1) {
                            setCartItems((prev: any) => prev.map((i: any) => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                          } else {
                            setCartItems((prev: any) => prev.filter((i: any) => i.id !== item.id));
                          }
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4f46e5' }}>-</Text>
                      </TouchableOpacity>

                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' }}>{cartItem.quantity}</Text>

                      <TouchableOpacity 
                        style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                        onPress={() => addToCart(item)}
                      >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4f46e5' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => addToCart(item)}
                  >
                    <Text style={styles.addBtnText}>+ Add to Cart</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* =============================================
          SUB CATEGORY MODAL
      ============================================= */}
      <Modal
        visible={showSubModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowSubModal(false); setActiveCatId(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subModalContainer}>

            {/* Header */}
            <View style={[styles.subModalHeader, { borderTopColor: selectedCategory?.color, borderTopWidth: 4 }]}>
              <View style={styles.subModalHeaderLeft}>
                <View style={[styles.subModalIcon, { backgroundColor: selectedCategory?.color + '20' }]}>
                  <Text style={styles.subModalEmoji}>{selectedCategory?.icon}</Text>
                </View>
                <View>
                  <Text style={styles.subModalTitle}>{selectedCategory?.name}</Text>
                  <Text style={styles.subModalCount}>{selectedCategory?.sub.length} products</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { setShowSubModal(false); setActiveCatId(''); }}
                style={styles.closeBtn}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Sub List */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedCategory?.sub.map((item, index) => (
                <TouchableOpacity key={index} style={styles.subItem}>
                  <View style={[styles.subDot, { backgroundColor: selectedCategory.color }]} />
                  <Text style={styles.subItemText}>{item}</Text>
                  <Text style={styles.subArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

          </View>
        </View>
      </Modal>

      {/* =============================================
          LOCATION MODAL
      ============================================= */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subModalContainer}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Location Chuniye</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.closeBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.currentLocationBtn}
              onPress={() => handleLocationSelect('Current Location - Agra, UP')}
            >
              <Text style={styles.currentLocationIcon}>🎯</Text>
              <View>
                <Text style={styles.currentLocationText}>Current Location Use Karo</Text>
                <Text style={styles.currentLocationSub}>GPS se automatic location</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.savedTitle}>Saved Locations</Text>
            {SAVED_LOCATIONS.map((loc) => (
              <TouchableOpacity key={loc.id} style={styles.savedLocationItem} onPress={() => handleLocationSelect(loc.address)}>
                <Text style={styles.savedLocationLabel}>{loc.label}</Text>
                <Text style={styles.savedLocationAddress}>{loc.address}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addLocationBtn}>
              <Text style={styles.addLocationText}>+ Naya Location Add Karo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// =============================================
// STYLES
// =============================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fb' },

  // Location Bar
  locationBar: {
    backgroundColor: '#ffffff', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', elevation: 3,
  },
  locationLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locationPin: { fontSize: 20, marginRight: 8 },
  locationLabel: { fontSize: 11, color: '#888' },
  locationAddress: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a', maxWidth: 180 },
  dropdownArrow: { fontSize: 10, color: '#4f46e5', marginLeft: 6, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Search (sticky wrapper)
  searchWrapper: { backgroundColor: '#f4f6fb', paddingTop: 12, paddingBottom: 8 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', marginHorizontal: 16,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  clearBtn: { fontSize: 16, color: '#999', paddingHorizontal: 4 },

  // Round Categories
  catSection: { backgroundColor: '#ffffff', paddingVertical: 16, marginBottom: 4, elevation: 1 },
  catScrollContent: { paddingHorizontal: 12 },
  catItem: { alignItems: 'center', marginHorizontal: 8, width: 68 },
  catCircle: {
    width: 62, height: 62, borderRadius: 31,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, marginBottom: 6,
  },
  catEmoji: { fontSize: 26 },
  catName: {
    fontSize: 11, color: '#444', textAlign: 'center',
    lineHeight: 15,
  },

  // Banner
  banner: {
    backgroundColor: '#4f46e5', marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  bannerEmoji: { fontSize: 20, marginRight: 8 },
  bannerText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13, flex: 1 },

  // Section
  sectionTitle: {
    fontSize: 17, fontWeight: 'bold', color: '#1a1a1a',
    marginHorizontal: 16, marginTop: 20, marginBottom: 12,
  },

  // Product Card
  productCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 14,
    borderRadius: 16, overflow: 'hidden', elevation: 2, flexDirection: 'row',
  },
  productImage: {
    width: 110, backgroundColor: '#eef0f8',
    justifyContent: 'center', alignItems: 'center',
  },
  productEmoji: { fontSize: 38 },
  badgeContainer: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#4f46e5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  productInfo: { flex: 1, padding: 14 },
  productName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  productCategory: { fontSize: 12, color: '#888', marginTop: 2 },
  productMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  productRating: { fontSize: 13, color: '#333', fontWeight: '600' },
  productDot: { marginHorizontal: 6, color: '#ccc' },
  productPrice: { fontSize: 13, color: '#4f46e5', fontWeight: 'bold' },
  addBtn: {
    backgroundColor: '#4f46e5', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12,
    alignSelf: 'flex-start', marginTop: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Sub Category Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  subModalContainer: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 20, maxHeight: '80%',
  },
  subModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  subModalHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  subModalIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  subModalEmoji: { fontSize: 24 },
  subModalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  subModalCount: { fontSize: 12, color: '#888', marginTop: 2 },
  closeBtn: { padding: 4 },
  modalClose: { fontSize: 20, color: '#888' },
  subItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
  },
  subDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  subItemText: { flex: 1, fontSize: 14, color: '#1f2937' },
  subArrow: { fontSize: 20, color: '#ccc' },

  // Location Modal
  currentLocationBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f0ff', padding: 14, borderRadius: 12, marginBottom: 20,
  },
  currentLocationIcon: { fontSize: 24, marginRight: 12 },
  currentLocationText: { fontSize: 15, fontWeight: '600', color: '#4f46e5' },
  currentLocationSub: { fontSize: 12, color: '#888', marginTop: 2 },
  savedTitle: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 12 },
  savedLocationItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  savedLocationLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  savedLocationAddress: { fontSize: 13, color: '#888', marginTop: 2 },
  addLocationBtn: {
    marginTop: 16, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#4f46e5', borderStyle: 'dashed', alignItems: 'center',
  },
  addLocationText: { color: '#4f46e5', fontWeight: '600', fontSize: 15 },
});