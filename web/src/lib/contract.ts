import { parseAbi, isAddress } from 'viem';

// Address ที่ได้จากการ Deploy DoOrDonate.sol ใน Remix
const ENV_CONTRACT_ADDRESS =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONTRACT_ADDRESS) ||
  (typeof process !== 'undefined' && process.env?.VITE_CONTRACT_ADDRESS) ||
  '';

// Address เหรียญรางวัล WTC (ERC-20 Token บน Sepolia)
export const WTC_TOKEN_ADDRESS = (
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WTC_TOKEN_ADDRESS) ||
  '0x9A94Fdc6bBd09F48e6efece5B2BD74F853DF6d01'
) as `0x${string}`;

// กระเป๋ากองทุน Achievers Reward Pool (ใช้ Address ปกติ 42 หลัก ไม่ติด Precompiled contract)
export const ACHIEVER_POOL_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as `0x${string}`;

// อัตราโบนัส: 1 ETH = 10 WTC
export const WTC_REWARD_RATE = 10;

// คำนวณโบนัสเหรียญ WTC จากจำนวน ETH
export function calculateWtcBonus(ethAmount: number | string): number {
  const val = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
  if (isNaN(val) || val <= 0) return 0;
  return parseFloat((val * WTC_REWARD_RATE).toFixed(4));
}

export function getContractAddress(): `0x${string}` {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('doordonate_custom_contract');
    if (custom && isAddress(custom)) {
      return custom as `0x${string}`;
    }
  }
  return (ENV_CONTRACT_ADDRESS as `0x${string}`) || '0xb11082522409890d79666014e7a7605d8f76a760';
}

export function setCustomContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    if (address && isAddress(address)) {
      localStorage.setItem('doordonate_custom_contract', address);
    } else {
      localStorage.removeItem('doordonate_custom_contract');
    }
  }
}

// ลิงก์ดูข้อมูลบน Sepolia Etherscan
export const ETHERSCAN_TX = 'https://sepolia.etherscan.io/tx/';
export const ETHERSCAN_ADDRESS = 'https://sepolia.etherscan.io/address/';

// ABI ของ Smart Contract DoOrDonate (V2)
export const ABI_V2 = parseAbi([
  'function createGoal(uint256 _durationInDays, address _charityWallet) payable',
  'function createDemoGoal(address _charityWallet) payable',
  'function createExpiredDemoGoal(address _charityWallet) payable returns (uint256)',
  'function completeAndRefund(uint256 _goalId)',
  'function completeGoal(uint256 _goalId)',
  'function failAndDonate(uint256 _goalId)',
  'function failGoal(uint256 _goalId)',
  'function calculateBonus(uint256 _amount) view returns (uint256)',
  'function isUnlockEligible(uint256 _goalId) view returns (bool isUnlocked, uint256 unlockTimestamp)',
  'function getContractWtcBalance() view returns (uint256)',
  'function getAchieverPoolBalance() view returns (uint256)',
  'function achieverPool() view returns (uint256)',
  'function rewardRate() view returns (uint256)',
  'function rewardToken() view returns (address)',
  'function getAllGoals() view returns ((uint256 id, address user, uint256 amount, uint256 createdAt, uint256 deadline, address charityWallet, bool isCompleted, bool isClaimed)[])',
  'event GoalCreated(uint256 indexed goalId, address indexed user, uint256 amount, uint256 createdAt, uint256 deadline, address charityWallet)',
  'event GoalCompleted(uint256 indexed goalId, address indexed user, uint256 amount, uint256 bonusWtc, uint256 poolBonusEth)',
  'event GoalFailed(uint256 indexed goalId, address indexed user, address charityWallet, uint256 amount)',
  'event AchieverPoolFunded(uint256 indexed goalId, uint256 amount)',
  'event RewardTokenUpdated(address indexed newToken)',
  'event RewardRateUpdated(uint256 newRate)',
  'event RewardDeposited(address indexed sender, uint256 amount)'
]);

// ABI ของ Smart Contract DoOrDonate (V1)
export const ABI_V1 = parseAbi([
  'function createGoal(uint256 _durationInDays, address _charityWallet) payable',
  'function completeAndRefund(uint256 _goalId)',
  'function completeGoal(uint256 _goalId)',
  'function failAndDonate(uint256 _goalId)',
  'function failGoal(uint256 _goalId)',
  'function calculateBonus(uint256 _amount) view returns (uint256)',
  'function getContractWtcBalance() view returns (uint256)',
  'function getAchieverPoolBalance() view returns (uint256)',
  'function achieverPool() view returns (uint256)',
  'function rewardRate() view returns (uint256)',
  'function rewardToken() view returns (address)',
  'function getAllGoals() view returns ((uint256 id, address user, uint256 amount, uint256 deadline, address charityWallet, bool isCompleted, bool isClaimed)[])',
  'event GoalCreated(uint256 indexed goalId, address indexed user, uint256 amount, uint256 deadline, address charityWallet)',
  'event GoalCompleted(uint256 indexed goalId, address indexed user, uint256 amount, uint256 bonusWtc, uint256 poolBonusEth)',
  'event GoalFailed(uint256 indexed goalId, address indexed user, address charityWallet, uint256 amount)',
  'event AchieverPoolFunded(uint256 indexed goalId, uint256 amount)',
  'event RewardTokenUpdated(address indexed newToken)',
  'event RewardRateUpdated(uint256 newRate)',
  'event RewardDeposited(address indexed sender, uint256 amount)'
]);

export enum GoalStatus {
  Active = 0,
  Completed = 1,
  Failed = 2,
}

// ABI ของ Smart Contract DoOrDonate (V3: มี status uint8)
export const ABI_STATUS = parseAbi([
  'function createGoal(uint256 _durationInDays, address _charityWallet) payable',
  'function createDemoGoal(address _charityWallet) payable',
  'function createExpiredDemoGoal(address _charityWallet) payable returns (uint256)',
  'function completeAndRefund(uint256 _goalId)',
  'function completeGoal(uint256 _goalId)',
  'function failAndDonate(uint256 _goalId)',
  'function failGoal(uint256 _goalId)',
  'function calculateBonus(uint256 _amount) view returns (uint256)',
  'function isUnlockEligible(uint256 _goalId) view returns (bool isUnlocked, uint256 unlockTimestamp)',
  'function getContractWtcBalance() view returns (uint256)',
  'function getAchieverPoolBalance() view returns (uint256)',
  'function achieverPool() view returns (uint256)',
  'function rewardRate() view returns (uint256)',
  'function rewardToken() view returns (address)',
  'function goals(uint256) view returns (uint256 id, address user, uint256 amount, uint256 createdAt, uint256 deadline, address charityWallet, uint8 status)',
  'function getAllGoals() view returns ((uint256 id, address user, uint256 amount, uint256 createdAt, uint256 deadline, address charityWallet, uint8 status)[])',
  'event GoalCreated(uint256 indexed goalId, address indexed user, uint256 amount, uint256 createdAt, uint256 deadline, address charityWallet)',
  'event GoalCompleted(uint256 indexed goalId, address indexed user, uint256 amount, uint256 bonusWtc, uint256 poolBonusEth)',
  'event GoalFailed(uint256 indexed goalId, address indexed user, address charityWallet, uint256 amount)',
  'event AchieverPoolFunded(uint256 indexed goalId, uint256 amount)',
  'event RewardTokenUpdated(address indexed newToken)',
  'event RewardRateUpdated(uint256 newRate)',
  'event RewardDeposited(address indexed sender, uint256 amount)'
]);

export const ABI_EVENTS = parseAbi([
  'event GoalCreated(uint256 indexed goalId, address indexed user, uint256 amount, uint256 createdAt, uint256 deadline, address charityWallet)',
  'event GoalCreated(uint256 indexed goalId, address indexed user, uint256 amount, uint256 deadline, address charityWallet)',
  'event GoalCompleted(uint256 indexed goalId, address indexed user, uint256 amount, uint256 bonusWtc, uint256 poolBonusEth)',
  'event GoalCompleted(uint256 indexed goalId, address indexed user, uint256 amount)',
  'event GoalFailed(uint256 indexed goalId, address indexed user, address charityWallet, uint256 amount)'
]);

export const ABI = ABI_STATUS;

export const WTC_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);

export async function addWtcTokenToWallet(): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as any).ethereum) return false;
  try {
    const wasAdded = await (window as any).ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: WTC_TOKEN_ADDRESS,
          symbol: 'WTC',
          decimals: 18,
        },
      },
    });
    return Boolean(wasAdded);
  } catch (err) {
    console.error('Failed to add WTC token to wallet:', err);
    return false;
  }
}

export interface Charity {
  name: string;
  category: string;
  address: string;
  description: string;
  isPool?: boolean;
}

// รายชื่อมูลนิธิที่ใช้ Address กระเป๋าจริงความยาว 42 หลัก
export const CHARITIES: Charity[] = [
  {
    name: '🏆 กองทุนเงินมัดจำสำหรับผู้ที่ทำสำเร็จ (Achievers Reward Pool)',
    category: 'สมทบรางวัลให้ผู้ที่ทำสำเร็จในระบบ',
    address: ACHIEVER_POOL_ADDRESS,
    description: 'หากทำไม่สำเร็จ เงินมัดจำของคุณจะถูกสะสมในกองทุนกลาง เพื่อนำไปแจกจ่ายและสมทบเป็นรางวัลพิเศษแก่ผู้ที่ทำเป้าหมายสำเร็จในระบบ',
    isPool: true,
  },
  {
    name: 'มูลนิธิกระจกเงา (The Mirror Foundation)',
    category: 'ช่วยเหลือสังคมและคนไร้ที่พึ่ง',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    description: 'ช่วยเหลือผู้ด้อยโอกาส เด็กหาย และสนับสนุนชุมชนยากไร้',
  },
  {
    name: 'มูลนิธิรามาธิบดี (Ramathibodi Foundation)',
    category: 'การแพทย์และสาธารณสุข',
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    description: 'จัดซื้อเครื่องมือแพทย์และช่วยเหลือผู้ป่วยยากไร้',
  },
  {
    name: 'สภากาชาดไทย (The Thai Red Cross Society)',
    category: 'บรรเทาทุกข์และบริจาคโลหิต',
    address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    description: 'บรรเทาทุกข์ผู้ประสบภัย ส่งเสริมคุณภาพชีวิต และการบริการโลหิต',
  },
];