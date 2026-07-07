import { StyleSheet, Text, View } from "react-native";

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Frontend Base Setup</Text>
      <Text style={styles.description}>
        주제 확정 전 최소 프론트 기본 세팅입니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#0F1C2E",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    color: "#253344",
    fontSize: 14,
    textAlign: "center",
  },
});
