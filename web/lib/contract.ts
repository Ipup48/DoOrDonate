import { parseAbi } from 'viem';

// address ของ contract (ได้จากตอน Deploy ใน Remix ใส่ไว้ในไฟล์ .env.local)
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

// ลิงก์ดู transaction บน Sepolia
export const ETHERSCAN_TX = 'https://sepolia.etherscan.io/tx/';

// ABI = รายชื่อฟังก์ชันของ contract ที่เว็บเรียกใช้
export const ABI = parseAbi([
  'function createGoal(uint256 _durationInDays, address _charityWallet) payable',
  'function completeAndRefund(uint256 _goalId)',
  'function failAndDonate(uint256 _goalId)',
  'function getAllGoals() view returns ((uint256 id, address user, uint256 amount, uint256 deadline, address charityWallet, bool isCompleted, bool isClaimed)[])',
]);

// รายชื่อมูลนิธิให้เลือก (ตัวอย่าง — เปลี่ยนเป็น address มูลนิธิจริงได้)
export const CHARITIES = [
  { name: 'มูลนิธิตัวอย่าง A', address: '0x000000000000000000000000000000000000dEaD' },
  { name: 'มูลนิธิตัวอย่าง B', address: '0x0000000000000000000000000000000000000001' },
];
