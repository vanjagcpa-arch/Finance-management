import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export interface MYOBCompanyFile {
  Id: string
  Name: string
  Uri: string
}

export async function GET(req: NextRequest) {
  const accessToken = req.nextUrl.searchParams.get('accessToken')
  if (!accessToken) {
    return NextResponse.json({ error: 'accessToken required' }, { status: 400 })
  }

  try {
    const res = await fetch('https://api.myob.com/accountright/', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-myobapi-version': 'v2',
      },
    })
    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `MYOB error ${res.status}: ${errText.slice(0, 300)}` }, { status: res.status })
    }
    const files: MYOBCompanyFile[] = await res.json()
    return NextResponse.json({ files })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
