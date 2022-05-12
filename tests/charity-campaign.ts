import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CharityCampaign } from "../target/types/charity_campaign";
import {TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount, getMint} from "@solana/spl-token";
import {assert} from "chai";
import {PublicKey, Signer, SystemProgram} from "@solana/web3.js";

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

    //Создаём токены А для аккаунта initializerTokenAccountA который принадлежит отправителю.
    await mintTo(
      provider.connection,
      payer,
      mintA,
      initializerTokenAccountA,
      mintAuthority.publicKey,
      initializerAmount,
      [mintAuthority],
    );

    ////Создаём токены B для аккаунта initializerTokenAccountB который принадлежит получателю
    await mintTo(
      provider.connection,
      payer,
      mintB,
      takerTokenAccountB,
      mintAuthority.publicKey,
      takerAmount,
      [mintAuthority],
    );

    let _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA,
    ) /*mintA.getAccountInfo(initializerTokenAccountA);*/


    let _takerTokenAccountB = await getAccount(
      provider.connection,
      takerTokenAccountB
    );


    //То есть у отправителя сейчас есть два токен аккаунта, один с токенами A другой с B но пустой, а у получателя наоборот
    assert.ok(_initializerTokenAccountA.amount.toString() == initializerAmount.toString());
    assert.ok(_takerTokenAccountB.amount.toString() == takerAmount.toString());
  });


  it("Initialize escrow", async () => {
    const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("token-seed"))],
      program.programId
    );
    vault_account_pda = _vault_account_pda;
    vault_account_bump = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    await program.methods
      .initialize(vault_account_bump, new anchor.BN(initializerAmount), new anchor.BN(takerAmount))
      .accounts({
        initializer: provider.wallet.publicKey, // initializerMainAccount.publicKey
        mint: mintA,
        vaultAccount: vault_account_pda,
        escrowAccount: escrowAccount.publicKey,
        initializerDepositTokenAccount: initializerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();

    /*await program.rpc.initialize(
      vault_account_bump,
      new anchor.BN(initializerAmount),
      new anchor.BN(takerAmount),
      {
        accounts: {
          initializer: initializerMainAccount.publicKey,
          vaultAccount: vault_account_pda,
          mint: mintA.publicKey,
          initializerDepositTokenAccount: initializerTokenAccountA,
          initializerReceiveTokenAccount: initializerTokenAccountB,
          escrowAccount: escrowAccount.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions: [
          await program.account.escrowAccount.createInstruction(escrowAccount),
        ],
        signers: [escrowAccount, initializerMainAccount],
      }
    );*/

    /*let _vault = await getAccount(
      provider.connection,
      vault_account_pda
    );

    /!*let _takerTokenAccountB = await getAccount(
      provider.connection,
      takerTokenAccountB
    );*!/

    let _escrowAccount = await program.account.escrowAccount.fetch(
      escrowAccount.publicKey
    );

    // Check that the new owner is the PDA.
    assert.ok(_vault.owner.equals(vault_authority_pda));

    // Check that the values in the escrow account match what we expect.
    assert.ok(_escrowAccount.initializerKey.equals(initializerMainAccount.publicKey));
    assert.ok(_escrowAccount.initializerAmount.toNumber() == initializerAmount);
    assert.ok(_escrowAccount.takerAmount.toNumber() == takerAmount);
    assert.ok(
      _escrowAccount.initializerDepositTokenAccount.equals(initializerTokenAccountA)
    );
    assert.ok(
      _escrowAccount.initializerReceiveTokenAccount.equals(initializerTokenAccountB)
    );*/
  });


  /*it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });*/
});
