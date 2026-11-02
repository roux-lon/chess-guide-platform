import { DiarySettings } from "@/ui/DiarySettings";
import { PreferencesSettings, ThinkFirstSettings } from "@/ui/PreferencesSettings";

export default function SettingsPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        <PreferencesSettings />
        <ThinkFirstSettings />
      </div>
      <DiarySettings />
    </>
  );
}
