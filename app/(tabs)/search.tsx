// =============================================
// search.tsx - Search Screen
// app/(tabs)/search.tsx
// =============================================

import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ALL_PRODUCTS = [
  
  { id: '1', name: 'Soft Close Hinges', category: 'Hinges', price: '₹120/pair', emoji: '🔩' },
  { id: '2', name: 'Butt Hinges', category: 'Hinges', price: '₹45/pair', emoji: '🔩' },
  { id: '3', name: 'Concealed Hinges', category: 'Hinges', price: '₹95/pc', emoji: '🔩' },
  { id: '4', name: 'Mortise Lock', category: 'Locks & Latches', price: '₹450/pc', emoji: '🔒' },
  { id: '5', name: 'Tower Bolt', category: 'Locks & Latches', price: '₹60/pc', emoji: '🔒' },
  { id: '6', name: 'Cabinet Lock', category: 'Locks & Latches', price: '₹85/pc', emoji: '🔒' },
  { id: '7', name: 'Lever Handle', category: 'Handles & Knobs', price: '₹220/pc', emoji: '🚪' },
  { id: '8', name: 'Cabinet Knobs (10pc)', category: 'Handles & Knobs', price: '₹280/pack', emoji: '🚪' },
  { id: '9', name: 'Drawer Pulls', category: 'Handles & Knobs', price: '₹150/pair', emoji: '🚪' },
  { id: '10', name: 'Wood Screws (100pc)', category: 'Screws & Fasteners', price: '₹90/pack', emoji: '🪛' },
  { id: '11', name: 'Anchor Bolts (50pc)', category: 'Screws & Fasteners', price: '₹120/pack', emoji: '🪛' },
  { id: '12', name: 'Ball Bearing Slides', category: 'Drawer & Sliding', price: '₹350/pair', emoji: '📦' },
  { id: '13', name: 'Wardrobe Rod', category: 'Wardrobe Fittings', price: '₹180/pc', emoji: '🗄️' },
  { id: '14', name: 'L Brackets (4pc)', category: 'Brackets & Joints', price: '₹75/pack', emoji: '📐' },
  { id: '15', name: 'Fevicol 1kg', category: 'Adhesives & Filler', price: '₹210/kg', emoji: '🧴' },
];

const POPULAR_SEARCHES = ['Hinges', 'Cabinet Lock', 'Drawer Slides', 'Wood Screws', 'Lever Handle', 'Tower Bolt'];

export default function SearchScreen() {
  // 1. Sirf ek baar useState rakhein
  const [query, setQuery] = useState('');

  // 2. Sirf ek baar filteredData ka logic rakhein
  const results = query.trim().length > 0 
    ? ALL_PRODUCTS.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) || 
        item.category.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_PRODUCTS; 

  // Iske baad seedha return shuru hoga

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header */}
      <View style={styles.header}>
        <TextInput
  style={styles.searchBar}
  placeholder="Search products..."
  value={query}                // Line 34 wala variable
  onChangeText={setQuery}      // Type karne par value update hogi
/>
        <Text style={styles.headerTitle}>Search Products</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Product ya category dhundo..."
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          autoFocus={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Popular Searches (when empty) */}
        {query.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
            <View style={styles.tagsRow}>
              {POPULAR_SEARCHES.map((s, i) => (
                <TouchableOpacity key={i} style={styles.tag} onPress={() => setQuery(s)}>
                  <Text style={styles.tagText}>🔥 {s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Search Results */}
        {query.length > 0 && results.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>"{query}" nahi mila</Text>
            <Text style={styles.emptySub}>Kuch aur search karo</Text>
          </View>
        )}

        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{results.length} results mile</Text>
            {results.map(item => (
              <TouchableOpacity key={item.id} style={styles.resultCard}>
                <View style={styles.resultLeft}>
                  <Text style={styles.resultEmoji}>{item.emoji}</Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultCat}>{item.category}</Text>
                </View>
                <Text style={styles.resultPrice}>{item.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fb' },
  header: {
    backgroundColor: '#ffffff', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  searchBar: {
    backgroundColor: '#f4f6fb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    fontSize: 15,
    color: '#333',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', margin: 16, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  clearBtn: { fontSize: 16, color: '#999', paddingHorizontal: 4 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, elevation: 1, marginBottom: 8,
  },
  tagText: { fontSize: 13, color: '#4f46e5', fontWeight: '600' },
  resultCard: {
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 1,
    flexDirection: 'row', alignItems: 'center',
  },
  resultLeft: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f0f0ff', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  resultEmoji: { fontSize: 22 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' },
  resultCat: { fontSize: 12, color: '#888', marginTop: 2 },
  resultPrice: { fontSize: 14, fontWeight: 'bold', color: '#4f46e5' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#555', fontWeight: 'bold' },
  emptySub: { fontSize: 13, color: '#aaa', marginTop: 4 },
});