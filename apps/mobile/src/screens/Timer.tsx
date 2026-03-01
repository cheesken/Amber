import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WheelColumn, HOURS, MINS, SECS } from '../components/WheelColumn';

const CIRCLE_SIZE = 200;

const BREATH_PHASES = [
  { label: 'Breathe In', duration: 4000 },
  { label: 'Hold', duration: 4000 },
  { label: 'Breathe Out', duration: 4000 },
  { label: 'Hold', duration: 4000 },
];

const CYCLE_MS = 16000;

interface TimerScreenProps {
  onUnlock?: () => void;
  secretCode?: number | null;
  showInstructionOverlay?: boolean;
  onGoToSignUp?: () => void;
}

export const TimerScreen: React.FC<TimerScreenProps> = ({
  onUnlock,
  onGoToSignUp,
  secretCode,
  showInstructionOverlay = false,
}) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(showInstructionOverlay);

  const breathAnim = useRef(new Animated.Value(0)).current;
  const phaseFade = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const phaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPhaseRef = useRef(0);

  const getPickerTotal = () => hours * 3600 + minutes * 60 + seconds;

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Breathing animation ---
  const startBreathing = useCallback(() => {
    breathAnim.setValue(0);
    const cycle = Animated.sequence([
      Animated.timing(breathAnim, {
        toValue: 1, duration: 4000,
        easing: Easing.inOut(Easing.sin), useNativeDriver: true,
      }),
      Animated.timing(breathAnim, {
        toValue: 1, duration: 4000,
        easing: Easing.linear, useNativeDriver: true,
      }),
      Animated.timing(breathAnim, {
        toValue: 0, duration: 4000,
        easing: Easing.inOut(Easing.sin), useNativeDriver: true,
      }),
      Animated.timing(breathAnim, {
        toValue: 0, duration: 4000,
        easing: Easing.linear, useNativeDriver: true,
      }),
    ]);
    loopRef.current = Animated.loop(cycle);
    loopRef.current.start();
  }, [breathAnim]);

  const stopBreathing = useCallback(() => {
    if (loopRef.current) loopRef.current.stop();
    breathAnim.setValue(0);
  }, [breathAnim]);

  // --- Phase label cycling ---
  const startPhaseCycling = useCallback(() => {
    const startTime = Date.now();
    lastPhaseRef.current = 0;
    setPhaseIndex(0);
    phaseFade.setValue(1);

    const updatePhase = () => {
      const elapsed = (Date.now() - startTime) % CYCLE_MS;
      let phase = 0;
      if (elapsed < 4000) phase = 0;
      else if (elapsed < 8000) phase = 1;
      else if (elapsed < 12000) phase = 2;
      else phase = 3;

      if (phase !== lastPhaseRef.current) {
        lastPhaseRef.current = phase;
        Animated.timing(phaseFade, {
          toValue: 0, duration: 150, useNativeDriver: true,
        }).start(() => {
          setPhaseIndex(phase);
          Animated.timing(phaseFade, {
            toValue: 1, duration: 150, useNativeDriver: true,
          }).start();
        });
      }
    };
    phaseIntervalRef.current = setInterval(updatePhase, 100);
  }, [phaseFade]);

  const stopPhaseCycling = useCallback(() => {
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    lastPhaseRef.current = 0;
    setPhaseIndex(0);
    phaseFade.setValue(1);
  }, [phaseFade]);

  // --- Countdown ---
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev: number) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeRemaining]);

  useEffect(() => {
    if (isRunning) {
      startBreathing();
      startPhaseCycling();
    } else {
      stopBreathing();
      stopPhaseCycling();
    }
    return () => {
      stopBreathing();
      stopPhaseCycling();
    };
  }, [isRunning]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
      if (loopRef.current) loopRef.current.stop();
    };
  }, []);

  const handleDone = () => {
    // Check if the entered code matches the secret
    if (secretCode != null) {
      const inputCode = hours * 10000 + minutes * 100 + seconds;
      if (inputCode === secretCode) {
        onUnlock?.();
        return;
      }
    }

    // Code doesn't match — run meditation timer normally
    const total = getPickerTotal();
    if (total > 0) {
      setTimeRemaining(total);
      setIsRunning(true);
      setIsComplete(false);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(0);
    setIsComplete(false);
  };

  // --- Interpolations ---
  const circleScale = breathAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.75, 1.05],
  });
  const circleOpacity = breathAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.55, 1.0],
  });
  const ring1Opacity = breathAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.08, 0.28],
  });
  const ring2Opacity = breathAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.04, 0.14],
  });
  const ring3Opacity = breathAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.02, 0.07],
  });

  const displayTime = isRunning || isComplete ? timeRemaining : getPickerTotal();
  const showHoursDisplay = displayTime >= 3600;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meditation</Text>
        {onGoToSignUp && (
          <TouchableOpacity
            style={styles.debugSignUpBtn}
            onPress={onGoToSignUp}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color="#C4A882" />
          </TouchableOpacity>
        )}
      </View>

      {/* Breathing circle */}
      <View style={styles.breathingArea}>
        <Animated.View
          style={[styles.glowRing, styles.ring3, { transform: [{ scale: circleScale }], opacity: ring3Opacity }]}
        />
        <Animated.View
          style={[styles.glowRing, styles.ring2, { transform: [{ scale: circleScale }], opacity: ring2Opacity }]}
        />
        <Animated.View
          style={[styles.glowRing, styles.ring1, { transform: [{ scale: circleScale }], opacity: ring1Opacity }]}
        />
        <Animated.View
          style={[styles.mainCircle, { transform: [{ scale: circleScale }], opacity: circleOpacity }]}
        >
          <Text style={[styles.timerText, showHoursDisplay && styles.timerTextSmall]}>
            {formatTime(displayTime)}
          </Text>
          {(isRunning || isComplete) && (
            <Animated.Text style={[styles.circlePhaseText, { opacity: phaseFade }]}>
              {isComplete ? 'Complete' : BREATH_PHASES[phaseIndex].label}
            </Animated.Text>
          )}
        </Animated.View>
      </View>

      {!isRunning && !isComplete ? (
        <>
          <View style={styles.pickerRow}>
            <WheelColumn data={HOURS} initialIndex={0} onIndexChange={setHours} />
            <Text style={styles.pickerSep}>:</Text>
            <WheelColumn data={MINS} initialIndex={0} onIndexChange={setMinutes} />
            <Text style={styles.pickerSep}>:</Text>
            <WheelColumn data={SECS} initialIndex={0} onIndexChange={setSeconds} />
          </View>

          <View style={styles.pickerLabels}>
            <Text style={styles.pickerLabel}>hours</Text>
            <Text style={styles.pickerLabel}>min</Text>
            <Text style={styles.pickerLabel}>sec</Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset} activeOpacity={0.7}>
              <Ionicons name="refresh" size={22} color="#C4A882" />
            </TouchableOpacity>

            {isRunning ? (
              <TouchableOpacity style={styles.playBtn} onPress={handlePause} activeOpacity={0.8}>
                <Ionicons name="pause" size={30} color="#FFFAF5" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.playBtn} onPress={() => setIsRunning(true)} activeOpacity={0.8}>
                <Ionicons name="play" size={30} color="#FFFAF5" style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            )}

            <View style={styles.btnPlaceholder} />
          </View>
        </>
      )}

      {/* Instruction overlay — shown once after first signup */}
      {overlayVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOverlayVisible(false)}
        >
          <View style={styles.overlayCard}>
            <Ionicons name="lock-open-outline" size={32} color="#E8956A" />
            <Text style={styles.overlayTitle}>How to unlock</Text>
            <Text style={styles.overlayText}>
              Set the timer to your secret code and tap Done to access your vault.
            </Text>
            <Text style={styles.overlayText}>
              Any other time will simply start a meditation session.
            </Text>
            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={() => setOverlayVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.overlayBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },

  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '200',
    color: '#4A3728',
    letterSpacing: 2,
  },

  breathingArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 320,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: '#E8956A',
  },
  ring3: { width: CIRCLE_SIZE + 120, height: CIRCLE_SIZE + 120 },
  ring2: { width: CIRCLE_SIZE + 80, height: CIRCLE_SIZE + 80 },
  ring1: { width: CIRCLE_SIZE + 40, height: CIRCLE_SIZE + 40 },
  mainCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#E8956A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 44,
    fontWeight: '200',
    color: '#FFFAF5',
    letterSpacing: 2,
  },
  timerTextSmall: {
    fontSize: 30,
  },
  circlePhaseText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#FFFAF5',
    letterSpacing: 1,
    marginTop: 4,
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  pickerSep: {
    fontSize: 30,
    fontWeight: '300',
    color: '#C4A882',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  pickerLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
    paddingTop: 4,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#C4A882',
    letterSpacing: 0.5,
  },

  doneBtn: {
    alignSelf: 'center',
    backgroundColor: '#E8956A',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 20,
    marginBottom: 24,
  },
  doneBtnText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFAF5',
    letterSpacing: 1,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingVertical: 20,
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPlaceholder: {
    width: 48,
    height: 48,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8956A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Instruction overlay */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 26, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  overlayCard: {
    backgroundColor: '#FFF9F5',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A3728',
    marginTop: 16,
    marginBottom: 12,
  },
  overlayText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#5C3D2E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  overlayBtn: {
    backgroundColor: '#E8956A',
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  overlayBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFAF5',
  },

  debugSignUpBtn: {
    position: 'absolute',
    right: 20,
    top: 22,
    padding: 6,
  },
});
