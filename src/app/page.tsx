import { GameScreen } from "@/ui/GameScreen";
import { PasscodeGate } from "@/ui/PasscodeGate";

export default function Home() {
  return (
    <PasscodeGate>
      <GameScreen />
    </PasscodeGate>
  );
}
