<template>
  <div id="upload">
    <div class="file-field">
      <input type="file" @change="selectFile" />
      <el-button type="primary" @click="uploadChunk">上传</el-button>
      <el-button type="primary" @click="stopUploadChunk">暂停</el-button>
    </div>
    <h2>总进度</h2>
    <el-progress class="total" :percentage="totalPercent"></el-progress>
    <h2>生成hash</h2>
    <el-progress class="hash" :percentage="hashPercent"></el-progress>
    <h2>切片上传</h2>
    <div class="chunk" v-for="(item, idx) in processList" :key="idx">
      <div class="chunk-name">{{ item.name }}</div>
      <div class="proccess">
        <el-progress class="hash" :percentage="item.percent"></el-progress>
      </div>
    </div>
  </div>
</template>

<script>
import hashWoker from '../../plugin/hash.worker.js'

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
      totalPercent: 0,
      hash: '',
      processList: [],
      xhrList: [],
    }
  },
  methods: {
    request(method, url, data, process, isAbort = true) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        if (isAbort) this.xhrList.push(xhr)

        xhr.open(method, url, true)

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
              resolve(xhr.responseText)
            }
          }
        }
        xhr.upload.onprogress = process
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
      this.totalPercent = 0
      this.processList = []
      this.splitChunks(file)
    },
    splitChunks(file) {
      const totalSize = file.size
      const chunkLimitSize = this.chunkLimitSize
      const chunkList = this.chunkList

      for (let start = 0; start < totalSize; start += chunkLimitSize) {
        const end = start + chunkLimitSize
        chunkList.push(file.slice(start, end))

        const process = { name: 'chunk_' + parseInt(start / chunkLimitSize), percent: 0 }
        this.processList.push(process)
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
          let { percent, hash } = e.data
          percent = parseInt(percent)
          this.hashPercent = percent > 100 ? 100 : percent
          this.hash = hash
          this.totalPercent = Math.round(percent * 0.5)

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
      return this.request('post', 'http://localhost:8888/merge_chunks', formData, undefined, false)
    },
    async getChunkList() {
      let cacheChunkList = await this.request('get', 'http://localhost:8888/cache_chunk_list?hash=' + this.hash)
      const dirs = JSON.parse(cacheChunkList).dirs

      if (dirs) {
        const cacheIdxList = dirs.map((val, idx) => parseInt(val.split('_')[1]))
        this.chunkList.forEach((val, idx) => {
          const res = cacheIdxList.indexOf(idx) === -1

          if (!res) {
            this.processList[idx].percent = 100
            this.chunkList[idx] = null
          }
        })
      }
    },
    async uploadChunk() {
      await this.calcContentHash()

      await this.getChunkList()

      const chunkList = this.chunkList
      const vm = this

      const requestList = chunkList.map((val, idx) => {
        if (!val) return Promise.resolve()
        const formData = new FormData()
        formData.append('chunk', val)
        formData.append('idx', idx)
        formData.append('hash', this.hash)
        const process = this.processList[idx]
        process.name = this.hash + '_' + idx
        return this.request('post', 'http://localhost:8888/save_chunk', formData, (e) => {
          process.percent = Math.round((e.loaded / e.total) * 100)

          if (e.loaded == e.total) {
            vm.totalPercent += parseFloat((50 / chunkList.length).toFixed(2))
          }
        })
      })
      await Promise.all(requestList)
      console.log('notify')
      this.totalPercent = 99.5
      await this.notifyMergeChunks()
      this.totalPercent = 100
    },
    // 暂停上传
    stopUploadChunk() {
      const xhrList = this.xhrList

      xhrList.forEach((xhr, idx) => {
        xhr.abort()
      })
      
      this.xhrList = []
    },
  },
  created() {},
}
</script>
<style lang="less">
.file-field {
  position: sticky;
  top: 0;
  background-color: white;
  width: 100%;
  z-index: 12;
  padding: 10px 0;
}
.chunk {
  display: flex;

  .chunk-name {
    flex: 0 0 auto;
    margin-right: 20px;
  }

  .proccess {
    flex: 1 1 auto;
  }
}
</style>
