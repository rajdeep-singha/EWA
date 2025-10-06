// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Early Wage Access (EWA)
 * @dev This contract allows employees to access a portion of their earned salary before the official payday.
 * Employers can register, deposit funds, and manage their employees.
 * Employees can request early wage access, subject to available funds and platform fees.
 */
contract EWA {
    /// @notice The percentage fee charged by the platform for early wage access.
    uint256 public constant PLATFORM_FEE = 3;

    /// @notice The ERC20 token used for payments and deposits.
    IERC20 public token;
    /// @notice The total number of registered employers.
    uint256 public employerCount;
    /// @notice The total accumulated platform fees.
    uint256 public totalPlatformFees;
    /// @notice The address of the contract owner.
    address public owner;

    /**
     * @dev Represents an employer registered on the platform.
     * @param id The unique identifier for the employer.
     * @param employerAddress The Ethereum address of the employer.
     * @param depositedFunds The total amount of funds deposited by the employer.
     * @param totalEmployees The total number of employees registered under this employer.
     */
    struct Employer {
        uint256 id;
        address employerAddress;
        uint256 depositedFunds;
        uint256 totalEmployees;
    }

    /// @notice An array storing all registered employers.
    Employer[] public employers;

    /**
     * @dev Represents an employee registered by an employer.
     * @param employerId The ID of the employer this employee belongs to.
     * @param employeeAddress The Ethereum address of the employee.
     * @param salary The monthly salary of the employee.
     * @param remainingSalary The portion of the salary that the employee can still withdraw.
     * @param lastPaymentTimestamp The timestamp of the last early wage payment.
     * @param lastPaymentAmount The amount of the last early wage payment.
     */
    struct Employee {
        uint256 employerId;
        address employeeAddress;
        uint256 salary;
        uint256 remainingSalary;
        uint256 lastPaymentTimestamp;
        uint256 lastPaymentAmount;
    }

    /// @notice Mapping from employer ID to an array of their employees.
    mapping(uint256 => Employee[]) public employeesByEmployer;
    /// @notice Mapping from employee address to their employee data.
    mapping(address => Employee) public employeeByAddress;

    /**
     * @dev Modifier to restrict function access to the contract owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    /**
     * @dev Contract constructor.
     * @param _token The address of the ERC20 token to be used for transactions.
     */
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        owner = msg.sender;
    }

    /**
     * @dev Checks if an employer is already registered.
     * @return bool True if the employer is registered, false otherwise.
     */
    function isEmployerRegistered() internal view returns (bool) {
        for (uint256 i = 0; i < employerCount; i++) {
            if (employers[i].employerAddress == msg.sender) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Checks if an employee is already registered under a specific employer.
     * @param _employerId The ID of the employer.
     * @param _employeeAddress The address of the employee.
     * @return bool True if the employee is registered with the employer, false otherwise.
     */
    function isEmployeeRegistered(uint256 _employerId, address _employeeAddress) internal view returns (bool) {
        return employeeByAddress[_employeeAddress].employeeAddress != address(0)
            && employeeByAddress[_employeeAddress].employerId == _employerId;
    }

    /**
     * @notice Registers a new employer on the platform.
     * @dev The caller's address will be registered as the employer.
     * @param _employerAddress The address of the employer to register.
     */
    function registerEmployer(address _employerAddress) external {
        require(_employerAddress != address(0), "Invalid employer address");
        require(employerCount < type(uint256).max, "Employer limit reached");
        require(!isEmployerRegistered(), "Employer already registered");

        employers.push(
            Employer({id: employerCount, employerAddress: _employerAddress, depositedFunds: 0, totalEmployees: 0})
        );

        employerCount++;
    }

    /**
     * @notice Registers a new employee under a specific employer.
     * @dev Can only be called by the registered employer.
     * @param _employerId The ID of the employer registering the employee.
     * @param _employeeAddress The address of the employee to be registered.
     * @param _salary The monthly salary of the employee.
     */
    function registerEmployee(uint256 _employerId, address _employeeAddress, uint256 _salary) external {
        require(_employerId < employerCount, "Invalid employer ID");
        require(_employeeAddress != address(0), "Invalid employee address");
        require(_salary > 0, "Salary must be greater than zero");
        require(!isEmployeeRegistered(_employerId, _employeeAddress), "Employee already registered");

        Employer storage employer = employers[_employerId];
        require(msg.sender == employer.employerAddress, "Only employer can register employees");

        employer.totalEmployees++;

        Employee memory newEmployee = Employee({
            employerId: _employerId,
            employeeAddress: _employeeAddress,
            salary: _salary,
            remainingSalary: _salary,
            lastPaymentTimestamp: 0,
            lastPaymentAmount: 0
        });

        employeesByEmployer[_employerId].push(newEmployee);
        employeeByAddress[_employeeAddress] = newEmployee;
    }

    /**
     * @notice Allows an employer to deposit funds into their account.
     * @dev The employer must approve the contract to spend tokens on their behalf beforehand.
     * @param _employerId The ID of the employer depositing funds.
     * @param _amount The amount of tokens to deposit.
     */
    function depositFunds(uint256 _employerId, uint256 _amount) external {
        require(_employerId < employerCount, "Invalid employer ID");
        require(_amount > 0, "Deposit amount must be greater than zero");

        Employer storage employer = employers[_employerId];
        require(msg.sender == employer.employerAddress, "Only employer can deposit");
        require(token.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        employer.depositedFunds += _amount;
    }

    /**
     * @notice Allows an employer to withdraw a specific amount of funds from their account.
     * @param _employerId The ID of the employer withdrawing funds.
     * @param _amount The amount of tokens to withdraw.
     */
    function withdrawFunds(uint256 _employerId, uint256 _amount) external {
        require(_employerId < employerCount, "Invalid employer ID");
        require(_amount > 0, "Withdrawal amount must be greater than zero");

        Employer storage employer = employers[_employerId];
        require(msg.sender == employer.employerAddress, "Only employer can withdraw");
        require(employer.depositedFunds >= _amount, "Insufficient funds");

        require(token.transfer(msg.sender, _amount), "Token transfer failed");
        employer.depositedFunds -= _amount;
    }

    /**
     * @notice Allows an employer to withdraw all available funds from their account.
     * @param _employerId The ID of the employer withdrawing all funds.
     */
    function withdrawAllFunds(uint256 _employerId) external {
        require(_employerId < employerCount, "Invalid employer ID");

        Employer storage employer = employers[_employerId];
        require(msg.sender == employer.employerAddress, "Only employer can withdraw");
        uint256 amountToWithdraw = employer.depositedFunds;

        require(amountToWithdraw > 0, "No funds to withdraw");
        require(token.transfer(msg.sender, amountToWithdraw), "Token transfer failed");

        employer.depositedFunds = 0;
    }

    /**
     * @notice Allows a registered employee to request an early wage access.
     * @dev A platform fee is deducted from the requested amount.
     * The employer must have sufficient deposited funds.
     * @param _amount The amount of wage the employee wants to access early.
     */
    function earlyWageAccess(uint256 _amount) external {
        Employee storage employee = employeeByAddress[msg.sender];

        require(employee.employeeAddress == msg.sender, "Employee not registered");
        require(employee.remainingSalary >= _amount, "Insufficient remaining salary");
        require(employers[employee.employerId].depositedFunds >= _amount, "Employer has insufficient balance");

        uint256 platformFee = (_amount * PLATFORM_FEE) / 100;
        require(token.transfer(msg.sender, _amount - platformFee), "Token transfer failed");

        employee.remainingSalary -= _amount;
        employee.lastPaymentTimestamp = block.timestamp;
        employee.lastPaymentAmount = _amount;
        employers[employee.employerId].depositedFunds -= _amount;

        totalPlatformFees += platformFee;
    }

    /**
     * @notice Allows the contract owner to withdraw accumulated platform fees.
     * @dev Can only be called by the contract owner.
     */
    function withdrawPlatformFees() external onlyOwner {
        require(totalPlatformFees > 0, "No fees to withdraw");
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;
        require(token.transfer(owner, amount), "Transfer failed");
    }
}
