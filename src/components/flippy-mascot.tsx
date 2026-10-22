import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

const mascotImage = require('../../assets/images/flippy-mascot-foreground.png') as ImageSourcePropType;

type FlippyMascotProps = { size?: number; style?: object };

export default function FlippyMascot({ size = 92, style }: FlippyMascotProps) {
  return (
    <View accessible={false} style={[styles.wrap, { width: size, height: size }, style]}>
      <Image source={mascotImage} resizeMode="contain" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
