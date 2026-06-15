import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/electricity/settings?myob_error=${encodeURIComponent(error)}`, req.url))
  }
  if (!code) {
    return NextResponse.redirect(new URL('/electricity/settings?myob_error=no_code', req.url))
  }

  const cookieStore = await cookies()
  const raw = cookieStore.get('myob_oauth')?.value
  if (!raw) {
    return NextResponse.redirect(new URL('/electricity/settings?myob_error=session_expired', req.url))
  }

  let clientId: string, clientSecret: string, redirectUri: string
  try {
    ({ clientId, clientSecret, redirectUri } = JSON.parse(raw))
  } catch {
    return NextResponse.redirect(new URL('/electricity/settings?myob_error=invalid_session', req.url))
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    grant_type: 'authorization_code',
  })

  let tokenData: { access_token: string; refresh_token: string; expires_in: number }
  try {
    const tokenRes = await fetch('https://secure.myob.com/oauth2/v1/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      return NextResponse.redirect(new URL(`/electricity/settings?myob_error=${encodeURIComponent(errText.slice(0, 200))}`, req.url))
    }
    tokenData = await tokenRes.json()
  } catch (err) {
    return NextResponse.redirect(new URL(`/electricity/settings?myob_error=${encodeURIComponent(String(err))}`, req.url))
  }

  const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  cookieStore.delete('myob_oauth')

  const params = new URLSearchParams({
    myob_at: tokenData.access_token,
    myob_rt: tokenData.refresh_token,
    myob_exp: expiry,
  })

  return NextResponse.redirect(new URL(`/electricity/settings?${params.toString()}`, req.url))
}
