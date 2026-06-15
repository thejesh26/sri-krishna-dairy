import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { sendReferralCompletedEmail } from '../../../lib/email'
import { notifyReferralCompleted } from '../../../lib/whatsapp'

const REFERRAL_POINTS = 100
const REFERRAL_DAYS_REQUIRED = 30

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { data: pendingReferrals } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_id, referred_id, subscription_days_count, profiles!referrals_referred_id_fkey(full_name)')
      .eq('status', 'pending')

    if (!pendingReferrals || pendingReferrals.length === 0) {
      return NextResponse.json({ success: true, checked: 0, activated: 0, message: 'No pending referrals found.' })
    }

    let activated = 0
    let updated = 0

    for (const ref of pendingReferrals) {
      // Count actual delivered subscription days for the referred user
      const { count } = await supabaseAdmin
        .from('subscription_deliveries')
        .select('id', { count: 'exact' })
        .eq('user_id', ref.referred_id)
        .eq('not_delivered', false)

      const deliveredDays = count || 0

      if (deliveredDays >= REFERRAL_DAYS_REQUIRED) {
        // Award points to both referrer and referred
        const [{ data: referrerProf }, { data: referrerAuth }, { data: referredProf }, { data: referredAuth }] = await Promise.all([
          supabaseAdmin.from('profiles').select('loyalty_points, full_name, phone, email').eq('id', ref.referrer_id).single(),
          supabaseAdmin.auth.admin.getUserById(ref.referrer_id),
          supabaseAdmin.from('profiles').select('loyalty_points, full_name, phone, email').eq('id', ref.referred_id).single(),
          supabaseAdmin.auth.admin.getUserById(ref.referred_id),
        ])

        const referredName = ref.profiles?.full_name || referredProf?.full_name || 'Your referral'

        await Promise.all([
          supabaseAdmin.from('profiles')
            .update({ loyalty_points: (referrerProf?.loyalty_points || 0) + REFERRAL_POINTS })
            .eq('id', ref.referrer_id),
          supabaseAdmin.from('profiles')
            .update({ loyalty_points: (referredProf?.loyalty_points || 0) + REFERRAL_POINTS })
            .eq('id', ref.referred_id),
          supabaseAdmin.from('referrals')
            .update({ status: 'completed', referral_activated_at: new Date().toISOString(), subscription_days_count: deliveredDays })
            .eq('id', ref.id),
        ])

        activated++

        // Notify both users — non-blocking
        try {
          const referrerEmail = referrerAuth?.user?.email || referrerProf?.email
          const referredEmail = referredAuth?.user?.email || referredProf?.email
          await Promise.allSettled([
            referrerEmail && sendReferralCompletedEmail({ to: referrerEmail, name: referrerProf?.full_name || 'Customer', points: REFERRAL_POINTS, friendName: referredName }),
            referredEmail && sendReferralCompletedEmail({ to: referredEmail, name: referredProf?.full_name || 'Customer', points: REFERRAL_POINTS, friendName: referrerProf?.full_name || 'Your referrer' }),
            referrerProf?.phone && notifyReferralCompleted({ phone: referrerProf.phone, name: referrerProf.full_name || 'Customer', points: REFERRAL_POINTS }),
            referredProf?.phone && notifyReferralCompleted({ phone: referredProf.phone, name: referredProf.full_name || 'Customer', points: REFERRAL_POINTS }),
          ])
        } catch { /* non-blocking */ }
      } else if (deliveredDays !== (ref.subscription_days_count || 0)) {
        // Update the count if it changed
        await supabaseAdmin.from('referrals').update({ subscription_days_count: deliveredDays }).eq('id', ref.id)
        updated++
      }
    }

    return NextResponse.json({
      success: true,
      checked: pendingReferrals.length,
      activated,
      updated,
      message: `Checked ${pendingReferrals.length} referrals. Activated: ${activated}, Updated counts: ${updated}.`,
    })
  } catch (err) {
    console.error('[check-referrals] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
