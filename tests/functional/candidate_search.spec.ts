import { test } from '@japa/runner'
import Language from '#models/language'
import { makeCandidate, makeEmployer, refIds, resetData } from '#tests/helpers'

test.group('Recruiter candidate search filters', (group) => {
  group.each.setup(() => resetData())

  test('skills (all/any), experience, salary, location and language filters combine', async ({ client, assert }) => {
    const { doha, lusail, westBay } = await refIds()
    const { profile: a } = await makeCandidate({ visibility: 'discoverable', skills: ['React', 'Node.js'], profile: { yearsExperience: 6, expectedSalary: 18000, expectedSalaryCurrency: 'QAR', currentLocationId: westBay.id, currentJobTitle: 'Software Engineer' } })
    const { profile: b } = await makeCandidate({ visibility: 'discoverable', skills: ['React'], profile: { yearsExperience: 2, expectedSalary: 9000, expectedSalaryCurrency: 'QAR', currentLocationId: lusail.id, currentJobTitle: 'Frontend Developer' } })
    const { profile: c } = await makeCandidate({ visibility: 'discoverable', skills: ['Nursing'], profile: { yearsExperience: 10, expectedSalary: null, currentLocationId: doha.id, headline: 'ICU nurse' } })
    const ar = await Language.findByOrFail('code', 'ar')
    await c.related('languages').attach({ [ar.id]: { proficiency: 'native' } })

    const { user: emp } = await makeEmployer('verified')
    const ids = async (qs: string) => (await client.get(`/employer/candidates?${qs}`).withInertia().loginAs(emp)).inertiaProps.results.data.map((x: any) => x.id).sort()

    assert.deepEqual(await ids('skills=react&skills=node-dot-js'), [a.id])
    assert.deepEqual(await ids('skills=react&skills=node-dot-js&skillMode=any'), [a.id, b.id].sort())
    assert.deepEqual(await ids('expMin=5'), [a.id, c.id].sort())
    assert.deepEqual(await ids('salaryMax=10000&currency=QAR'), [b.id], 'undisclosed salaries are excluded when filtering on salary')
    assert.deepEqual(await ids('salaryMax=10000&currency=AED'), [], 'salaries in another currency are not compared')
    assert.deepEqual(await ids('salaryMax=10000&location=qatar'), [b.id], 'the selected country sets the currency')
    assert.deepEqual(await ids('location=doha'), [a.id, c.id].sort(), 'Doha includes West Bay')
    assert.deepEqual(await ids('location=qatar'), [a.id, b.id, c.id].sort(), 'a country includes all its cities and districts')
    assert.deepEqual(await ids('languages=ar'), [c.id])
    assert.deepEqual(await ids('title=developer'), [b.id])
    assert.deepEqual(await ids('q=nurse'), [c.id])
    assert.deepEqual(await ids('q=react&expMax=3'), [b.id])
  })

  test('result count and pagination metadata are returned and filters preserved', async ({ client, assert }) => {
    for (let i = 0; i < 23; i++) await makeCandidate({ visibility: 'discoverable', skills: ['SQL'] })
    const { user: emp } = await makeEmployer('verified')
    const res = await client.get('/employer/candidates?skills=sql&page=2').withInertia().loginAs(emp)
    assert.equal(res.inertiaProps.results.meta.total, 23)
    assert.equal(res.inertiaProps.results.meta.page, 2)
    assert.lengthOf(res.inertiaProps.results.data, 3)
    assert.deepEqual(res.inertiaProps.filters.skills, ['sql'])
  })

  test('keyword search treats LIKE wildcards literally', async ({ client, assert }) => {
    await makeCandidate({ visibility: 'discoverable', profile: { headline: 'Accountant' } })
    const { user: emp } = await makeEmployer('verified')
    const res = await client.get('/employer/candidates?q=%25%25').withInertia().loginAs(emp)
    assert.equal(res.inertiaProps.results.meta.total, 0)
  })

  test('employers can save candidates to named lists and save searches', async ({ client, assert }) => {
    const { profile } = await makeCandidate({ visibility: 'discoverable' })
    const { user: emp } = await makeEmployer('verified')
    await client.post(`/employer/candidates/${profile.id}/save`).json({ listName: 'Lusail engineers' }).withCsrfToken().loginAs(emp)
    await client.post('/employer/saved-searches').json({ name: 'Seniors', query: 'expMin=5' }).withCsrfToken().loginAs(emp)
    const saved = await client.get('/employer/candidates/saved').withInertia().loginAs(emp)
    assert.equal(saved.inertiaProps.items[0].listName, 'Lusail engineers')
    const search = await client.get('/employer/candidates').withInertia().loginAs(emp)
    assert.equal(search.inertiaProps.savedSearches[0].filters.expMin, 5)
  })
})
