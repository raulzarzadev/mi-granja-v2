export default async function catchError<T>(
  promise: Promise<T>
): Promise<[Error, null] | [null, T]> {
  try {
    const data = await promise
    return [null, data]
  } catch (error) {
    return [error as Error, null]
  }
}
