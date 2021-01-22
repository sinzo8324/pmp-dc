DCVault
=============
### 1. 주요 기능
*  GX network 상의 포인트 Token 발행을 위해 DC Token 을 담보로 잠그는(보관하는) 역할 수행.
* Gx network 상의 포인트 Token 컨트랙트 당 하나의 DCVault 컨트랙트가 매핑 됨.
* 각 DCVault 컨트랙트의 DC 보유량과, 매핑되는 Gx network 상의 포인트 Token 컨트랙트의 총 발행량은 항상 일치해야 함.

### 2. 사용된 외부 모듈
* Ownable - 컨트랙트에 특정 권한을 가진 계정만 실행 가능한 함수 생성에 사용
* IERC20 - DC Token 컨트랙트의 전송, 조회 함수 호출 시 사용
* RequestListLib - 포인트 token 발행 요청 ID를 ~~단방향~~ 이중연결 linked list로 관리하기 위해 사용 된 Embedded Library 컨트랙트

### 3. 구성하는 함수 목록
* 특정 권한(owner) 계정만 호출 가능한 함수 목록
    * setDCContractAddress(address contractAddress)
        * 다루고자 하는 DC Contract 주소를 지정하기 위해 사용.
        * DCVault 배포 이후 초기값이 0이므로 꼭 세팅이 필요함.
    * lockUpDC(address source, uint256 amount)
        * 담보 DC Token을 제공하는 source 계좌 주소, 발행을 원하는 포인트 Token 금액을 argument로 사용
        * 해당 함수 안에서 transferFrom을 사용하여 함수를 호출한 계좌의 DC Token을 가져옴
            * source 계좌의 사전 Approve Transaction 이 필요
            * DC 를 가져오는 방식을 확정 필요
                * Approve - transferFrom 방식
                * EIP2612 permit
                * 특정 권한을 부여한 강제 전송 방식
        * DC Token 을 정상적으로 가져온 이후, 요청 내용을 Contract에 기록 및 DCLocked event 발생 시킴
    * addTxHash(bytes32[] calldata requestIDList, bytes32[] calldata txHash)
        * point token 발행 요청에 상응하여 GX network 상에 point 발행이 완료 된 경우, point 발행에 대한 txHash 를 기록하여 receipt 으로 사용
        * 해당 함수를 통해 (요청 – txHash) pair가 이루어져야 요청 처리가 완전히 이루어 진 걸로 처리
        * 함수가 정상적으로 수행 된 경우 finalize event 발생 및 요청 리스트에서 해당되는 요청을 삭제
    * unlockDC(address destination, uint256 amount)
        * 보관 중인(담보로 잡힌) DC Token을 내보내는 기능 수행 (Point Token 소각 확인 후 담보물 반환에 사용)
        * 받는 주소, 금액을 argument로 사용
        * 함수가 정상적으로 수행 된 경우 DCUnlocked event 발생
    * cancelRequest(bytes32 requestID) 
        * 포인트 Token 발행 요청이 되었으나 처리되지 않은(포인트 Token 발행 전) 요청을 취소하고 DC Token을 반환 받을 때 사용
        * 요청을 했었던 (requestHPointKlaytn 함수를 호출 했었던) 계좌만 수행 가능
        * gx network에 포인트 token 발행 중 사용자가 취소하는 상황 방지를 위해 guard time 설정 필요(요청 시간에서 guard time 이후 cancel request 가능하도록, 현재는 30분으로 임의 설정)
    * mintDCnLockUp(address source, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        * DCVault를 통하여 DC의 발행, lockUp 을 한번의 트랜젝션으로 처리하기 위해 만들어진 함수
        * DC 발행, DCVault로의 LockUp 과정의 atomicity를 보장하기 위해 제작
        * source 계좌로 amount 만큼의 DC를 발행하는 과정 수행을 위해 DCVault는 DC Contract의 발행 권한(Mint privilege)을 부여 받은 상태여야 함
        * DC 발행 이후 source 계좌의 approve 설정 상태에 관계 없이 transferFrom 을 통한 DC Lockup이 가능하도록 EIP-2612 permit 기능을 사용함
        * permit 기능을 사용하기 위해 필요한 인자 및 생성 순서
            1. permit 부여를 위한 서명의 유효 기간 설정(deadline, UNIX timestamp)
            2. DC 컨트랙트에서 permit을 생성하는 계정(source)의 현재 nonce 값 확인(nonces(address) 함수를 통해 확인 가능)
            3. DOMAIN_SEPARATOR 생성   
                DOMAIN_SEPARATOR = keccak256(   
                    keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),   
                    keccak256('Digital Currency'),   
                    keccak256('1'),   
                    $chainID,   
                    $DCContractAddress,   
                )   
                여기서 chainId, $DCContractAddress 필드는 32바이트에 맞추도록 padding
            4. PERMIT_TYPEHASH 생성
                PERMIT_TYPEHASH = keccak256(   
                    'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'   
                )
            5. 서명 할 message_digest 생성
                messageDigest = keccak256(   
                    '0x19',   
                    '0x01',   
                    DOMAIN_SEPARATOR,   
                    keccak256(   
                        PERMIT_TYPEHASH,   
                        ownerAddr,   
                        spenderAddr,   
                        amount,   
                        nonce,   
                        deadline   
                    )   
                )
            6. message_digest 서명 (by source 계좌의 private key)
    * unlockDCnBurn(address destination, uint256 amount)
        * DCVault를 통하여 DC의 Unlock, 청산을 위한 DC 소각을 한번의 트랜젝션으로 처리하기 위해 만들어진 함수
        * DCVault에서 부터의 DC Unlock, 청산시의 DC 소각 과정의 atomicity를 보장하기 위해 제작
        * destination 계좌로 amount 만큼의 DC 소각 과정 수행을 위해 DCVault는 DC Contract의 소각 권한(Burn privilege)을 부여 받은 상태여야 함
* 호출에 제약이 없는 함수
    * getPendingList() returns (bytes32[] memory, address[] memory, uint256[] memory)
        * 포인트 Token 발행 요청이 되었으나 처리되지 않은(포인트 Token 발행 전) 요청 list 를 조회하는 함수
        * tuple 형태로 리턴을 받게 됨
        (요청ID, 요청한 계좌 주소, 포인트 Token을 받을 계좌 주소, 금액) 
    * totalLocked() returns (uint256)
        * DCVault 에 잠겨 있는 DC의 총량
        * lockUpDC, mintDCnLockUp 함수를 통해서 잠겨진 DC Token의 총량을 조회 가능
        * 악의적으로 DCVault에 DC Token을 외부에서 전송(transfer) 하였을 경우, 이를 구분하기 위해 사용
