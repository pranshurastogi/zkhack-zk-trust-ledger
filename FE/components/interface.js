import { useState } from "react";
import utils from "../utils/$u.js";
import { ethers } from "ethers";
const wc = require("../circuit/witness_calculator.js");
const tornadoJSON = require("../json/Tornado.json");
const tornadoABI = tornadoJSON.abi;
const tornadoInterface = new ethers.utils.Interface(tornadoABI);

const aspJSON = require("../json/Asp.json");
const aspABI = aspJSON.abi;
const aspInterface = new ethers.utils.Interface(aspABI)

const tornadoAddress = "0xCc81865F9C21ff864f3f45064eD16baEC83ED270";
const aspAddress = "0xf2D3B9124a412a0A9300c6f720B57C89d1677f40"

const Interface = () => {
  const [account, updateAccount] = useState(null);
  const [proofElements, updateProofElements] = useState(null);
  const [proofStringEl, updateProofStringEl] = useState(null);
  const [textArea, updateTextArea] = useState(null);
  const [aspData, updateAspData] = useState(null);

  // interface states



  const connectMetamask = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install Metamask to use this app.");
        throw "no-metamask";
      }

      var accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      var chainId = window.ethereum.networkVersion;

      var activeAccount = accounts[0];
      var balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [activeAccount, "latest"],
      });
      balance = utils.moveDecimalLeft(
        ethers.BigNumber.from(balance).toString(),
        18
      );

      var newAccountState = {
        chainId: chainId,
        address: activeAccount,
        balance: balance,
      };
      updateAccount(newAccountState);
    } catch (error) {
      console.log(error);
    }
  };
  async function waitForTransactionReceipt(txHash) {
    while (true) {
      const receipt = await window.ethereum.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      });

      if (receipt !== null) {
        return receipt; // Transaction mined, return receipt
      }

      // If receipt is not yet available, wait for a while before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
    }
  }

  const withdraw = async () => {
    // updateWithdrawButtonState(ButtonState.Disabled);
      await callASP()

        if(!textArea || !textArea.value){ alert("Please input the proof of deposit string."); }

        try{
            const proofString = textArea.value;
            const proofElements = JSON.parse(atob(proofString));
            const b_aspData = JSON.parse(atob(aspData));
            console.log(proofElements);

    //         receipt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [proofElements.txHash] });
    //         if(!receipt){ throw "empty-receipt"; }

    //         const log = receipt.logs[0];
    //         const decodedData = tornadoInterface.decodeEventLog("Deposit", log.data, log.topics);
              console.log(1);
            const SnarkJS = window['snarkjs'];
            console.log(2);
            const proofInput = {
                "root": proofElements.root,//utils.BNToDecimal(decodedData.root),
                "nullifierHash": proofElements.nullifierHash,
                "recipient": utils.BNToDecimal(account.address),
                "associationHash":b_aspData.root,
                "associationRecipient":utils.BNToDecimal(account.address),
                "secret": utils.BN256ToBin(proofElements.secret).split(""),
                "nullifier": utils.BN256ToBin(proofElements.nullifier).split(""),
                "hashPairings": proofElements.hashPairing,//decodedData.hashPairings.map((n) => ($u.BNToDecimal(n))),
                "hashDirections": proofElements.hashDirections,//decodedData.pairDirection,
                "associationHashPairings": b_aspData.hashPairing,//decodedData.hashPairings.map((n) => ($u.BNToDecimal(n))),
                "associationHashDirections": b_aspData.hashDirections//decodedData.pairDirection
            };
            console.log(3);
            const { proof, publicSignals } = await SnarkJS.groth16.fullProve(proofInput, "/withdraw.wasm", "/setup_final.zkey");
            console.log(4);
            console.log('=========================================');
            console.log(proof);
            console.log(publicSignals);
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


    //         var receipt;
    //         while(!receipt){
    //             receipt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] });
    //             await new Promise((resolve, reject) => { setTimeout(resolve, 1000); });
    //         }

    //         if(!!receipt){ updateWithdrawalSuccessful(true); }
        }catch(e){
            console.log(e);
        }

    //     updateWithdrawButtonState(ButtonState.Normal);
  }
  const depositEther = async () => {
    const secret = ethers.BigNumber.from(
      ethers.utils.randomBytes(32)
    ).toString();
    const nullifier = ethers.BigNumber.from(
      ethers.utils.randomBytes(32)
    ).toString();

    const input = {
      secret: utils.BN256ToBin(secret).split(""),
      nullifier: utils.BN256ToBin(nullifier).split(""),
    };

    var res = await fetch("/deposit.wasm");
    var buffer = await res.arrayBuffer();
    var depositWC = await wc(buffer);

    const r = await depositWC.calculateWitness(input);

    const commitment = r[1];
    const nullifierHash = r[2];
    console.log("commitment", commitment);

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

      const decodedData = tornadoInterface.decodeEventLog(
        "Deposit",
        log.data,
        log.topics
      );

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
    } catch (error) {
      console.log(error);
    }

    console.log(commitment, nullifierHash);
  };

  const callASP = async () => {

    const tx = {
      to: aspAddress,
      from: account.address,
      data: aspInterface.encodeFunctionData("addUser"),
    };

    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [tx],
      });
      const receipt = await waitForTransactionReceipt(txHash);
      console.log(receipt);
      const log = receipt.logs[0];

      const decodedData = aspInterface.decodeEventLog(
        "userAdded",
        log.data,
        log.topics
      );

      const aspElements = {
        root: utils.BNToDecimal(decodedData.root),
        hashPairing: decodedData.hashPairings.map((n) => utils.BNToDecimal(n)),
        hashDirections: decodedData.pairDirection,
      };

      updateAspData(btoa(JSON.stringify(aspElements)));

      console.log('===============!!!!!!!!===============');
      console.log('aspElements',aspElements);
      console.log('================!!!!!!!!!!!==============');

    } catch (error) {
      console.log(error);
    }

  }

  const copyProof = () => {
    if(!!proofStringEl){
        // flashCopiedMessage();
        navigator.clipboard.writeText(proofStringEl.innerHTML);
    }  
};

  return (
    <div>
      {!!account ? (
        <div>
          <p>ChainId: {account.chainId}</p>
          <p>Address: {account.address}</p>
          <p>Balance: {account.balance} ethers</p>
        </div>
      ) : (
        <div>
          {" "}
          <button onClick={connectMetamask}> Connect Metamask</button>
        </div>
      )}
      <div>
        <hr />
      </div>
      {!!account ? (
        <div>
          {proofElements ? (
            <div>
                <p><strong>Proof of Deposit</strong></p>
            <div style={{maxWidth: "100vw", overflowWrap:"break-word"}} >
            <span style={{ fontSize: 10 }} ref={(proofStringEl) => { updateProofStringEl(proofStringEl); }}>{proofElements}</span>
            </div>
            {
                proofStringEl && (
                    <button onClick={copyProof}> Copy Proof</button>
                )
            }
            </div>
          ) : (
            <button onClick={depositEther}> Deposit 0.1 Ether</button>
          )}
        </div>
      ) : (
        <p>You need to connect to metamask to use this section</p>
      )}
      <div>
        <hr />
      </div>

      {
        account? (
          <div>
            <div><textarea className="form-control" style={{ resize: "none" }} ref={(ta) => { updateTextArea(ta); }}></textarea> </div>
            <button onClick={withdraw}> Withdraw 0.1 Ether</button>
            </div>
        ) : (
          <div>
            <p>You need to connect to metamask to use this section</p>
          </div>
        )
      }

    </div>
  );
};
export default Interface;
