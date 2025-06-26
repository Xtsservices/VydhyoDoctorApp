import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const LoadingScreen = () => {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: 500,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.clipBox}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <Svg width={1000} height={100} viewBox="0 0 1000 100">
            <Path
              d="
                M 0 50 
                L 20 50 
                L 25 70 
                L 30 20 
                L 35 80 
                L 40 50 
                L 60 50 
                L 65 70 
                L 70 20 
                L 75 80 
                L 80 50 
                L 100 50 
                L 105 70 
                L 110 20 
                L 115 80 
                L 120 50 
                L 140 50 
                L 145 70 
                L 150 20 
                L 155 80 
                L 160 50 
                L 180 50 
                L 185 70 
                L 190 20 
                L 195 80 
                L 200 50 
                L 220 50
                L 225 70 
                L 230 20 
                L 235 80 
                L 240 50
                L 260 50 
                L 265 70 
                L 270 20 
                L 275 80 
                L 280 50 
                L 300 50 
                L 305 70 
                L 310 20 
                L 315 80 
                L 320 50 
                L 340 50
              "
              stroke="#00FF6F"
              strokeWidth="2"
              fill="none"
            />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clipBox: {
    width: 300, // view window size
    height: 100,
    overflow: 'hidden',
  },
});

export default LoadingScreen;

