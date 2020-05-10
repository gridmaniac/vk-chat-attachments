const axios = require('axios')
const easyvk = require("easyvk")
const { createWriteStream, existsSync, mkdirSync } = require('fs')
const moment = require('moment')

async function delay(ms) {
    await new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
    const rootDir = './photos'
    if (!existsSync(rootDir))
        await mkdirSync(rootDir)

    const app = await easyvk({
        username: process.env.VK_USERNAME,
        password: process.env.VK_PASSWORD,
        save: true
    })

    const chatId = process.env.VK_CHAT_ID
    const photoDir = `./photos/${chatId}`

    if (!existsSync(photoDir))
        mkdirSync(photoDir)

    const photos = await getPhotos(chatId, '', [], app)
    const sizes = [ 's', 'm', 'x', 'o', 'p', 'q', 'r', 'y', 'z', 'w'].reverse()

    for (let x of photos) {
        const s = sizes.findIndex(size => x.sizes.map(x => x.type).indexOf(size) !== -1)
        const index = x.sizes.findIndex(x => x.type == sizes[s])
        const { url } = x.sizes[index]
        const date = moment.unix(x.date).format('YY.MM.DD HH.MM.SS')
        const name = `${date} - ${x.id}`
            
        await delay(300)
        await downloadImage(url, name, chatId)
        console.log(`Downloaded ${photos.indexOf(x)} of ${photos.length - 1}...`)
    }
}

async function downloadImage (url, name, toDir) {  
    const dove = `${__dirname}/photos/${toDir}/${name}.jpg`
    const writer = createWriteStream(dove)
  
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })
  
    response.data.pipe(writer)
  
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }

async function getPhotos(chatId, pointer, list, vk) {
    const { items, next_from } = await vk.call('messages.getHistoryAttachments', {
        peer_id: chatId,
        media_type: 'photo',
        count: 200,
        start_from: pointer
    })
    
    const photos = items.map(x => x.attachment.photo)
    const newList = [ ...list, ...photos ]

    if (next_from == '' || next_from == null)
        return newList

    await delay(2000)
    console.log('Fetching: ', next_from)
    return await getPhotos(chatId, next_from, newList, vk)
}

main()