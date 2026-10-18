/*
| Bouncer policies — pre-registered so they can be referenced by name.
*/
export const policies = {
  JobPolicy: () => import('#policies/job_policy'),
  ApplicationPolicy: () => import('#policies/application_policy'),
  CompanyPolicy: () => import('#policies/company_policy'),
}
