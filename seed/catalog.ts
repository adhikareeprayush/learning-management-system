import { CourseStatus, Level } from "@prisma/client";
import type { CourseSeed } from "./helpers";

export const courseCatalog: CourseSeed[] = [
  {
    slug: "intro-to-web-development",
    title: "Intro to Web Development",
    description:
      "Go from zero to a deployed portfolio site. Learn semantic HTML, modern CSS layout, and JavaScript fundamentals through guided projects.",
    category: "Web Development",
    level: Level.BEGINNER,
    featured: true,
    price: 4999,
    priceNpr: 149900,
    duration: 720,
    thumbnail: "/images/courses/1.png",
    outcomes: [
      "Build responsive, accessible web pages",
      "Style layouts with Flexbox and CSS Grid",
      "Add interactivity with vanilla JavaScript",
      "Deploy a static site to the web",
    ],
    modules: [
      {
        order: 1,
        title: "HTML & document structure",
        description: "Write clean, semantic markup that search engines and screen readers understand.",
        lessons: [
          {
            order: 1,
            title: "Your first HTML page",
            summary: "Document structure, headings, paragraphs, and links.",
            content:
              "Learn the anatomy of an HTML document: doctype, head, body, and semantic landmarks. You'll build a personal bio page with proper heading hierarchy and accessible links.",
            duration: 28,
            isFree: true,
          },
          {
            order: 2,
            title: "Lists, images, and media",
            summary: "Structure content with lists and embed images responsibly.",
            content:
              "Cover unordered and ordered lists, figure/figcaption, img alt text, and basic audio/video elements. Practice by building a recipe or reading-list page.",
            duration: 32,
          },
          {
            order: 3,
            title: "Forms and user input",
            summary: "Collect data with accessible form controls.",
            content:
              "Explore input types, labels, fieldsets, buttons, and validation attributes. Build a contact form that works without JavaScript.",
            duration: 35,
          },
        ],
      },
      {
        order: 2,
        title: "CSS layout & design",
        description: "Make pages look professional with typography, color, and layout systems.",
        lessons: [
          {
            order: 4,
            title: "Selectors and the box model",
            summary: "Target elements and control spacing with the box model.",
            content:
              "Master class/id selectors, specificity, margin, padding, border, and box-sizing. Style your bio page with a cohesive color palette.",
            duration: 38,
          },
          {
            order: 5,
            title: "Flexbox for components",
            summary: "Align and distribute space in nav bars, cards, and footers.",
            content:
              "Use flex-direction, justify-content, align-items, and gap to build responsive navigation and card grids without frameworks.",
            duration: 42,
          },
          {
            order: 6,
            title: "CSS Grid for page layouts",
            summary: "Design full-page layouts with rows and columns.",
            content:
              "Create hero + sidebar + footer layouts using grid-template-areas. Add a mobile breakpoint with a single column stack.",
            duration: 45,
          },
        ],
      },
      {
        order: 3,
        title: "JavaScript essentials",
        description: "Bring pages to life with variables, DOM APIs, and events.",
        lessons: [
          {
            order: 7,
            title: "Variables, functions, and logic",
            summary: "Core programming building blocks in the browser.",
            content:
              "Declare variables with let/const, write functions, and use if/else and loops. Solve small challenges in the browser console.",
            duration: 50,
          },
          {
            order: 8,
            title: "The DOM and events",
            summary: "Read and update the page from JavaScript.",
            content:
              "Select elements, update text and classes, and respond to clicks and keyboard input. Build a theme toggle and accordion component.",
            duration: 55,
          },
          {
            order: 9,
            title: "Deploy your portfolio",
            summary: "Ship your project to a public URL.",
            content:
              "Prepare assets, set meta tags for SEO, and deploy to a static host. Share your live link and reflect on what you learned.",
            duration: 30,
          },
        ],
      },
    ],
  },
  {
    slug: "javascript-deep-dive",
    title: "JavaScript Deep Dive",
    description:
      "Level up from basics to professional patterns — closures, async/await, modules, and modern tooling used in real codebases.",
    category: "Web Development",
    level: Level.INTERMEDIATE,
    featured: true,
    price: 5499,
    priceNpr: 164900,
    duration: 840,
    thumbnail: "/images/courses/2.png",
    outcomes: [
      "Explain closures, prototypes, and the event loop",
      "Fetch and display data with async/await",
      "Structure code with ES modules",
      "Use npm and a modern bundler workflow",
    ],
    modules: [
      {
        order: 1,
        title: "Language fundamentals",
        description: "Deep understanding of how JavaScript actually works.",
        lessons: [
          {
            order: 1,
            title: "Scope, closures, and this",
            summary: "Why variables behave the way they do.",
            content:
              "Trace execution contexts, lexical scope, closure use cases, and how this binding changes across regular functions, arrows, and methods.",
            duration: 45,
            isFree: true,
          },
          {
            order: 2,
            title: "Arrays, objects, and immutability",
            summary: "Work with data without accidental side effects.",
            content:
              "Spread/rest, destructuring, map/filter/reduce, and shallow vs deep copies. Refactor imperative loops into declarative transforms.",
            duration: 48,
          },
          {
            order: 3,
            title: "Prototypes and classes",
            summary: "Object-oriented patterns in modern JS.",
            content:
              "Prototype chain, constructor functions, class syntax, extends, and when to prefer composition over inheritance.",
            duration: 52,
          },
        ],
      },
      {
        order: 2,
        title: "Async JavaScript",
        description: "Network requests, promises, and error handling.",
        lessons: [
          {
            order: 4,
            title: "Callbacks to promises",
            summary: "Evolve from callback hell to readable async code.",
            content:
              "Compare callbacks, Promise chains, and async/await. Handle errors with try/catch and finally blocks.",
            duration: 40,
          },
          {
            order: 5,
            title: "Fetch API and REST basics",
            summary: "Load live data into your apps.",
            content:
              "GET/POST requests, JSON parsing, loading states, and displaying API errors gracefully in the UI.",
            duration: 55,
          },
          {
            order: 6,
            title: "The event loop explained",
            summary: "Microtasks, macrotasks, and performance intuition.",
            content:
              "Visualize the call stack, task queue, and microtask queue. Debug timing bugs and avoid blocking the main thread.",
            duration: 38,
          },
        ],
      },
      {
        order: 3,
        title: "Modules & tooling",
        description: "Organize projects like a production team.",
        lessons: [
          {
            order: 7,
            title: "ES modules import/export",
            summary: "Split code across files with clear boundaries.",
            content:
              "Named vs default exports, barrel files, and tree-shaking basics. Refactor a monolithic script into modules.",
            duration: 42,
          },
          {
            order: 8,
            title: "npm scripts and dependencies",
            summary: "Manage packages and run dev workflows.",
            content:
              "Read package.json, install dev dependencies, run lint/build scripts, and understand semver at a high level.",
            duration: 35,
          },
          {
            order: 9,
            title: "Debugging in DevTools",
            summary: "Find bugs faster with breakpoints and the console.",
            content:
              "Use Sources panel breakpoints, watch expressions, network throttling, and console grouping to diagnose real issues.",
            duration: 33,
          },
        ],
      },
    ],
  },
  {
    slug: "react-fundamentals",
    title: "React Fundamentals",
    description:
      "Build interactive UIs with components, hooks, and state. Create a multi-page app with routing and reusable design patterns.",
    category: "Web Development",
    level: Level.INTERMEDIATE,
    featured: true,
    price: 6499,
    priceNpr: 194900,
    duration: 900,
    thumbnail: "/images/courses/4.png",
    outcomes: [
      "Compose UIs from reusable React components",
      "Manage state with useState and useEffect",
      "Fetch data and handle loading/error states",
      "Route between pages in a single-page app",
    ],
    modules: [
      {
        order: 1,
        title: "Components & JSX",
        description: "Think in components from day one.",
        lessons: [
          {
            order: 1,
            title: "What is React?",
            summary: "Declarative UI and the component model.",
            content:
              "Compare imperative DOM updates vs React's render cycle. Scaffold a Vite + React project and render your first component tree.",
            duration: 30,
            isFree: true,
          },
          {
            order: 2,
            title: "Props and composition",
            summary: "Pass data down and compose layouts.",
            content:
              "Build a Card, Avatar, and Button library. Use children props and layout components to avoid prop drilling early on.",
            duration: 45,
          },
          {
            order: 3,
            title: "Lists, keys, and conditional UI",
            summary: "Render dynamic collections safely.",
            content:
              "Map over arrays, choose stable keys, and show empty states. Add search filtering to a course catalog mockup.",
            duration: 40,
          },
        ],
      },
      {
        order: 2,
        title: "State & effects",
        description: "Make components interactive and connected to the outside world.",
        lessons: [
          {
            order: 4,
            title: "useState patterns",
            summary: "Local state for forms, toggles, and counters.",
            content:
              "Controlled inputs, derived state, and lifting state up. Build a multi-step enrollment wizard.",
            duration: 50,
          },
          {
            order: 5,
            title: "useEffect and data fetching",
            summary: "Side effects without infinite loops.",
            content:
              "Dependency arrays, cleanup functions, and fetching course data on mount. Display skeleton loaders while waiting.",
            duration: 55,
          },
          {
            order: 6,
            title: "Forms and validation",
            summary: "Collect user input with accessible feedback.",
            content:
              "Client-side validation, error messages, and submit handling. Wire a newsletter signup form to a mock API.",
            duration: 48,
          },
        ],
      },
      {
        order: 3,
        title: "Routing & project",
        description: "Ship a small multi-page React application.",
        lessons: [
          {
            order: 7,
            title: "Client-side routing",
            summary: "Navigate without full page reloads.",
            content:
              "Set up React Router with nested routes, route params, and a 404 page. Link from catalog to course detail views.",
            duration: 42,
          },
          {
            order: 8,
            title: "Context for shared state",
            summary: "Avoid prop drilling for theme and auth mocks.",
            content:
              "Create AuthProvider and ThemeProvider contexts. Consume them in navbar and dashboard shells.",
            duration: 38,
          },
          {
            order: 9,
            title: "Capstone: mini LMS dashboard",
            summary: "Combine everything into one polished project.",
            content:
              "Build a student dashboard with course progress, assignments list, and profile panel. Deploy to a static host.",
            duration: 60,
          },
        ],
      },
    ],
  },
  {
    slug: "digital-marketing-foundations",
    title: "Digital Marketing Foundations",
    description:
      "Plan campaigns that convert. Research audiences, craft offers, run ads, and read analytics — without the jargon overload.",
    category: "Digital Marketing",
    level: Level.INTERMEDIATE,
    featured: true,
    price: 5999,
    priceNpr: 179900,
    duration: 600,
    thumbnail: "/images/courses/3.png",
    outcomes: [
      "Define an ideal customer profile",
      "Map a simple marketing funnel",
      "Write compelling ad and email copy",
      "Interpret core metrics in Google Analytics",
    ],
    modules: [
      {
        order: 1,
        title: "Audience & positioning",
        description: "Know who you're talking to before spending a dollar on ads.",
        lessons: [
          {
            order: 1,
            title: "Audience research that sticks",
            summary: "Interviews, surveys, and empathy maps.",
            content:
              "Run five customer interviews, synthesize pain points, and document a one-page ideal learner persona.",
            duration: 35,
            isFree: true,
          },
          {
            order: 2,
            title: "Value proposition canvas",
            summary: "Match pains to your course or product offer.",
            content:
              "Map jobs-to-be-done, pains, and gains. Draft a headline and three bullet benefits for a landing page.",
            duration: 30,
          },
          {
            order: 3,
            title: "Competitive landscape scan",
            summary: "Learn from rivals without copying them.",
            content:
              "Compare three competitors' messaging, pricing, and social proof. Identify a gap you can own.",
            duration: 28,
          },
        ],
      },
      {
        order: 2,
        title: "Channels & content",
        description: "Meet learners where they already spend time.",
        lessons: [
          {
            order: 4,
            title: "Content pillars and calendar",
            summary: "Plan four weeks of posts in one sitting.",
            content:
              "Choose three content pillars, batch ideas, and schedule a month of educational posts with clear CTAs.",
            duration: 40,
          },
          {
            order: 5,
            title: "Email sequences that nurture",
            summary: "Welcome series and launch emails.",
            content:
              "Write a three-email welcome sequence and a launch announcement. Focus on one CTA per email.",
            duration: 38,
          },
          {
            order: 6,
            title: "Paid ads on a small budget",
            summary: "Meta and Google basics for course creators.",
            content:
              "Set campaign objectives, define audiences, write ad copy, and set a daily cap. Review results after seven days.",
            duration: 45,
          },
        ],
      },
      {
        order: 3,
        title: "Measure & improve",
        description: "Let data tell you what to do next.",
        lessons: [
          {
            order: 7,
            title: "Funnel metrics that matter",
            summary: "Awareness → signup → purchase → completion.",
            content:
              "Define KPIs for each stage. Build a simple spreadsheet dashboard you can update weekly.",
            duration: 32,
          },
          {
            order: 8,
            title: "Google Analytics walkthrough",
            summary: "Traffic sources, events, and conversions.",
            content:
              "Install GA4, mark key events, and read acquisition and engagement reports for a landing page.",
            duration: 42,
          },
          {
            order: 9,
            title: "Run a two-week growth experiment",
            summary: "Hypothesis, test, learn, iterate.",
            content:
              "Pick one lever (headline, CTA, or channel), run an A/B style test, and document results in a one-page memo.",
            duration: 35,
          },
        ],
      },
    ],
  },
  {
    slug: "ui-design-systems",
    title: "UI Design Systems",
    description:
      "Design consistent, accessible interfaces. Learn typography, color, spacing tokens, and hand off specs developers love.",
    category: "Design",
    level: Level.BEGINNER,
    featured: true,
    price: 4499,
    priceNpr: 134900,
    duration: 540,
    thumbnail: "/images/courses/5.png",
    outcomes: [
      "Create a type scale and color palette",
      "Build reusable component specs",
      "Document spacing and radius tokens",
      "Deliver a Figma library ready for dev handoff",
    ],
    modules: [
      {
        order: 1,
        title: "Visual foundations",
        description: "The building blocks every interface shares.",
        lessons: [
          {
            order: 1,
            title: "Typography hierarchy",
            summary: "Headings, body, and captions that guide the eye.",
            content:
              "Pick two font families, define a modular scale, and apply it to a blog and dashboard mockup.",
            duration: 35,
            isFree: true,
          },
          {
            order: 2,
            title: "Color with purpose",
            summary: "Brand, semantic, and neutral palettes.",
            content:
              "Define primary, success, warning, and error colors with accessible contrast ratios (WCAG AA).",
            duration: 40,
          },
          {
            order: 3,
            title: "Spacing and layout grids",
            summary: "8pt grids and consistent whitespace.",
            content:
              "Set spacing tokens, column grids for desktop and mobile, and align components to the grid.",
            duration: 38,
          },
        ],
      },
      {
        order: 2,
        title: "Components & documentation",
        description: "From buttons to modals — systematize the UI.",
        lessons: [
          {
            order: 4,
            title: "Buttons and form controls",
            summary: "States, sizes, and focus rings.",
            content:
              "Design primary/secondary/ghost buttons, inputs, selects, and error states. Document usage guidelines.",
            duration: 45,
          },
          {
            order: 5,
            title: "Cards, tables, and navigation",
            summary: "Patterns for dashboards and marketing pages.",
            content:
              "Spec course cards, data tables, sidebars, and top navs with responsive behavior notes.",
            duration: 50,
          },
          {
            order: 6,
            title: "Handoff and design tokens",
            summary: "Export tokens devs can implement in Tailwind.",
            content:
              "Name tokens semantically, export CSS variables, and write a short README for your design system.",
            duration: 42,
          },
        ],
      },
    ],
  },
  {
    slug: "content-strategy-for-creators",
    title: "Content Strategy for Creators",
    description:
      "Turn expertise into a content engine. Plan newsletters, social threads, and lead magnets that grow an audience around your courses.",
    category: "Digital Marketing",
    level: Level.BEGINNER,
    price: 3999,
    priceNpr: 119900,
    duration: 420,
    thumbnail: "/images/courses/6.png",
    outcomes: [
      "Define a content mission and voice",
      "Repurpose one idea across five formats",
      "Grow an email list with ethical lead magnets",
      "Measure engagement without vanity metrics",
    ],
    modules: [
      {
        order: 1,
        title: "Strategy & voice",
        description: "Clarity before consistency.",
        lessons: [
          {
            order: 1,
            title: "Find your content niche",
            summary: "Intersection of skill, demand, and joy.",
            content:
              "Use the ikigai-style exercise to pick a topic lane. Draft a one-sentence content mission.",
            duration: 25,
            isFree: true,
          },
          {
            order: 2,
            title: "Voice and tone guide",
            summary: "Sound like you — on purpose.",
            content:
              "Write three voice principles and example phrases. Apply them to a tweet, email, and video script.",
            duration: 30,
          },
        ],
      },
      {
        order: 2,
        title: "Distribution & growth",
        description: "Ship consistently and compound reach.",
        lessons: [
          {
            order: 3,
            title: "Repurpose one pillar post",
            summary: "Blog → thread → carousel → newsletter.",
            content:
              "Start with a 800-word article and break it into four formats without losing the core insight.",
            duration: 38,
          },
          {
            order: 4,
            title: "Lead magnets that convert",
            summary: "Checklists, templates, and mini-courses.",
            content:
              "Design a one-page PDF lead magnet and a landing page outline. Set a realistic signup goal.",
            duration: 35,
          },
          {
            order: 5,
            title: "Newsletter rhythm",
            summary: "Weekly sends people actually open.",
            content:
              "Pick a send day, subject line formulas, and a three-section email structure. Plan your first four issues.",
            duration: 32,
          },
        ],
      },
    ],
  },
  {
    slug: "advanced-react-patterns",
    title: "Advanced React Patterns",
    description:
      "Hooks at scale, composition, performance, and architecture decisions for production-grade React applications.",
    category: "Web Development",
    level: Level.ADVANCED,
    status: CourseStatus.PUBLISHED,
    price: 7999,
    priceNpr: 239900,
    duration: 780,
    thumbnail: "/images/courses/2.png",
    outcomes: [
      "Apply compound component and render prop patterns",
      "Optimize renders with memo and useMemo",
      "Structure feature folders and shared hooks",
      "Test components with realistic user flows",
    ],
    modules: [
      {
        order: 1,
        title: "Composition patterns",
        description: "Flexible APIs without prop explosion.",
        lessons: [
          {
            order: 1,
            title: "Compound components",
            summary: "Tabs, accordions, and menus with shared state.",
            content:
              "Build a Tabs component using context and subcomponents. Compare to a single-component props API.",
            duration: 48,
            isFree: true,
          },
          {
            order: 2,
            title: "Custom hooks for logic reuse",
            summary: "Extract data fetching and form state.",
            content:
              "Create useCourses, useDebounce, and useLocalStorage hooks. Share them across dashboard pages.",
            duration: 52,
          },
          {
            order: 3,
            title: "Controlled vs uncontrolled inputs",
            summary: "When to lift state and when to ref.",
            content:
              "Implement both patterns for a complex filter panel. Document trade-offs for your team.",
            duration: 40,
          },
        ],
      },
      {
        order: 2,
        title: "Performance & architecture",
        description: "Keep apps fast as they grow.",
        lessons: [
          {
            order: 4,
            title: "Re-render detective work",
            summary: "React DevTools Profiler in practice.",
            content:
              "Find unnecessary renders, apply React.memo judiciously, and stabilize callbacks with useCallback.",
            duration: 45,
          },
          {
            order: 5,
            title: "Code splitting and lazy routes",
            summary: "Smaller initial bundles.",
            content:
              "Lazy-load instructor and admin sections. Measure bundle size before and after.",
            duration: 38,
          },
          {
            order: 6,
            title: "Feature folders and boundaries",
            summary: "Scale a codebase past ten routes.",
            content:
              "Organize by feature vs layer. Set import boundaries and shared ui/ and lib/ conventions.",
            duration: 42,
          },
        ],
      },
    ],
  },
];

export type RoadmapSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  featured?: boolean;
  estimatedHours: number;
  thumbnail: string;
  outcomes: string[];
  courseSlugs: string[];
};

export const roadmapCatalog: RoadmapSeed[] = [
  {
    slug: "web-developer-starter",
    title: "Web Developer Starter",
    description:
      "A guided path from your first HTML tag to a deployed React dashboard. Perfect for career switchers who want a portfolio-ready skill stack in one place.",
    category: "Web Development",
    level: Level.BEGINNER,
    featured: true,
    estimatedHours: 28,
    thumbnail: "/images/courses/1.png",
    outcomes: [
      "Ship a responsive static portfolio",
      "Write modern JavaScript with confidence",
      "Build a React app with routing and state",
      "Earn a path certificate on completion",
    ],
    courseSlugs: [
      "intro-to-web-development",
      "javascript-deep-dive",
      "react-fundamentals",
    ],
  },
  {
    slug: "digital-growth-path",
    title: "Digital Growth Path",
    description:
      "Learn to find your audience, run campaigns, and grow an email list — then turn that attention into course signups with a repeatable content system.",
    category: "Digital Marketing",
    level: Level.INTERMEDIATE,
    featured: true,
    estimatedHours: 18,
    thumbnail: "/images/courses/3.png",
    outcomes: [
      "Research and document your ideal customer",
      "Launch a small-budget ad test",
      "Run a weekly newsletter rhythm",
      "Repurpose content across channels",
    ],
    courseSlugs: [
      "digital-marketing-foundations",
      "content-strategy-for-creators",
    ],
  },
  {
    slug: "creator-career-path",
    title: "Creator Career Path",
    description:
      "Combine building, designing, and marketing — the full stack for solo creators who teach online. Finish all courses to unlock the Creator Path certificate.",
    category: "Career",
    level: Level.BEGINNER,
    estimatedHours: 32,
    thumbnail: "/images/courses/4.png",
    outcomes: [
      "Publish a project site you designed yourself",
      "Market it with funnels and email",
      "Present a cohesive personal brand",
      "Stack course + path credentials on LinkedIn",
    ],
    courseSlugs: [
      "intro-to-web-development",
      "ui-design-systems",
      "digital-marketing-foundations",
      "content-strategy-for-creators",
    ],
  },
  {
    slug: "full-stack-ui-path",
    title: "Full-Stack UI Path",
    description:
      "For developers ready to go deep: modern JavaScript, React fundamentals, and advanced patterns used in production LMS and SaaS dashboards.",
    category: "Web Development",
    level: Level.ADVANCED,
    featured: true,
    estimatedHours: 26,
    thumbnail: "/images/courses/2.png",
    outcomes: [
      "Master async JS and module architecture",
      "Ship a routed React application",
      "Apply performance and composition patterns",
      "Structure features for team-scale codebases",
    ],
    courseSlugs: [
      "javascript-deep-dive",
      "react-fundamentals",
      "advanced-react-patterns",
    ],
  },
  {
    slug: "design-to-ship",
    title: "Design to Ship",
    description:
      "Bridge design and development — learn systems thinking in Figma, then implement your components in HTML, CSS, and React.",
    category: "Design",
    level: Level.INTERMEDIATE,
    estimatedHours: 24,
    thumbnail: "/images/courses/5.png",
    outcomes: [
      "Document a token-based design system",
      "Implement responsive layouts from specs",
      "Hand off assets developers can trust",
      "Build a React UI from your own designs",
    ],
    courseSlugs: [
      "ui-design-systems",
      "intro-to-web-development",
      "react-fundamentals",
    ],
  },
];

export const paymentMethodSeed = [
  {
    id: "seed-payment-esewa",
    type: "ESEWA" as const,
    label: "eSewa",
    accountInfo: "9801122334",
    instructions: "Send the exact course fee to this eSewa ID. Use your full name in the remarks.",
    qrImageUrl: null,
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "seed-payment-mobile-banking",
    type: "MOBILE_BANKING" as const,
    label: "Mobile Banking (NMB)",
    accountInfo: "0123456789012345 · Edujarr Learning Pvt. Ltd.",
    instructions: "Transfer via mobile banking and upload the confirmation screenshot.",
    qrImageUrl: null,
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "seed-payment-khalti-qr",
    type: "KHALTI_QR" as const,
    label: "Khalti QR",
    accountInfo: "edujarr@khalti",
    instructions: "Scan the Khalti QR (upload one in Admin → Payments) and screenshot the success screen.",
    qrImageUrl: null,
    enabled: true,
    sortOrder: 2,
  },
];

export const newsletterSubscriberSeed = [
  { email: "priya.sharma@example.com", name: "Priya Sharma", source: "footer" },
  { email: "michael.chen@example.com", name: "Michael Chen", source: "footer" },
  { email: "sarah.okonkwo@example.com", name: "Sarah Okonkwo", source: "course-page" },
  { email: "james.wilson@example.com", name: "James Wilson", source: "footer" },
  { email: "lena.hoffmann@example.com", name: "Lena Hoffmann", source: "blog" },
  { email: "diego.martinez@example.com", name: "Diego Martinez", source: "footer" },
  { email: "emma.thompson@example.com", name: "Emma Thompson", source: "roadmap-page" },
  { email: "raj.patel@example.com", name: "Raj Patel", source: "footer" },
  { email: "nina.kowalski@example.com", name: "Nina Kowalski", source: "footer" },
  { email: "alex.turner@example.com", name: "Alex Turner", source: "pricing" },
  { email: "maria.gonzalez@example.com", name: "Maria Gonzalez", source: "footer" },
  { email: "yuki.tanaka@example.com", name: "Yuki Tanaka", source: "footer" },
  { email: "old.subscriber@example.com", name: "Former Subscriber", source: "footer", status: "UNSUBSCRIBED" as const },
];

export const newsletterCampaignSeed = [
  {
    id: "seed-campaign-welcome",
    subject: "Welcome to Edujarr — your learning path starts here",
    body: `Hi there,

Thanks for subscribing to Edujarr updates. Each month we share new courses, roadmaps, and practical tips from working instructors.

This month highlights:
• Web Developer Starter — 3 courses, one path certificate
• Digital Growth Path — marketing + content strategy
• New React Fundamentals capstone project

Browse roadmaps: /roadmaps

Happy learning,
The Edujarr team`,
    status: "SENT" as const,
    sentDaysAgo: 12,
  },
  {
    id: "seed-campaign-august",
    subject: "August picks: Design systems & creator marketing",
    body: `Hello,

August on Edujarr is all about shipping polished work:

1. UI Design Systems — tokens, components, dev handoff
2. Content Strategy for Creators — newsletters that grow your list
3. Design to Ship roadmap — design in Figma, build in React

Reply and tell us what you'd like to learn next.

— Sam, Edujarr`,
    status: "DRAFT" as const,
  },
];
