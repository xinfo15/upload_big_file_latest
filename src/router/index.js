import Vue from 'vue'
import VueRouter from 'vue-router'
import Upload from '../views/upload/upload.vue'
import Login from '../views/login/login.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    component: Login
  },
  {
    path: '/upload',
    component: Upload
  }
]

const router = new VueRouter({
  routes
})

export default router