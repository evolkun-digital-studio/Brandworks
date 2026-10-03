/**
 * Copy and structure for the Technology service page
 * (src/pages/services/TechnologyPage.tsx). Numbers shown on the page are
 * derived from each item's position, never written here.
 */

export const technologySeo = {
  title: 'Technology, AI & Automation | BrandWorks',
  description:
    'AI agents, business automation, dashboards, ERP and custom systems designed around the way your business actually operates.',
  pathname: '/services/technology',
}

export const technologyHero = {
  label: 'Technology / BrandWorks',
  heading: ['Technology that works', 'behind your business.'],
  copy: 'AI, automation and custom systems designed around the way your business actually operates.',
  cta: 'Explore technology',
  partnerLink: 'Technology by Evolkun',
}

export const technologyIntro = {
  label: 'What we build',
  statement:
    'We connect technology to the parts of your business that consume the most time.',
  copy: 'From repetitive operations to customer communication, sales workflows and internal reporting, we build systems that make work simpler.',
}

export type CapabilityVisual =
  | 'agents'
  | 'sales'
  | 'support'
  | 'analytics'
  | 'erp'
  | 'workflow'
  | 'integration'
  | 'tools'

export type Capability = {
  id: string
  title: string
  description: string
  visual: CapabilityVisual
}

export const capabilities: Capability[] = [
  {
    id: 'ai-agents',
    title: 'AI Agents & Business Automation',
    description:
      'Autonomous systems designed to handle repetitive decisions, workflows and operational tasks.',
    visual: 'agents',
  },
  {
    id: 'sales-automation',
    title: 'AI Sales & Marketing Automation',
    description:
      'Automate lead handling, qualification, follow-ups, campaigns and customer journeys.',
    visual: 'sales',
  },
  {
    id: 'customer-support',
    title: 'AI Customer Support & Chatbots',
    description:
      'AI assistants trained around your business, products, FAQs and customer workflows.',
    visual: 'support',
  },
  {
    id: 'dashboards',
    title: 'Data & Analytics Dashboards',
    description: 'Turn scattered business data into clear, live and actionable dashboards.',
    visual: 'analytics',
  },
  {
    id: 'erp',
    title: 'ERP Development',
    description:
      'Custom operational systems connecting inventory, teams, processes, reporting and business data.',
    visual: 'erp',
  },
  {
    id: 'workflow-automation',
    title: 'Workflow Automation',
    description:
      'Connect tools, approvals, notifications and repetitive processes into automated workflows.',
    visual: 'workflow',
  },
  {
    id: 'ai-integration',
    title: 'AI Integration',
    description: 'Add AI capabilities to the software and systems your company already uses.',
    visual: 'integration',
  },
  {
    id: 'internal-tools',
    title: 'Custom Internal Tools',
    description:
      'Purpose-built software for teams instead of forcing operations into generic tools.',
    visual: 'tools',
  },
]

export const automationStory = {
  stages: [
    {
      word: 'Trigger',
      line: 'An event enters the system.',
    },
    {
      word: 'Think',
      line: 'Rules, data and AI determine what happens next.',
    },
    {
      word: 'Act',
      line: 'The system performs the required action.',
    },
  ],
  triggers: ['Lead received', 'Order placed', 'Customer message', 'Form submitted', 'Inventory changed'],
  actions: ['Reply', 'Assign', 'Update', 'Notify', 'Generate', 'Analyse', 'Schedule'],
}

export const workflowExample = {
  heading: ['One workflow.', 'Zero unnecessary steps.'],
  steps: [
    'Lead Arrives',
    'AI Qualification',
    'CRM Updated',
    'Sales Team Assigned',
    'Follow-up Triggered',
    'Dashboard Updated',
  ],
}

export const dataSection = {
  label: 'Data / Decisions',
  heading: ['See what your business', 'is actually doing.'],
  copy: 'Custom dashboards that turn operational data into information teams can actually use.',
  /** Sample values for an illustrative interface — not client results. */
  metrics: {
    revenue: { label: 'Revenue', value: 248900, change: '+12.4%' },
    others: [
      { label: 'Leads', value: 1284, suffix: '' },
      { label: 'Conversion', value: 6.8, suffix: '%', decimals: 1 },
      { label: 'Active workflows', value: 37, suffix: '' },
      { label: 'Customer requests', value: 412, suffix: '' },
    ],
  },
}

export const erpSection = {
  heading: 'Software shaped around your operations.',
  copy: 'When generic tools stop fitting the business, we design systems around the workflow instead.',
  departments: ['Sales', 'Operations', 'Inventory', 'Finance', 'Customers'],
  core: 'Custom ERP',
}

export const evolkunSection = {
  label: 'Technology partner',
  heading: 'Built deeper with Evolkun.',
  copy: 'For specialised software, AI and engineering requirements, BrandWorks works alongside Evolkun to take ideas from strategy to production.',
  cta: 'Visit Evolkun',
}
