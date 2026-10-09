const DRAFT_KEY = 'forno-draft';
const ADDRESS_KEY = 'forno-address';

export function kes(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatWhen(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function saveDraft(draft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function loadAddress() {
  try {
    return JSON.parse(localStorage.getItem(ADDRESS_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveAddress(address) {
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
}

export function selectionPayload(draft) {
  const quantity = draft.quantity || 1;
  if (draft.kind === 'preset') {
    return { kind: 'preset', presetSlug: draft.presetSlug, quantity };
  }
  return {
    kind: 'custom',
    baseId: draft.baseId,
    sauceId: draft.sauceId,
    cheeseId: draft.cheeseId,
    vegetableIds: draft.vegetableIds || [],
    quantity,
  };
}

export function describeOrder(order) {
  if (!order?.selection) return '';
  const veg = (order.selection.vegetables || []).map((item) => item.name).join(', ');
  return [order.selection.base?.name, order.selection.sauce?.name, order.selection.cheese?.name, veg]
    .filter(Boolean)
    .join(' · ');
}

export function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

export const PIPELINE = ['Order Received', 'In Kitchen', 'Sent to Delivery'];
export const STATUSES = [...PIPELINE, 'Delivered', 'Cancelled'];
