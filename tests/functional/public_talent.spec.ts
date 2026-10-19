import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import CandidateCv from '#models/candidate_cv'
import CandidateAccessLog from '#models/candidate_access_log'
import Location from '#models/location'
import SavedCandidate from '#models/saved_candidate'
import { makeCandidate, makeEmployer, makeJob, PDF_BYTES, resetData } from '#tests/helpers'

async function withCv(profileId: number) {
  const key = `cvs/test/${profileId}-${Date.now()}.pdf`
  await drive.use('private').put(key, PDF_BYTES)
  return CandidateCv.create({ candidateProfileId: profileId, label: 'CV', storageKey: key, originalName: 'cv.pdf', mimeType: 'application/pdf', sizeBytes: PDF_BYTES.length, isPrimary: true })
}

test.group('Public profiles on the homepage and Find Talent', (group) => {
  group.each.setup(() => resetData())

  test('only public profiles appear on the homepage, with full name but no contact details', async ({ client, assert }) => {
    const { profile: pub, user } = await makeCandidate({ visibility: 'public', profile: { desiredPosition: 'Accountant', gender: 'female' } })
    const { profile: disc } = await makeCandidate({ visibility: 'discoverable' })
    const { profile: priv } = await makeCandidate({ visibility: 'private' })
    const res = await client.get('/').withInertia()
    const cards = res.inertiaProps.feed.data
    const ids = cards.map((c: any) => c.id)
    assert.include(ids, pub.id)
    assert.notInclude(ids, disc.id)
    assert.notInclude(ids, priv.id)
    const card = cards.find((c: any) => c.id === pub.id)
    assert.equal(card.name, user.fullName)
    assert.equal(card.desiredPosition, 'Accountant')
    assert.equal(card.gender, 'female')
    const json = JSON.stringify(res.inertiaProps.feed)
    assert.notInclude(json, '+974 5555 0000')
    assert.notInclude(json, user.email)
  })

  test('homepage tabs, country filter and the load-more feed', async ({ client, assert }) => {
    const dubai = await Location.findByOrFail('slug', 'dubai')
    const doha = await Location.findByOrFail('slug', 'doha')
    const { profile: now } = await makeCandidate({ visibility: 'public', profile: { availability: 'immediately', currentLocationId: dubai.id } })
    const { profile: later } = await makeCandidate({ visibility: 'public', profile: { availability: 'within_3_months', currentLocationId: doha.id } })
    const ids = async (qs: string) => (await client.get(`/?${qs}`).withInertia()).inertiaProps.feed.data.map((c: any) => c.id)
    assert.deepEqual(await ids('tab=available'), [now.id])
    assert.deepEqual(await ids('country=qatar'), [later.id])
    for (let i = 0; i < 6; i++) await makeCandidate({ visibility: 'public' })
    const page2 = await client.get('/talent/feed?page=2')
    page2.assertStatus(200)
    assert.equal(page2.body().meta.page, 2)
    assert.lengthOf(page2.body().data, 2)
  })

  test('anyone can download the CV of a public profile that allows it; nothing else', async ({ client, assert }) => {
    const { profile: open } = await makeCandidate({ visibility: 'public', cvSearchable: true })
    const { profile: noCv } = await makeCandidate({ visibility: 'public', cvSearchable: false })
    const { profile: disc } = await makeCandidate({ visibility: 'discoverable', cvSearchable: true })
    const a = await withCv(open.id)
    const b = await withCv(noCv.id)
    const c = await withCv(disc.id)
    ;(await client.get(`/files/cvs/${a.id}`)).assertStatus(200)
    ;(await client.get(`/files/cvs/${b.id}`)).assertStatus(404)
    ;(await client.get(`/files/cvs/${c.id}`)).assertStatus(404)
    const log = await CandidateAccessLog.query().where('candidate_profile_id', open.id).where('action', 'cv_download').firstOrFail()
    assert.isNull(log.companyId)

    // consent withdrawn: next request is refused
    open.visibility = 'private'
    await open.save()
    ;(await client.get(`/files/cvs/${a.id}`)).assertStatus(404)
  })

  test('public profile pages are visible to guests; private ones are not', async ({ client }) => {
    const { profile: pub } = await makeCandidate({ visibility: 'public' })
    const { profile: priv } = await makeCandidate({ visibility: 'private' })
    ;(await client.get(`/talent/${pub.id}`).withInertia()).assertStatus(200)
    ;(await client.get(`/talent/${priv.id}`).withInertia()).assertStatus(404)
    const res = await client.get(`/talent/${pub.id}`).withInertia()
    res.assertInertiaPropsContains({ candidate: { contact: null } })
  })

  test('Find Talent lists public profiles only', async ({ client, assert }) => {
    const { profile: pub } = await makeCandidate({ visibility: 'public', skills: ['HVAC'] })
    const { profile: disc } = await makeCandidate({ visibility: 'discoverable', skills: ['HVAC'] })
    const res = await client.get('/talent?q=hvac').withInertia()
    const ids = res.inertiaProps.results.data.map((c: any) => c.id)
    assert.include(ids, pub.id)
    assert.notInclude(ids, disc.id)
  })

  test('employers can shortlist a public profile in one click, and toggle it off', async ({ client, assert }) => {
    const { profile } = await makeCandidate({ visibility: 'public' })
    const { user, company } = await makeEmployer('pending')
    await client.post(`/employer/candidates/${profile.id}/toggle-save`).withCsrfToken().loginAs(user)
    assert.lengthOf(await SavedCandidate.query().where('company_id', company.id), 1)
    await client.post(`/employer/candidates/${profile.id}/toggle-save`).withCsrfToken().loginAs(user)
    assert.lengthOf(await SavedCandidate.query().where('company_id', company.id), 0)
  })

  test('job salary currency follows the job country', async ({ assert }) => {
    const { company } = await makeEmployer('verified')
    const dubai = await Location.findByOrFail('slug', 'dubai')
    const job = await makeJob(company, { locationId: dubai.id })
    assert.equal(job.salaryCurrency, 'AED')
  })
})

test.group('New public pages', () => {
  test('career tips, courses, Arabic notice, help and accessibility render', async ({ client }) => {
    for (const url of ['/career-tips', '/career-tips/spot-fake-job-offers', '/courses', '/arabic', '/help', '/accessibility', '/talent']) {
      ;(await client.get(url).withInertia()).assertStatus(200)
    }
    ;(await client.get('/career-tips/nope').withInertia()).assertStatus(404)
  })
})
