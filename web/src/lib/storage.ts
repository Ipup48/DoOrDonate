export interface GoalMeta {
  title?: string;
  proof?: string;
  proofSubmittedAt?: number;
  txHashCreate?: string;
  txHashAction?: string;
  createdAt?: number;
}

const STORAGE_KEY = 'doordonate_goals_meta_v2';
const PENDING_CREATION_KEY = 'doordonate_pending_goal_creation';

export function getAllGoalsMeta(): Record<string, GoalMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed;
  } catch (e) {
    console.error('Failed to parse goals meta from localStorage:', e);
    return {};
  }
}

export function getGoalMeta(goalId: string | bigint): GoalMeta {
  const idStr = String(goalId);
  const all = getAllGoalsMeta();

  // ตรวจสอบข้อมูลใน schema ใหม่ก่อน
  if (all[idStr]) {
    return all[idStr];
  }

  // Fallback: รองรับข้อมูลเวอร์ชันเก่า (เช่น title-0, proof-0, tx-0)
  if (typeof window !== 'undefined') {
    const oldTitle = localStorage.getItem('title-' + idStr);
    const oldProof = localStorage.getItem('proof-' + idStr);
    const oldTx = localStorage.getItem('tx-' + idStr);
    if (oldTitle || oldProof || oldTx) {
      return {
        title: oldTitle || undefined,
        proof: oldProof || undefined,
        txHashAction: oldTx || undefined,
      };
    }
  }

  return {};
}

export function saveGoalMeta(goalId: string | bigint, update: Partial<GoalMeta>) {
  if (typeof window === 'undefined') return;
  const idStr = String(goalId);
  const all = getAllGoalsMeta();
  const current = all[idStr] || getGoalMeta(idStr);

  all[idStr] = {
    ...current,
    ...update,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save goal meta to localStorage:', e);
  }
}

export function setPendingGoalCreation(data: { title: string; createdAt: number }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_CREATION_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to set pending goal creation:', e);
  }
}

export function getPendingGoalCreation(): { title: string; createdAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_CREATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearPendingGoalCreation() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PENDING_CREATION_KEY);
}
