const { default: axios } = require('axios')
const express = require('express')
const fs = require('fs')
const Multiparty = require('multiparty')
const path = require('path')

const app = express()
const port = 8888
// cors
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-control-Allow-Headers', '*')
  next()
})
// 教程
//https://blog.csdn.net/weixin_41545048/article/details/102978945
app.post('/github/login', (req, res) => {})

app.get('/github/callback', async (req, res) => {
  // console.log(req.query)
  const code = req.query.code

  const ans = await axios
    .post('https://github.com/login/oauth/access_token', {
      client_id: 'Iv1.40e24393ef848b3f',
      client_secret: 'b1466de25753a18019cbae6bc8d726fa8d56a065',
      code,
    })
    .catch((err) => console.log('error : ', err))

  const querys = ans.data.split('&')
  const queryObj = {}
  querys.forEach((val, idx) => {
    const tmp = val.split('=')
    queryObj[tmp[0]] = tmp[1]
  })

  console.log(queryObj.access_token)
  const accessToken = queryObj.access_token
  
  res.redirect(302, 'http://localhost:8080/#/?ac=' + accessToken);
})

app.post('/github/webhook', (req, res) => {})

app.get('/cache_chunk_list', (req, res) => {
  const hash = req.query.hash
  let ans
  if (fs.existsSync(hash)) {
    ans = { dirs: fs.readdirSync(hash) }
  } else {
    ans = {}
  }

  res.send(JSON.stringify(ans))
})

const pipeStream = (path, writeStream) =>
  new Promise((resolve) => {
    const readStream = fs.createReadStream(path)
    readStream.on('end', () => {
      // fs.unlinkSync(path)
      resolve()
    })
    readStream.pipe(writeStream)
  })

app.post('/merge_chunks', (req, res) => {
  const form = new Multiparty.Form()
  form.parse(req, async function (err, fields, files) {
    if (err) return
    const chunkDir = fields.hash[0]
    const targetName = fields.filename[0]
    const limitSize = fields.limitSize[0]
    if (!chunkDir) return

    if (fs.existsSync(chunkDir)) {
      let chunkPaths = fs.readdirSync(chunkDir)
      chunkPaths.sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))

      await Promise.all(
        chunkPaths.map((chunkPath, idx) =>
          pipeStream(
            `${chunkDir}/${chunkPath}`,
            fs.createWriteStream(targetName, {
              start: idx * limitSize,
              end: (idx + 1) * limitSize,
            })
          )
        )
      )

      // 删除文件和目录
      chunkPaths.forEach((chunkPath, idx) => {
        fs.unlinkSync(path.resolve(__dirname, chunkDir, chunkPath))
      })
      fs.rmdirSync(chunkDir)
    }
  })
  res.end()
})

app.post('/save_chunk', (req, res) => {
  const form = new Multiparty.Form()
  form.uploadDir = 'tmp'
  form.parse(req, function (err, fields, files) {
    // console.log(err);
    if (err) {
      res.end('失败！！！')
      return
    }
    const idx = fields.idx[0]
    const hash = fields.hash[0]
    const chunk = files.chunk[0]

    if (!chunk || !idx || !hash) return

    const dir = hash
    const filename = hash + '_' + idx

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    fs.renameSync(chunk.path, path.resolve(dir, filename))

    res.end()
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
