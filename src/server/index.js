const express = require('express')
const fs = require('fs')
const Multiparty = require('multiparty')
const path = require('path')
const { Z_FIXED } = require('zlib')

const app = express()
const port = 8888

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-control-Allow-Headers', '*')
  next()
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

app.get('/cache_chunk_list', (req, res) => {
  const hash = req.query.hash
  let ans
  if (fs.existsSync(hash)) {
    ans = {dirs: fs.readdirSync(hash)}
  } else {
    ans = {}
  }

  res.send(JSON.stringify(ans))
})

app.post('/merge_chunks', (req, res) => {
  const form = new Multiparty.Form()
  form.parse(req, async function (err, fields, files) {
    if (err) return
    const chunkDir = fields.hash[0]
    const targetName = fields.filename[0]
    const size = fields.size[0]
    if (!chunkDir) return

    if (fs.existsSync(chunkDir)) {
      const chunkPaths = fs.readdirSync(chunkDir)
      console.log(chunkPaths);
      // chunkPaths.sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))

      await Promise.all(
        chunkPaths.map((chunkPath, idx) => {
          return pipeStream(
            `${chunkDir}/${chunkPath}`,
            fs.createWriteStream(targetName, {
              start: idx * size,
              end: (idx + 1) * size,
            })
          )
        })
      )
    }
  })
  res.end()
})

app.post('/save_chunk', (req, res) => {
  const form = new Multiparty.Form()
  form.uploadDir = 'tmp'
  form.parse(req, function (err, fields, files) {
    // console.log(err);
    if (err) return
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
  })
  res.send(req.body)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
