import { mediaUrl } from '../lib/media'

/** Temporary copy + media for the FAQ and contact ending. Swap freely: no animation code reads from here. */
export const socialFaq = [
  ['What kinds of brands do you support?', 'From local businesses to growing companies: any brand that wants its social presence to feel intentional, human and consistent.'],
  ['Do you work only locally or also remotely?', 'Both. Shoots happen on location, while strategy, planning and reporting run smoothly from anywhere.'],
  ['What specific services do you offer?', 'Strategy, art direction, content creation, community management and reporting, planned as one connected system.'],
  ['Do you only offer social media management or also consulting?', 'Both. Many partnerships begin with a strategic phase and grow into day-to-day management of the accounts.'],
  ['What results can be expected when working with us?', 'Clearer engagement patterns within the first 8 to 12 weeks, then steady growth once the content pillars are in motion.'],
  ['How do I get a quote or start a collaboration?', 'Send us a few words about your project. We reply quickly with a first proposal and a call.'],
] as const

export const socialContact = {
  label: 'Contact',
  heading: 'Tell us about it.',
  copy: 'A mini quiz, 3 questions, less than a minute. We receive your answers and get back to you quickly.',
  cta: 'Start the quiz',
  to: '/contact',
  image: mediaUrl('Strategy.jpg'),
}

export const socialCaseOfMonth = {
  label: 'Case of the month',
  title: "The Shepherd's bag",
  tags: ['Content creation', 'Community management', 'Social media strategy'],
  cta: 'See the case',
  to: '/work',
}
