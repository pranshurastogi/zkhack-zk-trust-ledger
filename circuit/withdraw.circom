pragma circom 2.0.0;

include "./utils/mimc5sponge.circom";
include "./commitment_hasher.circom";

template Withdraw() {
    signal input root;
    signal input nullifierHash;
    signal input recipient;
    signal input associationHash; 
    signal input associationRecipient; 

    signal input secret[256];
    signal input nullifier[256];
    signal input hashPairings[10];
    signal input hashDirections[10];

    signal input associationHashPairings[10]; 
    signal input associationHashDirections[10]; 

   
    component cHasher = CommitmentHasher();
    cHasher.secret <== secret;
    cHasher.nullifier <== nullifier;
    cHasher.nullifierHash === nullifierHash;


    // checking merkle tree hash path
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

    
    component associationLeafHashers[10];

    signal associationCurrentHash[10 + 1];
    associationCurrentHash[0] <== associationRecipient;

    signal associationLeft[10];
    signal associationRight[10];

    for(var i = 0; i < 10; i++){
        var d = associationHashDirections[i];

        associationLeafHashers[i] = MiMC5Sponge(2);

        associationLeft[i] <== (1 - d) * associationCurrentHash[i];
        associationLeafHashers[i].ins[0] <== associationLeft[i] + d * associationHashPairings[i];

        associationRight[i] <== d * associationCurrentHash[i];
        associationLeafHashers[i].ins[1] <== associationRight[i] + (1 - d) * associationHashPairings[i];

        associationLeafHashers[i].k <== associationRecipient;
        associationCurrentHash[i + 1] <== associationLeafHashers[i].o;
    }

    associationHash === associationCurrentHash[10];


    // add recipient in the proof
    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

component main {public [root, nullifierHash,recipient, associationHash,associationRecipient]} = Withdraw();