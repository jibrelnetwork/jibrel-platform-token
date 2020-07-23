pragma solidity ^0.5.0;

import "../lifecycle/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title Blockable token
 * @dev ERC20 with blockable feature.
 *
 * Useful if you want to block account funds.
 */
contract ERC20Blockable is ERC20, Ownable {
    using SafeMath for uint256;

    mapping (address => uint256) _blockedFunds;

    event AccountFundsBlocked(address indexed account, uint256 value);
    event AccountFundsUnblocked(address indexed account, uint256 value);

    /**
     * @dev Block account funds. Can only be called by the owner.
     */
    function blockAccountFunds(address account, uint256 value) public onlyOwner {
        require(account != address(0x0));
        require(value > 0);

        _blockedFunds[account] = _blockedFunds[account].add(value);
        
        emit AccountFundsBlocked(account, value);
    }

    /**
     * @dev Unblock account funds. Can only be called by the owner.
     */
    function unblockAccountFunds(address account, uint256 value) public onlyOwner {
        require(account != address(0x0));
        require(value > 0);
        
        _blockedFunds[account] = _blockedFunds[account].sub(value);

        emit AccountFundsUnblocked(account, value);
    }
    
    /**
     * @dev Returns account blocked funds.
     */
    function getAccountBlockedFunds(address account) public view returns (uint256) {
        require(account != address(0x0), "ERC20Blockable: account is the zero address");
        
        return _blockedFunds[account];
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf(_msgSender()).sub(value) >= getAccountBlockedFunds(_msgSender()), "ERC20Blockable: funds is blocked");

        return super.transfer(to, value);
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf(from).sub(value) >= getAccountBlockedFunds(from), "ERC20Blockable: funds is blocked");

        return super.transferFrom(from, to, value);
    }
}
