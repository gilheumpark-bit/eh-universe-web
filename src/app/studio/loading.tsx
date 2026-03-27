export default function StudioLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="text-center">
        <div
          className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--color-accent-purple)", borderTopColor: "transparent" }}
        />
        <p className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-wider uppercase">
          INITIALIZING STUDIO...
        </p>
      </div>
    </div>
  );
}
