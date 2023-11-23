
import * as demo from '../spiders/demo.js'

import axios from 'axios'
import { runSpider } from '../src/request.js'

const url = 'http://localhost:4000'

const g = async (data) => {
  const res = await axios({
    method: 'post',
    url,
    data,
  })

  return res.data
}

export const run = async (options) => {
  return runSpider(options, g, {})
}

await run({
  ...demo,
  workers: [console.log],
})
