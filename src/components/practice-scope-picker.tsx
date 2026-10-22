import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette } from '../constants/theme';
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
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={counts.newWords === 0}
            onPress={() => onStart('new_words')}
            style={[styles.option, styles.newOption, counts.newWords === 0 && styles.disabled]}
          >
            <View style={styles.icon}><Text style={styles.iconText}>{String.fromCharCode(0x270E)}</Text></View>
            <View style={styles.copy}>
              <Text style={[styles.optionTitle, styles.newOptionTitle]}>Belum pernah dilatih</Text>
              <Text style={[styles.description, styles.newOptionDescription]}>{counts.newWords} kata tanpa riwayat latihan</Text>
            </View>
            <Text style={[styles.arrow, styles.newOptionTitle]}>{String.fromCharCode(0x2192)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={counts.allWords === 0}
            onPress={() => onStart('all_words')}
            style={[styles.option, styles.allOption, counts.allWords === 0 && styles.disabled]}
          >
            <View style={styles.icon}><Text style={styles.iconText}>{String.fromCharCode(0x2197)}</Text></View>
            <View style={styles.copy}>
              <Text style={styles.optionTitle}>10 kata acak</Text>
              <Text style={styles.description}>Pilih dari semua {counts.allWords} flashcard</Text>
            </View>
            <Text style={styles.arrow}>{String.fromCharCode(0x2192)}</Text>
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
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,25,40,0.48)' },
  sheet: { width: '100%', maxWidth: 460, padding: 20, borderRadius: 28, backgroundColor: Palette.white },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  kicker: { color: Palette.aquaTeal, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: Palette.ink, fontSize: 27, lineHeight: 33, fontWeight: '800', marginTop: 4 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 84, padding: 13, borderRadius: 19, marginTop: 10, gap: 11 },
  newOption: { backgroundColor: Palette.primary },
  allOption: { backgroundColor: Palette.lightGreen },
  disabled: { opacity: 0.45 },
  icon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: Palette.background },
  iconText: { color: Palette.ink, fontSize: 25, fontWeight: '700' },
  copy: { flex: 1 },
  optionTitle: { color: Palette.ink, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  description: { color: Palette.ink, fontSize: 12, lineHeight: 17, marginTop: 3 },
  newOptionTitle: { color: Palette.white },
  newOptionDescription: { color: Palette.white },
  arrow: { color: Palette.ink, fontSize: 21, paddingHorizontal: 4 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  cancelText: { color: Palette.aquaTeal, fontSize: 15, fontWeight: '800' },
});
