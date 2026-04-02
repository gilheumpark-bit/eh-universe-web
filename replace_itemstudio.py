import sys

path = r'C:\Users\sung4\OneDrive\바탕 화면\직박구리\eh-universe-web\src\components\studio\ItemStudioView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Item Card (line 559)
text = text.replace(
    'className="bg-bg-secondary border border-border rounded-xl p-4 space-y-2 relative overflow-hidden group"',
    'className="relative overflow-hidden rounded-xl bg-[rgba(255,255,255,0.02)] backdrop-blur-md border border-[rgba(202,161,92,0.15)] p-4 space-y-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-all hover:bg-[rgba(255,255,255,0.04)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_8px_20px_-4px_rgba(0,0,0,0.5)] group"'
)

# Replace Add Forms / Balance panels
text = text.replace(
    'className="bg-bg-secondary rounded-xl p-4 space-y-3"',
    'className="relative overflow-hidden rounded-xl bg-[rgba(255,255,255,0.02)] backdrop-blur-md border border-[rgba(202,161,92,0.1)] p-4 space-y-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"'
)

# Replace Skill Cards
text = text.replace(
    'className="bg-bg-secondary border border-border rounded-xl p-4 space-y-2"',
    'className="relative overflow-hidden rounded-xl bg-[rgba(255,255,255,0.02)] backdrop-blur-md border border-[rgba(202,161,92,0.15)] p-4 space-y-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-all hover:bg-[rgba(255,255,255,0.04)]"'
)

# Replace MagicSystemCard
text = text.replace(
    'className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3"',
    'className="relative overflow-hidden rounded-xl bg-[rgba(255,255,255,0.02)] backdrop-blur-md border border-[rgba(202,161,92,0.15)] p-4 space-y-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-all hover:bg-[rgba(255,255,255,0.04)]"'
)

# Replace Inputs
text = text.replace(
    'className="bg-bg-primary border border-border',
    'className="bg-black/40 border border-white/10'
)

# Replace top layout flex subtabs container items
text = text.replace(
    'bg-bg-secondary text-text-tertiary hover:text-text-primary',
    'bg-[rgba(255,255,255,0.03)] border border-white/5 text-text-tertiary hover:text-[rgba(246,226,188,0.94)] hover:border-[rgba(202,161,92,0.3)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
