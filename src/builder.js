
import { stringify } from 'csv-stringify'

export const jsonify = (options = {}) => {
  const json = options.to || process.stdout

  return async ({ event, data }) => {
    if (event === 'start') {
      json.write('[\n')
    } else if (event === 'item') {
      const line = JSON.stringify(data.data)
      json.write(line)
    } else if (event === 'end') {
      json.write('\n]\n')
    }
  }
}

export const csvify = (options = {}) => {

  const to = options.to || process.stdout

  const csv = stringify({
    ...options.csv,
    header: true,
  })

  csv.pipe(to)

  return async ({ event, data }) => {
    if (event === 'start') {
    } else if (event === 'item') {
      csv.write(data.data)
    } else if (event === 'end') {
      csv.end()
    }
  }
}
