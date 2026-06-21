import type { Emotion } from "@/engine/scene-parser";

export function getMoodFilter(mood?: string): string {
  switch (mood) {
    case "dark": return "brightness(0.6) contrast(1.1)";
    case "bright": return "brightness(1.1) saturate(1.2)";
    case "rainy": return "brightness(0.7) saturate(0.8) hue-rotate(10deg)";
    case "snowy": return "brightness(1.15) saturate(0.6)";
    case "misty": return "brightness(0.85) contrast(0.85) blur(1px)";
    case "eerie": return "brightness(0.5) saturate(0.4) hue-rotate(20deg)";
    case "warm": return "brightness(1.05) saturate(1.1) sepia(0.15)";
    case "cold": return "brightness(0.9) saturate(0.7) hue-rotate(-10deg)";
    case "peaceful": return "brightness(1.05) saturate(1.1)";
    default: return "none";
  }
}

export function getMoodGradient(mood?: string, timeOfDay?: string): string {
  if (timeOfDay === "밤" || timeOfDay === "night") return "linear-gradient(180deg, #0a0e1a 0%, #1a1f3a 50%, #0d1220 100%)";
  if (timeOfDay === "새벽" || timeOfDay === "dawn") return "linear-gradient(180deg, #1a1040 0%, #4a2060 30%, #d45050 70%, #f0a050 100%)";
  if (timeOfDay === "저녁" || timeOfDay === "evening" || timeOfDay === "해질녘" || timeOfDay === "dusk") return "linear-gradient(180deg, #2a1a3a 0%, #c04040 40%, #f09040 80%, #f0d080 100%)";
  switch (mood) {
    case "dark": return "linear-gradient(180deg, #0a0a14 0%, #1a1a28 100%)";
    case "eerie": return "linear-gradient(180deg, #0a1018 0%, #1a2030 100%)";
    case "peaceful": return "linear-gradient(180deg, #1a2a3a 0%, #2a4a5a 50%, #3a6a7a 100%)";
    default: return "linear-gradient(180deg, #0d1117 0%, #161b22 50%, #21262d 100%)";
  }
}

function getEmotionEmoji(emotion?: Emotion): string {
  if (!emotion) return "😐";
  const entries = Object.entries(emotion) as [keyof Emotion, number][];
  const dominant = entries.sort((a, b) => b[1] - a[1])[0];
  if (!dominant || dominant[1] < 0.2) return "😐";
  switch (dominant[0]) {
    case "joy": return "😊";
    case "sadness": return "😢";
    case "anger": return "😠";
    case "fear": return dominant[1] > 0.7 ? "😱" : "😨";
    case "surprise": return "😲";
  }
  const anger = emotion.anger ?? 0;
  const joy = emotion.joy ?? 0;
  const sadness = emotion.sadness ?? 0;
  if (anger > 0.3 && joy > 0.3) return "😤";
  if (anger > 0.3 && sadness > 0.3) return "😒";
  return "😐";
}

export function CharacterDisplay({ name, emotion, side }: { name: string; emotion?: Emotion; side: "left" | "right" }) {
  return (
    <div className={`absolute bottom-32 ${side === "left" ? "left-8" : "right-8"} flex flex-col items-center gap-1 transition-[transform,opacity,background-color,border-color,color] duration-300`}>
      <div className="text-3xl">{getEmotionEmoji(emotion)}</div>
      <div className="bg-bg-secondary/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-border/30">
        <span className="text-xs font-mono text-accent-purple">{name}</span>
      </div>
    </div>
  );
}
