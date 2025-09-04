## zk-trust-ledgerwith Regulatory Compliance

zk-trust-ledger, a tool designed to enhance privacy for cryptocurrency transactions. By using Zero-Knowledge Proofs (zk-SNARKs) along with technologies like Circom, Solidity, and Next.js

## Overview
**Problem Summary:** Cryptocurrency mixers face a significant challenge: when they inadvertently mix funds from legitimate users with those from bad actors, all participants risk having their addresses banned due to guilt-by-association. This issue undermines the trust and utility of mixers for privacy protection.

**Proposed Solution** Implement an associative set-based proof of exclusion system. This system categorizes addresses based on transaction history, allowing mixers to generate a proof that legitimate funds are not mixed with those from malicious sources. This approach aims to protect innocent users from being unfairly penalized, while maintaining privacy and enhancing regulatory compliance.

**Expected Outcome:** The solution is expected to safeguard innocent users from association with illicit activities in mixers, balancing privacy with regulatory needs.

<img width="921" alt="Screenshot 2023-11-12 at 11 11 19 AM" src="https://github.com/pranshurastogi/zkhack-zk-trust-ledger/assets/12568291/3681207a-2094-4142-ab4f-f32a2f4a85c1">

<img width="941" alt="Screenshot 2023-11-12 at 11 11 42 AM" src="https://github.com/pranshurastogi/zkhack-zk-trust-ledger/assets/12568291/d8f6a2fc-6419-4ef9-a8d1-d6c0def47816">

<img width="865" alt="Screenshot 2023-11-12 at 11 12 09 AM" src="https://github.com/pranshurastogi/zkhack-zk-trust-ledger/assets/12568291/18f15016-a7dc-4734-bf5d-ed47da8d6577">

<img width="865" alt="Screenshot 2023-11-12 at 11 12 50 AM" src="https://github.com/pranshurastogi/zkhack-zk-trust-ledger/assets/12568291/c8c44361-41e6-4654-9020-767d13d7d1ab">



## Commands wrt circuit
### Other commands with respect to this circuit

1. compile: `npx circom2 withdraw.circom --rics --wasm`
2. groth16
    1. generate ceremony file: `npx snarkjs powersoftau new bn128 12 ceremony_0000.ptau`
    2. contribute in ceremony: `npx snarkjs powersoftau contribute ceremony_0000.ptau ceremony_ 0001.ptau`
    3. prepare for phase2: `npx snarkjs powersoftau prepare phase2 ceremony_0001.ptau ceremony_final.ptau -v`
    4. verifying ceremony file: `npx snarkjs powersoftau verify ceremony_0000.ptau`
    5. Groth16 setup: `npx snarkjs groth16 setup withdraw.r1cs ceremony_final.ptau setup_0000.zkey`
    6. Adding randomness to the zkey file : `npx snarkjs zkey contribute setup_0000.zkey setup_final.zkey`
    7. Verifying zkey file: `npx snarkjs zkey verify withdraw.r1cs ceremony_final.ptau setup_final.zkey`
    8. export solidity contract: `npx snarkjs zkey export solidityverifier setup_final.zkey Verifier.sol`

## Polygon Mumbai

- ASP: [0x45C9Fa9EF985BdD2AA3D979824Ab23Bd665D2A1B](https://mumbai.polygonscan.com/address/0x45C9Fa9EF985BdD2AA3D979824Ab23Bd665D2A1B)
- Cryptomixer: [0x9550Da89dA0873188c5390021643eB3930C8365D](https://mumbai.polygonscan.com/address/0x9550Da89dA0873188c5390021643eB3930C8365D)
- Deposit: [0xeece91117496d8487054e05423ef4437415b1896c4a07d9ca284c95f08cfcc93](https://mumbai.polygonscan.com/tx/0xeece91117496d8487054e05423ef4437415b1896c4a07d9ca284c95f08cfcc93)
- WithDraw: [0x96651d489ceafd12e593569f183281862e0c34c67aee01f41641e2e12a5379e9](https://mumbai.polygonscan.com/tx/0x96651d489ceafd12e593569f183281862e0c34c67aee01f41641e2e12a5379e9)


## Polygon ZKEVM

- ASP: [0xaA9CDfdC1081f37BD9508aa9667ec5BCFD3d9550](https://testnet-zkevm.polygonscan.com/address/0xaA9CDfdC1081f37BD9508aa9667ec5BCFD3d9550)

- Cryptomixer: [0x7E0E7E7af70d40fa577c668bd235C0A0441d5b63](https://testnet-zkevm.polygonscan.com/address/0x7E0E7E7af70d40fa577c668bd235C0A0441d5b63)


## Mantle Testnet

- ASP: [0x11897a15C3b9Ec2eDc7925671E578b9751AABFf2](https://explorer.testnet.mantle.xyz/address/0x11897a15C3b9Ec2eDc7925671E578b9751AABFf2)
- Cryptomixer: [0xcbe92BcA5623e8ABa23C2F4CdeF0886380dCd3D0](https://explorer.testnet.mantle.xyz/address/0xcbe92BcA5623e8ABa23C2F4CdeF0886380dCd3D0)


## Scroll Testnet

- ASP: [0x11897a15C3b9Ec2eDc7925671E578b9751AABFf2](https://scroll.l2scan.co/address/0x11897a15C3b9Ec2eDc7925671E578b9751AABFf2)
- Cryptomixer: [0xcbe92bca5623e8aba23c2f4cdef0886380dcd3d0](https://scroll.l2scan.co/address/0xcbe92BcA5623e8ABa23C2F4CdeF0886380dCd3D0)

