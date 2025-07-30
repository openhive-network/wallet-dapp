import AccountCreate from '@/pages/account/create.vue';
import RequestCreate from '@/pages/account/request.vue';
import AccountUpdate from '@/pages/account/update.vue';
import Index from '@/pages/index.vue';
import SignMessage from '@/pages/sign/message.vue';
import SignTransaction from '@/pages/sign/transaction.vue';

export const routes = [
  { path: '/', component: Index },
  { path: '/sign/transaction', component: SignTransaction },
  { path: '/sign/message', component: SignMessage },
  { path: '/account/create', component: AccountCreate },
  { path: '/account/request', component: RequestCreate },
  { path: '/account/update', component: AccountUpdate }
];
