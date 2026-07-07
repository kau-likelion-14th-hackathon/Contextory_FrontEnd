import { StyleSheet, Text, View } from "react-native";
import { colors } from "../shared/constants/colors";

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
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});
