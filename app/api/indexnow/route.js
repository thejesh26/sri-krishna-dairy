export async function POST(request) {
  const urls = [
    'https://sri-krishna-dairy.vercel.app/',
    'https://sri-krishna-dairy.vercel.app/login',
    'https://sri-krishna-dairy.vercel.app/signup',
  ]

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'sri-krishna-dairy.vercel.app',
        key: 'b1e811da04357018ba7e207f1bb4fc6d',
        keyLocation: 'https://sri-krishna-dairy.vercel.app/b1e811da04357018ba7e207f1bb4fc6d.txt',
        urlList: urls
      })
    })

    return Response.json({ success: true, status: response.status })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}