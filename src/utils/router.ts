import type { Component } from 'vue';

import AppSidebar from '@/components/navigation/AppSidebar.vue';
import AccountCreate from '@/pages/account/create.vue';
import RequestCreate from '@/pages/account/request.vue';
import AccountUpdate from '@/pages/account/update.vue';
import DappAuthorize from '@/pages/automation/authorize.vue';
import Index from '@/pages/index.vue';
import SignMessage from '@/pages/sign/message.vue';
import SignTransaction from '@/pages/sign/transaction.vue';
import CreateToken from '@/pages/tokens/create.vue';
import EditToken from '@/pages/tokens/edit.vue';
import TokensList from '@/pages/tokens/list.vue';
import AccountBalances from '@/pages/tokens/my-balance.vue';
import TokenDefinitions from '@/pages/tokens/my-tokens.vue';
import RegisterHTMAccount from '@/pages/tokens/register-account.vue';
import TokenDetail from '@/pages/tokens/token.vue';

const standardPath = (path: string, component: Component) => ({ path, component });

const tokensPath = (path: string, component: Component) => ({
  path,
  components: {
    default: component,
    sidebar: AppSidebar
  },
  props: {
    sidebar: { forceTokenView: true }
  }
});

export const routes = [
  standardPath('/', Index),
  standardPath('/sign/transaction', SignTransaction),
  standardPath('/sign/message', SignMessage),
  standardPath('/account/create', AccountCreate),
  standardPath('/account/request', RequestCreate),
  standardPath('/account/update', AccountUpdate),
  standardPath('/automation/authorize', DappAuthorize),
  tokensPath('/tokens/register-account', RegisterHTMAccount),
  tokensPath('/tokens/create', CreateToken),
  tokensPath('/tokens/edit', EditToken),
  tokensPath('/tokens/my-tokens', TokenDefinitions),
  tokensPath('/tokens/my-balance', AccountBalances),
  tokensPath('/tokens/list', TokensList),
  tokensPath('/tokens/token', TokenDetail)
];
