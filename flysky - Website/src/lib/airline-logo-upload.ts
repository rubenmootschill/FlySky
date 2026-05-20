import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function saveAirlineLogo(file: File): Promise<string> {
  if (file.size === 0) {
    throw new Error('Logo file is empty.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Logo file is too large. Maximum size is 2MB.')
  }

  const ext = MIME_TO_EXT[file.type]
  if (!ext) {
    throw new Error('Invalid logo format. Please upload PNG, JPG, or WEBP.')
  }

  const fileName = `${Date.now()}-${randomUUID()}.${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'airline-logos')
  const filePath = join(uploadDir, fileName)

  await mkdir(uploadDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  return `/uploads/airline-logos/${fileName}`
}
