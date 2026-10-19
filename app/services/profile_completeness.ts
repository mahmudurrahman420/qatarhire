import type CandidateProfile from '#models/candidate_profile'

/**
 * Weighted completeness score (0-100). The profile must have its
 * experiences, educations, skills, languages and cvs relations loaded.
 */
export function computeCompleteness(p: CandidateProfile) {
  const checks: Array<[boolean, number, string]> = [
    [Boolean(p.headline), 10, 'Add a professional headline'],
    [Boolean(p.summary && p.summary.length >= 80), 5, 'Write a summary of at least a few sentences'],
    [Boolean(p.desiredPosition), 5, 'Add the position you want'],
    [Boolean(p.photoKey), 5, 'Add a profile photo'],
    [Boolean(p.currentJobTitle), 5, 'Add your current or most recent job title'],
    [p.industryId !== null, 5, 'Choose your industry'],
    [p.yearsExperience !== null, 5, 'Add your years of experience'],
    [p.currentLocationId !== null || Boolean(p.currentLocationText), 5, 'Add your current location'],
    [p.preferredLocationId !== null, 5, 'Choose where in the Gulf you want to work'],
    [p.availability !== null, 5, 'Set your availability'],
    
    [(p.experiences?.length ?? 0) > 0, 15, 'Add your employment history'],
    [(p.educations?.length ?? 0) > 0, 5, 'Add your education'],
    [(p.skills?.length ?? 0) >= 3, 10, 'Add at least three skills'],
    [(p.languages?.length ?? 0) > 0, 5, 'Add the languages you speak'],
    [(p.cvs?.length ?? 0) > 0, 10, 'Upload your CV'],
  ]
  let score = 0
  const missing: string[] = []
  for (const [ok, weight, hint] of checks) {
    if (ok) score += weight
    else missing.push(hint)
  }
  return { score: Math.min(100, score), missing }
}

export async function refreshCompleteness(p: CandidateProfile) {
  await p.load((l) => l.load('experiences').load('educations').load('skills').load('languages').load('cvs'))
  const { score } = computeCompleteness(p)
  if (score !== p.completeness) {
    p.completeness = score
    await p.save()
  }
  return score
}
