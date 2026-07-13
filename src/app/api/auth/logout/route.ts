import { NextRequest, NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('bh_session')?.value
  if (token) destroySession(token)
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('bh_session')
  return res
}
