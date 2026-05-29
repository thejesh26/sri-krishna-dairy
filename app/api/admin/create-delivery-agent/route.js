import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const { full_name, phone, email, password, address, dl_number, bike_number, photo_url, document_url } = await request.json()
    if (!full_name || !phone || !email || !password) {
      return Response.json({ error: 'full_name, phone, email, password are required' }, { status: 400 })
    }

    // Create auth user using service role
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, is_delivery: true },
    })
    if (createError) {
      return Response.json({ error: createError.message }, { status: 400 })
    }
    const userId = authData.user.id

    // Insert profile row
    await supabaseAdmin.from('profiles').insert({
      id: userId,
      full_name,
      phone,
      is_delivery: true,
      is_admin: false,
    })

    // Insert delivery_agents row
    const agentRow = {
      user_id: userId,
      full_name,
      phone,
      email,
      is_active: true,
      otp_verified: false,
    }
    if (address) agentRow.address = address
    if (dl_number) agentRow.dl_number = dl_number
    if (bike_number) agentRow.bike_number = bike_number
    if (photo_url) agentRow.photo_url = photo_url
    if (document_url) agentRow.document_url = document_url

    const { data: agentRecord } = await supabaseAdmin.from('delivery_agents').insert(agentRow).select('id').single()

    // Send WhatsApp welcome
    await sendWhatsAppMessage(
      phone,
      `Hi ${full_name}! You have been added as a delivery agent for Sri Krishnaa Dairy. Login at srikrishnaadairy.in/delivery with your phone number. Welcome to the team! 🥛`
    ).catch(() => {})

    return Response.json({ success: true, user_id: userId, agent_id: agentRecord?.id })
  } catch (error) {
    console.error('Create delivery agent error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
