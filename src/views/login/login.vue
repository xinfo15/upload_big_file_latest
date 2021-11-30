<template>
  <div class="login">
    <el-button @click="login">github登陆</el-button>
  </div>
</template>

<script>
export default {
  methods: {
    request({
      method,
      url,
      data
    }) {
      const baseUrl = 'http://localhost:8888'
      url = baseUrl + url
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url, false)
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
              resolve(xhr.responseText)
            }
          }
        }
        xhr.send(data)
      })
    },
    async login() {
      const res = await this.request({
        method: 'post',
        url: '/github/login'
      })

      console.log(res);
    }
  }
}
</script>

<style>

</style>