import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette } from '../constants/theme';

export default function CardMascot() {
  return (
    <View accessibilityElementsHidden style={styles.stage}>
      <View style={styles.armLeft} />
      <View style={styles.armRight} />
      <View style={styles.body}>
        <View style={styles.eyes}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
        <View style={styles.smile} />
      </View>
      <View style={styles.legs}>
        <View style={styles.leg} />
        <View style={styles.leg} />
      </View>
      <View style={styles.bubble}><Text style={styles.bubbleText}>Yuk!</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 86, height: 82, alignItems: 'center', justifyContent: 'center' },
  body: { width: 56, height: 48, borderRadius: 13, backgroundColor: Palette.limeGreen, borderWidth: 2, borderColor: Palette.charcoalBlack, alignItems: 'center', justifyContent: 'center', zIndex: 2, transform: [{ rotate: '-5deg' }] },
  eyes: { flexDirection: 'row', gap: 12, marginTop: 5 },
  eye: { width: 5, height: 5, borderRadius: 3, backgroundColor: Palette.charcoalBlack },
  smile: { width: 13, height: 7, borderBottomWidth: 2, borderColor: Palette.charcoalBlack, borderRadius: 8, marginTop: 3 },
  armLeft: { position: 'absolute', width: 13, height: 3, backgroundColor: Palette.charcoalBlack, left: 3, top: 43, transform: [{ rotate: '-28deg' }] },
  armRight: { position: 'absolute', width: 13, height: 3, backgroundColor: Palette.charcoalBlack, right: 3, top: 38, transform: [{ rotate: '28deg' }] },
  legs: { position: 'absolute', bottom: 4, width: 31, flexDirection: 'row', justifyContent: 'space-between' },
  leg: { width: 3, height: 10, borderRadius: 2, backgroundColor: Palette.charcoalBlack },
  bubble: { position: 'absolute', top: -1, right: -1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: Palette.bubblegumPink, borderWidth: 1.5, borderColor: Palette.charcoalBlack, transform: [{ rotate: '7deg' }] },
  bubbleText: { color: Palette.charcoalBlack, fontSize: 9, fontWeight: '900' },
});
