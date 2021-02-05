DCLender
=============
### 1. 주요 기능
* 파트너사(쿠폰 사업자)의 지갑에 DC Token 대출을 제공
* 파트너사는 DCWallet 컨트랙트를 통하여 DC Token 대출 요청 및 상환을 할 수 있음 
* DCWallet 컨트랙트에게 대출 한도 정보 제공
* DCWallet 컨트랙트 이외에 일반 EoA 계정에도 대출 서비스 제공여부 확인 필요(EoA 계정에 대출 제공시 상환은 EoA가 수동으로 직접 해야함)

### 2. 사용된 외부 모듈
* Ownable - 컨트랙트에 특정 권한을 가진 계정만 실행 가능한 함수 생성에 사용
* IERC223Recipient - DC Token 수령 시 호출 되는 tokenFallback 함수 구현(DC Token 수령시 상환 로직 구현)
* IERC20 - DC Token 컨트랙트의 전송, 조회 함수 호출 시 사용
* SafeMath - DC Token 대출 관련 사칙 연산에 사용

### 3. 구성하는 함수 목록
* 특정 권한(owner) 계정만 호출 가능한 함수 목록
    * setDCContract(address dcContractAddress)
        * 다루고자 하는 DC 컨트랙트 지정하기 위해 사용
        * DC 보관, 전송 기능 제공을 위해 반드시 지정 필요
    * setLoanLimit(uint256 newLimit)
        * DC 대출을 받는 계정 별 최대 대출 한도 설정 시 사용
    * transferDC(address to, uint256 amount)
        * DCLender 컨트랙트에 대출을 위해 보관 된 DC Token 을 강제 전송 시 사용
* 호출에 제약이 없는 함수
    * requestLend(uint256 amount)
        * DC 대출을 받고자 하는 계정에서 대출 요청을 위해 호출
        * amount 는 최대 대출 가능 금액보다 작아야 함
        * 대출 요청 계정에 요청 금액 만큼의 DC Token 이 입금 되며 컨트랙트 내부의 대출 장부에 대출 금액을 기록
    * getAvailableDCLoanAmount(address borrower)
        * borrower 계정에서 대출 가능한 최대 금액 조회 기능을 제공
        * 계좌별 대출 한도, borrower의 기 대출 금액, 현재 DC Lender 컨트랙트가 보유한 DC 잔량 정보를 이용하여 대출 가능 금액을 산정
    * getLendedAmount(address borrower)
        * borrower 계정에서 대출한 DC Token 금액 조회 기능 제공
    * tokenFallback(address from, uint256 value, bytes calldata data)
        * DCLender 컨트랙트에게 DC Token이 전송되면 호출되는 함수
        * DC Token 컨트랙트만이 호출 가능하도록 제한
        * DC Lender 컨트랙트 소유자가 DC Token을 제약없이 전송 가능하도록 설계(DCLender 컨트랙트의 대출 가능 DC Token을 입금하는 행위로 간주)
        * DC Lender 컨트랙트로 부터 DC Token을 대출 받은 계정만이 DC Token 입금 가능 (DCLender 컨트랙트에게 대출을 상환하는 행위로 간주)
        * DC Lender 컨트랙트는 입금 받는 DC Token 양을 반영하여 보낸 계정의 대출 장부를 업데이트