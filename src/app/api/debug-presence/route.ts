import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

// Endpoint de diagnostico para probar que la tabla announcement funciona
// con IDs personalizados (prefijos ol_, mm_, vq_)
export async function GET() {
  const results: any = { steps: [] }
  const supabase = getSupabaseClient()

  try {
    // Paso 1: Probar lectura de la tabla
    const { data: allData, error: readErr, count } = await supabase
      .from('announcement')
      .select('id, text, active, createdAt', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .limit(10)

    results.steps.push({
      step: 'read_all',
      success: !readErr,
      count,
      sample: (allData || []).map((d: any) => ({ id: d.id, active: d.active, textLen: d.text?.length })),
      error: readErr?.message
    })

    // Paso 2: Probar insert con ID personalizado
    const testId = 'test_' + Date.now()
    const { data: insertData, error: insertErr } = await supabase
      .from('announcement')
      .insert({
        id: testId,
        text: JSON.stringify({ test: true, ts: Date.now() }),
        active: true,
        createdAt: new Date().toISOString(),
      })
      .select('id, text, createdAt')
      .single()

    results.steps.push({
      step: 'insert_custom_id',
      success: !insertErr,
      insertedId: testId,
      data: insertData,
      error: insertErr?.message
    })

    // Paso 3: Probar LIKE query
    const { data: likeData, error: likeErr, count: likeCount } = await supabase
      .from('announcement')
      .select('id', { count: 'exact', head: true })
      .like('id', 'ol_%')

    results.steps.push({
      step: 'like_ol_prefix',
      success: !likeErr,
      count: likeCount,
      error: likeErr?.message
    })

    // Paso 4: Contar matchmaking entries
    const { count: mmCount, error: mmErr } = await supabase
      .from('announcement')
      .select('*', { count: 'exact', head: true })
      .like('id', 'mm_%')

    results.steps.push({
      step: 'count_mm_prefix',
      success: !mmErr,
      count: mmCount,
      error: mmErr?.message
    })

    // Paso 5: Contar verify queue entries
    const { count: vqCount, error: vqErr } = await supabase
      .from('announcement')
      .select('*', { count: 'exact', head: true })
      .like('id', 'vq_%')

    results.steps.push({
      step: 'count_vq_prefix',
      success: !vqErr,
      count: vqCount,
      error: vqErr?.message
    })

    // Paso 6: Limpiar test entry
    if (!insertErr) {
      await supabase.from('announcement').delete().eq('id', testId)
      results.steps.push({ step: 'cleanup', success: true })
    }

    // Paso 7: Probar upsert
    const upsertId = 'test_upsert_' + Date.now()
    const { error: upsertErr } = await supabase
      .from('announcement')
      .upsert({
        id: upsertId,
        text: 'upsert_test',
        active: true,
        createdAt: new Date().toISOString(),
      }, { onConflict: 'id' })

    results.steps.push({
      step: 'upsert_custom_id',
      success: !upsertErr,
      error: upsertErr?.message
    })

    // Limpiar upsert test
    if (!upsertErr) {
      await supabase.from('announcement').delete().eq('id', upsertId)
    }

    results.ok = true
  } catch (e) {
    results.ok = false
    results.error = String(e)
  }

  return NextResponse.json(results)
}
