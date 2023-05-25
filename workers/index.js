
export const getWorker = async (name) => {
  if (typeof name === 'function') return name
  const path = name.endsWith('.js') ? name : `./${name}.js`
  const { worker } = await import(path)
  return worker
}

export const getWorkers = async (workers = []) => {
  return Promise.all(workers.map(getWorker))
}
