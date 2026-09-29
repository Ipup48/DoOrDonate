# DoOrDonate

มัดจำเป้าหมายชีวิตด้วย ETH — ทำสำเร็จได้เงินคืน ไม่สำเร็จเงินถูกส่งให้มูลนิธิ
ใช้ Remix IDE สำหรับ Smart Contract และ Next.js สำหรับหน้าเว็บ (เครือข่าย Sepolia Testnet)

```
contracts/DoOrDonate.sol    Smart Contract (เอาไปวางใน Remix)
web/                        หน้าเว็บ Next.js
```

## สิ่งที่ต้องมี
- Node.js 18 ขึ้นไป
- MetaMask และเปลี่ยนเครือข่ายเป็น Sepolia
- Sepolia ETH ฟรีจาก faucet (ค้นหา "Sepolia faucet")

## ขั้นที่ 1: Deploy Smart Contract ด้วย Remix
1. เปิด https://remix.ethereum.org
2. สร้างไฟล์ใหม่ชื่อ `DoOrDonate.sol` แล้วคัดลอกโค้ดจาก `contracts/DoOrDonate.sol` ไปวาง
3. แท็บ **Solidity Compiler** เลือกเวอร์ชัน 0.8.20 ขึ้นไป แล้วกด **Compile**
4. แท็บ **Deploy & Run** ตั้ง Environment เป็น **Injected Provider - MetaMask** (ตรวจว่าเป็น Sepolia)
5. เลือก contract **DoOrDonate** แล้วกด **Deploy** และยืนยันใน MetaMask
6. ที่ช่อง Deployed Contracts กดไอคอนคัดลอก **address** เก็บไว้

## ขั้นที่ 2: รันหน้าเว็บ
```bash
cd web
npm install
cp .env.example .env.local
```
เปิดไฟล์ `.env.local` แล้วใส่ค่า 2 อย่าง
- `NEXT_PUBLIC_CONTRACT_ADDRESS` = address จากขั้นที่ 1
- `NEXT_PUBLIC_WC_PROJECT_ID` = Project ID ฟรีจาก https://cloud.reown.com

จากนั้นรัน
```bash
npm run dev
```
เปิด http://localhost:3000

## วิธีใช้งาน
1. กด Connect Wallet
2. กรอกชื่อเป้าหมาย ระยะเวลา เงินมัดจำ และเลือกมูลนิธิ แล้วกดสร้าง
3. แท็บ "เป้าหมายที่กำลังทำ": กด "ส่งหลักฐาน" แล้วกด "ขอรับเงินคืน" ก่อนหมดเวลา
4. ถ้าหมดเวลา ใครก็กด "โอนเงินให้มูลนิธิ" ได้
5. แท็บ "ประวัติ" มีลิงก์ดู Transaction บน Etherscan

## หมายเหตุ
- รายชื่อมูลนิธิอยู่ใน `web/lib/contract.ts` (เป็นค่าตัวอย่าง แก้ได้)
- ชื่อเป้าหมาย หลักฐาน และลิงก์ Transaction เก็บในเบราว์เซอร์ ถ้าเปลี่ยนเครื่องจะไม่เห็น
- ถ้าต้องการทดสอบกรณีหมดเวลาเร็ว ๆ ให้แก้ `1 days` ในสัญญาเป็น `1 minutes` แล้ว Deploy ใหม่
