import { NextResponse } from 'next/server'
import dns from 'dns/promises'

export async function GET() {
  const results: Record<string, any> = {}
  const dbUrl = process.env.DATABASE_URL || ''
  results.databaseUrlPrefix = dbUrl.substring(0, Math.min(80, dbUrl.length)) + '...'
  results.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set'
  results.hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  // Extraer host de DB
  try {
    const hostMatch = dbUrl.match(/@([^:]+)/)
    if (hostMatch) {
      const host = hostMatch[1]
      results.dbHost = host
      try {
        const addresses = await dns.resolve4(host)
        results.dbHostResolved = addresses
      } catch (e: any) {
        results.dbHostError = e.code || e.message
      }
    }
  } catch {}

  // Probar pooler alternativo
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const refMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  if (refMatch) {
    const ref = refMatch[1]
    const poolerHost = `aws-0-us-east-1.pooler.supabase.com`
    try {
      const addresses = await dns.resolve4(poolerHost)
      results.poolerHostResolved = { host: poolerHost, ips: addresses }
    } catch (e: any) {
      results.poolerHostError = { host: poolerHost, error: e.code || e.message }
    }
  }

  return NextResponse.json(results)
}