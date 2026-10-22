import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaxContentWidth, Palette } from '@/constants/theme';

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
  const glyphs: Record<string, string> = { Home: String.fromCharCode(0x2302), Kata: String.fromCharCode(0x270E), Album: String.fromCharCode(0x25A4), User: String.fromCharCode(0x25CF) };
  const colors: Record<string, string> = { Home: Palette.primarySoft, Kata: Palette.primarySoft, Album: Palette.primarySoft, User: Palette.primarySoft };
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: isFocused }} {...props} style={[styles.tab, isFocused && styles.selected]}>
      <View style={[styles.iconSticker, { backgroundColor: isFocused ? colors[label] : Palette.paper }]}>
        <Text style={[styles.glyph, isFocused && styles.selectedGlyph]}>{glyphs[label] ?? '+'}</Text>
      </View>
      <Text style={[styles.tabText, isFocused && styles.selectedText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 12, alignSelf: 'center', width: '96%', maxWidth: MaxContentWidth, minHeight: 73, borderRadius: 24, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 5, paddingVertical: 5, gap: 3 },
  tab: { flex: 1, minWidth: 0, minHeight: 60, borderRadius: 18, paddingHorizontal: 3, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', gap: 1 },
  selected: { backgroundColor: Palette.primarySoft },
  iconSticker: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.softWhite },
  glyph: { color: Palette.ink, fontSize: 22, fontWeight: '800', lineHeight: 26 },
  selectedGlyph: { color: Palette.primary },
  tabText: { fontSize: 11, color: Palette.ink, fontWeight: '700' },
  selectedText: { color: Palette.primary, fontWeight: '900' },
});
