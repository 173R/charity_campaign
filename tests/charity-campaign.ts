import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CharityCampaign } from "../target/types/charity_campaign";
import {TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount, getMint} from "@solana/spl-token";
import {assert} from "chai";
import {PublicKey, Signer} from "@solana/web3.js";

describe("charity-campaign", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CharityCampaign as Program<CharityCampaign>;

  let mintA = null;
  let mintB = null;
  let initializerTokenAccountA = null;
  let initializerTokenAccountB = null;
  let takerTokenAccountA = null;
  let takerTokenAccountB = null;
  let vault_account_pda = null;
  let vault_account_bump = null;
  let vault_authority_pda = null;

  const takerAmount = 1000;
  const initializerAmount: number = 50000;

  const escrowAccount = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();
  const initializerMainAccount = anchor.web3.Keypair.generate();
  const takerMainAccount = anchor.web3.Keypair.generate();

  it("Initialize program state", async () => {
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(initializerMainAccount.publicKey, 1000000000),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(takerMainAccount.publicKey, 1000000000),
      "confirmed"
    );

    /*// Fund Main Accounts
    await provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: initializerMainAccount.publicKey,
            lamports: 1000000000,
          }),
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: takerMainAccount.publicKey,
            lamports: 1000000000,
          })
        );
        return tx;
      })(),
      [payer]
    );*/

    mintA = await createMint( // Создаём минт токена A
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
    );

    mintB = await createMint( // Создаём минт токена B
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
    );

    //Создаём токен аккаунт токена A для юзера initializerMainAccount, то есть для отправителя токенов А
    initializerTokenAccountA = await createAccount(
      provider.connection,
      payer,
      mintA,
      initializerMainAccount.publicKey,
    )

    //Создаём токен аккаунт токена A для юзера takerMainAccount, то есть для получателя токенов токенов А
    takerTokenAccountA = await createAccount(
      provider.connection,
      payer,
      mintA,
      takerMainAccount.publicKey,
    )

    //Тоже самое только для токена B
    initializerTokenAccountB = await createAccount(
      provider.connection,
      payer,
      mintB,
      initializerMainAccount.publicKey,
    )

    takerTokenAccountB = await createAccount(
      provider.connection,
      payer,
      mintB,
      takerMainAccount.publicKey,
    )

    //const signer

    //Создаём токены для аккаунта initializerTokenAccountA который принадлежит отправителю.
    await mintTo(
      provider.connection,
      payer,
      mintA,
      initializerTokenAccountA,
      mintAuthority.publicKey,
      initializerAmount,
      [mintAuthority],
    );

    ////Создаём токены для аккаунта initializerTokenAccountA который принадлежит получателю
    await mintTo(
      provider.connection,
      payer,
      mintB,
      takerTokenAccountB,
      mintAuthority.publicKey,
      takerAmount,
      [mintAuthority],
    );

    /*await mintB.mintTo(
      takerTokenAccountB,
      mintAuthority.publicKey,
      [mintAuthority],
      takerAmount
    );*/

    let _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA,
    ) /*mintA.getAccountInfo(initializerTokenAccountA);*/


    let _takerTokenAccountB = await getAccount(
      provider.connection,
      takerTokenAccountB
    );

    assert.ok(_initializerTokenAccountA.amount.toString() == initializerAmount.toString());
    assert.ok(_takerTokenAccountB.amount.toString() == takerAmount.toString());
  });


  /*it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });*/
});
