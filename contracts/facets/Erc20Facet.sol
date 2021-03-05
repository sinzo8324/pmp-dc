/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity 0.7.6;

import '../interfaces/IERC223Recipient.sol';
import '../storages/Erc20.sol';
import '../storages/Pausable.sol';
import '../libraries/Constants.sol';
import '../libraries/LibAccessControl.sol';
import 'openzeppelin-solidity/contracts/utils/Address.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract Erc20Facet is IERC20 {
    using SafeMath for uint256;
    using Address for address;

    function setVersion(string calldata _version) external {
        require(_hasRole(Constants.TYPE_OPERATOR, msg.sender), 'Caller is not the Operator');
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        fs.version = _version;
    }

    function updateTokenDetails(string calldata _name, string calldata  _symbol, uint8 _decimals) external {
        require(_hasRole(Constants.TYPE_OPERATOR, msg.sender), 'Caller is not the Operator');

        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();

        fs.symbol = _symbol;
        fs.name = _name;
        fs.decimals = _decimals;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory) {
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        return fs.name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name. 
     */
    function symbol() external view returns (string memory) {
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        return fs.symbol;
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
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        return fs.decimals;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view override returns (uint256) {
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        return fs.totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view override returns (uint256) {
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        return fs.balances[account];
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
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view override returns (uint256) {
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        return fs.allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(msg.sender, spender, amount);
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
        uint256 allowances = allowance(sender, msg.sender);
        _approve(sender, msg.sender, allowances.sub(amount, 'ERC20: transfer amount exceeds allowance'));
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
        uint256 allowances = allowance(msg.sender, spender);
        _approve(msg.sender, spender, allowances.add(addedValue));
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
        uint256 allowances = allowance(msg.sender, spender);
        _approve(msg.sender, spender, allowances.sub(subtractedValue, 'ERC20: decreased allowance below zero'));
        return true;
    }

    function issue(address tokenHolder, uint256 value) external {
        require(_hasRole(Constants.TYPE_MINTER, msg.sender), 'Caller is not the Minter');
        require(value != 0,  'Can not mint zero amount');
        _mint(tokenHolder, value);
    }

    function redeem(address tokenHolder, uint256 value) external {
        require(_hasRole(Constants.TYPE_BURNER, msg.sender), 'Caller is not the Burner');
        require(value != 0,  'Can not redeem zero amount');
        _burn(tokenHolder, value);
    }

    // EIP - 2612
    function nonces(address owner) external view returns (uint256) {
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        return fs.nonces[owner];
    }

    // Stack 사이즈 제한으로 인해 local variable의 개수를 최소화하였음.
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, 'Erc20Facet: EXPIRED');
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();

        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                keccak256(
                    abi.encode(
                        Constants.EIP712_DOMAIN,
                        keccak256(bytes(fs.name)),
                        keccak256(bytes(fs.version)),
                        Constants.CHAINID,
                        address(this)
                    )
                ),
                keccak256(abi.encode(Constants.PERMIT_TYPE, owner, spender, value, fs.nonces[owner], deadline))
            )
        );

        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'Erc20Facet: INVALID_SIGNATURE');

        fs.nonces[owner] = fs.nonces[owner].add(1);

        _approve(owner, spender, value);
    }

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
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        uint256 senderBalance = fs.balances[sender];
        uint256 recipientBalance = fs.balances[recipient];
        senderBalance = senderBalance.sub(amount, 'ERC20: transfer amount exceeds balance');
        recipientBalance = recipientBalance.add(amount);

        fs.balances[sender] = senderBalance;
        fs.balances[recipient] = recipientBalance;

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
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        uint256 currentTotalSupply = fs.totalSupply;
        uint256 targetBalance = fs.balances[account];

        currentTotalSupply = currentTotalSupply.add(amount);
        targetBalance = targetBalance.add(amount);

        fs.totalSupply = currentTotalSupply;
        fs.balances[account] = targetBalance;

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

        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        uint256 currentTotalSupply = fs.totalSupply;
        uint256 targetBalance = fs.balances[account];

        targetBalance = targetBalance.sub(amount, 'ERC20: burn amount exceeds balance');
        currentTotalSupply = currentTotalSupply.sub(amount);

        fs.totalSupply = currentTotalSupply;
        fs.balances[account] = targetBalance;

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
        
        Erc20.Erc20Storage storage fs = Erc20.erc20Storage();
        fs.allowances[owner][spender] = amount;
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
        Pausable.PausableStorage storage fs = Pausable.pausableStorage();
        require(!fs.paused, 'Erc20Facet: token transfer while paused');
        from;
        to;
        amount;
    }

    function _hasRole(bytes32 role, address account) internal view returns (bool) {
        return LibAccessControl._hasRole(role, account);
    }
}