// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_, uint256 initialSupply_) ERC20(name_, symbol_) {
        _mint(msg.sender, initialSupply_);
    }

    // Mint function for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
