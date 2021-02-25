/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.6.12;

import './EternalStorage.sol';
import './IERC223Recipient.sol';
import 'openzeppelin-solidity/contracts/access/AccessControl.sol';
import 'openzeppelin-solidity/contracts/utils/Pausable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract LogicUpgradeTest is AccessControl, Pausable, EternalStorage, IERC20 {
    using SafeMath for uint256;

    //keccak256('TYPE_MINTER')
    bytes32 public constant TYPE_MINTER = 0xa8791d3acb7f4f152c41f3308e90b16e68a23666347d9c4c5ce8535dffead10d;
    //keccak256('TYPE_BURNER')
    bytes32 public constant TYPE_BURNER = 0x9a433df5d818859975655002918d19fe2ba4567432e52f0cec8426ddf4dc2ada;
    // keccak256('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)');
    // bytes32 public constant PERMIT_TYPE = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    //keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
    // bytes32 public constant EIP712_DOMAIN = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;
    // uint256 public constant CHAINID = 8888;

    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory) {
        bytes32 key = keccak256(abi.encodePacked('name'));
        return getStringValue(key);
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() external view returns (string memory) {
        bytes32 key = keccak256(abi.encodePacked('symbol'));
        return getStringValue(key);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
     * called.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() external view returns (uint8) {
        bytes32 key = keccak256(abi.encodePacked('decimals'));
        return uint8(getUintValue(key));
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view override returns (uint256) {
        bytes32 key = keccak256(abi.encodePacked('totalSupply'));
        return getUintValue(key);
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view override returns (uint256) {
        bytes32 key = keccak256(abi.encodePacked('balance', account));
        return getUintValue(key);
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view override returns (uint256) {
        bytes32 key = keccak256(abi.encodePacked('allowance', owner, spender));
        return getUintValue(key);
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20};
     *
     * Requirements:
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 allowances = allowance(sender, _msgSender());
        _approve(sender, _msgSender(), allowances.sub(amount, 'ERC20: transfer amount exceeds allowance'));
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        uint256 allowances = allowance(_msgSender(), spender);
        _approve(_msgSender(), spender, allowances.add(addedValue));
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        uint256 allowances = allowance(_msgSender(), spender);
        _approve(_msgSender(), spender, allowances.sub(subtractedValue, 'ERC20: decreased allowance below zero'));
        return true;
    }

    function issue(address tokenHolder, uint256 value) external {
        require(hasRole(TYPE_MINTER, _msgSender()), 'Caller is not the Minter');
        require(value != 0,  'Can not mint zero amount');
        _mint(tokenHolder, value);
    }

    function redeem(address tokenHolder, uint256 value) external {
        require(hasRole(TYPE_BURNER, _msgSender()), 'Caller is not the Burner');
        require(value != 0,  'Can not redeem zero amount');
        _burn(tokenHolder, value);
    }

    // EIP - 2612
    // function nonces(address owner) external view returns (uint256) {
    //     bytes32 key = keccak256(abi.encodePacked('nonce', owner));
    //     return getUintValue(key);
    // }

    // function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
    //     require(deadline >= block.timestamp, 'Erc20Logic: EXPIRED');

    //     bytes32 key = keccak256(abi.encodePacked('name'));
    //     string memory _name = getStringValue(key);

    //     key = keccak256(abi.encodePacked('version'));
    //     string memory _version = getStringValue(key);

    //     bytes32 domainSeparator = keccak256(
    //         abi.encode(
    //             EIP712_DOMAIN,
    //             keccak256(bytes(_name)),
    //             keccak256(bytes(_version)),
    //             CHAINID,
    //             address(this)
    //             )
    //     );

    //     key = keccak256(abi.encodePacked('nonce', owner));
    //     uint256 nonce = getUintValue(key);

    //     bytes32 digest = keccak256(
    //         abi.encodePacked(
    //             '\x19\x01',
    //             domainSeparator,
    //             keccak256(abi.encode(PERMIT_TYPE, owner, spender, value, nonce, deadline))
    //         )
    //     );

    //     address recoveredAddress = ecrecover(digest, v, r, s);
    //     require(recoveredAddress != address(0) && recoveredAddress == owner, 'Erc20Logic: INVALID_SIGNATURE');

    //     nonce = nonce.add(1);
    //     set(key, nonce);

    //     _approve(owner, spender, value);
    // }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), 'ERC20: transfer from the zero address');
        require(recipient != address(0), 'ERC20: transfer to the zero address');

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = balanceOf(sender);
        uint256 recipientBalance = balanceOf(recipient);
        senderBalance = senderBalance.sub(amount, 'ERC20: transfer amount exceeds balance');
        recipientBalance = recipientBalance.add(amount);

        _setBalance(sender, senderBalance);
        _setBalance(recipient, recipientBalance);

        if(Address.isContract(recipient)) {
            IERC223Recipient(recipient).tokenFallback(sender, amount, '');
        }

        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), 'ERC20: mint to the zero address');

        _beforeTokenTransfer(address(0), account, amount);
        uint256 currentTotalSupply = totalSupply();
        uint256 targetBalance = balanceOf(account);

        currentTotalSupply = currentTotalSupply.add(amount);
        targetBalance = targetBalance.add(amount);

        bytes32 key = keccak256(abi.encodePacked('totalSupply'));
        set(key, currentTotalSupply);
        _setBalance(account, targetBalance);

        if(Address.isContract(account)) {
            IERC223Recipient(account).tokenFallback(address(0), amount, '');
        }

        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), 'ERC20: burn from the zero address');

        _beforeTokenTransfer(account, address(0), amount);

        uint256 currentTotalSupply = totalSupply();
        uint256 targetBalance = balanceOf(account);

        targetBalance = targetBalance.sub(amount, 'ERC20: burn amount exceeds balance');
        currentTotalSupply = currentTotalSupply.sub(amount);

        bytes32 key = keccak256(abi.encodePacked('totalSupply'));
        set(key, currentTotalSupply);
        _setBalance(account, targetBalance);

        emit Transfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), 'ERC20: approve from the zero address');
        require(spender != address(0), 'ERC20: approve to the zero address');

        bytes32 key = keccak256(abi.encodePacked('allowance', owner, spender));
        set(key, amount);
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be to transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal view {
        require(!paused(), 'Erc20Logic: token transfer while paused');
        from;
        to;
        amount;
    }

    function _setBalance(address target, uint256 amount) internal {
        bytes32 key = keccak256(abi.encodePacked('balance', target));
        set(key, amount);
    }

}
