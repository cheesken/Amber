import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

export const ITEM_HEIGHT = 50;
export const VISIBLE_ITEMS = 5;
export const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
export const MINS = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
export const SECS = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

interface WheelColumnProps {
  data: string[];
  initialIndex: number;
  onIndexChange: (index: number) => void;
  visibleItems?: number;
}

export const WheelColumn: React.FC<WheelColumnProps> = ({
  data,
  initialIndex,
  onIndexChange,
  visibleItems = VISIBLE_ITEMS,
}) => {
  const scrollY = useRef(new Animated.Value(initialIndex * ITEM_HEIGHT)).current;
  const scrollRef = useRef<any>(null);
  const height = ITEM_HEIGHT * visibleItems;
  const halfVisible = Math.floor(visibleItems / 2);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    }, 50);
  }, []);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    onIndexChange(Math.max(0, Math.min(index, data.length - 1)));
  };

  return (
    <View style={[styles.column, { height }]}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled={true}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: ITEM_HEIGHT * halfVisible,
          paddingBottom: ITEM_HEIGHT * halfVisible,
        }}
      >
        {data.map((item, i) => {
          const offset = i * ITEM_HEIGHT;
          const itemOpacity = scrollY.interpolate({
            inputRange: [
              offset - ITEM_HEIGHT * 2,
              offset - ITEM_HEIGHT,
              offset,
              offset + ITEM_HEIGHT,
              offset + ITEM_HEIGHT * 2,
            ],
            outputRange: [0.12, 0.35, 1, 0.35, 0.12],
            extrapolate: 'clamp',
          });
          const itemScale = scrollY.interpolate({
            inputRange: [
              offset - ITEM_HEIGHT * 2,
              offset - ITEM_HEIGHT,
              offset,
              offset + ITEM_HEIGHT,
              offset + ITEM_HEIGHT * 2,
            ],
            outputRange: [0.75, 0.88, 1.12, 0.88, 0.75],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={i}
              style={[
                styles.item,
                { opacity: itemOpacity, transform: [{ scale: itemScale }] },
              ]}
            >
              <Text style={styles.itemText}>{item}</Text>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      <View
        style={[styles.highlightBand, { top: ITEM_HEIGHT * halfVisible }]}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    width: 62,
    overflow: 'hidden',
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 30,
    fontWeight: '300',
    color: '#4A3728',
  },
  highlightBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#E8956A40',
    backgroundColor: '#E8956A08',
    borderRadius: 8,
  },
});
