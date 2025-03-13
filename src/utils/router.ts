import Index from "@/pages/index.vue";
import SignTransaction from "@/pages/sign/transaction.vue";
import SignMessage from "@/pages/sign/message.vue";
import AccountCreate from "@/pages/account/create.vue";
import AccountUpdate from "@/pages/account/update.vue";

export const routes = [
  { path: '/', component: Index },
  { path: '/sign/transaction', component: SignTransaction },
  { path: '/sign/message', component: SignMessage },
  { path: '/account/create', component: AccountCreate },
  { path: '/account/update', component: AccountUpdate }
];
