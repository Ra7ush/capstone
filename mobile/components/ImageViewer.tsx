import React, { useRef, useState, useCallback } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  FlatList,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const IMAGE_HEIGHT = height * 0.8;

// Smooth animation config - no bouncing
const TIMING_CONFIG = {
  duration: 200,
  easing: Easing.out(Easing.ease),
};

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

const ZoomableImage = ({
  uri,
  onZoomChange,
}: {
  uri: string;
  onZoomChange: (scale: number) => void;
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // All helper functions must be worklets when used in gesture handlers
  const clamp = (value: number, min: number, max: number) => {
    "worklet";
    return Math.min(max, Math.max(min, value));
  };

  const getMaxTranslateX = (currentScale: number) => {
    "worklet";
    return Math.max(0, ((currentScale - 1) * width) / 2);
  };

  const getMaxTranslateY = (currentScale: number) => {
    "worklet";
    return Math.max(0, ((currentScale - 1) * IMAGE_HEIGHT) / 2);
  };

  // Double tap to zoom in/out
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      "worklet";
      if (scale.value > 1.1) {
        // Zoom out
        scale.value = withTiming(MIN_SCALE, TIMING_CONFIG);
        savedScale.value = MIN_SCALE;
        translateX.value = withTiming(0, TIMING_CONFIG);
        translateY.value = withTiming(0, TIMING_CONFIG);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(onZoomChange)(MIN_SCALE);
      } else {
        // Zoom in to tap location
        const targetScale = DOUBLE_TAP_SCALE;
        const tapX = event.x - width / 2;
        const tapY = event.y - IMAGE_HEIGHT / 2;

        const maxX = getMaxTranslateX(targetScale);
        const maxY = getMaxTranslateY(targetScale);
        const newX = clamp(-tapX * (targetScale - 1) * 0.5, -maxX, maxX);
        const newY = clamp(-tapY * (targetScale - 1) * 0.5, -maxY, maxY);

        scale.value = withTiming(targetScale, TIMING_CONFIG);
        savedScale.value = targetScale;
        translateX.value = withTiming(newX, TIMING_CONFIG);
        translateY.value = withTiming(newY, TIMING_CONFIG);
        savedTranslateX.value = newX;
        savedTranslateY.value = newY;

        runOnJS(onZoomChange)(targetScale);
      }
    });

  // Pinch to zoom
  const pinch = Gesture.Pinch()
    .onStart(() => {
      "worklet";
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      "worklet";
      const newScale = clamp(
        savedScale.value * event.scale,
        MIN_SCALE * 0.5,
        MAX_SCALE
      );
      scale.value = newScale;
      // Don't call runOnJS during updates to avoid crashes
    })
    .onEnd(() => {
      "worklet";
      // Snap back if below minimum
      if (scale.value < MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE, TIMING_CONFIG);
        savedScale.value = MIN_SCALE;
        translateX.value = withTiming(0, TIMING_CONFIG);
        translateY.value = withTiming(0, TIMING_CONFIG);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(onZoomChange)(MIN_SCALE);
      } else if (scale.value > MAX_SCALE) {
        scale.value = withTiming(MAX_SCALE, TIMING_CONFIG);
        savedScale.value = MAX_SCALE;
        runOnJS(onZoomChange)(MAX_SCALE);
      } else {
        savedScale.value = scale.value;
        runOnJS(onZoomChange)(scale.value);
      }
    });

  // Pan when zoomed - only activate if zoomed in
  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .manualActivation(true)
    .onTouchesMove((event, stateManager) => {
      "worklet";
      // Only activate pan gesture when zoomed in
      if (scale.value > 1.05) {
        stateManager.activate();
      } else {
        stateManager.fail();
      }
    })
    .onStart(() => {
      "worklet";
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      "worklet";
      const maxX = getMaxTranslateX(scale.value);
      const maxY = getMaxTranslateY(scale.value);
      translateX.value = clamp(
        savedTranslateX.value + event.translationX,
        -maxX,
        maxX
      );
      translateY.value = clamp(
        savedTranslateY.value + event.translationY,
        -maxY,
        maxY
      );
    })
    .onEnd(() => {
      "worklet";
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combine gestures - pinch and doubleTap always work, pan only when zoomed
  const composed = Gesture.Simultaneous(doubleTap, pinch, pan);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          {
            width,
            height,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Animated.Image
          source={{ uri }}
          style={[
            {
              width: width,
              height: height * 0.8,
            },
            animatedStyle,
          ]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

export function ImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsScrollEnabled(true);
    }
  }, [visible, initialIndex]);

  const onScroll = useCallback((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setCurrentIndex(roundIndex);
  }, []);

  const handleZoomChange = useCallback((scale: number) => {
    setIsScrollEnabled(scale <= 1.1);
  }, []);

  const goToImage = useCallback(
    (index: number) => {
      if (index >= 0 && index < images.length) {
        flatListRef.current?.scrollToIndex({ index, animated: true });
        setCurrentIndex(index);
      }
    },
    [images.length]
  );

  if (!visible || !images || images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "black" }}>
        {/* Header / Close Button */}
        <View className="absolute top-12 left-0 right-0 z-20 flex-row justify-between items-center px-6">
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
          >
            <Ionicons name="close" size={26} color="white" />
          </TouchableOpacity>
          {images.length > 1 && (
            <View className="bg-black/50 px-4 py-2 rounded-full">
              <Text className="text-white font-semibold text-base">
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          )}
          <View className="w-10" />
        </View>

        {/* Gallery - Swipe to navigate */}
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          scrollEnabled={isScrollEnabled}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          initialScrollIndex={initialIndex}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item }) => (
            <ZoomableImage uri={item} onZoomChange={handleZoomChange} />
          )}
        />

        {/* Bottom Dots Indicator (for multiple images) */}
        {images.length > 1 && (
          <View className="absolute bottom-12 left-0 right-0 flex-row justify-center items-center gap-2">
            {images.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => goToImage(index)}
                className={`rounded-full ${
                  index === currentIndex
                    ? "w-3 h-3 bg-white"
                    : "w-2 h-2 bg-white/50"
                }`}
              />
            ))}
          </View>
        )}

        {/* Zoom hint (show briefly) */}
        <View className="absolute bottom-24 left-0 right-0 items-center">
          <Text className="text-white/60 text-xs">
            Double-tap to zoom • Pinch to zoom
          </Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
