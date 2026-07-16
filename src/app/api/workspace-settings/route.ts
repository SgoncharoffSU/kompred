import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, readDb, updateWorkspace, Workspace } from '@/lib/auth'

const VALID_DESIGNS = ['classic', 'modern', 'minimal']

export async function GET(req: NextRequest) {
  const token = req.cookies.get('bh_session')?.value || ''
  const user = getSessionUser(token)
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const workspace = readDb().workspaces.find((w) => w.id === user.workspace_id)

  const popupBlocks = workspace?.popup_blocks
    ? workspace.popup_blocks
    : workspace?.inclusion_sections?.length
      ? [{ id: 'inclusion-1', type: 'inclusion', title: 'Что входит в базовую стоимость', data: { sections: workspace.inclusion_sections } }]
      : []

  return NextResponse.json({
    ok: true,
    client_design: workspace?.client_design || 'classic',
    workspace_id: user.workspace_id,
    workspace_name: workspace?.name || '',
    logo_light_url: workspace?.logo_light_url || '',
    logo_dark_url: workspace?.logo_dark_url || '',
    page_title: workspace?.page_title || '',
    page_subtitle: workspace?.page_subtitle || '',
    cta_text: workspace?.cta_text || '',
    offer_note: workspace?.offer_note || '',
    group_texts: workspace?.group_texts || {},
    delivery_configs: workspace?.delivery_configs || {},
    popup_blocks: popupBlocks,
    contact_blocks: workspace?.contact_blocks ?? [],
    chat_widget_welcome: workspace?.chat_widget_welcome || '',
    chat_widget_delay_seconds: workspace?.chat_widget_delay_seconds ?? 8,
    chat_widget_animations: workspace?.chat_widget_animations ?? true,
    published_model_ids: workspace?.published_model_ids ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('bh_session')?.value || ''
  const user = getSessionUser(token)
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Partial<Workspace> = {}

  if (body.client_design !== undefined) {
    if (!VALID_DESIGNS.includes(body.client_design)) {
      return NextResponse.json({ ok: false, error: 'Invalid design' }, { status: 400 })
    }
    updates.client_design = body.client_design
  }
  if (typeof body.logo_light_url === 'string') updates.logo_light_url = body.logo_light_url
  if (typeof body.logo_dark_url === 'string') updates.logo_dark_url = body.logo_dark_url
  if (typeof body.workspace_name === 'string' && body.workspace_name.trim()) updates.name = body.workspace_name.trim()
  if (typeof body.page_title === 'string') updates.page_title = body.page_title
  if (typeof body.page_subtitle === 'string') updates.page_subtitle = body.page_subtitle
  if (typeof body.cta_text === 'string') updates.cta_text = body.cta_text
  if (typeof body.offer_note === 'string') updates.offer_note = body.offer_note
  if (body.group_texts !== undefined && typeof body.group_texts === 'object') updates.group_texts = body.group_texts
  if (body.delivery_configs !== undefined && typeof body.delivery_configs === 'object') updates.delivery_configs = body.delivery_configs
  if (Array.isArray(body.popup_blocks)) {
    updates.popup_blocks = body.popup_blocks
    updates.inclusion_sections = undefined
  }
  if (Array.isArray(body.contact_blocks)) updates.contact_blocks = body.contact_blocks
  if (typeof body.chat_widget_welcome === 'string') updates.chat_widget_welcome = body.chat_widget_welcome
  if (typeof body.chat_widget_delay_seconds === 'number') updates.chat_widget_delay_seconds = body.chat_widget_delay_seconds
  if (typeof body.chat_widget_animations === 'boolean') updates.chat_widget_animations = body.chat_widget_animations
  if (body.published_model_ids === null || Array.isArray(body.published_model_ids)) {
    updates.published_model_ids = body.published_model_ids
  }

  updateWorkspace(user.workspace_id, updates)
  return NextResponse.json({ ok: true })
}
