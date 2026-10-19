/**
 * Starter Career Tips articles. Plain text with blank-line paragraphs and "- " bullets,
 * rendered by the same safe RichText component as job descriptions.
 * Move these into an admin-managed table when the editorial team needs to edit them.
 */
export type Tip = { slug: string; title: string; summary: string; minutes: number; body: string }

export const CareerTips: Tip[] = [
  {
    slug: 'write-a-gulf-ready-cv',
    title: 'Write a CV Gulf recruiters actually read',
    summary: 'Recruiters scan a CV in under a minute. Put the facts they filter on where they can see them.',
    minutes: 4,
    body: `Most recruiters in the Gulf shortlist from dozens of CVs for one role. They look for a few things first: the job title you want, where you are now, your visa status, your notice period and your most relevant experience.

Put these at the top
- The position you want, in the words employers use ("Quantity Surveyor", not "QS professional")
- Current city and country, and whether you can transfer your visa
- Notice period or availability date
- Years of experience in this field

Keep it to two pages. List your last ten years of roles, newest first, with three to five results per role. Numbers help: projects delivered, budgets handled, team size, targets met.

Save it as PDF. Name the file with your name and the role, for example "Aisha-Khan-Accountant-CV.pdf".

Leave out your passport number, date of birth and religion. Employers don't need them to shortlist you, and a CV travels further than you expect.`,
  },
  {
    slug: 'spot-fake-job-offers',
    title: 'How to spot a fake job offer',
    summary: 'Real employers never ask you to pay for a visa, medical or "processing". Here are the other warning signs.',
    minutes: 3,
    body: `Job scams target people who are keen to move quickly. They usually follow the same pattern.

Warning signs
- Any request for money, even "refundable", for visas, medicals, training or processing
- An offer without an interview, or one that arrives within minutes of applying
- Pressure to decide today or to keep the offer secret
- Contact only through personal messaging apps or a free email address
- A salary far above what the role normally pays

What to do
- Check the company on HireMeGulf and look for the verified mark
- Search the company's trade licence or commercial registration number
- Never send original documents before a written offer
- Report the job using the "Report this job" link so our team can act on it`,
  },
  {
    slug: 'prepare-for-a-video-interview',
    title: 'Prepare for a video interview from abroad',
    summary: 'Many first interviews for Gulf roles happen on video. Small preparation makes a big difference.',
    minutes: 3,
    body: `If you're applying from another country, your first interview will almost certainly be on a video call. Treat it like an in-person interview.

The day before
- Test the link, your camera and your microphone
- Check the time zone: UAE and Oman are GMT+4; Saudi Arabia, Qatar, Kuwait and Bahrain are GMT+3
- Prepare three short stories about problems you solved at work

On the day
- Sit facing a window or a lamp, with a plain background
- Dress as you would for the office
- Keep your CV and the job description open so you can refer to them

End by asking about the next step and the expected start date. It shows you're serious and helps you plan your notice period.`,
  },
  {
    slug: 'negotiate-your-gulf-salary',
    title: 'Understand a Gulf salary package',
    summary: 'Basic salary is only part of the offer. Know what to ask about before you accept.',
    minutes: 4,
    body: `Gulf offers are usually quoted as a monthly package in the local currency. The headline number can include several parts.

Ask how the package breaks down
- Basic salary (end-of-service benefits are often calculated on this)
- Housing allowance or provided accommodation
- Transport allowance or company transport
- Medical insurance for you and, if relevant, your family
- Annual flight ticket and leave entitlement

Compare offers on the total monthly value and on what you'd actually spend. A lower package with accommodation can leave you better off than a higher one without.

Get the final offer in writing, with the job title, package breakdown and start date, before you resign from your current job.`,
  },
]
