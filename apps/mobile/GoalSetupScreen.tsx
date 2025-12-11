import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function GoalSetupScreen() {
  const navigation = useNavigation<any>();
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hedef Belirleme 🎯</Text>

      <TextInput
        placeholder="Cinsiyet (Kadın / Erkek)"
        style={styles.input}
        value={gender}
        onChangeText={setGender}
      />
      <TextInput
        placeholder="Boy (cm)"
        style={styles.input}
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
      />
      <TextInput
        placeholder="Kilo (kg)"
        style={styles.input}
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />
      <TextInput
        placeholder="Hedef Kilo (kg)"
        style={styles.input}
        keyboardType="numeric"
        value={targetWeight}
        onChangeText={setTargetWeight}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Dashboard")}
      >
        <Text style={styles.buttonText}>Kaydet →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0984e3",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
