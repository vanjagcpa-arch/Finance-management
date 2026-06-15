import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { clientId, clientSecret, redirectUri } = await req.json()
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'clientId, clientSecret, and redirectUri are required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set('myob_oauth', JSON.stringify({ clientId, clientSecret, redirectUri }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'CompanyFile offline_access',
  })

  const authUrl = `https://secure.myob.com/oauth2/account/authorize?${params.toString()}`
  return NextResponse.json({ authUrl })
}
