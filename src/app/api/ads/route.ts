import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')
    const context = searchParams.get('context') // 'login' or 'main'

    let query = supabase.from('ad').select('*').eq('active', true).order('createdAt', { ascending: false })

    if (position) query = query.eq('position', position)
    if (context === 'login') query = query.eq('showOnLogin', true)
    else if (context === 'main') query = query.eq('showOnMain', true)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ads: data || [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    const { action, id, title, imageUrl, linkUrl, htmlContent, position, active, showOnLogin, showOnMain } = body

    if (action === 'delete') {
      const { error } = await supabase.from('ad').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'toggle') {
      const { data: current } = await supabase.from('ad').select('active').eq('id', id).single()
      if (!current) return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 })
      const { error } = await supabase.from('ad').update({ active: !current.active, "updatedAt": new Date().toISOString() }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'update') {
      const updates: any = { "updatedAt": new Date().toISOString() }
      if (title !== undefined) updates.title = title
      if (imageUrl !== undefined) updates.imageUrl = imageUrl || null
      if (linkUrl !== undefined) updates.linkUrl = linkUrl || null
      if (htmlContent !== undefined) updates.htmlContent = htmlContent || null
      if (position !== undefined) updates.position = position
      if (active !== undefined) updates.active = active
      if (showOnLogin !== undefined) updates.showOnLogin = showOnLogin
      if (showOnMain !== undefined) updates.showOnMain = showOnMain
      const { error } = await supabase.from('ad').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    // Create new ad
    if (!title || !position) return NextResponse.json({ error: 'Falta título y posición' }, { status: 400 })
    const { error } = await supabase.from('ad').insert({
      title, imageUrl: imageUrl || null, linkUrl: linkUrl || null,
      htmlContent: htmlContent || null, position,
      showOnLogin: showOnLogin ?? false, showOnMain: showOnMain ?? true,
      active: active ?? true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
