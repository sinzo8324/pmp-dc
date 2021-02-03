DCWallet
=============
### 1. 주요 기능
* 파트너사(쿠폰 사업자)의 DC Token 보관을 위한 지갑 컨트랙트
* 지갑 기본 기능을 소유 계정(EoA)에게 제공 (DC Token 보관 및 전송) 
* DCLender 컨트랙트에게 DC Token 대출 요청 기능 제공
* DC Token 수령 시 DCLender 컨트랙트에게 대출 금액 우선 상환 기능 제공

### 2. 사용된 외부 모듈
* Ownable - 컨트랙트에 특정 권한을 가진 계정만 실행 가능한 함수 생성에 사용
* IERC223Recipient - DC Token 수령 시 호출 되는 tokenFallback 함수 구현
* IERC20 - DC Token 컨트랙트의 전송, 조회 함수 호출 시 사용
* DCLender - DC Token 대출 신청, 상태 확인, 상환을 위해 사용

### 3. 구성하는 함수 목록
* 특정 권한(owner) 계정만 호출 가능한 함수 목록
    * setDCContract(address dcContractAddress)
        * 다루고자 하는 DC 컨트랙트 지정하기 위해 사용
        * DC 보관, 전송 기능 제공을 위해 반드시 지정 필요
    * setDCLenderContract(address dcLenderAddress)
        * DC 대출, 상환요청 및 대출 현황 조회를 위한 DCLender 컨트랙트를 지정하기 위해 사용
        * DC 대출 관련 서비스를 제공을 위해 반드시 지정 필요
    * transferDC(address to, uint256 amount)
        * DCWallet 컨트랙트에 보관중인 DC Token을 다른 계정으로 전송 시 사용
    * approveDC(address spender, uint256 amount)
        * DCWallet 컨트랙트에 보관중인 DC Token의 인출 권한을 다른 계정에게 위임시 사용
    * lendDC(uint256 amount)
        * DCLender에게 DC 대출 요청시 사용
        * DCLender가 보관중인 DC 토큰 보다 요청량(amount)가 클 경우 에러 발생
        * DCLender에 계정당 최대 제공 가능 대출량이 정의 되어 있으며, 이보다 요청량(amount)이 클 경우 에러 발생
*  호출에 제약이 없는 함수
    * getAvailableDCLoanAmount()
        * DCLender 컨트랙트에게 최대로 받을 수 있는 대출 가능 금액을 조회 시 사용
    * tokenFallback(address from, uint256 value, bytes calldata data)
        * DCWallet 이 DC 토큰을 전송 받게 되면 자동으로 호출 되는 함수
        * DCLender에게 대출 현황 확인 및 받은 DC 토큰으로 대출을 상환하도록 함수 설계
        * 대출 상환 후 남은 DC토큰, 혹은 대출이 없는 경우는 DCWallet에 DC 토큰을 보관
        * DC Token 컨트랙트만 호출이 가능하도록 설계
        * 해당 함수를 implement 하지 않으면 DC Token을 전송 받지 못함
