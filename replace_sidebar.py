import sys

path = r'C:\Users\sung4\OneDrive\바탕 화면\직박구리\eh-universe-web\src\components\studio\StudioSidebar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<div className="flex h-dvh flex-col px-2 py-2 md:px-3 md:py-3 overflow-hidden">' in line:
        lines[i] = '      <div className="flex h-dvh flex-col py-3 pl-3 pr-2 overflow-hidden">\n'
    if '<div className="premium-panel-soft flex min-h-0 flex-1 flex-col overflow-y-auto border-white/8">' in line:
        lines[i] = '        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[24px] bg-[#0A0A0C]/80 backdrop-blur-[32px] border border-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02),0_20px_40px_-10px_rgba(0,0,0,0.8)]">\n'

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done!')
