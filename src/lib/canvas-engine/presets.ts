// ============================================================
// Canvas Engine — Studio Presets (스튜디오별 캔버스 템플릿)
// ============================================================

import type { CanvasElement } from './elements';
import { createRect, createText, createConnection, createSticky, createFrame } from './elements';

/** 소설 스튜디오: 씬 스토리보드 템플릿 */
export function createStoryboardPreset(scenes: Array<{ title: string; description: string }>): CanvasElement[] {
  const elements: CanvasElement[] = [];
  const CARD_W = 240;
  const CARD_H = 160;
  const GAP = 40;

  scenes.forEach((scene, i) => {
    const x = (CARD_W + GAP) * i;
    const card = createRect(x, 0, CARD_W, CARD_H, { fill: '#1c1a17', stroke: '#3d3830', cornerRadius: 16 });
    const title = createText(x + 16, 16, scene.title, { fontSize: 14, fontWeight: 700, color: '#f4f0ea', width: CARD_W - 32, height: 24 });
    const desc = createText(x + 16, 48, scene.description, { fontSize: 11, color: '#b5ac9d', width: CARD_W - 32, height: CARD_H - 64 });
    elements.push(card, title, desc);

    if (i > 0) {
      const prevCard = elements.find(el => el.type === 'rect' && el.x === (CARD_W + GAP) * (i - 1));
      if (prevCard) elements.push(createConnection(prevCard.id, card.id, { label: `→ ${i + 1}` }));
    }
  });

  return elements;
}

/** 소설 스튜디오: 캐릭터 관계도 템플릿 */
export function createCharacterMapPreset(characters: Array<{ name: string; role: string }>): CanvasElement[] {
  const elements: CanvasElement[] = [];
  const RADIUS = 200;
  const center = { x: 400, y: 300 };

  characters.forEach((char, i) => {
    const angle = (2 * Math.PI * i) / characters.length - Math.PI / 2;
    const x = center.x + RADIUS * Math.cos(angle) - 60;
    const y = center.y + RADIUS * Math.sin(angle) - 40;
    const card = createRect(x, y, 120, 80, { fill: '#242018', stroke: '#b8955c', strokeWidth: 2, cornerRadius: 12 });
    const name = createText(x + 10, y + 10, char.name, { fontSize: 13, fontWeight: 700, color: '#f4f0ea', width: 100, height: 20 });
    const role = createText(x + 10, y + 34, char.role, { fontSize: 10, color: '#847a6c', width: 100, height: 16 });
    elements.push(card, name, role);
  });

  return elements;
}

/** 코드 스튜디오: 와이어프레임 템플릿 */
export function createWireframePreset(): CanvasElement[] {
  return [
    // 브라우저 프레임
    createFrame(0, 0, 800, 600, 'Desktop 1440px'),
    // Header
    createRect(0, 0, 800, 60, { fill: '#161918', stroke: '#2e312c', cornerRadius: 0 }),
    createText(20, 20, 'Logo', { fontSize: 16, fontWeight: 700, color: '#f2f4ec' }),
    createText(600, 20, 'Nav | Items | Here', { fontSize: 12, color: '#a6aba0' }),
    // Hero
    createRect(0, 60, 800, 300, { fill: '#1e201e', stroke: '#2e312c', cornerRadius: 0 }),
    createText(40, 140, 'Hero Title', { fontSize: 32, fontWeight: 700, color: '#f2f4ec', width: 400 }),
    createText(40, 190, 'Subtitle text goes here with description', { fontSize: 14, color: '#a6aba0', width: 400 }),
    // CTA
    createRect(40, 240, 160, 44, { fill: '#4a8f78', stroke: 'transparent', cornerRadius: 8 }),
    createText(60, 252, 'Get Started', { fontSize: 14, fontWeight: 600, color: '#fff' }),
    // Content grid
    createRect(40, 400, 230, 160, { fill: '#1e201e', stroke: '#2e312c', cornerRadius: 12 }),
    createRect(290, 400, 230, 160, { fill: '#1e201e', stroke: '#2e312c', cornerRadius: 12 }),
    createRect(540, 400, 230, 160, { fill: '#1e201e', stroke: '#2e312c', cornerRadius: 12 }),
  ];
}

/** 코드 스튜디오: 컴포넌트 구조도 */
export function createComponentTreePreset(components: string[]): CanvasElement[] {
  const elements: CanvasElement[] = [];
  const rootBox = createRect(300, 0, 200, 50, { fill: '#161918', stroke: '#4a8f78', strokeWidth: 2, cornerRadius: 8 });
  const rootText = createText(320, 14, components[0] || 'App', { fontSize: 13, fontWeight: 700, color: '#4a8f78' });
  elements.push(rootBox, rootText);

  components.slice(1).forEach((name, i) => {
    const x = (i - Math.floor((components.length - 1) / 2)) * 200 + 300;
    const y = 100;
    const box = createRect(x, y, 180, 44, { fill: '#1e201e', stroke: '#6d7d8f', cornerRadius: 6 });
    const text = createText(x + 12, y + 12, name, { fontSize: 11, color: '#f2f4ec' });
    elements.push(box, text);
    elements.push(createConnection(rootBox.id, box.id));
  });

  return elements;
}

/** 아카이브: 세계관 맵 템플릿 */
export function createWorldMapPreset(regions: Array<{ name: string; x: number; y: number }>): CanvasElement[] {
  const elements: CanvasElement[] = [];
  for (const region of regions) {
    const circle = createRect(region.x - 40, region.y - 40, 80, 80, { fill: '#242018', stroke: '#b8955c', cornerRadius: 40 });
    const label = createText(region.x - 40, region.y + 50, region.name, { fontSize: 11, fontWeight: 600, color: '#f4f0ea', align: 'center', width: 80 });
    elements.push(circle, label);
  }
  return elements;
}

/** 범용: 빈 캔버스에 스티키 3개 */
export function createBrainstormPreset(): CanvasElement[] {
  return [
    createSticky(100, 100, 'Idea 1', 'yellow'),
    createSticky(350, 80, 'Idea 2', 'pink'),
    createSticky(220, 340, 'Idea 3', 'blue'),
  ];
}
