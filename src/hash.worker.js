import SparkMD5 from 'spark-md5'

addEventListener('message', (e) => {
  const chunkList = e.data
  postMessage(chunkList)
  let spark = new SparkMD5.ArrayBuffer()

  let idx = 0;
  let percent = 0;
  
  function loadNext() {
    const reader = new FileReader()
    reader.readAsArrayBuffer(chunkList[idx])

    reader.onload = function(e) {
      idx ++
      spark.append(e.target.result)
      if (idx < chunkList.length) {
        percent = Math.floor(idx / chunkList.length * 100)
        postMessage({
          percent
        })
        loadNext()
      } else {
        percent = 100
        postMessage({
          percent,
          hash: spark.end()
        })
        close()
      }
    }
  }

  loadNext()
})