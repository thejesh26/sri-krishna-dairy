import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireCron } from '../../../lib/auth'
import { getISTDate } from '../../../lib/pricing'
import { notifyAdmin } from '../../../lib/whatsapp'
import { withCronLog, EXPECTED_CRON_JOBS } from '../../../lib/cron'

// Called daily at 23:00 IST (17:30 UTC) — after every other cron job listed in
// EXPECTED_CRON_JOBS is scheduled to have run for the day. Makes silent cron failure
// loud: any job with no cron_invocations row for today gets flagged to admin.
export async function GET(request) {
  const { error } = requireCron(request)
  if (error) return error
  return withCronLog('reconcile-invocations', runReconciliation)
}

async function runReconciliation() {
  const today = getISTDate()

  const { data: rows, error } = await supabaseAdmin
    .from('cron_invocations')
    .select('job_name, status')
    .eq('run_date', today)

  if (error) {
    console.error('[reconcile-invocations] fetch failed:', error)
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }

  const ranJobs = new Map((rows || []).map(r => [r.job_name, r.status]))

  const missing = EXPECTED_CRON_JOBS.filter(job => !ranJobs.has(job))
  const failed = EXPECTED_CRON_JOBS.filter(job => ranJobs.get(job) === 'error')

  if (!missing.length && !failed.length) {
    return NextResponse.json({ date: today, status: 'OK' })
  }

  const lines = [
    ...missing.map(job => `• ${job} — did not run at all`),
    ...failed.map(job => `• ${job} — ran but ended in error`),
  ].join('\n')

  await notifyAdmin(
    `⚠️ Cron Gap Detected — ${today}`,
    `Some daily cron jobs did not complete successfully on ${today}:\n${lines}\n\nCheck Vercel logs and the cron_invocations table.`
  ).catch(() => {})

  return NextResponse.json({ date: today, status: 'GAP', missing, failed })
}
