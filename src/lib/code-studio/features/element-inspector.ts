// ============================================================
// Code Studio — DOM Element Inspector
// ============================================================

export interface InspectedElement {
  tagName: string;
  id: string;
  classNames: string[];
  dimensions: { width: number; height: number; top: number; left: number };
  computedStyles: Record<string, string>;
  attributes: Record<string, string>;
  textContent: string;
  xpath: string;
  cssSelector: string;
}

export interface InspectorOverlay {
  visible: boolean;
  target: InspectedElement | null;
  highlightColor: string;
}

/* ── Element analysis ── */

export function inspectElement(el: Element): InspectedElement {
  const rect = el.getBoundingClientRect();
  const computed = window.getComputedStyle(el);

  const attributes: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    attributes[attr.name] = attr.value;
  }

  const styleKeys = [
    'color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight',
    'padding', 'margin', 'border', 'display', 'position',
    'width', 'height', 'lineHeight', 'zIndex', 'opacity',
  ];
  const computedStyles: Record<string, string> = {};
  for (const key of styleKeys) {
    computedStyles[key] = computed.getPropertyValue(
      key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
    );
  }

  return {
    tagName: el.tagName.toLowerCase(),
    id: el.id,
    classNames: Array.from(el.classList),
    dimensions: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
    computedStyles,
    attributes,
    textContent: (el.textContent ?? '').slice(0, 200).trim(),
    xpath: getXPath(el),
    cssSelector: getCSSSelector(el),
  };
}

function getXPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let idx = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) idx++;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift(`${current.tagName.toLowerCase()}[${idx}]`);
    current = current.parentElement;
  }
  return '/' + parts.join('/');
}

function getCSSSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  if (el.classList.length > 0) return `${tag}.${Array.from(el.classList).join('.')}`;
  return tag;
}

/* ── Overlay helpers ── */

export function createOverlayState(): InspectorOverlay {
  return { visible: false, target: null, highlightColor: 'rgba(59, 130, 246, 0.3)' };
}

export function formatDimensions(el: InspectedElement): string {
  const d = el.dimensions;
  return `${Math.round(d.width)} x ${Math.round(d.height)} px (top: ${Math.round(d.top)}, left: ${Math.round(d.left)})`;
}

// IDENTITY_SEAL: role=ElementInspector | inputs=Element | outputs=InspectedElement,InspectorOverlay
