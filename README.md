## Crypto Mixer with Regulatory Compliance

zkCryptoMixer, a tool designed to enhance privacy for cryptocurrency transactions. By using Zero-Knowledge Proofs (zk-SNARKs) along with technologies like Circom, Solidity, and Next.js

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
ASP: 0x45C9Fa9EF985BdD2AA3D979824Ab23Bd665D2A1B
Cryptomixer: 0x9550Da89dA0873188c5390021643eB3930C8365D

Deposit: 0xeece91117496d8487054e05423ef4437415b1896c4a07d9ca284c95f08cfcc93
WithDraw: 0x96651d489ceafd12e593569f183281862e0c34c67aee01f41641e2e12a5379e9

## Polygon ZKEVM
ASP: 0xaA9CDfdC1081f37BD9508aa9667ec5BCFD3d9550
Cryptomixer: 0x7E0E7E7af70d40fa577c668bd235C0A0441d5b63

## Mantle Testnet
ASP: 0x11897a15C3b9Ec2eDc7925671E578b9751AABFf2
Cryptomixer: 0xcbe92BcA5623e8ABa23C2F4CdeF0886380dCd3D0

## Scroll Testnet
ASP: 0x11897a15C3b9Ec2eDc7925671E578b9751AABFf2
Cryptomixer: 0xcbe92BcA5623e8ABa23C2F4CdeF0886380dCd3D0