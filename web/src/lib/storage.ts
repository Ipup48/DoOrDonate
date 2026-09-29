export interface GoalMeta {
  title?: string;
  proof?: string;
  proofSubmittedAt?: number;
  txHashCreate?: string;
  txHashAction?: string;
  createdAt?: number;
  deadline?: number;
  charityWallet?: string;
  isDemo?: boolean;
  isExpiredDemo?: boolean;
  status?: number; // 0: Active, 1: Completed, 2: Failed
  isCompleted?: boolean;
  isClaimed?: boolean;
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
    const meta = all[idStr];
    // แปลง status ให้เป็นตัวเลขที่ถูกต้อง (0: Active, 1: Completed, 2: Failed)
    if (meta.status !== undefined) {
      if ((meta.status as any) === 'failed' || (meta.status as any) === '2') {
        meta.status = 2;
        meta.isClaimed = true;
        meta.isCompleted = false;
      } else if ((meta.status as any) === 'completed' || (meta.status as any) === '1') {
        meta.status = 1;
        meta.isClaimed = true;
        meta.isCompleted = true;
      } else {
        meta.status = Number(meta.status);
      }
    }
    return meta;
  }

  // Fallback: รองรับข้อมูลเวอร์ชันเก่า (เช่น title-0, proof-0, tx-0, status-0)
  if (typeof window !== 'undefined') {
    const oldTitle = localStorage.getItem('title-' + idStr);
    const oldProof = localStorage.getItem('proof-' + idStr);
    const oldTx = localStorage.getItem('tx-' + idStr);
    const oldStatus = localStorage.getItem('status-' + idStr);
    if (oldTitle || oldProof || oldTx || oldStatus) {
      let statusNum: number | undefined;
      if (oldStatus === 'completed' || oldStatus === '1') statusNum = 1;
      else if (oldStatus === 'failed' || oldStatus === '2') statusNum = 2;
      else if (oldStatus === 'active' || oldStatus === '0') statusNum = 0;

      return {
        title: oldTitle || undefined,
        proof: oldProof || undefined,
        txHashAction: oldTx || undefined,
        status: statusNum,
        isCompleted: statusNum === 1,
        isClaimed: statusNum === 1 || statusNum === 2,
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
    if (update.title) localStorage.setItem('title-' + idStr, update.title);
    if (update.txHashAction) localStorage.setItem('tx-' + idStr, update.txHashAction);
    if (update.status !== undefined) localStorage.setItem('status-' + idStr, String(update.status));
  } catch (e) {
    console.error('Failed to save goal meta to localStorage:', e);
  }
}

/**
 * อัปเดตสถานะเป้าหมาย (0: Active, 1: Completed, 2: Failed/Donated)
 * รองรับทั้งตัวเลข (0, 1, 2) และข้อความ ('active', 'completed', 'failed')
 */
export function updateGoalStatus(
  goalId: string | bigint,
  status: 'completed' | 'failed' | 'active' | number | string,
  txHash?: string
) {
  let statusNum = 0;
  let isCompleted = false;
  let isClaimed = false;

  const s = String(status).toLowerCase();
  if (s === '1' || s === 'completed') {
    statusNum = 1;
    isCompleted = true;
    isClaimed = true;
  } else if (s === '2' || s === 'failed') {
    statusNum = 2;
    isCompleted = false;
    isClaimed = true;
  } else {
    // 'active' / '0'
    statusNum = 0;
    isCompleted = false;
    isClaimed = false;
  }

  saveGoalMeta(goalId, {
    status: statusNum,
    isCompleted,
    isClaimed,
    ...(txHash ? { txHashAction: txHash } : {}),
  });
}

export function setPendingGoalCreation(data: {
  title: string;
  createdAt: number;
  deadline?: number;
  charityWallet?: string;
  isDemo?: boolean;
  isExpiredDemo?: boolean;
}) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_CREATION_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to set pending goal creation:', e);
  }
}

export function getPendingGoalCreation(): {
  title: string;
  createdAt: number;
  deadline?: number;
  charityWallet?: string;
  isDemo?: boolean;
  isExpiredDemo?: boolean;
} | null {
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
