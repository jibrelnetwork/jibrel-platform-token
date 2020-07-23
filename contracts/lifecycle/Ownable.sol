pragma solidity ^0.5.0;

import "@openzeppelin/contracts/GSN/Context.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
contract Ownable is Context {

    /* Storage */

    address private _owner = address(0x0);
    address private _proposedOwner = address(0x0);

    /* Events */

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipOfferCreated(address indexed currentOwner, address indexed proposedOwner);
    event OwnershipOfferAccepted(address indexed currentOwner, address indexed proposedOwner);
    event OwnershipOfferCancelled(address indexed currentOwner, address indexed proposedOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () internal {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0x0), msgSender);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() public view returns (bool) {
        return _msgSender() == _owner;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0x0));
        _owner = address(0x0);
    }

    /**
    * @dev Old owner requests transfer ownership to the new owner.
    * @param proposedOwner The address to transfer ownership to.
    */
    function createOwnershipOffer(address proposedOwner) external onlyOwner {
        require (_proposedOwner == address(0x0), "Ownable: the proposal already exists");
        require (proposedOwner != address(0x0), "Ownable: proposed owner is the zero address");
        require (proposedOwner != address(this), "Ownable: the contract cannot be owner");

        _proposedOwner = proposedOwner;

        emit OwnershipOfferCreated(_owner, proposedOwner);
    }

    /**
    * @dev Allows the new owner to accept an ownership offer to contract control.
    */
    //noinspection UnprotectedFunction
    function acceptOwnershipOffer() external {
        require (_proposedOwner != address(0x0), "Ownable: proposed owner is the zero address");
        require (msg.sender == _proposedOwner, "Ownable: caller is not the proposed owner");

        address oldOwner = _owner;
        _owner = _proposedOwner;
        _proposedOwner = address(0x0);

        emit OwnershipTransferred(oldOwner, _owner);
        emit OwnershipOfferAccepted(oldOwner, _owner);
    }

    /**
    * @dev Old owner cancels transfer ownership to the new owner.
    */
    function cancelOwnershipOffer() external {
        require (_proposedOwner != address(0x0), "Ownable: proposed owner is the zero address");
        require (msg.sender == _owner || msg.sender == _proposedOwner, "Ownable: caller neither owner nor proposed owner");

        address oldProposedOwner = _proposedOwner;
        _proposedOwner = address(0x0);

        emit OwnershipOfferCancelled(_owner, oldProposedOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0x0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}
