import * as Location from 'expo-location'; // Location ke liye
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCart } from '../../contexts/cartcontext';

export default function CartScreen() {
  const { cartItems, setCartItems } = useCart();
  const [address, setAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI'); // Default UPI rakha hai
  const [loadingLocation, setLoadingLocation] = useState(false);

  // 1. Live Location Tracing Logic
  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Location access is needed to fetch your address.");
      setLoadingLocation(false);
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    // Reverse Geocoding: Coordinates se address nikalna
    let addressResponse = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (addressResponse.length > 0) {
      let item = addressResponse[0];
      let fullAddress = `${item.name || ''}, ${item.street || ''}, ${item.city}, ${item.region}, ${item.postalCode}`;
      setAddress(fullAddress);
    }
    setLoadingLocation(false);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total: number, item: any) => {
      const numericPrice = parseInt(item.price.toString().replace(/[^-0-9]/g, ''), 10) || 0;
      return total + (numericPrice * item.quantity);
    }, 0);
  };

  const handlePlaceOrder = () => {
    if (address.length < 10) {
      Alert.alert("Error", "Please enter a valid address or use GPS.");
      return;
    }

    // Yahan hum payment gateway integrate kar sakte hain (Razorpay/Stripe)
    Alert.alert(
      "Payment Processing...",
      `Proceeding with ${paymentMode} payment for ₹${calculateTotal()}`,
      [
        { 
          text: "Pay Now", 
          onPress: () => {
            setCartItems([]);
            setAddress('');
            Alert.alert("Success", "Order placed successfully!");
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={styles.headerTitle}>Your Cart 🛒</Text>

        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}><Text>Cart is empty</Text></View>
        ) : (
          <>
            {/* Cart Items Mapping (Puraana wala code yahan rahega) */}
            {cartItems.map((item: any) => (
               <View key={item.id} style={styles.cartItem}>
                  <Text style={styles.itemName}>{item.name} x {item.quantity}</Text>
                  <Text>₹{item.price}</Text>
               </View>
            ))}

            {/* --- Location Section --- */}
            <View style={styles.section}>
              <Text style={styles.subTitle}>Delivery Address</Text>
              <TouchableOpacity style={styles.gpsBtn} onPress={getCurrentLocation}>
                {loadingLocation ? <ActivityIndicator color="#fff" /> : <Text style={styles.gpsText}>📍 Use Current Location</Text>}
              </TouchableOpacity>
              <TextInput
                style={styles.addressInput}
                placeholder="Address manually enter karein..."
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>

            {/* --- Payment Options Section --- */}
            <View style={styles.section}>
              <Text style={styles.subTitle}>Select Payment Method</Text>
              <View style={styles.paymentRow}>
                {['UPI', 'Card', 'Net Banking'].map((mode) => (
                  <TouchableOpacity 
                    key={mode}
                    style={[styles.payOption, paymentMode === mode && styles.activeOption]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Text style={[styles.payText, paymentMode === mode && styles.activeText]}>{mode}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.totalText}>Total: ₹{calculateTotal()}</Text>
              <TouchableOpacity style={styles.orderBtn} onPress={handlePlaceOrder}>
                <Text style={styles.orderBtnText}>Pay & Place Order</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 20 },
  section: { backgroundColor: '#fff', padding: 20, marginBottom: 10 },
  subTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  gpsBtn: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  gpsText: { color: '#fff', fontWeight: 'bold' },
  addressInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, height: 80, textAlignVertical: 'top' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payOption: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  activeOption: { borderColor: '#4f46e5', backgroundColor: '#f0f0ff' },
  payText: { fontSize: 14, color: '#555' },
  activeText: { color: '#4f46e5', fontWeight: 'bold' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  totalText: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  orderBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center' },
  orderBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cartItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontWeight: '500' },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }
});