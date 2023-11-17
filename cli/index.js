
import { program } from 'commander'

import { commandRun } from './run.js'
import { commandAPI } from './api.js'

program
  .name('scrajs')

program
  .command('run')
  .description('run to crawl')
  .option('-w, --worker-name <name...>', 'worker names (choices: "log", "json", "csv")', [])
  .requiredOption('-s, --spider-path <path>', 'spider path')
  .action(commandRun)

program
  .command('api')
  .description('api to crawl')
  .action(commandAPI)

program.parse()
