export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div
          className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--color-accent-purple)", borderTopColor: "transparent" }}
        />
        <p className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-wider uppercase">
          LOADING...
        </p>
      </div>
    </div>
  );
}
