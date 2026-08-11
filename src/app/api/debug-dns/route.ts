import { NextResponse } from 'next/server'
import pg from 'pg'

export async function GET() {
  const results: Record<string, any> = {}
  const dbUrl = process.env.DATABASE_URL || ''
  
  // Mostrar estructura de la URL sin revelar todo
  const urlObj = new URL(dbUrl.replace('postgresql://', 'http://'))
  results.dbUser = urlObj.username
  results.dbPasswordLength = urlObj.password.length
  results.dbHost = urlObj.hostname
  results.dbPort = urlObj.port
  results.dbName = urlObj.pathname.replace('/', '')
  
  // Probar pooler con SSL y mostrar error detallado
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const refMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  const ref = refMatch ? refMatch[1] : ''
  
  if (ref && urlObj.password) {
    const poolerUrl = `postgresql://postgres.${ref}:${urlObj.password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    try {
      const client = new pg.Client({ 
        connectionString: poolerUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      })
      await client.connect()
      const res = await client.query('SELECT 1 as test')
      results.poolerTest = 'OK: ' + JSON.stringify(res.rows[0])
      await client.end()
    } catch (e: any) {
      results.poolerTest = 'ERROR: ' + (e.code || '') + ' - ' + (e.message || '').substring(0, 200)
    }
  }

  return NextResponse.json(results)
}