import { createPinia } from 'pinia';
import { createApp } from 'vue';
import './style.css';
import { createWebHistory, createRouter } from 'vue-router';

import App from './App.vue';
import { routes } from './utils/router';

const pinia = createPinia();
const router = createRouter({
  routes: routes,
  history: createWebHistory()
});

createApp(App).use(pinia).use(router).mount('#app');
