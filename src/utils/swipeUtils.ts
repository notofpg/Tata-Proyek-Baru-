/**
 * Utility to determine whether a touch swipe gesture should be ignored for main or sub-tab navigation.
 * Prevents accidental screen/tab switches when interacting with tags, buttons, inputs, sliders,
 * modals, popovers, or any horizontally scrollable container.
 */

export function isSwipeOnInteractiveOrScrollable(target: HTMLElement | null): boolean {
  if (!target) return true;

  // 1. Direct check against interactive or horizontal scroll selectors
  const ignoredSelector = [
    'input',
    'textarea',
    'select',
    'button',
    'a',
    'label',
    '[contenteditable="true"]',
    '[contenteditable]',
    '.editor-content',
    '.recharts-wrapper',
    '.recharts-surface',
    '.canvas-container',
    'canvas',
    'table',
    '[role="slider"]',
    '[type="range"]',
    '[role="tab"]',
    '[data-no-swipe]',
    '.no-swipe',
    '.modal-container',
    '.popover',
    '.overflow-x-auto',
    '.overflow-x-scroll',
    '.scrollable-x',
    '.no-scrollbar',
    '.tag-chip',
    '.category-pill',
    '.tab-button',
    'nav',
    'header',
    'footer',
    'form'
  ].join(', ');

  if (target.closest(ignoredSelector)) {
    return true;
  }

  // 2. Traversal check up the DOM tree without forced getComputedStyle reflow
  let curr: HTMLElement | null = target;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (curr.classList.contains('no-swipe') || curr.dataset.noSwipe === 'true') {
      return true;
    }
    // Check if container has scrollable class or active horizontal scroll
    if (curr.classList.contains('overflow-x-auto') || curr.classList.contains('overflow-x-scroll')) {
      return true;
    }
    curr = curr.parentElement;
  }

  return false;
}

export const MIN_SWIPE_DISTANCE = 80; // Minimum 80px gesture threshold
export const MIN_SWIPE_RATIO = 2.0; // Horizontal motion must be at least 2x vertical motion
export const MAX_SWIPE_TIME_MS = 500; // Fast swipe within 500ms
