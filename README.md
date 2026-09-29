# DoOrDonate 🎯

มัดจำเป้าหมายชีวิตด้วย ETH — ทำสำเร็จได้เงินคืน ไม่สำเร็จเงินถูกส่งให้มูลนิธิ
ใช้ Remix IDE สำหรับ Smart Contract และ **Next.js 14 (App Router) + Tailwind CSS** สำหรับหน้าเว็บ (เครือข่าย Ethereum Sepolia Testnet)

```
contracts/DoOrDonate.sol    Smart Contract (สำหรับ Compile & Deploy ใน Remix)
web/                        หน้าเว็บ Next.js App Router (Wagmi + Viem + Tailwind CSS)
```

---

## สิ่งที่ต้องมี
- Node.js 18 ขึ้นไป
- MetaMask Extension บนเบราว์เซอร์ พร้อมเลือกเครือข่าย **Sepolia Testnet**
- Sepolia ETH ฟรีจาก faucet (เช่น [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) หรือ [Alchemy Faucet](https://www.alchemy.com/faucets/ethereum-sepolia))

---

## ขั้นที่ 1: Deploy Smart Contract ด้วย Remix
1. เปิด [Remix IDE](https://remix.ethereum.org)
2. สร้างไฟล์ใหม่ชื่อ `DoOrDonate.sol` ในโฟลเดอร์ `contracts` แล้วคัดลอกโค้ดจาก `contracts/DoOrDonate.sol` ไปวาง
3. ที่แท็บ **Solidity Compiler**: เลือกคอมไพเลอร์เวอร์ชัน `0.8.20` ขึ้นไป แล้วกด **Compile DoOrDonate.sol**
4. ที่แท็บ **Deploy & Run Transactions**:
   - Environment: เลือก **Injected Provider - MetaMask**
   - ตรวจสอบว่า MetaMask เชื่อมต่อกับเครือข่าย **Sepolia** (Chain ID 11155111)
   - Contract: เลือก **DoOrDonate**
   - กดปุ่ม **Deploy** และกดยืนยันธุรกรรมใน MetaMask
5. เมื่อ Deploy เสร็จแล้ว ที่กล่อง **Deployed Contracts** ด้านล่าง กดไอคอนคัดลอก **Contract Address** เก็บไว้

---

## ขั้นที่ 2: รันหน้าเว็บ Next.js
```bash
cd web
npm install
```

คุณสามารถระบุ Contract Address ได้ 2 วิธี:
- **วิธีที่ 1 (ผ่านหน้าเว็บโดยตรง):** รันหน้าเว็บขึ้นมา แล้วใส่ Address ในกล่องแจ้งเตือนหรือกดปุ่ม ⚙️ ตั้งค่าบน Navbar
- **วิธีที่ 2 (ผ่านไฟล์ .env):**
   ```bash
   cp .env.example .env
   ```
   แล้วเปิดไฟล์ `.env` ใส่ค่า:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xเลข_Contract_ที่_Deploy_มา
   ```

จากนั้นรัน Development Server:
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## จุดเด่นและการทำงานของระบบ
1. **Next.js 14 App Router:**
   - โครงสร้าง App Router ที่ทันสมัย รวดเร็ว และรองรับ Server/Client Components อย่างลงตัว
   - มี Client-side Mounting ป้องกันปัญหา Hydration Mismatch ของ Web3 Providers
2. **รองรับเฉพาะ MetaMask โดยตรง:**
   - กดปุ่ม "เชื่อมต่อ MetaMask" แล้วจะเปิดหน้าต่างยืนยันของ MetaMask ทันที
   - ไม่มีการบล็อคปุ่มส่งมัดจำโดยไม่จำเป็น และตรวจจับยอดเงิน/ก๊าซแบบ Real-time พร้อม Fallback RPC หลายจุดเพื่อความเสถียร
3. **ระบบเตือนและสลับเครือข่ายอัตโนมัติ:**
   - หากผู้ใช้เชื่อมต่อผิดเครือข่าย ระบบจะมีแถบแจ้งเตือนและสลับไปยัง Sepolia ใน MetaMask ได้ทันที
4. **ป้องกันข้อผิดพลาดในการทำธุรกรรม:**
   - ป้องกันการระบุกระเป๋ามูลนิธิเป็นกระเป๋าของตนเอง (ตรงตามเงื่อนไขของ Smart Contract)
   - ตรวจสอบรูปแบบ Address และจำนวนเงินอย่างแม่นยำ
5. **การบันทึกข้อมูลและหลักฐาน (Proof):**
   - มี Modal สำหรับแนบลิงก์รูปภาพ, Strava, GitHub หรือข้อความบันทึกความสำเร็จ
   - ดึง `goalId` จาก Event Log `GoalCreated` โดยตรงเพื่อความถูกต้อง 100%
6. **Dashboard & Countdown Timer:**
   - มีการคำนวณและแสดงสถิติยอดเงินมัดจำ, เป้าหมายที่กำลังทำ, เป้าหมายที่ทำสำเร็จ, และเงินที่บริจาคมูลนิธิ
   - ตัวนับเวลาถอยหลังแบบเรียลไทม์ พร้อม Progress Bar แสดงระยะเวลาที่ผ่านไป
