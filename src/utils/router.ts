import AccountCreate from '@/pages/account/create.vue';
import RequestCreate from '@/pages/account/request.vue';
import AccountUpdate from '@/pages/account/update.vue';
import DappAuthorize from '@/pages/automation/authorize.vue';
import AccountBalances from '@/pages/finances/account-balances.vue';
import CreateToken from '@/pages/finances/create-token.vue';
import TokenDefinitions from '@/pages/finances/token-definitions.vue';
import TokenHolders from '@/pages/finances/token-holders.vue';
import Transfer from '@/pages/finances/transfer.vue';
import Index from '@/pages/index.vue';
import SignMessage from '@/pages/sign/message.vue';
import SignTransaction from '@/pages/sign/transaction.vue';

export const routes = [
  { path: '/', component: Index },
  { path: '/sign/transaction', component: SignTransaction },
  { path: '/sign/message', component: SignMessage },
  { path: '/account/create', component: AccountCreate },
  { path: '/account/request', component: RequestCreate },
  { path: '/account/update', component: AccountUpdate },
  { path: '/finances/transfer', component: Transfer },
  { path: '/finances/create-token', component: CreateToken },
  { path: '/finances/token-definitions', component: TokenDefinitions },
  { path: '/finances/token-holders', component: TokenHolders },
  { path: '/finances/account-balances', component: AccountBalances },
  { path: '/automation/authorize', component: DappAuthorize }
];
