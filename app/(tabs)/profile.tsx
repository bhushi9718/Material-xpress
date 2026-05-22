import React, { useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
export default function ProfileScreen() {

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
const [image, setImage] = useState(
  'https://i.pravatar.cc/300'
);
const pickImage = async () => {

  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    alert('Gallery permission required');
    return;
  }

  const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

  if (!result.canceled) {
    setImage(result.assets[0].uri);
  }
};
const saveProfile = async () => {

  try {

    const profileData = {
      name,
      email,
      image,
    };

    await AsyncStorage.setItem(
      'profileData',
      JSON.stringify(profileData)
    );

    alert('Profile Saved');

  } catch (error) {

    alert('Save Failed');

  }
};
const loadProfile = async () => {

  try {

    const data =
      await AsyncStorage.getItem('profileData');

    if (data !== null) {

      const profile = JSON.parse(data);

      setName(profile.name || '');
      setEmail(profile.email || '');
      setImage(profile.image || image);

    }

  } catch (error) {

    console.log(error);

  }
};
useEffect(() => {
    loadProfile();
  }, []);
  return (
    <ScrollView style={styles.container}>

      {/* PROFILE TOP */}

      <View style={styles.topSection}>

        <View style={styles.imageContainer}>

         <TouchableOpacity onPress={pickImage}>

  <Image
    source={{
      uri: image,
    }}
    style={styles.profileImage}
  />

</TouchableOpacity>

          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Ionicons
              name="camera"
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

        </View>

        <Text style={styles.name}>
          {name}
        </Text>

      </View>

      {/* STATS */}

      <View style={styles.statsContainer}>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>24</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Wishlist</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>

      </View>

      {/* EDIT PROFILE */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Edit Profile
        </Text>

        <TextInput
  style={styles.input}
  placeholder="Enter your name"
  value={name}                    // <-- Ye zaroori hai
  onChangeText={setName}          // <-- Ye zaroori hai
/>

        <TextInput
  style={styles.input}
  placeholder="Enter your email"
  value={email}                   // <-- Ye zaroori hai
  onChangeText={setEmail}         // <-- Ye zaroori hai
  keyboardType="email-address"
/>

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
  <Text style={styles.btnText}>Save Profile</Text>
</TouchableOpacity>

      </View>

      {/* MENU */}

      <View style={styles.card}>

        <MenuItem
          icon="person-outline"
          title="Personal Details"
        />

        <MenuItem
          icon="bag-outline"
          title="My Orders"
        />

        <MenuItem
          icon="heart-outline"
          title="Wishlist"
        />

        <MenuItem
          icon="location-outline"
          title="Saved Addresses"
        />

        <MenuItem
          icon="settings-outline"
          title="Settings"
        />

        <MenuItem
          icon="help-circle-outline"
          title="Help & Support"
        />

      </View>

      {/* LOGOUT */}

      <TouchableOpacity
  style={styles.logoutBtn}
  onPress={() => alert('Logged Out')}
>
        <Text style={styles.logoutText}>
          Logout
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* MENU ITEM */

function MenuItem({ icon, title }: any) {
  return (
    <TouchableOpacity style={styles.menuItem}>

      <View style={styles.menuLeft}>

        <Ionicons
          name={icon}
          size={22}
          color="#4f46e5"
        />

        <Text style={styles.menuText}>
          {title}
        </Text>

      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#bbb"
      />

    </TouchableOpacity>
  );
}

/* STYLES */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },

  topSection: {
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 30,
  },

  imageContainer: {
    position: 'relative',
  },

  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#DCCFFF',
  },

  editIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#4f46e5',
    padding: 8,
    borderRadius: 50,
  },

  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 15,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 25,
  },

  statBox: {
    backgroundColor: '#fff',
    width: '30%',
    padding: 18,
    borderRadius: 22,
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  statNumber: {
    color: '#4f46e5',
    fontSize: 22,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#777',
    marginTop: 5,
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 20,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
  },

  input: {
    backgroundColor: '#F3F1FA',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#222',
  },

  saveBtn: {
    backgroundColor: '#4f46e5',
    padding: 17,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 5,
  },

  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDF7',
  },

  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },

  logoutBtn: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 50,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  logoutText: {
    color: '#FF4D6D',
    fontSize: 16,
    fontWeight: 'bold',
  },

});