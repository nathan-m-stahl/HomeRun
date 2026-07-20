import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const onboardingPages = [
  {
    title: "Welcome to HomeRun",
    subtitle:
      "HomeRun helps people get help with small jobs around the house while giving local workers an easy way to find nearby work.",
    icon: "⌂",
    image: require("../../assets/images/OpenGrass1.jpg"),
  },
  {
    title: "Post a Task",
    subtitle:
      "Need help with yard work, moving, cleaning, snow shoveling, or another home task? Post what you need, set a price, and choose a worker.",
    icon: "▣",
    image: require("../../assets/images/OpenGrass2.jpg"),
  },
  {
    title: "Find Nearby Work",
    subtitle:
      "Workers can browse nearby tasks, request jobs, complete work, and build a strong rating over time.",
    icon: "⌖",
    image: require("../../assets/images/OpenGrass3.jpg"),
  },
  {
    title: "Simple and Reliable",
    subtitle:
      "Customers pay upfront, workers get paid after completion, and both sides can rate each other to help keep the community reliable.",
    icon: "✓",
    image: require("../../assets/images/OpenGrass4.jpg"),
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);

  const contentFade = useRef(new Animated.Value(1)).current;
  const contentSlide = useRef(new Animated.Value(0)).current;

  const currentPage = onboardingPages[pageIndex];
  const isLastPage = pageIndex === onboardingPages.length - 1;

  function goToPage(nextIndex: number, direction: "next" | "previous") {
    if (nextIndex < 0 || nextIndex >= onboardingPages.length) return;

    const slideOutValue = direction === "next" ? -width * 0.12 : width * 0.12;
    const slideInStartValue = direction === "next" ? width * 0.12 : -width * 0.12;

    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlide, {
        toValue: slideOutValue,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPageIndex(nextIndex);
      contentSlide.setValue(slideInStartValue);

      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  function animateToNextPage() {
    goToPage(pageIndex + 1, "next");
  }

  function animateToPreviousPage() {
    goToPage(pageIndex - 1, "previous");
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },

      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          animateToNextPage();
        } else if (gestureState.dx > 50) {
          animateToPreviousPage();
        }
      },
    })
  ).current;

  return (
    <View style={styles.backgroundImage}>
      {onboardingPages.map((page, index) => (
        <Animated.Image
          key={index}
          source={page.image}
          style={[
            styles.backgroundLayer,
            {
              opacity: pageIndex === index ? 1 : 0,
            },
          ]}
          resizeMode="cover"
        />
      ))}

      <View style={styles.overlay} />

      <View style={styles.container} {...panResponder.panHandlers}>
        <View style={styles.stepPill}>
          <Text style={styles.stepText}>
            {pageIndex + 1} of {onboardingPages.length}
          </Text>
        </View>

        <Animated.View
          style={[
            styles.bottomContent,
            {
              opacity: contentFade,
              transform: [{ translateX: contentSlide }],
            },
          ]}
        >
          <View style={styles.infoCard}>
            <Text style={styles.icon}>{currentPage.icon}</Text>

            <Text style={styles.title}>{currentPage.title}</Text>

            <View style={styles.greenLine} />

            <Text style={styles.subtitle}>{currentPage.subtitle}</Text>
          </View>

          {!isLastPage ? (
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={animateToNextPage}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>

              {pageIndex > 0 && (
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={animateToPreviousPage}
                >
                  <Text style={styles.outlineButtonText}>Back</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/start")}
              >
                <Text style={styles.buttonText}>Book Help</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => router.push("/start")}
              >
                <Text style={styles.outlineButtonText}>I Want Work</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={animateToPreviousPage}
              >
                <Text style={styles.textButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: "#000",
  },

  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },

  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 55,
    paddingBottom: 18,
    justifyContent: "space-between",
  },

  stepPill: {
    alignSelf: "center",
    backgroundColor: "rgba(10, 18, 10, 0.78)",
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderRadius: 999,
  },

  stepText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  bottomContent: {
    height: "50%",
    justifyContent: "flex-end",
  },

  infoCard: {
    backgroundColor: "rgba(8, 18, 9, 0.58)",
    borderRadius: 40,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.20)",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  icon: {
    color: "#79C62D",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 0,
    fontWeight: "700",
  },

  title: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 1,
  },

  greenLine: {
    width: 56,
    height: 2,
    backgroundColor: "#79C62D",
    alignSelf: "center",
    marginBottom: 16,
  },

  subtitle: {
    color: "#C9C9C9",
    fontSize: 15.5,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },

  navigationButtons: {
    marginTop: 10,
  },

  primaryButton: {
    backgroundColor: "rgba(72, 207, 30, 0.72)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 8,
    alignSelf: "center",
    width: "100%",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#293f0c",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1.5,
  },

  outlineButton: {
    backgroundColor: "rgba(8, 18, 9, 0.55)",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.20)",
    marginBottom: 8,
    alignSelf: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  outlineButtonText: {
    color: "#f1fbf1",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  textButton: {
    paddingVertical: 8,
  },

  textButtonText: {
    color: "#C9C9C9",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
});