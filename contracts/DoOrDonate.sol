// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DoOrDonate is ReentrancyGuard {

    address public owner;
    IERC20 public rewardToken;
    uint256 public rewardRate = 10;

    // รองรับ Achiever Pool Address มาตรฐาน
    address public constant ACHIEVER_POOL_ADDRESS = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    uint256 public achieverPool;

    enum GoalStatus { Active, Completed, Failed }

    struct Goal {
        uint256 id;
        address user;
        uint256 amount;
        uint256 createdAt;
        uint256 deadline;
        address charityWallet;
        GoalStatus status;
    }

    Goal[] public goals;

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

    receive() external payable {}
    fallback() external payable {}

    function createGoal(uint256 _durationInDays, address _charityWallet) public payable {
        if (_durationInDays == 0) {
            _createGoalInternal(5 minutes, _charityWallet);
        } else {
            _createGoalInternal(_durationInDays * 1 days, _charityWallet);
        }
    }

    function createDemoGoal(address _charityWallet) external payable {
        _createGoalInternal(5 minutes, _charityWallet);
    }

    function createExpiredDemoGoal(address _charityWallet) external payable returns (uint256) {
        require(msg.value > 0, "Deposit must be more than 0");
        require(_charityWallet != address(0), "Invalid charity");

        uint256 goalId = goals.length;
        uint256 createdTime = block.timestamp > 60 ? block.timestamp - 60 : block.timestamp;
        uint256 deadline = createdTime; // ให้ deadline อยู่ในอดีตทันที

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

    function calculateBonus(uint256 _amount) public view returns (uint256) {
        return _amount * rewardRate;
    }

    function completeAndRefund(uint256 _goalId) public nonReentrant {
        require(_goalId < goals.length, "Goal not found");
        Goal storage goal = goals[_goalId];

        require(msg.sender == goal.user, "Only the goal owner can do this");
        require(goal.status == GoalStatus.Active, "Already settled");
        require(block.timestamp <= goal.deadline, "Deadline has passed");

        uint256 totalDuration = goal.deadline - goal.createdAt;
        uint256 elapsedTime = block.timestamp - goal.createdAt;
        bool isDemoGoal = (totalDuration <= 1 hours) || (msg.sender == owner);

        if (!isDemoGoal) {
            require(
                elapsedTime >= (totalDuration * 80) / 100,
                "Too early: Must complete at least 80% of goal duration to prevent farming"
            );
        }

        goal.status = GoalStatus.Completed;

        uint256 refundAmount = goal.amount;
        uint256 poolBonusEth = 0;

        if (achieverPool > 0) {
            uint256 maxBonus = goal.amount / 10;
            if (maxBonus > 0) {
                poolBonusEth = maxBonus <= achieverPool ? maxBonus : achieverPool;
                achieverPool -= poolBonusEth;
                refundAmount += poolBonusEth;
            }
        }

        (bool ok, ) = payable(goal.user).call{value: refundAmount}("");
        require(ok, "Refund failed");

        uint256 bonusWtc = calculateBonus(goal.amount);
        uint256 actualBonusPaid = 0;

        if (address(rewardToken) != address(0) && bonusWtc > 0) {
            uint256 contractWtcBalance = rewardToken.balanceOf(address(this));
            if (contractWtcBalance > 0) {
                actualBonusPaid = bonusWtc <= contractWtcBalance ? bonusWtc : contractWtcBalance;
                rewardToken.transfer(goal.user, actualBonusPaid);
            }
        }

        emit GoalCompleted(_goalId, goal.user, goal.amount, actualBonusPaid, poolBonusEth);
    }

    function completeGoal(uint256 _goalId) external {
        completeAndRefund(_goalId);
    }

    // ฟังก์ชันส่งมอบเงินบริจาค / เข้ากองทุน
    function failAndDonate(uint256 _goalId) public nonReentrant {
        require(_goalId < goals.length, "Goal not found");
        Goal storage goal = goals[_goalId];

        require(goal.status == GoalStatus.Active, "Already settled");
        // ปรับเป็น >= เพื่อให้เป้าหมายที่หมดเวลาทันทีทำรายการได้เลย
        require(block.timestamp >= goal.deadline, "Deadline not reached yet");

        goal.status = GoalStatus.Failed;

        // รองรับทั้ง Address 0x...004, 0x7099..., หรือ address ของสัญญาเอง
        if (
            goal.charityWallet == ACHIEVER_POOL_ADDRESS || 
            goal.charityWallet == address(this) || 
            goal.charityWallet == 0x0000000000000000000000000000000000000004
        ) {
            achieverPool += goal.amount;
            emit AchieverPoolFunded(_goalId, goal.amount);
            emit GoalFailed(_goalId, goal.user, goal.charityWallet, goal.amount);
        } else {
            (bool ok, ) = payable(goal.charityWallet).call{value: goal.amount}("");
            require(ok, "Donation failed");
            emit GoalFailed(_goalId, goal.user, goal.charityWallet, goal.amount);
        }
    }

    function failGoal(uint256 _goalId) external {
        failAndDonate(_goalId);
    }

    function isUnlockEligible(uint256 _goalId) external view returns (bool isUnlocked, uint256 unlockTimestamp) {
        if (_goalId >= goals.length) return (false, 0);
        Goal storage goal = goals[_goalId];
        uint256 totalDuration = goal.deadline - goal.createdAt;
        bool isDemoGoal = (totalDuration <= 1 hours) || (goal.user == owner);

        if (isDemoGoal) {
            return (block.timestamp <= goal.deadline, goal.createdAt);
        }

        unlockTimestamp = goal.createdAt + ((totalDuration * 80) / 100);
        isUnlocked = block.timestamp >= unlockTimestamp && block.timestamp <= goal.deadline;
    }

    function getContractWtcBalance() external view returns (uint256) {
        if (address(rewardToken) == address(0)) return 0;
        return rewardToken.balanceOf(address(this));
    }

    function getAchieverPoolBalance() external view returns (uint256) {
        return achieverPool;
    }

    function depositRewardTokens(uint256 _amount) external {
        require(address(rewardToken) != address(0), "Reward token not set");
        require(_amount > 0, "Amount must be greater than 0");
        bool ok = rewardToken.transferFrom(msg.sender, address(this), _amount);
        require(ok, "TransferFrom failed");
        emit RewardDeposited(msg.sender, _amount);
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        rewardToken = IERC20(_rewardToken);
        emit RewardTokenUpdated(_rewardToken);
    }

    function setRewardRate(uint256 _newRate) external onlyOwner {
        rewardRate = _newRate;
        emit RewardRateUpdated(_newRate);
    }

    function withdrawRewardTokens(uint256 _amount) external onlyOwner {
        require(address(rewardToken) != address(0), "Reward token not set");
        bool ok = rewardToken.transfer(owner, _amount);
        require(ok, "Withdraw failed");
    }

    function getAllGoals() external view returns (Goal[] memory) {
        return goals;
    }
}