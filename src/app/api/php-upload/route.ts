import { type NextRequest, NextResponse } from 'next/server'

const PHP_API_URL = process.env.PHP_API_URL || 'http://159.194.225.55:8080/api/index.php'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const res = await fetch(`${PHP_API_URL}?action=upload_image`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 502 })
  }
}
