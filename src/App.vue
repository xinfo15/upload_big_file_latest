<template>
  <div id="app">
    <div class="file-field">
      <input type="file" @change="selectFile" />
      <el-button type="primary" @click="uploadChunk">上传</el-button>
    </div>
    <h2>生成hash</h2>
    <el-progress class="hash" :percentage="hashPercent"></el-progress>
    <h2>切片上传</h2>
    <div class="chunk" v-for="(item, idx) in processList" :key="idx">
      <div class="chunk-name">{{item.name}} </div>
      <el-progress class="hash"></el-progress>
    </div>
  </div>
</template>

<script>
import hashWoker from './hash.worker.js'

export default {
  name: 'App',
  data() {
    return {
      // 2M
      chunkLimitSize: 2 * 1024 * 1024,
      chunkList: [],
      file: null,
      worker: null,
      hashPercent: 0,
      hash: '',
      processList: [],
    }
  },
  methods: {
    request(method, url, data, process) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url, true)

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
              resolve(xhr.responseText)
            }
          }
        }
        xhr.addEventListener('progress', (e) => {
          console.log(e);
        })
        xhr.send(data)
      })
    },
    selectFile(e) {
      const [file] = e.target.files
      if (!file) return

      this.file = file
      this.chunkList = []
      this.hashPercent = 0
      this.hash = ''
      this.splitChunks(file)
    },
    splitChunks(file) {
      const totalSize = file.size
      const chunkLimitSize = this.chunkLimitSize
      const chunkList = this.chunkList

      for (let start = 0; start < totalSize; start += chunkLimitSize) {
        const end = start + chunkLimitSize
        chunkList.push(file.slice(start, end))
      }
    },
    calcContentHash() {
      if (this.hash) return
      return new Promise((resolve, reject) => {
        this.worker = new hashWoker()
        const worker = this.worker

        // console.log(worker);
        const chunkList = this.chunkList
        worker.postMessage(chunkList)
        worker.onmessage = (e) => {
          const { percent, hash } = e.data
          this.hashPercent = percent
          this.hash = hash

          // console.log(percent, hash);
          if (hash) {
            resolve()
          }
        }
      })
    },
    // 通知服务器合并chunks
    notifyMergeChunks() {
      const formData = new FormData()
      formData.append('hash', this.hash)
      formData.append('filename', this.file.name)
      formData.append('limitSize', this.chunkLimitSize)
      return this.request('post', 'http://localhost:8888/merge_chunks', formData)
    },
    async getChunkList() {
      let cacheChunkList = await this.request('get', 'http://localhost:8888/cache_chunk_list?hash=' + this.hash)
      const dirs = JSON.parse(cacheChunkList).dirs

      if (dirs) {
        const cacheIdxList = dirs.map((val, idx) => parseInt(val.split('_')[1]))
        this.chunkList = this.chunkList.filter((val, idx) => cacheIdxList.indexOf(idx) === -1)
      }
    },
    async uploadChunk() {
      await this.calcContentHash()

      await this.getChunkList()
      console.log(chunkList)
      const chunkList = this.chunkList

      const requestList = chunkList.map((val, idx) => {
        const formData = new FormData()
        formData.append('chunk', val)
        formData.append('idx', idx)
        formData.append('hash', this.hash)
        return this.request('post', 'http://localhost:8888/save_chunk', formData)
      })
      await Promise.all(requestList)
      console.log('notify')
      await this.notifyMergeChunks()
    },
  },
  created() {},
}
</script>
<style lang="less"></style>
