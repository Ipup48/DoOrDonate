// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ใช้ได้ใน Remix IDE โดยตรง (Remix จะโหลด OpenZeppelin จาก npm ให้เอง)
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC20/IERC20.sol";

contract DoOrDonate is ReentrancyGuard {

    // เจ้าของสัญญา (Admin)
    address public owner;

    // เหรียญรางวัล WTC (ERC-20 Token)
    IERC20 public rewardToken;

    // อัตราโบนัส: 1 ETH ได้ 10 WTC (rewardRate = 10)
    // bonusWTC = depositETH * rewardRate
    uint256 public rewardRate = 10;

    // Address สำหรับกองทุนผู้ทำสำเร็จ (Achievers Reward Pool)
    address public constant ACHIEVER_POOL_ADDRESS = 0x0000000000000000000000000000000000000004;

    // ยอดเงินมัดจำสะสมในกองทุนสำหรับแจกผู้ที่ทำสำเร็จ (หน่วย wei)
    uint256 public achieverPool;

    // สถานะของเป้าหมาย (ตรงกับ Frontend และ ABI uint8: 0 = Active, 1 = Completed, 2 = Failed)
    enum GoalStatus { Active, Completed, Failed }

    // ข้อมูลของ 1 เป้าหมาย
    struct Goal {
        uint256 id;             // เลขที่เป้าหมาย (เริ่มที่ 0)
        address user;           // เจ้าของเป้าหมาย
        uint256 amount;         // เงินมัดจำ (หน่วย wei)
        uint256 createdAt;      // เวลาที่สร้างเป้าหมาย (unix time)
        uint256 deadline;       // เวลาหมดเขต (unix time)
        address charityWallet;  // กระเป๋าของมูลนิธิ หรือ Achiever Pool
        GoalStatus status;      // สถานะเป้าหมาย (0: Active, 1: Completed, 2: Failed)
    }

    // เก็บเป้าหมายทั้งหมดไว้ใน array (id ก็คือตำแหน่งใน array)
    Goal[] public goals;

    // Event ไว้ให้เว็บและ Etherscan ดูเหตุการณ์ที่เกิดขึ้น
    event GoalCreated(uint256 indexed goalId, address indexed user, uint256 amount, uint256 createdAt, uint256 deadline, address charityWallet);
    event GoalCompleted(uint256 indexed goalId, address indexed user, uint256 amount, uint256 bonusWtc, uint256 poolBonusEth);
    event GoalFailed(uint256 indexed goalId, address indexed user, address charityWallet, uint256 amount);
    event AchieverPoolFunded(uint256 indexed goalId, uint256 amount);
    event RewardTokenUpdated(address indexed newToken);
    event RewardRateUpdated(uint256 newRate);
    event RewardDeposited(address indexed sender, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor(address _rewardToken) {
        owner = msg.sender;
        if (_rewardToken != address(0)) {
            rewardToken = IERC20(_rewardToken);
        }
    }

    // รองรับการรับโอน ETH เข้าสัญญาโดยตรง
    receive() external payable {}
    fallback() external payable {}

    // 1) สร้างเป้าหมาย + ล็อคเงินมัดจำ (ส่ง ETH มาพร้อมการเรียกฟังก์ชันนี้)
    // หากส่ง _durationInDays = 0 จะถือเป็นโหมดสาธิตนำเสนออาจารย์ (Demo Mode: ระยะเวลา 5 นาที และปลดล็อกเคลมได้ทันที)
    function createGoal(uint256 _durationInDays, address _charityWallet) public payable {
        if (_durationInDays == 0) {
            _createGoalInternal(5 minutes, _charityWallet);
        } else {
            _createGoalInternal(_durationInDays * 1 days, _charityWallet);
        }
    }

    // 1.1) ฟังก์ชันพิเศษสำหรับโหมดสาธิตนำเสนออาจารย์ (Presentation Demo Mode - ปลดล็อกได้ทันที)
    function createDemoGoal(address _charityWallet) external payable {
        _createGoalInternal(5 minutes, _charityWallet);
    }

    // 1.2) ฟังก์ชันพิเศษสำหรับสร้างเป้าหมายที่หมดอายุทันที (Expired Goal for Presentation / Demo บริจาค)
    function createExpiredDemoGoal(address _charityWallet) external payable returns (uint256) {
        require(msg.value > 0, "Deposit must be more than 0");
        require(_charityWallet != address(0), "Invalid charity");
        require(_charityWallet != msg.sender, "Charity cannot be yourself");

        uint256 goalId = goals.length;
        uint256 createdTime = block.timestamp > 10 ? block.timestamp - 10 : block.timestamp;
        // กำหนด deadline ให้อยู่ในอดีต (block.timestamp - 1) เพื่อให้เป้าหมายหมดเวลาทันทีตั้งแต่สร้าง
        uint256 deadline = block.timestamp - 1;

        goals.push(Goal({
            id: goalId,
            user: msg.sender,
            amount: msg.value,
            createdAt: createdTime,
            deadline: deadline,
            charityWallet: _charityWallet,
            status: GoalStatus.Active
        }));

        emit GoalCreated(goalId, msg.sender, msg.value, createdTime, deadline, _charityWallet);
        return goalId;
    }

    function _createGoalInternal(uint256 _durationInSeconds, address _charityWallet) internal {
        require(msg.value > 0, "Deposit must be more than 0");
        require(_charityWallet != address(0), "Invalid charity address");
        require(_charityWallet != msg.sender, "Charity cannot be yourself");

        uint256 goalId = goals.length;
        uint256 createdTime = block.timestamp;
        uint256 deadline = createdTime + _durationInSeconds;

        goals.push(Goal({
            id: goalId,
            user: msg.sender,
            amount: msg.value,
            createdAt: createdTime,
            deadline: deadline,
            charityWallet: _charityWallet,
            status: GoalStatus.Active
        }));

        emit GoalCreated(goalId, msg.sender, msg.value, createdTime, deadline, _charityWallet);
    }

    // 2) ทำสำเร็จ -> ขอเงินมัดจำ ETH คืน 100% + รับโบนัสเหรียญ WTC + ส่วนแบ่งโบนัส ETH จาก Achiever Pool (ถ้ามี)
    // มี Time-Lock ป้องกันการปั๊มเหรียญ (Anti-Farming: ต้องผ่านไปแล้วอย่างน้อย 80% ของระยะเวลา)
    // มีข้อยกเว้นสำหรับโหมด Demo (ระยะเวลา <= 1 ชั่วโมง หรือสร้างโดย Owner) เพื่อใช้สาธิตให้อาจารย์ดูได้ทันที
    function completeAndRefund(uint256 _goalId) public nonReentrant {
        require(_goalId < goals.length, "Goal not found");
        Goal storage goal = goals[_goalId];

        require(msg.sender == goal.user, "Only the goal owner can do this");
        require(goal.status == GoalStatus.Active, "Already settled");
        require(block.timestamp <= goal.deadline, "Deadline has passed");

        // Anti-Instant Claim Time-Lock: ต้องผ่านไปแล้วอย่างน้อย 80% ของระยะเวลาเป้าหมายทั้งหมด
        // ข้อยกเว้น: หากเป็นเป้าหมายในโหมด Demo (totalDuration <= 1 hours หรือ owner สร้าง) จะข้าม Time-Lock 80%
        uint256 totalDuration = goal.deadline - goal.createdAt;
        uint256 elapsedTime = block.timestamp - goal.createdAt;
        bool isDemoGoal = (totalDuration <= 1 hours) || (msg.sender == owner);

        if (!isDemoGoal) {
            require(
                elapsedTime >= (totalDuration * 80) / 100,
                "Too early: Must complete at least 80% of goal duration to prevent farming"
            );
        }

        // เปลี่ยนสถานะก่อน แล้วค่อยโอนเงิน (Checks-Effects-Interactions)
        goal.status = GoalStatus.Completed;

        // 1. คืนเงินมัดจำ ETH 100% ให้ msg.sender + โบนัสพิเศษจาก Achiever Pool (ถ้ามีสะสมไว้)
        uint256 refundAmount = goal.amount;
        uint256 poolBonusEth = 0;

        if (achieverPool > 0) {
            uint256 maxBonus = goal.amount / 10; // โบนัสเพิ่มสูงสุด 10% ของเงินมัดจำ
            if (maxBonus > 0) {
                poolBonusEth = maxBonus <= achieverPool ? maxBonus : achieverPool;
                achieverPool -= poolBonusEth;
                refundAmount += poolBonusEth;
            }
        }

        (bool ok, ) = payable(goal.user).call{value: refundAmount}("");
        require(ok, "Refund failed");

        // 2. คำนวณยอดโบนัสเหรียญ WTC ตามสัดส่วนเงินมัดจำ (1 ETH = 10 WTC)
        uint256 bonusWtc = calculateBonus(goal.amount);
        uint256 actualBonusPaid = 0;

        // 3. โอนเหรียญ WTC เข้ากระเป๋าผู้ใช้หาก Contract มีเหรียญเพียงพอ
        if (address(rewardToken) != address(0) && bonusWtc > 0) {
            uint256 contractWtcBalance = rewardToken.balanceOf(address(this));
            if (contractWtcBalance > 0) {
                actualBonusPaid = bonusWtc <= contractWtcBalance ? bonusWtc : contractWtcBalance;
                bool tokenOk = rewardToken.transfer(goal.user, actualBonusPaid);
                require(tokenOk, "Bonus transfer failed");
            }
        }

        emit GoalCompleted(_goalId, goal.user, goal.amount, actualBonusPaid, poolBonusEth);
    }

    // Alias สำหรับ completeGoal เพื่อความเข้ากันได้
    function completeGoal(uint256 _goalId) external {
        completeAndRefund(_goalId);
    }

    // 3) หมดเวลาแล้วไม่สำเร็จ -> ใครก็กดได้ เงินมัดจำจะถูกโอนไปที่มูลนิธิ หรือเข้า Achiever Pool
    function failAndDonate(uint256 _goalId) external nonReentrant {
        require(_goalId < goals.length, "Goal not found");
        Goal storage goal = goals[_goalId];

        require(goal.status == GoalStatus.Active, "Already settled");
        require(block.timestamp > goal.deadline, "Deadline not reached yet");

        goal.status = GoalStatus.Failed;

        // หากเลือกเป็นกองทุนผู้ทำสำเร็จ เงินจะถูกสะสมไว้ในสัญญาเพื่อจ่ายโบนัสแก่ผู้ทำสำเร็จคนอื่น
        if (goal.charityWallet == ACHIEVER_POOL_ADDRESS || goal.charityWallet == address(this)) {
            achieverPool += goal.amount;
            emit AchieverPoolFunded(_goalId, goal.amount);
            emit GoalFailed(_goalId, goal.user, goal.charityWallet, goal.amount);
        } else {
            (bool ok, ) = payable(goal.charityWallet).call{value: goal.amount}("");
            require(ok, "Donation failed");
            emit GoalFailed(_goalId, goal.user, goal.charityWallet, goal.amount);
        }
    }

    // Alias สำหรับ failGoal เพื่อความเข้ากันได้ 100%
    function failGoal(uint256 _goalId) external {
        failAndDonate(_goalId);
    }

    // ฟังก์ชันคำนวณโบนัสเหรียญ WTC (หน่วย wei: 1 ETH = 10 WTC)
    function calculateBonus(uint256 _amount) public view returns (uint256) {
        return _amount * rewardRate;
    }

    // ฟังก์ชันตรวจสอบสถานะ Time-Lock (80% Duration หรือ Demo Instant Unlock)
    function isUnlockEligible(uint256 _goalId) external view returns (bool isUnlocked, uint256 unlockTimestamp) {
        if (_goalId >= goals.length) return (false, 0);
        Goal storage goal = goals[_goalId];
        uint256 totalDuration = goal.deadline - goal.createdAt;
        bool isDemoGoal = (totalDuration <= 1 hours) || (goal.user == owner);

        if (isDemoGoal) {
            // โหมดเดโม: ปลดล็อกทันที
            return (block.timestamp <= goal.deadline, goal.createdAt);
        }

        unlockTimestamp = goal.createdAt + ((totalDuration * 80) / 100);
        isUnlocked = block.timestamp >= unlockTimestamp && block.timestamp <= goal.deadline;
    }

    // ฟังก์ชันตรวจสอบยอดคงเหลือเหรียญ WTC ในสัญญา
    function getContractWtcBalance() external view returns (uint256) {
        if (address(rewardToken) == address(0)) return 0;
        return rewardToken.balanceOf(address(this));
    }

    // ฟังก์ชันตรวจสอบยอดคงเหลือเงินในกองทุนผู้ทำสำเร็จ (Achiever Pool)
    function getAchieverPoolBalance() external view returns (uint256) {
        return achieverPool;
    }

    // ฟังก์ชันเติมเหรียญ WTC เข้าสัญญาเพื่อเป็นกองทุนจ่ายโบนัส
    function depositRewardTokens(uint256 _amount) external {
        require(address(rewardToken) != address(0), "Reward token not set");
        require(_amount > 0, "Amount must be greater than 0");
        bool ok = rewardToken.transferFrom(msg.sender, address(this), _amount);
        require(ok, "TransferFrom failed");
        emit RewardDeposited(msg.sender, _amount);
    }

    // ตั้งค่าเหรียญรางวัล WTC (เฉพาะ Owner)
    function setRewardToken(address _rewardToken) external onlyOwner {
        rewardToken = IERC20(_rewardToken);
        emit RewardTokenUpdated(_rewardToken);
    }

    // ตั้งค่าอัตราโบนัส (เฉพาะ Owner)
    function setRewardRate(uint256 _newRate) external onlyOwner {
        rewardRate = _newRate;
        emit RewardRateUpdated(_newRate);
    }

    // ถอนเหรียญ WTC ที่เหลือคืน (เฉพาะ Owner)
    function withdrawRewardTokens(uint256 _amount) external onlyOwner {
        require(address(rewardToken) != address(0), "Reward token not set");
        bool ok = rewardToken.transfer(owner, _amount);
        require(ok, "Withdraw failed");
    }

    // ฟังก์ชันสำหรับให้เว็บอ่านเป้าหมายทั้งหมด
    function getAllGoals() external view returns (Goal[] memory) {
        return goals;
    }
}
