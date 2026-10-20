import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Fonts, Palette } from '../constants/theme';
import { PracticeScope } from '../lib/practice';

export default function PracticeScopePicker({
  visible,
  counts,
  onCancel,
  onStart,
}: {
  visible: boolean;
  counts: { newWords: number; allWords: number };
  onCancel: () => void;
  onStart: (scope: PracticeScope) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Tutup pilihan latihan" onPress={onCancel} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.heading}>
            <View>
              <Text style={styles.kicker}>MULAI LATIHAN</Text>
              <Text style={styles.title}>Pilih kumpulan kata</Text>
            </View>
            <Text accessibilityElementsHidden style={styles.doodle}>✳</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={counts.newWords === 0}
            onPress={() => onStart('new_words')}
            style={[styles.option, styles.newOption, counts.newWords === 0 && styles.disabled]}
          >
            <View style={styles.icon}><Text style={styles.iconText}>✎</Text></View>
            <View style={styles.copy}>
              <Text style={styles.optionTitle}>Kata baru</Text>
              <Text style={styles.description}>Kata yang belum pernah dilatih · {counts.newWords} kata</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={counts.allWords === 0}
            onPress={() => onStart('all_words')}
            style={[styles.option, styles.allOption, counts.allWords === 0 && styles.disabled]}
          >
            <View style={styles.icon}><Text style={styles.iconText}>↗</Text></View>
            <View style={styles.copy}>
              <Text style={styles.optionTitle}>10 kata acak</Text>
              <Text style={styles.description}>Pilih dari semua {counts.allWords} flashcard</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Batal</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(37,37,37,0.54)' },
  sheet: { width: '100%', maxWidth: 460, padding: 20, borderWidth: 1.5, borderColor: Palette.ink, borderRadius: 23, backgroundColor: Palette.paper, transform: [{ rotate: '-0.25deg' }] },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kicker: { color: Palette.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 27, fontWeight: '700', marginTop: 2 },
  doodle: { color: '#8A70C8', fontSize: 27, transform: [{ rotate: '12deg' }] },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 74, padding: 11, borderWidth: 1.2, borderColor: Palette.ink, borderRadius: 16, marginTop: 9, gap: 11 },
  newOption: { backgroundColor: Palette.yellow },
  allOption: { backgroundColor: Palette.lavender },
  disabled: { opacity: 0.45 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.ink, borderRadius: 13, backgroundColor: Palette.paperAlt, transform: [{ rotate: '-4deg' }] },
  iconText: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 26, fontWeight: '700' },
  copy: { flex: 1 },
  optionTitle: { color: Palette.ink, fontSize: 15, fontWeight: '700' },
  description: { color: Palette.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  arrow: { color: Palette.ink, fontSize: 21, paddingHorizontal: 4 },
  cancel: { minHeight: 45, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  cancelText: { color: Palette.muted, fontSize: 14, fontWeight: '600' },
});
