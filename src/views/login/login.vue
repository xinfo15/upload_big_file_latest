<template>
  <div class="login">
    <el-button @click="login">github登陆</el-button>
  </div>
</template>

<script>
export default {
  methods: {
    request({ method, url, data }) {
      const baseUrl = 'http://localhost:8888'
      url = baseUrl + url
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url, false)
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
              resolve(xhr.responseText)
            }
          }
        }
        xhr.send(data)
      })
    },
    login() {
      location.href = 'https://github.com/login/oauth/authorize?client_id=Iv1.40e24393ef848b3f&redirect_uri=http://localhost:8888/github/callback'
    },
    getToken() {
      return localStorage.getItem('access_token')
    },
    async getUserinfo() {
      const accessToken = this.getToken()
      if (!accessToken) return

      let { data } = await this.$axios.get('https://api.github.com/user', {
        headers: {
          // accept: 'application/json',
          Authorization: `token ${accessToken}`,
        },
      })
      localStorage.setItem('userinfo', JSON.stringify(data))
      console.log(data);
    },
  },
  created() {
    const accessToken = this.$route.query.ac
    if (accessToken) {
      localStorage.setItem('access_token', accessToken)
      this.getUserinfo()
    }
  },
}
</script>

<style></style>
