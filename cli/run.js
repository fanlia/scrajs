
import { run } from '../src/scraper.js'

export const commandRun = async ({
  spiderPath,
  workerName,
  contextJson,
}) => {

  const customContext = JSON.parse(contextJson)

  spiderPath = spiderPath.endsWith('.js') ? spiderPath : `../spiders/${spiderPath}.js`
  const { context: defaultContext, workers: defaultWorkers, spiders } = await import(spiderPath)

  const context = {
    ...defaultContext,
    ...customContext,
  }

  const workers = workerName.length === 0 ? defaultWorkers : workerName

  await run({
    context,
    spiders,
    workers,
  })

  process.exit()
}

