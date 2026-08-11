import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

export async function GET() {
  const supabase = getSupabaseClient()
  
  // Intentar seleccionar de verify_queue para ver si existe
  const { data, error } = await supabase.from('verify_queue').select('peerId').limit(1)
  
  // Tambien intentar insertar una fila de prueba
  const testResult = await supabase.from('verify_queue').upsert({
    peerId: '__test__',
    username: '__test__',
    gender: 'test',
    joinedAt: Date.now(),
    adminPeerId: null,
  }, { onConflict: 'peerId' })

  // Limpiar la fila de prueba
  if (!testResult.error) {
    await supabase.from('verify_queue').delete().eq('peerId', '__test__')
  }
  
  return NextResponse.json({
    selectError: error ? { code: error.code, message: error.message } : 'OK - tabla existe',
    upsertError: testResult.error ? { code: testResult.error.code, message: testResult.error.message } : 'OK - insert funciona',
    tableExists: !error,
    insertWorks: !testResult.error,
  })
}