/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.5.6;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './DataStorage.sol';

contract Erc20Logic is Ownable, IERC20 {
    using SafeMath for uint256;

    address[] public dataStorages;

    function setTokenDetails(string calldata _name, string calldata _symbol, uint8 _decimals) external onlyOwner {
        DataStorage(dataStorages[0]).updateTokenDetails(_name, _symbol, _decimals);
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory) {
        return DataStorage(dataStorages[0]).getName();
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() external view returns (string memory) {
        return DataStorage(dataStorages[0]).getSymbol();
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
        return DataStorage(dataStorages[0]).getDecimals();
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view returns (uint256) {
        return DataStorage(dataStorages[0]).getTotalSupply();
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view returns (uint256) {
        return DataStorage(dataStorages[0]).getBalance(account);
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return DataStorage(dataStorages[0]).getAllowance(owner, spender);
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public returns (bool) {
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
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 allowances = DataStorage(dataStorages[0]).getAllowance(sender, _msgSender());
        _approve(sender, _msgSender(), allowances.sub(amount, "ERC20: transfer amount exceeds allowance"));
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
        uint256 allowances = DataStorage(dataStorages[0]).getAllowance(_msgSender(), spender);
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
        uint256 allowances = DataStorage(dataStorages[0]).getAllowance(_msgSender(), spender);
        _approve(_msgSender(), spender, allowances.sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function issue(address _tokenHolder, uint256 _value) external onlyOwner {
        require(_value != 0,  "Can not mint zero amount");
        _mint(_tokenHolder, _value);
    }

    function redeem(address _tokenHolder, uint256 _value) external onlyOwner {
        require(_value != 0,  "Can not redeem zero amount");
        _burn(_tokenHolder, _value);
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
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);
        uint256 senderBalance = DataStorage(dataStorages[0]).getBalance(sender);
        uint256 recipientBalance = DataStorage(dataStorages[0]).getBalance(recipient);
        senderBalance = senderBalance.sub(amount, "ERC20: transfer amount exceeds balance");
        recipientBalance = recipientBalance.add(amount);
        DataStorage(dataStorages[0]).updateBalance(sender, senderBalance);
        DataStorage(dataStorages[0]).updateBalance(recipient, recipientBalance);
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
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);
        uint256 currentTotalSupply = DataStorage(dataStorages[0]).getTotalSupply();
        uint256 targetBalance = DataStorage(dataStorages[0]).getBalance(account);

        currentTotalSupply = currentTotalSupply.add(amount);
        targetBalance = targetBalance.add(amount);

        DataStorage(dataStorages[0]).updateTotalSupply(currentTotalSupply);
        DataStorage(dataStorages[0]).updateBalance(account, targetBalance);

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
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 currentTotalSupply = DataStorage(dataStorages[0]).getTotalSupply();
        uint256 targetBalance = DataStorage(dataStorages[0]).getBalance(account);

        targetBalance = targetBalance.sub(amount, "ERC20: burn amount exceeds balance");
        currentTotalSupply = currentTotalSupply.sub(amount);

        DataStorage(dataStorages[0]).updateTotalSupply(currentTotalSupply);
        DataStorage(dataStorages[0]).updateBalance(account, targetBalance);

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
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        DataStorage(dataStorages[0]).updateAllowance(owner, spender, amount);
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
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal { }
}
