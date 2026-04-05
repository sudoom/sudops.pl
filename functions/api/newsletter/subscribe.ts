// Cloudflare Pages Function - Newsletter Subscription
// Uses Brevo's contacts API to add subscribers directly

interface Env {
  BREVO_API_KEY: string
  BREVO_LIST_ID: string
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const brevoApiKey = env.BREVO_API_KEY
    const brevoListId = env.BREVO_LIST_ID

    if (!brevoApiKey) {
      console.error('BREVO_API_KEY is not configured')
      return new Response(
        JSON.stringify({ error: 'Newsletter service is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const listId = brevoListId ? parseInt(brevoListId, 10) : null

    if (!listId || isNaN(listId)) {
      return new Response(
        JSON.stringify({ error: 'Newsletter list is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Add contact directly via Brevo contacts API
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        listIds: [listId],
        updateEnabled: true,
      }),
    })

    if (!brevoResponse.ok) {
      // Already subscribed
      if (brevoResponse.status === 409) {
        return new Response(
          JSON.stringify({
            message: 'You are already subscribed!',
            success: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      let brevoData: any = {}
      try {
        brevoData = await brevoResponse.json()
      } catch (_) {}

      const errorMessage = brevoData?.message || 'Failed to subscribe'
      console.error('Brevo API error:', {
        status: brevoResponse.status,
        data: brevoData,
      })

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: brevoResponse.status || 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        message: 'Successfully subscribed!',
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
