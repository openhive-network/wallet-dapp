# @hiveio/wallet-dapp

Metamask Wallet dApp

## Running

1. Install and configure [Metamask Flask](https://docs.metamask.io/snaps/get-started/install-flask/). **REMEMBER TO DISABLE STANDARD METAMASK BEFORE TESTING**
1. Install project: `git clone --recurse-submodules https://gitlab.syncad.com/hive/wallet-dapp.git`
1. Install dependencies: `pnpm install`
1. Start development server: `pnpm start`
1. Navigate to [http://localhost:5173](http://localhost:5173) and authorize to test

> If you want to see metamask snap logs on Chrome, go to: [chrome://extensions](chrome://extensions) Details of "MetaMask Flask DEVELOPMENT BUILD" and inspect `offscreen.html` console

## Regenerating ctokens api spec

```bash
pnpm regenerate-ctokens-api http://192.168.6.7/
```
