import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Fonts, MaxContentWidth, Palette } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View style={styles.bar}>
          <Text style={styles.brand}>flippy <Text style={styles.spark}>*</Text></Text>
          <TabTrigger name="index" href="/" asChild><TabButton>Home</TabButton></TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild><TabButton>Kata</TabButton></TabTrigger>
          <TabTrigger name="albums" href={'/albums' as Href} asChild><TabButton>Album</TabButton></TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={[styles.tab, isFocused && styles.selected]}>
      <Text style={[styles.tabText, isFocused && styles.selectedText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 16, alignSelf: 'center', width: '94%', maxWidth: MaxContentWidth, minHeight: 62, borderWidth: 1.5, borderColor: Palette.ink, borderRadius: 22, backgroundColor: Palette.paperAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 6, gap: 3 },
  brand: { fontFamily: Fonts.handwritten, fontSize: 20, color: Palette.ink, marginRight: 'auto', marginLeft: 6 },
  spark: { color: '#8A70C8' },
  tab: { minWidth: 60, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center' },
  selected: { backgroundColor: Palette.yellow, borderWidth: 1, borderColor: Palette.ink },
  tabText: { fontSize: 14, color: Palette.muted, fontWeight: '600' },
  selectedText: { color: Palette.ink },
});
