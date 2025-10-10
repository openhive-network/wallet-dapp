import AccountCreate from '@/pages/account/create.vue';
import RequestCreate from '@/pages/account/request.vue';
import AccountUpdate from '@/pages/account/update.vue';
import DappAuthorize from '@/pages/automation/authorize.vue';
import Index from '@/pages/index.vue';
import SignMessage from '@/pages/sign/message.vue';
import SignTransaction from '@/pages/sign/transaction.vue';
import CreateToken from '@/pages/tokens/create.vue';
import TokensList from '@/pages/tokens/list.vue';
import AccountBalances from '@/pages/tokens/my-balance.vue';
import TokenDefinitions from '@/pages/tokens/my-tokens.vue';
import RegisterHTMAccount from '@/pages/tokens/register-account.vue';
import TokenDetail from '@/pages/tokens/token.vue';

export const routes = [
  { path: '/', component: Index },
  { path: '/sign/transaction', component: SignTransaction },
  { path: '/sign/message', component: SignMessage },
  { path: '/account/create', component: AccountCreate },
  { path: '/account/request', component: RequestCreate },
  { path: '/account/update', component: AccountUpdate },
  { path: '/tokens/register-account', component: RegisterHTMAccount },
  { path: '/tokens/create', component: CreateToken },
  { path: '/tokens/my-tokens', component: TokenDefinitions },
  { path: '/tokens/my-balance', component: AccountBalances },
  { path: '/tokens/list', component: TokensList },
  { path: '/tokens/token', component: TokenDetail },
  { path: '/automation/authorize', component: DappAuthorize }
];
