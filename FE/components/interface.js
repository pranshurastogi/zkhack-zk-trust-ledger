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

const tornadoAddress = "0x7E0E7E7af70d40fa577c668bd235C0A0441d5b63";
const aspAddress = "0xaA9CDfdC1081f37BD9508aa9667ec5BCFD3d9550"
let tempData = null;


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
            // const b_aspData = JSON.parse(atob(aspData));
            const b_aspData = aspData
            console.log(proofElements);

    //         receipt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [proofElements.txHash] });
    //         if(!receipt){ throw "empty-receipt"; }

    //         const log = receipt.logs[0];
    //         const decodedData = tornadoInterface.decodeEventLog("Deposit", log.data, log.topics);
              console.log(1);
            const SnarkJS = window['snarkjs'];
            console.log(2);
            // console.log(aspData);
            console.log(tempData);
            const proofInput = {
                "root": proofElements.root,//utils.BNToDecimal(decodedData.root),
                "nullifierHash": proofElements.nullifierHash,
                "recipient": utils.BNToDecimal(account.address),
                "associationHash":tempData.root,
                "associationRecipient":utils.BNToDecimal(account.address),
                "secret": utils.BN256ToBin(proofElements.secret).split(""),
                "nullifier": utils.BN256ToBin(proofElements.nullifier).split(""),
                "hashPairings": proofElements.hashPairing,//decodedData.hashPairings.map((n) => ($u.BNToDecimal(n))),
                "hashDirections": proofElements.hashDirections,//decodedData.pairDirection,
                "associationHashPairings": tempData.hashPairing,//decodedData.hashPairings.map((n) => ($u.BNToDecimal(n))),
                "associationHashDirections": tempData.hashDirections//decodedData.pairDirection
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
                publicSignals.slice(0, 3).map(utils.BN256ToHex)
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

      // updateAspData(btoa(JSON.stringify(aspElements)));
      updateAspData(aspElements);
      tempData = aspElements


      console.log('===============!!!!!!!!===============');
      console.log('aspElements',aspElements);
      // console.log('btoa(JSON.stringify(aspElements))',btoa(JSON.stringify(aspElements)));
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
      <p style={{ marginBottom: "8px", fontSize: "18px", color: "#333" }}>ChainId: {account.chainId}</p>
      <p style={{ marginBottom: "8px", fontSize: "18px", color: "#333" }}>Address: {account.address}</p>
      <p style={{ marginBottom: "8px", fontSize: "18px", color: "#333" }}>Balance: {account.balance} ethers</p>
    </div>
  ) : (
    <div>
      <button
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={connectMetamask}
      >
        Connect Metamask
      </button>
    </div>
  )}
  <div style={{ margin: "16px 0" }}>
    <hr />
  </div>
  {!!account ? (
    <div>
      {proofElements ? (
        <div>
          <p style={{ fontWeight: "bold", fontSize: "18px", color: "#333", marginBottom: "8px" }}>
            Proof of Deposit
          </p>
          <div style={{ maxWidth: "100%", overflowWrap: "break-word", fontSize: "14px", color: "#555" }}>
            <span ref={(proofStringEl) => { updateProofStringEl(proofStringEl); }}>{proofElements}</span>
          </div>
          {proofStringEl && (
            <button
              style={{
                margin: "8px 0",
                padding: "12px 24px",
                fontSize: "16px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={copyProof}
            >
              Copy Proof
            </button>
          )}
        </div>
      ) : (
        <button
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={depositEther}
        >
          Deposit 0.1 Ether
        </button>
      )}
    </div>
  ) : (
    <p style={{ fontSize: "16px", color: "#555" }}>You need to connect to Metamask to use this section</p>
  )}
  <div style={{ margin: "16px 0" }}>
    <hr />
  </div>
  {account ? (
    <div>
      <div>
        <textarea
          className="form-control"
          style={{
            width: "100%",
            padding: "12px",
            resize: "none",
            boxSizing: "border-box",
            fontSize: "16px",
            color: "#333",
          }}
          ref={(ta) => {
            updateTextArea(ta);
          }}
        ></textarea>{" "}
      </div>
      <button
        style={{
          margin: "8px 0",
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={withdraw}
      >
        Withdraw 0.1 Ether
      </button>
    </div>
  ) : (
    <div>
      <p style={{ fontSize: "16px", color: "#555" }}>You need to connect to Metamask to use this section</p>
    </div>
  )}
</div>

  );
};
export default Interface;
