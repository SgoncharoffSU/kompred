import { NextRequest, NextResponse } from 'next/server'
import { readDb } from '@/lib/auth'

const ACCOUNT_ID_PATTERN = /^(admin)?\d+$/i

export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get('account') || ''
  if (!account) {
    return NextResponse.json({
      php_workspace_id: 1,
      client_design: 'classic',
      workspace_name: '',
      logo_light_url: '',
      logo_dark_url: '',
      page_title: '',
      page_subtitle: '',
      cta_text: '',
      offer_note: '',
      group_texts: {},
      delivery_configs: {},
      popup_blocks: [],
      contact_blocks: [],
      chat_widget_welcome: '',
      chat_widget_delay_seconds: 8,
      chat_widget_animations: true,
      chat_widget_show_from: '',
      chat_widget_show_until: '',
      published_model_ids: null,
    })
  }

  const workspace = readDb().workspaces.find(
    (w) => w.id === account || w.id === `admin${account}` || w.id.endsWith(account)
  )

  const rawName = workspace?.name || ''
  const workspaceName = rawName && !ACCOUNT_ID_PATTERN.test(rawName.replace(/\s/g, '')) ? rawName : ''

  const popupBlocks = workspace?.popup_blocks
    ? workspace.popup_blocks
    : workspace?.inclusion_sections?.length
      ? [{ id: 'inclusion-1', type: 'inclusion', title: 'Что входит в стоимость базовой комплектации', data: { sections: workspace.inclusion_sections } }]
      : []

  return NextResponse.json({
    php_workspace_id: workspace?.php_workspace_id || 1,
    client_design: workspace?.client_design || 'classic',
    workspace_name: workspaceName,
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
    chat_widget_show_from: workspace?.chat_widget_show_from || '',
    chat_widget_show_until: workspace?.chat_widget_show_until || '',
    published_model_ids: workspace?.published_model_ids ?? null,
  })
}
