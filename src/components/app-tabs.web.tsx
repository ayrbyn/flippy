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
          <TabTrigger name="index" href="/" asChild><TabButton>Home</TabButton></TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild><TabButton>Kata</TabButton></TabTrigger>
          <TabTrigger name="albums" href={'/albums' as Href} asChild><TabButton>Album</TabButton></TabTrigger>
          <TabTrigger name="user" href={'/user' as Href} asChild><TabButton>User</TabButton></TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const label = typeof children === 'string' ? children : '';
  const glyphs: Record<string, string> = { Home: '⌂', Kata: '✎', Album: '▤', User: '☺' };
  const colors: Record<string, string> = { Home: Palette.blue, Kata: Palette.yellow, Album: Palette.lavender, User: Palette.sage };
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: isFocused }} {...props} style={[styles.tab, isFocused && styles.selected]}>
      <View style={[styles.iconSticker, { backgroundColor: isFocused ? colors[label] : Palette.paper }]}>
        <Text style={[styles.glyph, isFocused && styles.selectedGlyph]}>{glyphs[label] ?? '•'}</Text>
      </View>
      <Text style={[styles.tabText, isFocused && styles.selectedText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 12, alignSelf: 'center', width: '96%', maxWidth: MaxContentWidth, minHeight: 73, borderWidth: 1.5, borderColor: Palette.ink, borderRadius: 24, backgroundColor: Palette.paperAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 5, paddingVertical: 5, gap: 3, transform: [{ rotate: '-0.25deg' }] },
  tab: { flex: 1, minWidth: 0, minHeight: 60, borderRadius: 17, paddingHorizontal: 3, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', gap: 1 },
  selected: { borderWidth: 1.2, borderColor: Palette.ink, transform: [{ rotate: '0.6deg' }] },
  iconSticker: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(37,37,37,0.16)', transform: [{ rotate: '-3deg' }] },
  glyph: { color: Palette.muted, fontFamily: Fonts.handwritten, fontSize: 23, fontWeight: '700', lineHeight: 26 },
  selectedGlyph: { color: Palette.ink },
  tabText: { fontSize: 11, color: Palette.muted, fontWeight: '600' },
  selectedText: { color: Palette.ink, fontWeight: '800' },
});
