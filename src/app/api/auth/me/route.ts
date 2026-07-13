import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, getSubscriptionStatus } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('bh_session')?.value
  const user = token ? getSessionUser(token) : null
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const subscription = getSubscriptionStatus(user)

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      workspace_id: user.workspace_id,
      workspace_name: user.workspace.name,
      use_php: user.workspace.use_php,
    },
    subscription: {
      status: subscription.status,
      daysLeft: subscription.daysLeft,
      isPaid: subscription.isPaid,
      trialExpiresAt: user.trial_expires_at ?? null,
      paidUntil: user.paid_until ?? null,
    },
  })
}
