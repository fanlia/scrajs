
import { run } from '../src/scraper.js'

export const commandRun = async ({
  spiderPath,
  workerName,
  contextJson,
}) => {

  const customContext = JSON.parse(contextJson)

  spiderPath = spiderPath.endsWith('.js') ? spiderPath : `../spiders/${spiderPath}.js`
  const options = await import(spiderPath)

  const workers = workerName.length === 0 ? defaultWorkers : workerName

  await run({
    ...options,
    workers,
  })

  process.exit()
}

