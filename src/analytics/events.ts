/**
 * Centralized event names — components never invent their own string
 * literals (Phase 12, Part 15). Every name here corresponds to a
 * clear, meaningful user action; this list is deliberately short —
 * "do not instrument every button" (Part 5).
 */
export const AnalyticsEvents = {
  pageView: 'page_view',
  blogArticleView: 'blog_article_view',
  /** A visitor follows a link into a specific blog post from a card (homepage teaser or /blog listing). */
  blogCardClick: 'blog_card_click',
  /** A visitor clicks the homepage "Start a project" / "Let's Talk" contact call-to-action. */
  contactCtaClick: 'contact_cta_click',
  /** A visitor clicks a "View Case Study" / service-related call-to-action. */
  serviceCtaClick: 'service_cta_click',
} as const

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]
