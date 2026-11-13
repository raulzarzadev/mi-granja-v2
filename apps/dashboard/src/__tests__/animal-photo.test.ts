import { compressAnimalPhoto, MAX_ANIMAL_PHOTO_INPUT_BYTES } from '@/lib/animal-photo'

jest.mock('@/lib/firebase', () => ({ auth: {}, storage: {} }))
const mockDraw = jest.fn()
const mockClose = jest.fn()
let captured: Array<{ width: number; height: number }> = []
beforeEach(() => {
  jest.clearAllMocks()
  captured = []
  global.createImageBitmap = jest
    .fn()
    .mockResolvedValue({ width: 6000, height: 4000, close: mockClose })
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ fillRect: jest.fn(), drawImage: mockDraw } as any)
  jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
    type,
  ) {
    captured.push({ width: this.width, height: this.height })
    callback(new Blob([new Uint8Array(100000)], { type }))
  })
})
afterEach(() => jest.restoreAllMocks())
it('reduce una foto grande conservando proporción y genera una imagen ligera compatible', async () => {
  const output = await compressAnimalPhoto(new File(['source'], 'foto.JPG', { type: 'image/jpeg' }))
  expect(output.type).toBe('image/webp')
  expect(output.size).toBeLessThanOrEqual(450 * 1024)
  expect(captured[0]).toEqual({ width: 1920, height: 1280 })
  expect(mockClose).toHaveBeenCalled()
})
it('no agranda fotos pequeñas y usa JPEG si el navegador no codifica WebP', async () => {
  jest
    .mocked(createImageBitmap)
    .mockResolvedValue({ width: 300, height: 200, close: mockClose } as any)
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback, type) =>
      callback(new Blob(['image'], { type: type === 'image/webp' ? 'image/png' : type })),
    )
  const output = await compressAnimalPhoto(new File(['source'], 'foto.png'))
  expect(output.type).toBe('image/jpeg')
  expect(output.name).toBe('foto.jpg')
})
it('rechaza originales demasiado grandes antes de decodificar', async () => {
  const file = new File(['image'], 'huge.jpg')
  Object.defineProperty(file, 'size', { value: MAX_ANIMAL_PHOTO_INPUT_BYTES + 1 })
  await expect(compressAnimalPhoto(file)).rejects.toThrow('50 MB')
  expect(createImageBitmap).not.toHaveBeenCalled()
})
it('reduce dimensiones si ajustar calidad no basta para alcanzar el tamaño objetivo', async () => {
  let calls = 0
  jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
    type,
  ) {
    calls += 1
    captured.push({ width: this.width, height: this.height })
    callback(new Blob([new Uint8Array(calls <= 3 ? 600000 : 200000)], { type }))
  })
  const output = await compressAnimalPhoto(new File(['source'], 'large.jpg'))
  expect(output.size).toBeLessThanOrEqual(450 * 1024)
  expect(captured.at(-1)).toEqual({ width: 1536, height: 1024 })
})
