import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,query')
    const data = await res.json()
    if (data.status === 'success') {
      return NextResponse.json({
        country: data.country,
        countryCode: data.countryCode,
        ip: data.query,
      })
    }
    return NextResponse.json({ country: 'Desconocido', countryCode: 'XX' })
  } catch {
    return NextResponse.json({ country: 'Desconocido', countryCode: 'XX' })
  }
}