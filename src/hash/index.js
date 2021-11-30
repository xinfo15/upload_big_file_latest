addEventListener('message', (e) => {
  const chunkList = e.data

  postMessage(chunkList)
})