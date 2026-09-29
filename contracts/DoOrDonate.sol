// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ใช้ได้ใน Remix IDE โดยตรง (Remix จะโหลด OpenZeppelin จาก npm ให้เอง)
// ReentrancyGuard = กันไม่ให้มีการเรียกฟังก์ชันโอนเงินซ้อนกัน (ความปลอดภัย)
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";

contract DoOrDonate is ReentrancyGuard {

    // ข้อมูลของ 1 เป้าหมาย
    struct Goal {
        uint256 id;             // เลขที่เป้าหมาย (เริ่มที่ 0)
        address user;           // เจ้าของเป้าหมาย
        uint256 amount;         // เงินมัดจำ (หน่วย wei)
        uint256 deadline;       // เวลาหมดเขต (unix time)
        address charityWallet;  // กระเป๋าของมูลนิธิ
        bool isCompleted;       // true = ทำสำเร็จและรับเงินคืนแล้ว
        bool isClaimed;         // true = เงินถูกจ่ายออกไปแล้ว (คืนหรือบริจาค)
    }

    // เก็บเป้าหมายทั้งหมดไว้ใน array (id ก็คือตำแหน่งใน array)
    Goal[] public goals;

    // Event ไว้ให้เว็บและ Etherscan ดูเหตุการณ์ที่เกิดขึ้น
    event GoalCreated(uint256 indexed goalId, address indexed user, uint256 amount, uint256 deadline, address charityWallet);
    event GoalCompleted(uint256 indexed goalId, address indexed user, uint256 amount);
    event GoalFailed(uint256 indexed goalId, address indexed user, address charityWallet, uint256 amount);

    // 1) สร้างเป้าหมาย + ล็อคเงินมัดจำ (ส่ง ETH มาพร้อมการเรียกฟังก์ชันนี้)
    function createGoal(uint256 _durationInDays, address _charityWallet) external payable {
        require(_durationInDays > 0, "Duration must be at least 1 day");
        require(msg.value > 0, "Deposit must be more than 0");
        require(_charityWallet != address(0), "Invalid charity address");
        require(_charityWallet != msg.sender, "Charity cannot be yourself");

        uint256 goalId = goals.length;
        uint256 deadline = block.timestamp + (_durationInDays * 1 days);

        goals.push(Goal({
            id: goalId,
            user: msg.sender,
            amount: msg.value,
            deadline: deadline,
            charityWallet: _charityWallet,
            isCompleted: false,
            isClaimed: false
        }));

        emit GoalCreated(goalId, msg.sender, msg.value, deadline, _charityWallet);
    }

    // 2) ทำสำเร็จ -> ขอเงินคืน (เฉพาะเจ้าของ และต้องก่อนหมดเวลา)
    function completeAndRefund(uint256 _goalId) external nonReentrant {
        require(_goalId < goals.length, "Goal not found");
        Goal storage goal = goals[_goalId];

        require(msg.sender == goal.user, "Only the goal owner can do this");
        require(!goal.isClaimed, "Already settled");
        require(block.timestamp <= goal.deadline, "Deadline has passed");

        // เปลี่ยนสถานะก่อน แล้วค่อยโอนเงิน (ปลอดภัยกว่า)
        goal.isCompleted = true;
        goal.isClaimed = true;

        (bool ok, ) = payable(goal.user).call{value: goal.amount}("");
        require(ok, "Refund failed");

        emit GoalCompleted(_goalId, goal.user, goal.amount);
    }

    // 3) หมดเวลาแล้วไม่สำเร็จ -> ใครก็กดได้ เงินจะไปที่มูลนิธิ
    function failAndDonate(uint256 _goalId) external nonReentrant {
        require(_goalId < goals.length, "Goal not found");
        Goal storage goal = goals[_goalId];

        require(!goal.isClaimed, "Already settled");
        require(block.timestamp > goal.deadline, "Deadline not reached yet");

        goal.isClaimed = true;

        (bool ok, ) = payable(goal.charityWallet).call{value: goal.amount}("");
        require(ok, "Donation failed");

        emit GoalFailed(_goalId, goal.user, goal.charityWallet, goal.amount);
    }

    // ฟังก์ชันสำหรับให้เว็บอ่านเป้าหมายทั้งหมด (เว็บจะกรองเฉพาะของตัวเองเอง)
    function getAllGoals() external view returns (Goal[] memory) {
        return goals;
    }
}
