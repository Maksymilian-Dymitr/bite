import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View, type LayoutChangeEvent } from "react-native";
import Svg, { Line } from "react-native-svg";
import { color } from "@/theme";

const PER_TICK = 50; // kcal per tick
const MAJOR = 10; // every 500 kcal gets a tall tick
const HEIGHT = 40;

type Props = { eaten: number; target: number };

/**
 * A ruler of ticks — one per 50 kcal of the daily target.
 * Eaten ticks fill green; ticks past the target turn raspberry.
 * Animates once to its new position whenever `eaten` changes.
 */
export function ScaleTape({ eaten, target }: Props) {
  const [width, setWidth] = useState(0);
  const targetTicks = Math.max(1, Math.round(target / PER_TICK));
  const eatenTicks = eaten / PER_TICK;
  const total = Math.min(Math.ceil(targetTicks * 1.4), Math.max(targetTicks, Math.ceil(eatenTicks)));

  const anim = useRef(new Animated.Value(eatenTicks)).current;
  const [shown, setShown] = useState(eatenTicks);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setShown(value));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) return anim.setValue(eatenTicks);
      Animated.timing(anim, {
        toValue: eatenTicks,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [eatenTicks, anim]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const step = width / total;

  return (
    <View
      onLayout={onLayout}
      style={{ height: HEIGHT }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${Math.round(eaten)} of ${Math.round(target)} kilocalories eaten`}
    >
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {Array.from({ length: total }, (_, i) => {
            const x = i * step + step / 2;
            const major = (i + 1) % MAJOR === 0;
            const isTargetEnd = i === targetTicks - 1;
            const filled = i < Math.floor(shown + 0.0001);
            const over = i >= targetTicks;
            const stroke = filled ? (over ? color.over : color.readout) : over ? "transparent" : color.line;
            const h = isTargetEnd ? HEIGHT : major ? HEIGHT * 0.8 : HEIGHT * 0.55;
            return (
              <Line
                key={i}
                x1={x}
                x2={x}
                y1={HEIGHT - h}
                y2={HEIGHT}
                stroke={stroke}
                strokeWidth={Math.max(2, step * 0.42)}
                strokeLinecap="butt"
              />
            );
          })}
        </Svg>
      )}
    </View>
  );
}
