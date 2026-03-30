// ============================================================
// Code Studio — Accessibility
// ============================================================
// ARIA 헬퍼, 포커스 관리, 스크린 리더 알림, 키보드 트랩.

/** Announce a message to screen readers via live region */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;

  let region = document.getElementById(`eh-sr-${priority}`);
  if (!region) {
    region = document.createElement('div');
    region.id = `eh-sr-${priority}`;
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    Object.assign(region.style, {
      position: 'absolute', width: '1px', height: '1px',
      padding: '0', margin: '-1px', overflow: 'hidden',
      clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: '0',
    });
    document.body.appendChild(region);
  }

  // Clear then set to ensure re-announcement
  region.textContent = '';
  requestAnimationFrame(() => { region!.textContent = message; });
}

/** Focus trap: keep Tab cycling within a container */
export function createFocusTrap(container: HTMLElement): { activate: () => void; deactivate: () => void } {
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let previousFocus: HTMLElement | null = null;

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      previousFocus = document.activeElement as HTMLElement;
      container.addEventListener('keydown', handleKeyDown);
      const first = container.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    },
    deactivate() {
      container.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    },
  };
}

/** Set ARIA attributes on an element */
export function setAriaAttributes(el: HTMLElement, attrs: Record<string, string | boolean>): void {
  for (const [key, value] of Object.entries(attrs)) {
    const attrName = key.startsWith('aria-') ? key : `aria-${key}`;
    if (typeof value === 'boolean') {
      el.setAttribute(attrName, String(value));
    } else {
      el.setAttribute(attrName, value);
    }
  }
}

/** Keyboard navigation helper for lists/trees */
export function handleListKeyNav(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void,
): number {
  let newIndex = currentIndex;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      newIndex = Math.min(currentIndex + 1, items.length - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      newIndex = Math.max(currentIndex - 1, 0);
      break;
    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      newIndex = items.length - 1;
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      onSelect(currentIndex);
      return currentIndex;
  }

  if (newIndex !== currentIndex && items[newIndex]) {
    items[newIndex].focus();
    items[newIndex].scrollIntoView({ block: 'nearest' });
  }

  return newIndex;
}

/** Generate unique ID for ARIA relationships */
let _idCounter = 0;
export function generateAriaId(prefix = 'eh'): string {
  return `${prefix}-${++_idCounter}`;
}

// IDENTITY_SEAL: role=Accessibility | inputs=message,container,element | outputs=void,focusTrap,number,string
