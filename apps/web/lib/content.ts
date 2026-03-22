export type ActionLink = {
  href: string;
  label: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type ModuleItem = {
  name: string;
  value: string;
  problem: string;
  useCase: string;
};

export type RoleBenefit = {
  role: string;
  summary: string;
  details: string;
};

export type PricingTier = {
  name: string;
  price: string;
  cadence: string;
  audience: string;
  description: string;
  features: string[];
  cta: ActionLink;
  highlight?: string;
  bestFor?: string;
  featured?: boolean;
};

export type DocsCategory = {
  title: string;
  summary: string;
  articles: string[];
};

export type IntegrationCategory = {
  title: string;
  summary: string;
  items: string[];
  outcome: string;
};

export type IntegrationWorkflow = {
  title: string;
  body: string;
};

export const valueStrip = [
  {
    title: "One employee record system",
    body: "EMP keeps employee records, teams, reporting lines, approvals, attendance, leave, and payroll visibility tied to the same company structure."
  },
  {
    title: "Approval ownership that stays clear",
    body: "HR, managers, team leads, and admins can act from the right approval queue without relying on side chats or private spreadsheets."
  },
  {
    title: "Daily exceptions in one place",
    body: "Attendance exceptions, leave overlaps, profile changes, and manager actions stay visible in one operating view."
  },
  {
    title: "Leadership visibility",
    body: "Leadership gets a clearer read on staffing pressure, policy execution, team ownership, and unresolved workforce issues."
  }
] as const;

export const homepageProofStrip = [
  "Structured employee records and reporting lines",
  "Attendance exceptions and leave approvals in one flow",
  "Payroll visibility with cleaner upstream context",
  "Admin control, governance, and workforce reporting"
] as const;

export const featuredModules = [
  {
    title: "Org structure",
    body: "Design departments, sub-departments, reporting lines, and ownership without losing control as the company grows."
  },
  {
    title: "Attendance and leave",
    body: "Handle attendance, leave, shift changes, and exceptions with clear approval logic and fewer manual follow-ups."
  },
  {
    title: "Projects and workflows",
    body: "Tie people, responsibilities, and operating work together so teams can execute inside the same system they report through."
  },
  {
    title: "Chat and approvals",
    body: "Keep action, context, inbox items, and decisions close to the work instead of buried across disconnected threads."
  },
  {
    title: "Payroll support",
    body: "Give payroll teams cleaner inputs, cleaner records, and better visibility into attendance, leave, and policy exceptions."
  },
  {
    title: "Analytics and SOPs",
    body: "Blend governance, knowledge, and live reporting so leadership can see what is happening and why."
  }
] as const;

export const operatingCoverage = [
  "Company management",
  "Departments and sub-departments",
  "Teams and reporting hierarchy",
  "Employee profiles",
  "Attendance",
  "Leave management",
  "Shift swaps",
  "Payroll support",
  "Projects and workflows",
  "Chat and collaboration",
  "Notifications and approvals",
  "Analytics and executive insight"
] as const;

export const modules: ModuleItem[] = [
  {
    name: "Attendance",
    value: "Review daily presence, missing punches, shift changes, and attendance exceptions in one place.",
    problem: "Attendance turns noisy when devices, spreadsheets, and supervisor messages all tell a slightly different story.",
    useCase: "Regional managers review late arrivals and missing punches before staffing calls and payroll checks begin."
  },
  {
    name: "Leave",
    value: "Handle leave requests, balances, overlap checks, and policy execution with cleaner manager reviews.",
    problem: "Leave handling gets inconsistent when each department interprets policy through email, chat, and manual notes.",
    useCase: "HR and managers approve leave with visibility into overlapping absences, remaining balances, and team coverage."
  },
  {
    name: "Employee Records",
    value: "Maintain a clean source of truth for role, reporting line, department, and employment context.",
    problem: "Employee details get duplicated when HR files, chat threads, and manager notes all become unofficial record systems.",
    useCase: "An operations lead reviews role history, team assignment, manager, shift, and contact data from one live record."
  },
  {
    name: "Organization",
    value: "Model departments, teams, and reporting lines in a way the whole company can actually use.",
    problem: "Org design becomes hard to trust when it lives in slides while day-to-day approvals and records follow different ownership paths.",
    useCase: "A growing company creates new teams and immediately routes visibility, approvals, and responsibility to the right owners."
  },
  {
    name: "Payroll Visibility",
    value: "Give finance and HR cleaner upstream context before payroll reviews and corrections begin.",
    problem: "Payroll review slows down when attendance, leave, exceptions, and employee records all need late manual reconciliation.",
    useCase: "Finance and HR review verified payroll inputs after department managers finish exception handling."
  },
  {
    name: "Projects",
    value: "Keep project ownership tied to the real teams, managers, and reporting lines doing the work.",
    problem: "Project tracking breaks down when work ownership sits outside the actual company structure.",
    useCase: "Department heads run cross-functional rollout work while keeping ownership tied to the same org hierarchy."
  },
  {
    name: "Collaboration",
    value: "Keep work conversations closer to the people, approvals, and records they affect.",
    problem: "Context gets lost when critical operational decisions live in chat threads with no connection to the underlying record or request.",
    useCase: "A team lead resolves a shift issue with the employee record and approval context already in view."
  },
  {
    name: "Approval Routing",
    value: "Route leave, attendance, profile, and structural requests to the right owner with the right context.",
    problem: "Manual follow-up creates delays when ownership is unclear or exceptions are buried in messages.",
    useCase: "Managers receive a clean queue for leave approvals, attendance exceptions, and structural changes."
  },
  {
    name: "Analytics",
    value: "Give leaders a live view of workforce activity, staffing pressure, gaps, and exceptions.",
    problem: "Executives usually see people data too late because reporting depends on manual consolidation across systems.",
    useCase: "Leadership reviews staffing patterns, approval bottlenecks, attendance trends, and policy exceptions in one place."
  },
  {
    name: "Knowledge Base",
    value: "Keep policies, SOPs, and operating guidance closer to the workflows teams actually run.",
    problem: "Important process guidance becomes shelfware when it lives in static files disconnected from daily approvals and requests.",
    useCase: "Managers attach policy guidance to approvals and team workflows to reduce policy drift."
  },
  {
    name: "Governance",
    value: "Control permissions, settings, policy boundaries, and operational guardrails from one admin layer.",
    problem: "Growth introduces risk when permissions, rules, and ownership are improvised instead of managed centrally.",
    useCase: "Admins define policy logic, department-level settings, and permissions without losing flexibility."
  }
];

export const roleBenefits: RoleBenefit[] = [
  {
    role: "Founder / CEO",
    summary: "See how the company is running without waiting on stitched spreadsheets and status updates.",
    details: "Track reporting lines, approvals, workforce pressure, unresolved exceptions, and team ownership from one leadership view."
  },
  {
    role: "HR teams",
    summary: "Run employee operations from a system that holds records, policy steps, and approvals together.",
    details: "Standardize employee records, leave approvals, attendance review, policy execution, and payroll support without chasing updates across tools."
  },
  {
    role: "Operations leaders",
    summary: "Handle workforce pressure with better routing, cleaner ownership, and less hidden work.",
    details: "Connect attendance, shift coverage, approvals, projects, and exceptions directly to teams and reporting lines."
  },
  {
    role: "Managers and team leads",
    summary: "Act faster because requests, records, and next steps live in the same place.",
    details: "Approve leave, review attendance exceptions, check team capacity, and resolve people issues without maintaining parallel spreadsheets."
  },
  {
    role: "Employees",
    summary: "Get a clearer employee experience for requests, records, and daily updates.",
    details: "Access leave, attendance, profile information, approvals, and key updates from one structured workspace."
  }
];

export const workflowSteps = [
  {
    step: "01",
    title: "Set up the company structure once",
    body: "Map departments, teams, reporting lines, approvers, and policy boundaries in a way the whole business can use."
  },
  {
    step: "02",
    title: "Run daily workforce operations",
    body: "Manage attendance, leave, employee record updates, shifts, and team actions from the same operating context."
  },
  {
    step: "03",
    title: "Route approvals and exceptions",
    body: "Send the right actions to the right manager, HR owner, or admin with clear history and accountability."
  },
  {
    step: "04",
    title: "Turn operating activity into visibility",
    body: "Give leadership a live view of staffing pressure, approval delays, policy issues, and team movement."
  }
] as const;

export const proofSectors = [
  "Multi-site operations",
  "Services teams",
  "Field operations",
  "Corporate departments",
  "Retail groups",
  "Growing back-office teams"
] as const;

export const homeFaqs: FAQItem[] = [
  {
    question: "Is EMP primarily HR software?",
    answer:
      "EMP includes core HR and workforce workflows, but it is broader than a basic HR tool. It brings employee records, reporting lines, approvals, attendance, leave, payroll visibility, and workforce analytics into one system."
  },
  {
    question: "Who is EMP built for?",
    answer:
      "EMP is built for organizations that need more control than spreadsheets can offer and more operational clarity than disconnected point tools provide. It is especially relevant for founders, HR teams, operations leaders, and managers."
  },
  {
    question: "Can EMP support multiple roles with different permissions?",
    answer:
      "Yes. EMP is designed around role-aware access for leadership, HR, department heads, managers, team leads, and employees so each person sees the right controls and context."
  },
  {
    question: "Why describe EMP as a Workforce OS or Company OS?",
    answer:
      "Because the core value is not one isolated module. EMP aligns company structure, people operations, requests, approvals, workforce visibility, and team coordination in one operating system."
  }
];

export const productPillars = [
  {
    title: "Shared company model",
    body: "Departments, teams, reporting lines, policies, and employee records form a single operating layer every workflow can rely on."
  },
  {
    title: "Connected daily execution",
    body: "Attendance, leave, shift changes, projects, chat, approvals, and notifications stay tied to the same people and structure."
  },
  {
    title: "Control and visibility",
    body: "Admins define governance while leadership and managers get clean views into what needs attention and how the organization is moving."
  }
] as const;

export const comparisonPoints = [
  {
    fragmented: "Attendance, leave, employee records, approvals, and reporting live in separate tools",
    emp: "EMP keeps employee operations, approvals, and reporting tied to the same structure and ownership model"
  },
  {
    fragmented: "Managers re-enter the same details across chat, inbox threads, and spreadsheets",
    emp: "Requests, records, and escalations inherit the same reporting lines, approvers, and team context"
  },
  {
    fragmented: "Leadership sees workforce issues after manual consolidation and delayed summaries",
    emp: "Leadership gets a live operating view with cleaner escalation paths and fewer blind spots"
  },
  {
    fragmented: "Policies drift because approvals and exception handling happen outside the system",
    emp: "Governance, approvals, admin controls, and daily workflows stay connected in the same product"
  }
] as const;

export const internalLinkCards = [
  {
    title: "Explore modules",
    body: "See how EMP handles attendance, leave, collaboration, projects, analytics, knowledge, and governance.",
    href: "/modules",
    label: "View modules"
  },
  {
    title: "Review pricing",
    body: "Compare Starter, Growth, and Enterprise plans, then decide where a guided demo makes sense.",
    href: "/pricing",
    label: "See pricing"
  },
  {
    title: "Understand trust posture",
    body: "Review how EMP approaches permissions, auditability, governance, and privacy-minded operations.",
    href: "/security",
    label: "View security"
  },
  {
    title: "Review integrations",
    body: "See how EMP fits with messaging, identity, work tracking, exports, and internal automation workflows.",
    href: "/integrations",
    label: "View integrations"
  },
  {
    title: "Book a live walkthrough",
    body: "Start a product conversation with the workflows, team structure, and rollout questions that matter most to your business.",
    href: "/contact",
    label: "Book demo"
  },
  {
    title: "Read the employee management guide",
    body: "Review a focused landing page for teams comparing EMP against generic employee management software.",
    href: "/employee-management-software",
    label: "Open guide"
  }
] as const;

export const integrationCategories: IntegrationCategory[] = [
  {
    title: "Communication",
    summary: "Keep approval notifications, escalation prompts, and workflow updates visible where teams already coordinate.",
    items: ["Slack", "Microsoft Teams", "Email digests", "Approval alerts"],
    outcome: "Reduce approval lag by sending the right prompts to the right teams without losing the system of record."
  },
  {
    title: "Identity and access",
    summary: "Support cleaner access management and onboarding across the tools employees already use to sign in and work.",
    items: ["Google Workspace", "Microsoft 365", "SSO roadmap", "Role-aware access"],
    outcome: "Keep account setup, ownership changes, and permission reviews closer to your workforce structure."
  },
  {
    title: "Work tracking",
    summary: "Connect operational follow-up to the systems project and program teams already use to move work forward.",
    items: ["Linear", "Jira", "Implementation checklists", "Escalation tasks"],
    outcome: "Turn approvals, org updates, and rollout work into visible next steps without losing accountability."
  },
  {
    title: "Data export and reporting",
    summary: "Prepare cleaner outputs for payroll support, finance review, BI workflows, and operational reporting.",
    items: ["CSV exports", "Payroll-ready exports", "Reporting extracts", "Structured summaries"],
    outcome: "Give downstream teams cleaner data without rebuilding context from scattered spreadsheets."
  },
  {
    title: "Automation and APIs",
    summary: "Extend EMP through API access, webhooks, and event-driven handoffs without forcing teams into brittle manual work.",
    items: ["Webhooks", "API access", "Event triggers", "Internal tooling support"],
    outcome: "Connect EMP to internal systems while keeping the product as the source of workflow and ownership truth."
  }
] as const;

export const integrationWorkflows: IntegrationWorkflow[] = [
  {
    title: "Send approval prompts into Slack or Teams",
    body: "Notify the right manager when leave, attendance, or profile actions are waiting so approvals move faster without relying on private follow-up."
  },
  {
    title: "Push rollout work into Linear or Jira",
    body: "Turn org setup, onboarding tasks, and admin follow-up into tracked implementation work for the teams running the rollout."
  },
  {
    title: "Export payroll-ready context for downstream review",
    body: "Send verified attendance, leave, and employee context into payroll or finance review flows with fewer manual corrections."
  },
  {
    title: "Trigger internal admin workflows from workforce events",
    body: "Use org changes, approvals, or ownership updates to drive internal tasks and operational checkpoints in connected tools."
  }
] as const;

export const integrationSupportPoints = [
  {
    title: "Implementation-aware planning",
    body: "We review what should connect on day one versus what can wait until the core workforce model is running well."
  },
  {
    title: "Clear data ownership",
    body: "The goal is to keep EMP as the source of truth for structure, records, and approvals while connected systems consume the right outputs."
  },
  {
    title: "Practical rollout scope",
    body: "Buyers can use a demo to pressure-test how far to go with integrations, exports, automation, and downstream tooling."
  }
] as const;

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "From $4",
    cadence: "per user / month guidance",
    audience: "For smaller teams replacing spreadsheets and ad hoc workflows",
    description:
      "A guided starting point for companies that need structured people operations, cleaner approvals, and a practical first rollout.",
    highlight: "Best when the team is replacing manual records, email approvals, and first-stage HR admin work.",
    bestFor: "Early operating structure",
    features: [
      "Core org structure and employee records",
      "Attendance and leave workflows",
      "Basic approvals and notifications",
      "Manager and HR dashboards",
      "Email-based support"
    ],
    cta: { href: "/contact", label: "Talk through Starter" }
  },
  {
    name: "Growth",
    price: "From $8",
    cadence: "per user / month guidance",
    audience: "For multi-team organizations that need deeper operating coordination",
    description:
      "Adds stronger cross-functional visibility, collaboration, analytics, and control for growing organizations.",
    highlight: "Best when departments, managers, and admins all need shared visibility across approvals and workforce activity.",
    bestFor: "Cross-team coordination",
    features: [
      "Everything in Starter",
      "Projects, collaboration, and shared inbox flows",
      "Advanced approval routing",
      "Analytics and executive reporting",
      "Knowledge / SOPs and admin controls"
    ],
    cta: { href: "/contact", label: "Talk through Growth" },
    featured: true
  },
  {
    name: "Enterprise",
    price: "Contact sales",
    cadence: "custom deployment",
    audience: "For operationally complex organizations with advanced governance needs",
    description: "Best for larger teams that need rollout planning, deeper control, and tailored deployment support.",
    highlight: "Best when governance, rollout support, permissions, and operational complexity need a more tailored commercial path.",
    bestFor: "Complex rollout and governance",
    features: [
      "Everything in Growth",
      "Enterprise rollout planning",
      "Expanded permissions and governance support",
      "Priority implementation guidance",
      "Commercial and deployment flexibility"
    ],
    cta: { href: "/contact", label: "Talk to sales" }
  }
];

export const comparisonTable = [
  {
    feature: "Departments, teams, and reporting structure",
    starter: "Included",
    growth: "Included",
    enterprise: "Included"
  },
  {
    feature: "Attendance and leave management",
    starter: "Included",
    growth: "Included",
    enterprise: "Included"
  },
  {
    feature: "Projects and collaboration",
    starter: "Limited",
    growth: "Included",
    enterprise: "Included"
  },
  {
    feature: "Analytics and executive insights",
    starter: "Core dashboards",
    growth: "Advanced",
    enterprise: "Advanced"
  },
  {
    feature: "Knowledge / SOPs",
    starter: "Optional",
    growth: "Included",
    enterprise: "Included"
  },
  {
    feature: "Deployment and implementation support",
    starter: "Standard",
    growth: "Guided",
    enterprise: "Tailored"
  }
] as const;

export const pricingPersonas = [
  {
    id: "starter",
    label: "Getting started",
    title: "For teams replacing spreadsheets and lightweight HR admin work",
    description:
      "Choose this view if the main goal is to put employee records, attendance, leave approvals, and basic admin controls on a cleaner foundation.",
    recommendedPlan: "Starter"
  },
  {
    id: "growth",
    label: "Scaling teams",
    title: "For companies needing stronger coordination across departments and managers",
    description:
      "Choose this view if approvals, reporting, project ownership, analytics, and shared visibility matter across multiple teams.",
    recommendedPlan: "Growth"
  },
  {
    id: "enterprise",
    label: "Complex rollout",
    title: "For organizations with deeper governance, rollout, and support expectations",
    description:
      "Choose this view if permissions, implementation complexity, operating scope, and deployment planning need a more tailored commercial conversation.",
    recommendedPlan: "Enterprise"
  }
] as const;

export const pricingComparisonGroups = [
  {
    id: "operations",
    label: "Operations",
    rows: [
      "Departments, teams, and reporting structure",
      "Attendance and leave management",
      "Projects and collaboration"
    ]
  },
  {
    id: "visibility",
    label: "Visibility",
    rows: ["Analytics and executive insights", "Knowledge / SOPs"]
  },
  {
    id: "rollout",
    label: "Rollout",
    rows: ["Deployment and implementation support"]
  }
] as const;

export const pricingCommercialGuidance = [
  {
    title: "When Starter usually fits",
    body: "Starter is usually the right entry point when the main need is to replace spreadsheets, tighten employee records, and give managers a cleaner path for attendance and leave approvals."
  },
  {
    title: "When Growth usually fits",
    body: "Growth is usually the right choice when multiple departments need shared approval routing, clearer reporting, project ownership, and broader workforce analytics."
  },
  {
    title: "When Enterprise usually fits",
    body: "Enterprise is usually the better path when rollout support, governance settings, permissions, and deployment complexity need a more tailored commercial conversation."
  }
] as const;

export const pricingFaqs: FAQItem[] = [
  {
    question: "Do you offer a trial before purchase?",
    answer:
      "Yes. We usually start with a guided demo, then open an optional 14-day trial for qualified teams when the use case, rollout shape, and decision process are clear."
  },
  {
    question: "Is pricing fixed for every customer?",
    answer:
      "The pricing shown here is a directional public structure. Final commercial terms may vary based on rollout scope, deployment requirements, support needs, and organizational complexity."
  },
  {
    question: "Do you price by company or by user?",
    answer:
      "The public framework is user-based for Starter and Growth, while Enterprise conversations may reflect a broader deployment and support model."
  },
  {
    question: "What does onboarding typically include?",
    answer:
      "Onboarding usually covers org setup, role mapping, policy alignment, data preparation, and workflow configuration so the platform reflects how the company actually operates."
  },
  {
    question: "Can we start small and expand later?",
    answer:
      "Yes. The platform story is designed to support a staged rollout, letting teams begin with foundational workflows and expand into broader operating use cases over time."
  }
];

export const pricingDrivers = [
  {
    title: "Deployment scope",
    body: "Public pricing is directional. Final commercials depend on how widely EMP will be rolled out across departments, sites, and operating workflows."
  },
  {
    title: "Module footprint",
    body: "Some teams start with core workforce workflows and expand into collaboration, analytics, knowledge, and governance as adoption grows."
  },
  {
    title: "Setup and support",
    body: "Implementation guidance, data preparation, policy mapping, and rollout support can influence packaging and commercial structure."
  }
] as const;

export const securityPrinciples = [
  {
    title: "Access with context",
    body: "Permissions can follow role, team, and operational responsibility so sensitive workforce actions do not become broadly exposed."
  },
  {
    title: "Review history where work happens",
    body: "Requests, approvals, record changes, and governance-sensitive actions stay easier to review when history remains attached to the workflow itself."
  },
  {
    title: "Structured governance",
    body: "Admin settings, hierarchy, policy logic, and approval boundaries stay part of the operating model instead of being improvised across separate tools."
  },
  {
    title: "Privacy-minded design",
    body: "EMP is positioned for organizations treating employee records, approvals, and workforce data as sensitive operational information that needs narrower exposure."
  }
] as const;

export const securityFaqs: FAQItem[] = [
  {
    question: "Does EMP support role-based access control?",
    answer:
      "Yes. EMP is designed around role-aware access so founders, HR, managers, team leads, and employees can work from views appropriate to their responsibility."
  },
  {
    question: "How does EMP help with auditability?",
    answer:
      "By keeping requests, approvals, records, and governance-sensitive actions inside the same platform context, EMP makes operational history easier to review."
  },
  {
    question: "How does EMP approach privacy?",
    answer:
      "The product positioning centers on limiting unnecessary exposure, structuring access, and treating workforce data as sensitive operational information."
  },
  {
    question: "Can EMP support enterprise security conversations?",
    answer:
      "Yes. Security and deployment discussions can be shaped around the organization’s governance, approval, operational, and implementation requirements."
  }
];

export const securityReviewTopics = [
  "Role-based permissions and approval boundaries",
  "Who can view or change employee records",
  "Attendance, leave, and approval history review",
  "Governance settings and admin responsibility",
  "Deployment expectations and rollout planning",
  "Privacy-minded handling of workforce information"
] as const;

export const docsCategories: DocsCategory[] = [
  {
    title: "Getting started",
    summary: "Platform orientation, workspace setup, role mapping, and first-run configuration.",
    articles: ["Welcome to EMP", "Set up your company profile", "Invite admins and managers"]
  },
  {
    title: "Attendance",
    summary: "Rules, attendance capture, exceptions, and manager review workflows.",
    articles: ["Configure attendance policies", "Review daily exceptions", "Approve attendance changes"]
  },
  {
    title: "Leave",
    summary: "Leave types, balances, approval flows, and conflict handling.",
    articles: ["Create leave policies", "Manage balances", "Handle overlapping leave"]
  },
  {
    title: "Payroll support",
    summary: "Operational inputs, exception cleanup, and payroll-ready visibility.",
    articles: ["Prepare payroll inputs", "Review policy exceptions", "Export verified records"]
  },
  {
    title: "Org setup",
    summary: "Departments, reporting hierarchy, teams, and structural governance.",
    articles: ["Create departments", "Assign reporting lines", "Update team ownership"]
  },
  {
    title: "Approvals",
    summary: "Inbox behavior, routing logic, approval ownership, and escalation handling.",
    articles: ["Configure approvals", "Assign approvers", "Resolve blocked requests"]
  },
  {
    title: "Admin settings",
    summary: "Governance, permissions, knowledge setup, notifications, and policy controls.",
    articles: ["Manage role access", "Set notification rules", "Publish SOP guidance"]
  }
];

export const implementationJourney = [
  {
    title: "Discover",
    body: "Align on teams, workflows, policy structure, and the operating outcomes you need to improve first."
  },
  {
    title: "Configure",
    body: "Map org structure, roles, approvals, attendance logic, leave setup, and foundational records."
  },
  {
    title: "Roll out",
    body: "Train administrators, managers, and team leads while validating daily workflows with live teams."
  },
  {
    title: "Scale",
    body: "Expand into collaboration, analytics, governance, and broader company operating use cases."
  }
] as const;

export const supportCards = [
  {
    title: "Admin enablement",
    body: "Clear documentation and rollout guidance for the people who will own the platform internally."
  },
  {
    title: "Manager adoption",
    body: "Practical help content for approvals, attendance review, team oversight, and exception handling."
  },
  {
    title: "Operational support",
    body: "Support channels that keep implementation questions moving without creating confusion about ownership."
  }
] as const;

export const docsStartingPaths = [
  {
    title: "For HR and people teams",
    body: "Start with org setup, employee records, leave policies, exceptions, and payroll preparation workflows."
  },
  {
    title: "For operations leaders",
    body: "Start with structure, attendance, shift coverage, approvals, and live operational visibility."
  },
  {
    title: "For managers and team leads",
    body: "Start with team oversight, request handling, exceptions, and daily approval queues."
  },
  {
    title: "For employees",
    body: "Start with profile access, attendance visibility, leave requests, and notification flow."
  }
] as const;

export const demoExpectations = [
  {
    title: "A practical walkthrough",
    body: "See how EMP connects company structure, workforce workflows, approvals, and leadership visibility."
  },
  {
    title: "Role-based discussion",
    body: "We tailor the conversation around your HR, operations, leadership, and manager workflows."
  },
  {
    title: "Implementation fit",
    body: "Review team size, rollout scope, governance needs, and the systems you want to replace."
  },
  {
    title: "Next steps",
    body: "Leave with a clearer view of fit, deployment approach, and where EMP can add value first."
  }
] as const;

export const contactFaqs: FAQItem[] = [
  {
    question: "What should I prepare before booking a demo?",
    answer:
      "It helps to know your team size, your current tool stack, the workflows causing the most friction, and which stakeholders should join the conversation."
  },
  {
    question: "Who should attend the demo?",
    answer:
      "Founders, HR leaders, operations owners, department heads, or anyone responsible for workforce workflows and approvals usually gets the most value from the session."
  },
  {
    question: "Is the contact form connected to a backend?",
    answer:
      "Once you submit the form, the EMP team can use your details to prepare a more relevant demo conversation and follow up with the right next step."
  }
];

export const employeeManagementSignals = [
  {
    title: "One system instead of a stitched stack",
    body: "EMP combines company structure, employee records, attendance, leave, approvals, collaboration, and reporting in one operating layer."
  },
  {
    title: "Built for managers, HR, and leadership",
    body: "Different roles get the right visibility and controls without forcing the organization to bounce between disconnected tools."
  },
  {
    title: "Better fit for growing organizations",
    body: "The platform is designed for teams that have outgrown spreadsheets, manual approval chains, and siloed workforce software."
  }
] as const;

export const employeeManagementOutcomes = [
  "Reduce spreadsheet-led attendance and leave handling",
  "Keep approvals closer to the people and policies they affect",
  "Give managers a clearer view of team capacity and exceptions",
  "Support payroll preparation with cleaner operational inputs",
  "Model departments, reporting lines, and role ownership centrally",
  "Give leadership a live view of workforce movement and bottlenecks"
] as const;

export const employeeManagementFaqs: FAQItem[] = [
  {
    question: "What makes EMP different from generic employee management software?",
    answer:
      "EMP is positioned as a Workforce OS, not just an employee record system. It connects company structure, approvals, attendance, leave, collaboration, reporting, and leadership visibility in one platform."
  },
  {
    question: "Can EMP replace spreadsheets for attendance and leave?",
    answer:
      "Yes. EMP is built for teams that want attendance, leave balances, exceptions, approvals, and manager visibility to live in a cleaner operational system instead of scattered sheets and messages."
  },
  {
    question: "Is EMP suitable for multi-department organizations?",
    answer:
      "Yes. The product story is strongest for organizations with departments, reporting layers, multiple managers, and operational workflows that need a shared company model."
  },
  {
    question: "Who usually evaluates EMP first?",
    answer:
      "Founders, HR leaders, operations managers, and department heads usually evaluate EMP when they need stronger control, cleaner routing, and better workforce visibility."
  }
] as const;

export type SeoClusterPageKey =
  | "employeeManagement"
  | "attendanceManagement"
  | "leaveManagement"
  | "payrollManagement"
  | "employeeDirectory"
  | "workforceAnalytics";

export type SeoClusterLink = {
  key: SeoClusterPageKey;
  title: string;
  body: string;
  href: string;
  label: string;
};

export type SeoClusterPage = {
  key: SeoClusterPageKey;
  shortTitle: string;
  title: string;
  path: string;
  metadataDescription: string;
  keywords: string[];
  softwareName: string;
  softwareDescription: string;
  eyebrow: string;
  heroTitleStart: string;
  heroTitleAccent: string;
  heroTitleEnd: string;
  heroDescription: string;
  categoryFit: ReadonlyArray<string>;
  signals: ReadonlyArray<{
    title: string;
    body: string;
  }>;
  outcomes: ReadonlyArray<string>;
  capabilities: ReadonlyArray<{
    title: string;
    body: string;
    href: string;
    label: string;
  }>;
  faqs: FAQItem[];
  relatedKeys: SeoClusterPageKey[];
  cta: {
    eyebrow: string;
    title: string;
    description: string;
    primary: ActionLink;
    secondary: ActionLink;
  };
};

export const seoClusterLinkMap: Record<SeoClusterPageKey, SeoClusterLink> = {
  employeeManagement: {
    key: "employeeManagement",
    title: "Employee management software",
    body: "Start with the pillar page that frames EMP as a connected Workforce OS for records, approvals, attendance, leave, payroll support, and leadership visibility.",
    href: "/employee-management-software",
    label: "Open employee management guide"
  },
  attendanceManagement: {
    key: "attendanceManagement",
    title: "Attendance management software",
    body: "See how EMP gives operations, HR, and managers tighter control over daily presence, exceptions, shift visibility, and review workflows.",
    href: "/attendance-management-software",
    label: "Explore attendance software"
  },
  leaveManagement: {
    key: "leaveManagement",
    title: "Leave management system",
    body: "Review how EMP standardizes policy execution, balances, approvals, overlap visibility, and audit-friendly leave coordination.",
    href: "/leave-management-system",
    label: "Explore leave management"
  },
  payrollManagement: {
    key: "payrollManagement",
    title: "Payroll management software",
    body: "Understand how EMP helps finance and HR teams reach payroll readiness faster with cleaner inputs, exception control, and operational visibility.",
    href: "/payroll-management-software",
    label: "Explore payroll software"
  },
  employeeDirectory: {
    key: "employeeDirectory",
    title: "Employee directory software",
    body: "See how EMP turns fragmented employee records into a structured, searchable source of truth for reporting lines, roles, and team context.",
    href: "/employee-directory-software",
    label: "Explore directory software"
  },
  workforceAnalytics: {
    key: "workforceAnalytics",
    title: "Workforce analytics software",
    body: "See how EMP helps leadership spot trends, bottlenecks, staffing pressure, and policy exceptions without waiting for stitched-together reporting.",
    href: "/workforce-analytics-software",
    label: "Explore workforce analytics"
  }
};

export const seoClusterPages: Record<SeoClusterPageKey, SeoClusterPage> = {
  employeeManagement: {
    key: "employeeManagement",
    shortTitle: "Employee Management Software",
    title: "Employee Management Software",
    path: "/employee-management-software",
    metadataDescription:
      "Explore EMP as premium employee management software for organizations that need structure, attendance, leave, approvals, collaboration, and leadership visibility in one platform.",
    keywords: [
      "employee management software",
      "employee management system",
      "workforce management platform",
      "attendance and leave software",
      "employee management solution"
    ],
    softwareName: "EMP Employee Management Software",
    softwareDescription:
      "Premium employee management software for company structure, attendance, leave, approvals, collaboration, and leadership visibility.",
    eyebrow: "Employee management software",
    heroTitleStart: "Employee management software for companies that need",
    heroTitleAccent: "operational structure",
    heroTitleEnd: ", not just records.",
    heroDescription:
      "EMP gives growing organizations a more complete system for employee records, attendance, leave, approvals, collaboration, and leadership visibility than a generic admin tool can offer.",
    categoryFit: [
      "Employee records and org structure",
      "Attendance, leave, and approvals",
      "Manager oversight and accountability",
      "Leadership reporting and operating clarity"
    ],
    signals: employeeManagementSignals,
    outcomes: employeeManagementOutcomes,
    capabilities: [
      {
        title: "Attendance management",
        body: "Control daily presence, exceptions, shift reviews, and manager visibility without relying on spreadsheet-led reconciliation.",
        href: "/attendance-management-software",
        label: "Attendance software"
      },
      {
        title: "Leave management",
        body: "Standardize policies, balances, approvals, and overlap handling inside the same workforce operating model.",
        href: "/leave-management-system",
        label: "Leave management"
      },
      {
        title: "Payroll support",
        body: "Give finance and HR cleaner inputs for payroll readiness by connecting records, leave, attendance, and approvals.",
        href: "/payroll-management-software",
        label: "Payroll software"
      },
      {
        title: "Directory and org clarity",
        body: "Keep employee records, reporting lines, and contact context in a structured directory the business can trust.",
        href: "/employee-directory-software",
        label: "Employee directory"
      },
      {
        title: "Workforce analytics",
        body: "Turn workforce activity into executive visibility with trend reporting, bottleneck detection, and operational insight.",
        href: "/workforce-analytics-software",
        label: "Workforce analytics"
      }
    ],
    faqs: employeeManagementFaqs,
    relatedKeys: [
      "attendanceManagement",
      "leaveManagement",
      "payrollManagement",
      "employeeDirectory",
      "workforceAnalytics"
    ],
    cta: {
      eyebrow: "See the full platform",
      title: "Evaluate EMP as employee management software with the operating depth serious teams need.",
      description:
        "Use a live demo to review your structure, workforce workflows, approvals, and rollout priorities in one conversation.",
      primary: { href: "/contact", label: "Book Demo" },
      secondary: { href: "/pricing", label: "Review pricing approach" }
    }
  },
  attendanceManagement: {
    key: "attendanceManagement",
    shortTitle: "Attendance Management Software",
    title: "Attendance Management Software",
    path: "/attendance-management-software",
    metadataDescription:
      "Explore EMP as attendance management software for enterprises that need shift visibility, exception control, manager review, and workforce accountability.",
    keywords: [
      "attendance management software",
      "attendance tracking software",
      "attendance system for employees",
      "shift attendance software",
      "enterprise attendance management"
    ],
    softwareName: "EMP Attendance Management Software",
    softwareDescription:
      "Premium attendance management software for attendance visibility, exception handling, shift review, and operational accountability.",
    eyebrow: "Attendance management software",
    heroTitleStart: "Attendance management software for teams that need",
    heroTitleAccent: "daily workforce control",
    heroTitleEnd: ", not delayed reconciliation.",
    heroDescription:
      "EMP helps operations, HR, and managers track daily presence, late arrivals, missing punches, shift exceptions, and review workflows inside one connected workforce system.",
    categoryFit: [
      "Daily attendance visibility",
      "Shift coverage and exceptions",
      "Manager review workflows",
      "Audit-friendly workforce records"
    ],
    signals: [
      {
        title: "See attendance issues early",
        body: "Managers can review late arrivals, missing punches, and pattern changes before daily operations drift."
      },
      {
        title: "Keep exceptions inside the workflow",
        body: "Attendance adjustments, reviews, and accountability stay attached to people, teams, and approval history."
      },
      {
        title: "Support distributed operations",
        body: "EMP fits organizations running multiple teams, sites, or shifts that need a cleaner attendance operating rhythm."
      }
    ],
    outcomes: [
      "Reduce manual attendance cleanup at the end of the pay cycle",
      "Give managers faster visibility into missing punches and late arrivals",
      "Keep shift issues tied to the right team and reporting line",
      "Create cleaner attendance records for payroll and policy review",
      "Improve escalation when repeated attendance exceptions appear",
      "Replace side-channel attendance follow-up with structured workflows"
    ],
    capabilities: [
      {
        title: "Attendance plus employee context",
        body: "Tie each attendance record to the employee, team, manager, and policy context that explains what happened.",
        href: "/employee-management-software",
        label: "See the full platform"
      },
      {
        title: "Leave coordination",
        body: "Avoid blind spots by keeping approved leave and attendance exceptions aligned in the same operating system.",
        href: "/leave-management-system",
        label: "See leave management"
      },
      {
        title: "Payroll readiness",
        body: "Give finance and HR a cleaner handoff by resolving attendance exceptions before payroll pressure builds.",
        href: "/payroll-management-software",
        label: "See payroll support"
      }
    ],
    faqs: [
      {
        question: "What kind of teams benefit most from EMP attendance management software?",
        answer:
          "EMP is strongest for organizations with multiple managers, locations, shifts, or review layers that need more operational control than spreadsheet attendance logs can provide."
      },
      {
        question: "Can EMP help with attendance exceptions and manager review?",
        answer:
          "Yes. EMP is positioned around visibility into missing punches, late arrivals, shift issues, and manager-led review workflows so exceptions do not disappear into chat threads."
      },
      {
        question: "How does attendance data connect to the broader platform?",
        answer:
          "Attendance sits inside the same company model as employee records, leave, approvals, and payroll support so teams work from shared context instead of disconnected tools."
      },
      {
        question: "Is EMP built only for basic clock tracking?",
        answer:
          "No. The story is broader than raw clock events. EMP is designed for organizations that need operational visibility, accountability, and downstream coordination."
      }
    ],
    relatedKeys: [
      "employeeManagement",
      "leaveManagement",
      "payrollManagement",
      "workforceAnalytics"
    ],
    cta: {
      eyebrow: "Review operational fit",
      title: "See how EMP handles attendance with more structure and less manual follow-up.",
      description:
        "A guided demo can map your attendance exceptions, manager review flow, and rollout priorities before you commit to a broader workforce platform change.",
      primary: { href: "/contact", label: "Book Demo" },
      secondary: { href: "/pricing", label: "Review pricing approach" }
    }
  },
  leaveManagement: {
    key: "leaveManagement",
    shortTitle: "Leave Management System",
    title: "Leave Management System",
    path: "/leave-management-system",
    metadataDescription:
      "Explore EMP as a leave management system for enterprises that need policy consistency, balance visibility, approvals, overlap control, and audit-friendly workflows.",
    keywords: [
      "leave management system",
      "leave management software",
      "employee leave tracker",
      "pto management system",
      "enterprise leave management"
    ],
    softwareName: "EMP Leave Management System",
    softwareDescription:
      "Premium leave management software for policy execution, leave balances, approvals, overlap visibility, and workforce coordination.",
    eyebrow: "Leave management system",
    heroTitleStart: "Leave management for companies that need",
    heroTitleAccent: "policy discipline",
    heroTitleEnd: " across teams and managers.",
    heroDescription:
      "EMP helps enterprises standardize leave requests, balances, approvals, overlap visibility, and manager coordination without relying on manual interpretation of policy.",
    categoryFit: [
      "Leave policy consistency",
      "Balance and overlap visibility",
      "Manager and HR approvals",
      "Compliance-minded records"
    ],
    signals: [
      {
        title: "Reduce policy drift",
        body: "Leave rules stay closer to the system so different departments do not interpret the same policy differently."
      },
      {
        title: "Spot staffing impact sooner",
        body: "Approvers can see balance, overlap, and team coverage context before leave requests create downstream pressure."
      },
      {
        title: "Keep the audit trail cleaner",
        body: "Requests, approvals, and changes stay visible in one place instead of being split across inboxes and messages."
      }
    ],
    outcomes: [
      "Standardize leave approvals across departments and managers",
      "Improve visibility into overlapping absences and staffing coverage",
      "Reduce manual leave balance lookups and policy interpretation",
      "Create cleaner records for workforce planning and payroll support",
      "Make HR review more consistent and audit-friendly",
      "Give employees a clearer request path with fewer back-and-forth messages"
    ],
    capabilities: [
      {
        title: "Attendance coordination",
        body: "Approved leave and attendance exceptions stay aligned so managers are not chasing conflicting records.",
        href: "/attendance-management-software",
        label: "See attendance management"
      },
      {
        title: "Employee records and policy context",
        body: "Leave requests inherit the same employee, team, and reporting structure used across the platform.",
        href: "/employee-directory-software",
        label: "See directory software"
      },
      {
        title: "Leadership visibility",
        body: "Surface leave pressure, approval bottlenecks, and policy exceptions as part of broader workforce analytics.",
        href: "/workforce-analytics-software",
        label: "See workforce analytics"
      }
    ],
    faqs: [
      {
        question: "Why position EMP as a leave management system instead of a basic leave tracker?",
        answer:
          "Because the value is not just recording requests. EMP helps organizations standardize policy execution, approvals, balance visibility, overlap handling, and manager coordination."
      },
      {
        question: "Can EMP support different teams and approval layers?",
        answer:
          "Yes. EMP is designed for organizations where leave requests move through different managers, departments, or oversight paths and still need a shared operating model."
      },
      {
        question: "How does leave management connect to payroll and attendance?",
        answer:
          "Leave sits alongside attendance, employee records, approvals, and payroll support so downstream teams work from cleaner and more consistent data."
      },
      {
        question: "Is EMP a fit for enterprise policy complexity?",
        answer:
          "Yes. The strongest fit is for organizations that need structure, visibility, and governance across multiple teams rather than a lightweight standalone request form."
      }
    ],
    relatedKeys: [
      "employeeManagement",
      "attendanceManagement",
      "employeeDirectory",
      "workforceAnalytics"
    ],
    cta: {
      eyebrow: "Make leave policies easier to run",
      title: "Pressure-test EMP against your leave rules, approval chains, and staffing constraints.",
      description:
        "Use a live conversation to review balances, overlap visibility, escalation flow, and the wider workforce workflows that leave management depends on.",
      primary: { href: "/contact", label: "Book Demo" },
      secondary: { href: "/pricing", label: "Review pricing approach" }
    }
  },
  payrollManagement: {
    key: "payrollManagement",
    shortTitle: "Payroll Management Software",
    title: "Payroll Management Software",
    path: "/payroll-management-software",
    metadataDescription:
      "Explore EMP as payroll management software for enterprises that need payroll-ready inputs, exception control, finance and HR coordination, and audit-friendly workforce data.",
    keywords: [
      "payroll management software",
      "payroll software for employees",
      "payroll workflow software",
      "enterprise payroll management",
      "payroll operations platform"
    ],
    softwareName: "EMP Payroll Management Software",
    softwareDescription:
      "Premium payroll management software for payroll-ready inputs, exception control, finance and HR coordination, and workforce visibility.",
    eyebrow: "Payroll management software",
    heroTitleStart: "Payroll management software for teams that need",
    heroTitleAccent: "cleaner payroll readiness",
    heroTitleEnd: " before the deadline hits.",
    heroDescription:
      "EMP helps finance, HR, and operations teams move toward payroll with cleaner workforce records, fewer unresolved exceptions, and better visibility into what needs attention.",
    categoryFit: [
      "Payroll-ready workforce inputs",
      "Finance and HR coordination",
      "Attendance and leave exception control",
      "Audit-friendly operating records"
    ],
    signals: [
      {
        title: "Resolve issues before payroll crunch time",
        body: "Attendance, leave, and employee record issues can be reviewed earlier so payroll is not forced into late-cycle cleanup."
      },
      {
        title: "Keep finance and HR on shared context",
        body: "EMP connects the people data and operational workflows that usually create payroll friction when systems are disconnected."
      },
      {
        title: "Improve confidence in payroll inputs",
        body: "Cleaner records and approval history help teams export and review payroll inputs with fewer surprises."
      }
    ],
    outcomes: [
      "Reduce last-minute payroll exception handling",
      "Improve confidence in attendance and leave inputs before payroll runs",
      "Give HR and finance a clearer shared view of unresolved issues",
      "Keep payroll support tied to the same employee and policy context",
      "Strengthen auditability around corrections and approvals",
      "Lower the operating drag of spreadsheet-based payroll preparation"
    ],
    capabilities: [
      {
        title: "Attendance and leave handoff",
        body: "Bring attendance review and leave approvals into the payroll preparation conversation before errors accumulate.",
        href: "/attendance-management-software",
        label: "See attendance management"
      },
      {
        title: "Structured employee records",
        body: "Use a cleaner employee source of truth so finance and HR are not reconciling key payroll context from multiple files.",
        href: "/employee-directory-software",
        label: "See employee directory"
      },
      {
        title: "Executive visibility",
        body: "Surface payroll pressure, exception trends, and operational bottlenecks as part of broader workforce analytics.",
        href: "/workforce-analytics-software",
        label: "See workforce analytics"
      }
    ],
    faqs: [
      {
        question: "Is EMP a full billing or payroll checkout system?",
        answer:
          "No. This positioning is about payroll management and payroll readiness inside a broader Workforce OS, not about adding checkout or billing logic to the marketing site."
      },
      {
        question: "What makes EMP useful for payroll teams?",
        answer:
          "EMP helps payroll-adjacent teams get cleaner attendance, leave, employee, and approval inputs so payroll reviews become easier to manage and less dependent on late manual reconciliation."
      },
      {
        question: "Does EMP only help HR teams?",
        answer:
          "No. The strongest fit is where HR, finance, and operations all depend on the same workforce data and need better coordination ahead of payroll."
      },
      {
        question: "How does payroll management fit the EMP product story?",
        answer:
          "Payroll support is one part of a connected platform that also covers employee records, attendance, leave, approvals, and workforce visibility."
      }
    ],
    relatedKeys: [
      "employeeManagement",
      "attendanceManagement",
      "employeeDirectory",
      "workforceAnalytics"
    ],
    cta: {
      eyebrow: "Reduce payroll friction",
      title: "Review how EMP can improve payroll readiness without adding more disconnected tooling.",
      description:
        "A live demo can focus on exception handling, cross-team ownership, data quality, and the rollout scope that makes sense for your organization.",
      primary: { href: "/contact", label: "Book Demo" },
      secondary: { href: "/pricing", label: "Review pricing approach" }
    }
  },
  employeeDirectory: {
    key: "employeeDirectory",
    shortTitle: "Employee Directory Software",
    title: "Employee Directory Software",
    path: "/employee-directory-software",
    metadataDescription:
      "Explore EMP as employee directory software for enterprises that need structured records, reporting lines, org clarity, and reliable workforce discovery.",
    keywords: [
      "employee directory software",
      "employee directory system",
      "staff directory software",
      "company directory software",
      "enterprise employee directory"
    ],
    softwareName: "EMP Employee Directory Software",
    softwareDescription:
      "Premium employee directory software for structured records, reporting lines, org clarity, and workforce discovery.",
    eyebrow: "Employee directory software",
    heroTitleStart: "Employee directory software that gives the business",
    heroTitleAccent: "real org clarity",
    heroTitleEnd: " instead of fragmented records.",
    heroDescription:
      "EMP helps organizations maintain a structured employee directory with reporting lines, role context, department visibility, and the live workforce data daily operations depend on.",
    categoryFit: [
      "Structured employee records",
      "Reporting lines and org context",
      "Searchable workforce discovery",
      "Trusted source of truth"
    ],
    signals: [
      {
        title: "Replace scattered profile data",
        body: "Bring core employee, role, manager, and team information into one directory the organization can actually trust."
      },
      {
        title: "Improve discoverability",
        body: "Help teams find the right people, understand reporting lines, and confirm workforce context without hunting through chat threads or files."
      },
      {
        title: "Strengthen every downstream workflow",
        body: "A structured directory improves attendance, leave, approvals, analytics, and payroll support because they all inherit the same people model."
      }
    ],
    outcomes: [
      "Create a cleaner employee source of truth across departments",
      "Make reporting lines and team ownership easier to understand",
      "Reduce duplicate profile maintenance across systems and files",
      "Improve confidence in manager, role, and department context",
      "Support downstream workflows with more reliable employee records",
      "Give leadership and admins better visibility into org structure changes"
    ],
    capabilities: [
      {
        title: "Employee management platform fit",
        body: "The directory is more valuable because it lives inside a wider employee management platform instead of as a standalone contact list.",
        href: "/employee-management-software",
        label: "See the full platform"
      },
      {
        title: "Payroll and leave support",
        body: "HR and finance can work from cleaner employee context when leave, payroll, and approvals depend on the same records.",
        href: "/payroll-management-software",
        label: "See payroll support"
      },
      {
        title: "Operational insight",
        body: "Leadership gets better analytics when reporting lines, teams, and employee attributes are structured from the start.",
        href: "/workforce-analytics-software",
        label: "See workforce analytics"
      }
    ],
    faqs: [
      {
        question: "What makes EMP different from a basic staff directory?",
        answer:
          "EMP is not just a searchable directory. It connects employee records, reporting lines, attendance, leave, approvals, and analytics inside one workforce operating system."
      },
      {
        question: "Who benefits most from employee directory software?",
        answer:
          "Organizations with multiple teams, managers, departments, or growing workforce complexity benefit most because discoverability and reporting clarity matter more as the business scales."
      },
      {
        question: "Can the directory support operational workflows?",
        answer:
          "Yes. The directory is designed as shared context for approvals, attendance, leave, payroll support, and leadership reporting rather than as a disconnected HR reference page."
      },
      {
        question: "Why is org structure important on this page?",
        answer:
          "Because the real value comes from showing who reports to whom, how teams are organized, and how workforce data flows through the wider operating system."
      }
    ],
    relatedKeys: [
      "employeeManagement",
      "payrollManagement",
      "leaveManagement",
      "workforceAnalytics"
    ],
    cta: {
      eyebrow: "Turn records into operating context",
      title: "See how EMP gives teams a structured employee directory with real organizational depth.",
      description:
        "A live walkthrough can focus on reporting lines, employee record governance, downstream workflow impact, and how directory clarity supports broader rollout goals.",
      primary: { href: "/contact", label: "Book Demo" },
      secondary: { href: "/pricing", label: "Review pricing approach" }
    }
  },
  workforceAnalytics: {
    key: "workforceAnalytics",
    shortTitle: "Workforce Analytics Software",
    title: "Workforce Analytics Software",
    path: "/workforce-analytics-software",
    metadataDescription:
      "Explore EMP as workforce analytics software for enterprises that need trend reporting, bottleneck detection, staffing insight, and leadership visibility.",
    keywords: [
      "workforce analytics software",
      "employee analytics software",
      "workforce reporting software",
      "workforce intelligence platform",
      "enterprise workforce analytics"
    ],
    softwareName: "EMP Workforce Analytics Software",
    softwareDescription:
      "Premium workforce analytics software for trend reporting, bottleneck detection, staffing insight, and leadership visibility.",
    eyebrow: "Workforce analytics software",
    heroTitleStart: "Workforce analytics software for leaders who need",
    heroTitleAccent: "live operating insight",
    heroTitleEnd: " instead of stitched reports.",
    heroDescription:
      "EMP helps leadership teams review workforce movement, staffing pressure, approval bottlenecks, attendance trends, and policy exceptions from one connected operating model.",
    categoryFit: [
      "Executive workforce visibility",
      "Trend reporting and bottlenecks",
      "Staffing and policy insight",
      "Cross-functional operating context"
    ],
    signals: [
      {
        title: "See the workforce as it operates",
        body: "EMP turns daily attendance, leave, approvals, and structure changes into visibility that leadership can actually use."
      },
      {
        title: "Reduce reporting lag",
        body: "Leaders do not have to wait for manual consolidation when workforce workflows already live in one connected platform."
      },
      {
        title: "Find pressure points sooner",
        body: "Spot overloaded teams, approval bottlenecks, exception patterns, and policy friction before they become larger operating problems."
      }
    ],
    outcomes: [
      "Improve executive visibility into workforce movement and pressure",
      "Reduce dependence on manually stitched people reports",
      "Spot approval bottlenecks and exception patterns earlier",
      "Connect attendance, leave, payroll support, and structure into one reporting view",
      "Give department leaders a clearer picture of operating risk",
      "Support better rollout and staffing decisions with live context"
    ],
    capabilities: [
      {
        title: "Attendance and leave insight",
        body: "Workforce analytics is stronger when it inherits attendance and leave data from the same underlying operating system.",
        href: "/attendance-management-software",
        label: "See attendance management"
      },
      {
        title: "Directory and org context",
        body: "Leadership reporting improves when teams, reporting lines, and employee records are structured clearly from the start.",
        href: "/employee-directory-software",
        label: "See employee directory"
      },
      {
        title: "Broader employee management story",
        body: "Analytics is one part of a wider platform for employee management, approvals, and workforce control.",
        href: "/employee-management-software",
        label: "See the full platform"
      }
    ],
    faqs: [
      {
        question: "What makes EMP different from a standalone workforce analytics tool?",
        answer:
          "EMP analytics is grounded in the same records, approvals, attendance, leave, and org structure the company already uses, which makes the reporting context stronger and more actionable."
      },
      {
        question: "Who usually cares most about workforce analytics software?",
        answer:
          "Founders, executives, HR leaders, and operations leaders care most when they need faster visibility into staffing, bottlenecks, exceptions, and organization-wide workforce patterns."
      },
      {
        question: "Can workforce analytics help beyond reporting?",
        answer:
          "Yes. Better analytics helps leaders identify where approvals stall, where policies create friction, and where teams need stronger operational support."
      },
      {
        question: "Does EMP require a separate analytics stack to be useful?",
        answer:
          "No. The product story is that workforce analytics becomes more useful because it is part of the same connected operating system rather than bolted on later."
      }
    ],
    relatedKeys: [
      "employeeManagement",
      "attendanceManagement",
      "leaveManagement",
      "employeeDirectory"
    ],
    cta: {
      eyebrow: "See the workforce more clearly",
      title: "Review how EMP can turn daily workforce activity into leadership-level operating insight.",
      description:
        "A guided demo can focus on the metrics, bottlenecks, reporting questions, and rollout scope that matter most to your leadership team.",
      primary: { href: "/contact", label: "Book Demo" },
      secondary: { href: "/pricing", label: "Review pricing approach" }
    }
  }
};

export function getSeoClusterLinks(keys: SeoClusterPageKey[]): SeoClusterLink[] {
  return keys.map((key) => seoClusterLinkMap[key]);
}
