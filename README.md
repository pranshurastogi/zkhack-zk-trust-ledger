
# Zk Crypto Mixer 
zkCryptoMixer, a tool designed to enhance privacy for cryptocurrency transactions. By using Zero-Knowledge Proofs (zk-SNARKs) along with technologies like Circom, Solidity, and Next.js

`Below you can find the full code explanation`
### Blockchain

**ReentrancyGuard**

1. This contract is used to protect contract against reentrancy attack.

**MiMCSponge.sol**

1. This contract is used for hashing inputs
2. For more details look into Ep9 of the video or notes

**Verifier.sol**

1.  It’s a auto generated contract by circom and snark.js. This is used to verify the proof inside the contract.
2. If we start closely looking into this contract we will find this contract is doing static call to precompiled contracts to do curve additions…

**Tornado.sol**

1. This is the user-facing contract.
2. It holds all the money.
3. It has 2 main function deposit and withdraw and this internally uses `verifier.sol` and `MiMCSponge.sol` 
4. Code description

```jsx
// SPDX-License-Identifier: NONE
pragma solidity 0.8.17;

import "./MiMCSponge.sol";
import "./ReentrancyGuard.sol";

interface IVerifier {
    function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[3] memory input) external;
}

contract Tornado is ReentrancyGuard {
    address verifier; // address of the verifier contract 
    Hasher hasher; //  MiMCSponge Instance

    uint8 public treeLevel = 10;
		// tree level is basically depth of the tree, where the root is at the level 0
		// to find the relationship between lead and depth of tree(tree level) : Max Number of Leaf Nodes = 2^Level
		// In this case Max Number of Leaf Nodes = 2^10 = 1,024
		// It means this contract can have 1024 deposits 

    uint256 public denomination = 0.01 ether;
		// the amount of ether used need to depost in each deposi transaction

    uint256 public nextLeafIdx = 0; // next leaf location where the deposit(commitment) will be stored
    mapping(uint256 => bool) public roots; // keeps track of occured merkle roots when each deposit is happening.
    mapping(uint8 => uint256) lastLevelHash; 
		//when traversing upward in the tree.
		//When looking for the hash value of sister nodes, the direction of your path matters. If your path is on the left, you should look to the right for sister nodes, and the default value for those sister nodes will always be the same at that level.
		//However, if your hashing path for a particular level is on the right, then when looking left for the sister node value, it will be the last hash produced by a previous deposit at that level.
		//to keep track of this in a mapping structure.

    mapping(uint256 => bool) public nullifierHashes; // keeps track of the spends nullifier to eliminate the risk of double withdrawl (nullifierhash => bool)
    mapping(uint256 => bool) public commitments; // keeps track of existing commitment (commitment => bool)
    
		// these are the default value of leaves at each level
		// since we have max 10 levels, we had generated 10 random number 
		// these numbers are specific to this contract only

    uint256[10] levelDefaults = [
        23183772226880328093887215408966704399401918833188238128725944610428185466379,
        24000819369602093814416139508614852491908395579435466932859056804037806454973,
        90767735163385213280029221395007952082767922246267858237072012090673396196740,
        36838446922933702266161394000006956756061899673576454513992013853093276527813,
        68942419351509126448570740374747181965696714458775214939345221885282113404505,
        50082386515045053504076326033442809551011315580267173564563197889162423619623,
        73182421758286469310850848737411980736456210038565066977682644585724928397862,
        60176431197461170637692882955627917456800648458772472331451918908568455016445,
        105740430515862457360623134126179561153993738774115400861400649215360807197726,
        76840483767501885884368002925517179365815019383466879774586151314479309584255
    ];
		
		// events for deposit and withdraw
    event Deposit(uint256 root, uint256[10] hashPairings, uint8[10] pairDirection);
    event Withdrawal(address to, uint256 nullifierHash);

    constructor(
        address _hasher,
        address _verifier
    ){
        hasher = Hasher(_hasher);
        verifier = _verifier;
    }

    function deposit(uint256 _commitment) external payable nonReentrant {
        require(msg.value == denomination, "incorrect-amount"); // so user should not send less/more eth
        require(!commitments[_commitment], "existing-commitment"); // should not be an existing commitment
        require(nextLeafIdx < 2 ** treeLevel, "tree-full"); // should have vacant leaf

        uint256 newRoot; // root for the tree
        uint256[10] memory hashPairings; // path for the root from leaf
        uint8[10] memory hashDirections; // direction of the leaf

        uint256 currentIdx = nextLeafIdx;
        uint256 currentHash = _commitment;

        uint256 left;
        uint256 right;
        uint256[2] memory ins; // this is used to prepare the input to sponge , as it takes 2 input 
        // the below code is there to update the merkle tree and store all the relevant hashes
        for(uint8 i = 0; i < treeLevel; i++){
            
            if(currentIdx % 2 == 0){
                left = currentHash;
                right = levelDefaults[i];
                hashPairings[i] = levelDefaults[i];
                hashDirections[i] = 0;
            }else{
                left = lastLevelHash[i];
                right = currentHash;
                hashPairings[i] = lastLevelHash[i];
                hashDirections[i] = 1;
            }
            lastLevelHash[i] = currentHash;

            ins[0] = left;
            ins[1] = right;

            (uint256 h) = hasher.MiMC5Sponge{ gas: 150000 }(ins, _commitment);

            currentHash = h;
            currentIdx = currentIdx / 2;
        }

        newRoot = currentHash;
        roots[newRoot] = true;
        nextLeafIdx += 1;
				// storing the commitment
        commitments[_commitment] = true;
        emit Deposit(newRoot, hashPairings, hashDirections);

    }
		
		// As the verifier contract accept 4 input, this withdraw function has 4 inputs
    function withdraw(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[2] memory input
    ) external payable nonReentrant {
// the verifier contract takes array of size 3 in the last input
// but our withdraw takes only 2 size array as the last input is msg.sender
// so miner can not execute withdraw on their behalf 
// basically binding prrof with msg.sender

        uint256 _root = input[0];
        uint256 _nullifierHash = input[1];

        require(!nullifierHashes[_nullifierHash], "already-spent");
        require(roots[_root], "not-root");

        uint256 _addr = uint256(uint160(msg.sender));

        (bool verifyOK, ) = verifier.call(abi.encodeCall(IVerifier.verifyProof, (a, b, c, [_root, _nullifierHash, _addr])));

        require(verifyOK, "invalid-proof");

        nullifierHashes[_nullifierHash] = true;
        address payable target = payable(msg.sender);

        (bool ok, ) = target.call{ value: denomination }("");

        require(ok, "payment-failed");

        emit Withdrawal(msg.sender, _nullifierHash);
    }
                
}
```

 

### Circom

There are few code under utils section

1. MiMC5Sponge
2. Montgomery
3. Mux3
4. Pedersen

You can read more about `MiMC5Sponge` in above section or in [github](https://github.com/srv-smn/circom-101/tree/mimc5). `Montgomery` and `Mux3` are internally used in `[Pedersen](https://github.com/srv-smn/circom-101/tree/pedersen_mimc_sponge)` .You can read more about these function in whitepaper also.

In this process while making the `MiMC5Sponge` we make solidity version of `MiMC5Sponge` 

There are 2 user facing circuits:

1. deposit.circom
2. withdraw.circom

**deposit.circom**

This circuit takes `secret` and `nullifier` and construct the `commitment` and `nullifier hash`

Both the `secret` and `nullifier` are random number.

`deposit.circom` internally imports `CommitmentHasher`

```jsx
pragma circom 2.0.0;

include "./utils/pedersen.circom";

template CommitmentHasher() {
		// takes 2 inputs secreat and nullifier
    signal input secret[256];
    signal input nullifier[256];

		// output commitment and nullifierHash
    signal output commitment;
    signal output nullifierHash;

		// cHasher is of 512 size because commitment is combination of secret and nullifier
    component cHasher = Pedersen(512);
		// nHasher is of same size as of nullifier
    component nHasher = Pedersen(256);

		// providing inputs to each bit of Pedersen
		// since cHasher is of 512 so nullifier is till 255 and after that there is secret
    for(var i = 0; i < 256; i++){
        cHasher.in[i] <== nullifier[i];
        cHasher.in[i + 256] <== secret[i];
        nHasher.in[i] <== nullifier[i];
    }
		// outputs the commitment and nullifier hash
    commitment <== cHasher.o;
    nullifierHash <== nHasher.o;
}
```

**withdraw.circom**

`Withdraw` internally uses `mimc5sponge` and `commitment_hasher` (`commitment_hasher` internally uses `pedersen`)

It takes input various parameter such as :

1. `root` : merkle root
2. `nullifierHash` : hash of the nullifier
3. `recipient` : address of the recipient
4. `secret[256]` : actual secret 
5. `nullifier[256]` : actual nullifier
6. `hashPairings[10]` : hash for the merkle path construction
7. `hashDirections[10]` : direction of the nodes

```jsx
pragma circom 2.0.0;

include "./utils/mimc5sponge.circom";
include "./commitment_hasher.circom";

template Withdraw() {
// inputs
    signal input root;
    signal input nullifierHash;
    signal input recipient;

    signal input secret[256];
    signal input nullifier[256];
    signal input hashPairings[10]; // we get this from evnet of contract
    signal input hashDirections[10]; // we get this from evnet of contract

    // check if the public variable (submitted) nullifierHash is equal to the output 
    // from hashing secret and nullifier
    component cHasher = CommitmentHasher();
// providing inputs to commitment hasher
    cHasher.secret <== secret;
    cHasher.nullifier <== nullifier;

// checking if the secret and nullifier provided construct the same nullifierHash 
    cHasher.nullifierHash === nullifierHash;

    // reconstructing merkle tree to check if the hash , path and commitment leads 
		//to correct provided root or not
    component leafHashers[10];

    signal currentHash[10 + 1];
    currentHash[0] <== cHasher.commitment;

    signal left[10];
    signal right[10];

    for(var i = 0; i < 10; i++){
        var d = hashDirections[i];

        leafHashers[i] = MiMC5Sponge(2);

        left[i] <== (1 - d) * currentHash[i];
        leafHashers[i].ins[0] <== left[i] + d * hashPairings[i];

        right[i] <== d * currentHash[i];
        leafHashers[i].ins[1] <== right[i] + (1 - d) * hashPairings[i];

        leafHashers[i].k <== cHasher.commitment;
        currentHash[i + 1] <== leafHashers[i].o;
    }

    root === currentHash[10];

    // add recipient in the proof
//as we observe recipient is not taking part in the calculation
// but we included this to make sure recipient shout be the part of the 
// proof and this will avoid situation where miner can exploit the transaction 
    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

// all inputs to circuit are private 
// we can mark any input parameter as public from here
// all the input parameter will be part of the parameter that 
// we need to provide to verifier contract to verify proof
component main {public [root, nullifierHash, recipient]} = Withdraw();
```

**So basically we can generate verifier contract for this circuit and we can run this circuit offchain to generate proof for the computation and then that proof can be submitted to verifier contract.**

### Other commands with respect to this circuit

1. compile: `npx circom2 withdraw.circom --rics --wasm`
2. groth16
    1. generate ceremony file: `npx snarkjs powersoftau new bn128 12 ceremony_ 0000.ptau`
    2. contribute in ceremony: `npx snarkjs powersoftau contribute ceremony_ 0000.ptau ceremony_ 0001.ptau`
    3. prepare for phase2: `npx snarkjs powersoftau prepare phase2 ceremony_0001.ptau ceremony_final.ptau -v`
    4. verifying ceremony file: `npx snarkjs powersoftau verify ceremony_0000.ptau`
    5. Groth16 setup: `npx snarkjs groth16 setup circuit.r1cs ceremony_final.ptau setup_0000.zkey`
    6. Adding randomness to the zkey file : `npx snarkjs zkey contribute setup_0000.zkey setup_final.zkey`
    7. Verifying zkey file: `npx snarkjs zkey verify circuit.r1cs ceremony_final.ptau setup_final.zkey`
    8. export solidity contract: `npx snarkjs zkey export solidityverifier setup_final.zkey Verifier.sol`

### Frontend

Deposit

```jsx
// since the secret and nullifier are 2 random number
// so, we are generating secret and nullifier 
// then conversting them to string
const secret = ethers.BigNumber.from(
      ethers.utils.randomBytes(32)
    ).toString();
    const nullifier = ethers.BigNumber.from(
      ethers.utils.randomBytes(32)
    ).toString();

// constructing the input
// As this data is required by the circuit to generate this witness
    const input = {
      secret: utils.BN256ToBin(secret).split(""),
      nullifier: utils.BN256ToBin(nullifier).split(""),
    };

// when we compile the circuit using `npx circom2 circuit.circom --r1cs --wasm`
// we get js files "generate_witness" and "witness_calculator"
// "witness_calculator" is the main file, if we look into "generate_witness"
// we can see how to generate witness with js. So will try to do the same thing in FE
// 
// imported the web assembly format of the circuit that we imported
// convert to array buffer
// feed that circuit to witness calculator 
// here const wc = require("../circuit/witness_calculator.js");
// Now since we have instance of the calculator we can now generate the witness by passing ip
// and from the circuit we already know circuit op is commitment and nullifierHash

    var res = await fetch("/deposit.wasm");
    var buffer = await res.arrayBuffer();
    var depositWC = await wc(buffer);

    const r = await depositWC.calculateWitness(input);

    const commitment = r[1];
    const nullifierHash = r[2];
    console.log("commitment", commitment);

// constructing the transaction, to send it to bc

    const value = ethers.BigNumber.from("10000000000000000").toHexString();
    const tx = {
      to: tornadoAddress,
      from: account.address,
      value: value,
      data: tornadoInterface.encodeFunctionData("deposit", [commitment]),
    };

    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [tx],
      });
      const receipt = await waitForTransactionReceipt(txHash);
      console.log(receipt);
      const log = receipt.logs[1];

// once transaction is done it emits event with certain fields
// like hash hashPairing, directions and root

      const decodedData = tornadoInterface.decodeEventLog(
        "Deposit",
        log.data,
        log.topics
      );

//by taking all this data we make a object will all information 
// Then converted that object to Base64-encoded ASCII string "btoa()"
// user need to keep this text secreat so that they can withdraw it.

      const proofElements = {
        root: utils.BNToDecimal(decodedData.root),
        nullifierHash: `${nullifierHash}`,
        secret: secret,
        nullifier: nullifier,
        commitment: `${commitment}`,
        hashPairing: decodedData.hashPairings.map((n) => utils.BNToDecimal(n)),
        hashDirections: decodedData.pairDirection,
      };
      console.log(proofElements);

      updateProofElements(btoa(JSON.stringify(proofElements)));
```

Withdraw:

```jsx
// decodes a string of data which has been encoded using Base64 encoding
const proofElements = JSON.parse(atob(proofString));
            console.log(proofElements);
// The command to generate proof 
// npx snarkjs groth16 fullprove input.json circuit_js/circuit.wasm setup_final.zkey proof.json public.json
//to simulate this in our frontend we need to install snarkjs utility
//npm install snarkjs@latest
// cp node_modules/snarkjs/build/snarkjs.min.js . we can link this js file in browser to have browser access to utility
// read more here : https://github.com/iden3/snarkjs#in-the-browser
//after doing this snark js module is available on the window object

            const SnarkJS = window['snarkjs'];

// constructing the object again
            const proofInput = {
                "root": proofElements.root,//utils.BNToDecimal(decodedData.root),
                "nullifierHash": proofElements.nullifierHash,
                "recipient": utils.BNToDecimal(account.address),
                "secret": utils.BN256ToBin(proofElements.secret).split(""),
                "nullifier": utils.BN256ToBin(proofElements.nullifier).split(""),
                "hashPairings": proofElements.hashPairing,//decodedData.hashPairings.map((n) => ($u.BNToDecimal(n))),
                "hashDirections": proofElements.hashDirections//decodedData.pairDirection
            };
            console.log(3);

// Generating proofs 
// As there will be 2 op since we declared few fields as public
            const { proof, publicSignals } = await SnarkJS.groth16.fullProve(proofInput, "/withdraw.wasm", "/setup_final.zkey");
            console.log(4);
            console.log('=========================================');
            console.log(proof);
            console.log(publicSignals);
// constructing data to be sent to bc
            const callInputs = [
                proof.pi_a.slice(0, 2).map(utils.BN256ToHex),
                proof.pi_b.slice(0, 2).map((row) => (utils.reverseCoordinate(row.map(utils.BN256ToHex)))),
                proof.pi_c.slice(0, 2).map(utils.BN256ToHex),
                publicSignals.slice(0, 2).map(utils.BN256ToHex)
            ];

            const callData = tornadoInterface.encodeFunctionData("withdraw", callInputs);
            const tx = {
                to: tornadoAddress,
                from: account.address,
                data: callData
            };
            const txHash = await window.ethereum.request({ method: "eth_sendTransaction", params: [tx] });
            const receipt = await waitForTransactionReceipt(txHash);
```