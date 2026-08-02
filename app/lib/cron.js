import { NextResponse } from 'next/server'
import { supabaseAdmin } from './db'
import { getISTDate } from './pricing'

// Every job name that has a Vercel Cron schedule pointing at it — kept in sync with
// vercel.json's `crons` array. Used by the reconciliation job to detect missing runs.
export const EXPECTED_CRON_JOBS = [
  'deduct-subscriptions',
  'snapshot-today-deliveries',
  'heartbeat-check',
  'check-undelivered',
  'check-missed-deliveries',
  'low-balance-warning',
  'review-requests',
]

// Wraps a cron job body with an idempotency + outcome record in cron_invocations.
// On a duplicate invocation for the same (job_name, run_date) the unique constraint
// rejects the insert and the job body never runs — this is the idempotency primitive,
// not just an audit log.
export async function withCronLog(jobName, fn) {
  const runDate = getISTDate()

  const { error: insertError } = await supabaseAdmin
    .from('cron_invocations')
    .insert({ job_name: jobName, run_date: runDate })

  if (insertError) {
    if (insertError.code === '23505') {
      console.warn(`[cron_invocations] ${jobName} already ran for ${runDate} — skipping duplicate invocation`)
      return NextResponse.json({ skipped: 'already_ran' })
    }
    // Insert failed for some other reason (e.g. table missing, RLS misconfigured).
    // Don't block the job on logging infra — run it anyway, but the failure is loud in logs.
    console.error(`[cron_invocations] insert failed for ${jobName}:`, insertError)
  }

  try {
    const response = await fn()
    const status = response?.status >= 400 ? 'error' : 'success'
    await supabaseAdmin
      .from('cron_invocations')
      .update({ status, finished_at: new Date().toISOString() })
      .eq('job_name', jobName)
      .eq('run_date', runDate)
    return response
  } catch (err) {
    console.error(`[cron_invocations] ${jobName} threw:`, err)
    await supabaseAdmin
      .from('cron_invocations')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_detail: String(err?.message || err),
      })
      .eq('job_name', jobName)
      .eq('run_date', runDate)
    return NextResponse.json({ error: 'cron job failed', detail: String(err?.message || err) }, { status: 500 })
  }
}
