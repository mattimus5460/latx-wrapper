pragma solidity ^0.4.22;

// ERC20-compliant wrapper token for LATX
// adapted from GNTW

contract LatiumX {

    // owner of this contract
    address public owner;

    // balances for each account
    mapping (address => uint256) public balanceOf;

    // triggered when tokens are transferred
    event Transfer(address indexed _from, address indexed _to, uint _value);

    // transfer the balance from sender's account to another one
    function transfer(address _to, uint256 _value);
}

contract TokenInterface {
    mapping (address => uint256) balances;
    mapping (address => mapping (address => uint256)) allowed;

    uint256 public totalSupply;

    function balanceOf(address _owner) public constant returns (uint256 balance);
    function transfer(address _to, uint256 _amount) public returns (bool success);
    function transferFrom(
        address _from, address _to, uint256 _amount) public returns (bool success);
    function approve(address _spender, uint256 _amount) public returns (bool success);
    function allowance(
        address _owner, address _spender) public constant returns (uint256 remaining);

    event Transfer(address indexed _from, address indexed _to, uint256 _amount);
    event Approval(
        address indexed _owner, address indexed _spender, uint256 _amount);
}

contract TokenInterfaceLatium is LatiumX {

    mapping (address => uint256) public balanceOf;
    function balanceOf(address _owner) public constant returns (uint256 balance) {
        return balanceOf[_owner];
    }
}

contract Token is TokenInterface {
    function balanceOf(address _owner) public constant returns (uint256 balance) {
        return balances[_owner];
    }

    function _transfer(address _to,
        uint256 _amount) internal returns (bool success) {
        if (balances[msg.sender] >= _amount && _amount > 0) {
            balances[msg.sender] -= _amount;
            balances[_to] += _amount;
            emit Transfer(msg.sender, _to, _amount);
            return true;
        } else {
            return false;
        }
    }

    function _transferFrom(address _from,
        address _to,
        uint256 _amount) internal returns (bool success) {
        if (balances[_from] >= _amount
        && allowed[_from][msg.sender] >= _amount
        && _amount > 0) {

            balances[_to] += _amount;
            balances[_from] -= _amount;
            allowed[_from][msg.sender] -= _amount;
            emit Transfer(_from, _to, _amount);
            return true;
        } else {
            return false;
        }
    }

    function approve(address _spender, uint256 _amount) public returns (bool success) {
        allowed[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    function allowance(address _owner,
        address _spender) public constant returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }
}

contract DepositSlot {
    address public constant LATX = 0xbbf289d846208c16edc8474705c748aff07732db;//0x2f85E502a988AF76f7ee6D83b7db8d6c0A823bf9;

    address public wrapper;

    modifier onlyWrapper {
        if (msg.sender != wrapper) throw;
        _;
    }

    function DepositSlot(address _wrapper) public {
        wrapper = _wrapper;
    }

    function collect() public onlyWrapper {
        uint amount = TokenInterfaceLatium(LATX).balanceOf(this);
        if (amount == 0) throw;

        TokenInterfaceLatium(LATX).transfer(wrapper, amount);
    }
}

contract LatiumXTokenWrapped is Token {
    string public constant standard = "Token 0.1";
    string public constant name = "LatiumX Wrapped";
    string public constant symbol = "LATXW";
    uint8 public constant decimals = 8;

    address public constant LATX = 0xbbf289d846208c16edc8474705c748aff07732db;

    mapping (address => address) depositSlots;

    function createPersonalDepositAddress() public returns (address depositAddress) {
        if (depositSlots[msg.sender] == 0) {
            depositSlots[msg.sender] = new DepositSlot(this);
        }

        return depositSlots[msg.sender];
    }

    function getPersonalDepositAddress(
        address depositer) public constant returns (address depositAddress) {
        return depositSlots[depositer];
    }

    function processDeposit() public {
        address depositSlot = depositSlots[msg.sender];
        if (depositSlot == 0) throw;

        DepositSlot(depositSlot).collect();

        uint balance = TokenInterfaceLatium(LATX).balanceOf(this);
        if (balance <= totalSupply) throw;

        uint freshLATXW = balance - totalSupply;
        totalSupply += freshLATXW;
        balances[msg.sender] += freshLATXW;
        emit Transfer(address(this), msg.sender, freshLATXW);
    }

    function transfer(address _to,
        uint256 _amount) public returns (bool success) {
        if (_to == address(this)) {
            withdrawLATX(_amount);   // convert back to LATX
            return true;
        } else {
            return _transfer(_to, _amount);     // standard transfer
        }
    }

    function transferFrom(address _from,
        address _to,
        uint256 _amount) public returns (bool success) {
        if (_to == address(this)) throw;        // not supported
        return _transferFrom(_from, _to, _amount);
    }


    function withdrawLATX(uint amount) internal {
        if (balances[msg.sender] < amount) throw;

        balances[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(this), amount);

        TokenInterfaceLatium(LATX).transfer(msg.sender, amount);
    }
}