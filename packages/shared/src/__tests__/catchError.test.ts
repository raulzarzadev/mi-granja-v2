import catchError from '../lib/catchError'

describe('catchError', () => {
  it('should return [null, data] on success', async () => {
    const [error, data] = await catchError(Promise.resolve('hello'))
    expect(error).toBeNull()
    expect(data).toBe('hello')
  })

  it('should return [Error, null] on failure', async () => {
    const [error, data] = await catchError(Promise.reject(new Error('fail')))
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toBe('fail')
    expect(data).toBeNull()
  })

  it('should handle resolved objects', async () => {
    const obj = { id: 1, name: 'test' }
    const [error, data] = await catchError(Promise.resolve(obj))
    expect(error).toBeNull()
    expect(data).toEqual(obj)
  })

  it('should handle resolved null', async () => {
    const [error, data] = await catchError(Promise.resolve(null))
    expect(error).toBeNull()
    expect(data).toBeNull()
  })
})
