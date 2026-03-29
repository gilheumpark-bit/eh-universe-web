// ============================================================
// Code Studio — Virtual List
// ============================================================
// 긴 목록에서 보이는 항목만 렌더, 스크롤 핸들링, 동적 아이템 높이.

// ============================================================
// PART 1 — Types
// ============================================================

export interface VirtualListConfig {
  totalItems: number;
  containerHeight: number;
  estimatedItemHeight: number;
  overscan: number; // extra items to render above/below viewport
}

export interface VirtualListState {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  totalHeight: number;
  visibleCount: number;
}

export interface VirtualItem {
  index: number;
  offsetTop: number;
  height: number;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=VirtualListConfig,VirtualListState,VirtualItem

// ============================================================
// PART 2 — Fixed Height Virtual List
// ============================================================

/** Calculate visible range for fixed-height items */
export function calculateVisibleRange(
  scrollTop: number,
  config: VirtualListConfig,
): VirtualListState {
  const { totalItems, containerHeight, estimatedItemHeight, overscan } = config;

  if (totalItems === 0) {
    return { startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0, visibleCount: 0 };
  }

  const totalHeight = totalItems * estimatedItemHeight;
  const visibleCount = Math.ceil(containerHeight / estimatedItemHeight);

  const rawStart = Math.floor(scrollTop / estimatedItemHeight);
  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(totalItems - 1, rawStart + visibleCount + overscan);

  return {
    startIndex,
    endIndex,
    offsetTop: startIndex * estimatedItemHeight,
    totalHeight,
    visibleCount: endIndex - startIndex + 1,
  };
}

/** Generate virtual items for the visible range */
export function getVirtualItems(state: VirtualListState, itemHeight: number): VirtualItem[] {
  const items: VirtualItem[] = [];
  for (let i = state.startIndex; i <= state.endIndex; i++) {
    items.push({
      index: i,
      offsetTop: i * itemHeight,
      height: itemHeight,
    });
  }
  return items;
}

// IDENTITY_SEAL: PART-2 | role=FixedHeightList | inputs=scrollTop,config | outputs=VirtualListState,VirtualItem[]

// ============================================================
// PART 3 — Dynamic Height Virtual List
// ============================================================

/** Manages a virtual list with variable item heights */
export class DynamicVirtualList {
  private heights: number[];
  private offsets: number[];
  private readonly defaultHeight: number;
  private totalHeight: number;

  constructor(totalItems: number, defaultHeight: number) {
    this.defaultHeight = defaultHeight;
    this.heights = new Array(totalItems).fill(defaultHeight);
    this.offsets = new Array(totalItems).fill(0);
    this.totalHeight = totalItems * defaultHeight;
    this.recalculateOffsets();
  }

  private recalculateOffsets(): void {
    let offset = 0;
    for (let i = 0; i < this.heights.length; i++) {
      this.offsets[i] = offset;
      offset += this.heights[i];
    }
    this.totalHeight = offset;
  }

  /** Update the measured height of an item */
  setItemHeight(index: number, height: number): void {
    if (index < 0 || index >= this.heights.length) return;
    if (this.heights[index] === height) return;
    this.heights[index] = height;
    this.recalculateOffsets();
  }

  /** Get total scrollable height */
  getTotalHeight(): number {
    return this.totalHeight;
  }

  /** Calculate visible range for current scroll position */
  getVisibleRange(scrollTop: number, containerHeight: number, overscan = 3): VirtualListState {
    const total = this.heights.length;
    if (total === 0) {
      return { startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0, visibleCount: 0 };
    }

    // Binary search for start index
    let startIndex = this.binarySearch(scrollTop);
    startIndex = Math.max(0, startIndex - overscan);

    // Find end index
    let endIndex = startIndex;
    let accHeight = 0;
    while (endIndex < total && accHeight < containerHeight + overscan * this.defaultHeight) {
      accHeight += this.heights[endIndex];
      endIndex++;
    }
    endIndex = Math.min(total - 1, endIndex + overscan);

    return {
      startIndex,
      endIndex,
      offsetTop: this.offsets[startIndex] ?? 0,
      totalHeight: this.totalHeight,
      visibleCount: endIndex - startIndex + 1,
    };
  }

  /** Get items for rendering */
  getItems(state: VirtualListState): VirtualItem[] {
    const items: VirtualItem[] = [];
    for (let i = state.startIndex; i <= state.endIndex; i++) {
      items.push({
        index: i,
        offsetTop: this.offsets[i] ?? 0,
        height: this.heights[i] ?? this.defaultHeight,
      });
    }
    return items;
  }

  /** Resize the list (when total items change) */
  resize(newTotal: number): void {
    if (newTotal > this.heights.length) {
      const extra = new Array(newTotal - this.heights.length).fill(this.defaultHeight);
      this.heights = [...this.heights, ...extra];
    } else {
      this.heights = this.heights.slice(0, newTotal);
    }
    this.offsets = new Array(newTotal).fill(0);
    this.recalculateOffsets();
  }

  private binarySearch(scrollTop: number): number {
    let lo = 0;
    let hi = this.offsets.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (this.offsets[mid] < scrollTop) lo = mid + 1;
      else hi = mid - 1;
    }
    return Math.max(0, lo - 1);
  }
}

// IDENTITY_SEAL: PART-3 | role=DynamicHeightList | inputs=totalItems,scrollTop | outputs=VirtualListState,VirtualItem[]
