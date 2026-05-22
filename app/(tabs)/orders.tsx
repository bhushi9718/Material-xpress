import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OrdersScreen() {

  // Abhi ke liye ye humara nakli (dummy) orders data hai
  const PAST_ORDERS = [
    { 
      id: 'ORD-8732', 
      date: '10 May 2026', 
      items: 'Mortise Lock (x1), Fevicol 1kg (x2)', 
      total: '₹870', 
      status: 'Delivered', 
      statusColor: '#10b981' // Green
    },
    { 
      id: 'ORD-8731', 
      date: '05 May 2026', 
      items: 'Concealed Hinges (x4)', 
      total: '₹380', 
      status: 'In Transit', 
      statusColor: '#f59e0b' // Orange/Yellow
    },
    { 
      id: 'ORD-8699', 
      date: '28 Apr 2026', 
      items: 'Drawer Pulls (x10)', 
      total: '₹1500', 
      status: 'Cancelled', 
      statusColor: '#ef4444' // Red
    },
  ];

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      {/* Upar ka hissa: Order ID aur Status */}
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: item.statusColor }]}>{item.status}</Text>
        </View>
      </View>

      {/* Beech ka hissa: Items aur Date */}
      <View style={styles.orderDetails}>
        <Text style={styles.dateText}>📅 {item.date}</Text>
        <Text style={styles.itemsText} numberOfLines={1}>📦 {item.items}</Text>
      </View>

      {/* Neeche ka hissa: Total aur Button */}
      <View style={styles.orderFooter}>
        <Text style={styles.totalText}>Total: {item.total}</Text>
        <TouchableOpacity style={styles.reorderBtn}>
          <Text style={styles.reorderBtnText}>Reorder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>My Orders 📦</Text>
      
      <FlatList
        data={PAST_ORDERS}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', margin: 20, color: '#1a1a1a' },
  orderCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 15, padding: 16, borderRadius: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  orderDetails: { marginBottom: 15 },
  dateText: { fontSize: 14, color: '#555', marginBottom: 4 },
  itemsText: { fontSize: 14, color: '#555' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  totalText: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  reorderBtn: { backgroundColor: '#eef0f8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  reorderBtnText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 14 },
});