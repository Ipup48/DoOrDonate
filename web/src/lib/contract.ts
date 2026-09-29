import { parseAbi, isAddress } from 'viem';

// Address ที่ได้จากการ Deploy DoOrDonate.sol ใน Remix
const ENV_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

export function getContractAddress(): `0x${string}` {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('doordonate_custom_contract');
    if (custom && isAddress(custom)) {
      return custom as `0x${string}`;
    }
  }
  return (ENV_CONTRACT_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000';
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

// ABI ของ Smart Contract DoOrDonate (ตรงกับ contracts/DoOrDonate.sol)
export const ABI = parseAbi([
  'function createGoal(uint256 _durationInDays, address _charityWallet) payable',
  'function completeAndRefund(uint256 _goalId)',
  'function failAndDonate(uint256 _goalId)',
  'function getAllGoals() view returns ((uint256 id, address user, uint256 amount, uint256 deadline, address charityWallet, bool isCompleted, bool isClaimed)[])',
  'event GoalCreated(uint256 indexed goalId, address indexed user, uint256 amount, uint256 deadline, address charityWallet)',
  'event GoalCompleted(uint256 indexed goalId, address indexed user, uint256 amount)',
  'event GoalFailed(uint256 indexed goalId, address indexed user, address charityWallet, uint256 amount)'
]);

// รายชื่อมูลนิธิให้เลือก
export interface Charity {
  name: string;
  category: string;
  address: string;
  description: string;
}

export const CHARITIES: Charity[] = [
  {
    name: 'มูลนิธิกระจกเงา (The Mirror Foundation)',
    category: 'ช่วยเหลือสังคมและคนไร้ที่พึ่ง',
    address: '0x000000000000000000000000000000000000dEaD',
    description: 'ช่วยเหลือผู้ด้อยโอกาส เด็กหาย และสนับสนุนชุมชนยากไร้',
  },
  {
    name: 'มูลนิธิรามาธิบดี (Ramathibodi Foundation)',
    category: 'การแพทย์และสาธารณสุข',
    address: '0x0000000000000000000000000000000000000001',
    description: 'จัดซื้อเครื่องมือแพทย์และช่วยเหลือผู้ป่วยยากไร้',
  },
  {
    name: 'สภากาชาดไทย (The Thai Red Cross Society)',
    category: 'บรรเทาทุกข์และบริจาคโลหิต',
    address: '0x0000000000000000000000000000000000000002',
    description: 'บรรเทาทุกข์ผู้ประสบภัย ส่งเสริมคุณภาพชีวิต และการบริการโลหิต',
  },
  {
    name: 'มูลนิธิสืบนาคะเสถียร (Seub Nakhasathien Foundation)',
    category: 'สิ่งแวดล้อมและสัตว์ป่า',
    address: '0x0000000000000000000000000000000000000003',
    description: 'พิทักษ์ป่าไม้ อนุรักษ์ทรัพยากรธรรมชาติและสัตว์ป่าไทย',
  },
];
