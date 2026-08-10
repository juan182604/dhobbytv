import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('DATABASE') || k.includes('NEXT_PUBLIC')),
  })
}
