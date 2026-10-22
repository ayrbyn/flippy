import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Palette } from "@/constants/theme";

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Palette.background}
      indicatorColor={Palette.lightGreen}
      labelVisibilityMode="labeled"
      rippleColor={Palette.lightGreen}
      iconColor={{ default: Palette.ink, selected: Palette.ink }}
      labelStyle={{
        default: { color: Palette.ink, fontSize: 11 },
        selected: { color: Palette.ink, fontSize: 11, fontWeight: "700" },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md={{ default: "home", selected: "home" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Kata</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "pencil.tip.crop.circle", selected: "pencil.tip.crop.circle.fill" }} md={{ default: "edit_note", selected: "edit" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="albums">
        <NativeTabs.Trigger.Label>Album</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "books.vertical", selected: "books.vertical.fill" }} md={{ default: "collections_bookmark", selected: "collections_bookmark" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="user">
        <NativeTabs.Trigger.Label>User</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md={{ default: "person_outline", selected: "person" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
