import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, RoadmapStatus, OrgRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { serializeQuizPayload } from "./src/lib/lesson-resources";
import { imagekitAsset } from "./src/lib/imagekit-url";
import {
  courseCatalog,
  newsletterCampaignSeed,
  newsletterSubscriberSeed,
  paymentMethodSeed,
  roadmapCatalog,
} from "./seed/catalog";
import { linkRoadmapCourse, seedCourseWithModules } from "./seed/helpers";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 15_000,
} as ConstructorParameters<typeof Pool>[0]);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "password123";
const asset = imagekitAsset;

type ExtendedProfileSeed = {
  headline?: string;
  location?: string;
  website?: string;
  phone?: string;
  linkedIn?: string;
  github?: string;
};

function profilePreferences(profile: ExtendedProfileSeed) {
  return { profile };
}

async function upsertUserWithPassword(input: {
  email: string;
  name: string;
  role: Role;
  bio?: string;
  image?: string;
  extendedProfile?: ExtendedProfileSeed;
}) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const preferences = input.extendedProfile
    ? profilePreferences(input.extendedProfile)
    : undefined;

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      bio: input.bio,
      image: input.image,
      emailVerified: true,
      ...(preferences ? { preferences } : {}),
    },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      bio: input.bio,
      image: input.image,
      emailVerified: true,
      ...(preferences ? { preferences } : {}),
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    update: { password: passwordHash },
    create: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: passwordHash,
    },
  });

  return user;
}

async function completeLessonsForStudent(
  studentId: string,
  courseId: string,
  daysAgoOffsets: number[],
) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  for (const [index, lesson] of lessons.entries()) {
    const completedAt = new Date();
    completedAt.setDate(completedAt.getDate() - (daysAgoOffsets[index] ?? index + 1));
    completedAt.setHours(10 + index, 30, 0, 0);

    await prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: { studentId, lessonId: lesson.id },
      },
      update: { completed: true, completedAt },
      create: {
        studentId,
        lessonId: lesson.id,
        completed: true,
        completedAt,
      },
    });
  }

  await prisma.enrollment.update({
    where: { courseId_studentId: { courseId, studentId } },
    data: { progress: 100 },
  });
}

async function main() {
  console.log("Seeding database...");

  const plans = [
    {
      id: "plan_free",
      slug: "free",
      name: "Free",
      description: "Get started with one course and up to 50 students.",
      priceNpr: 0,
      limits: { maxCourses: 1, maxInstructors: 1, maxStudents: 50, storageMb: 500 },
      features: { certificates: true, roadmaps: false, analytics: false, whiteLabel: false },
      sortOrder: 0,
    },
    {
      id: "plan_starter",
      slug: "starter",
      name: "Starter",
      description: "For growing institutes.",
      priceNpr: 299900,
      limits: { maxCourses: 10, maxInstructors: 3, maxStudents: 500, storageMb: 5000 },
      features: { certificates: true, roadmaps: true, analytics: true, whiteLabel: false },
      sortOrder: 1,
    },
    {
      id: "plan_pro",
      slug: "pro",
      name: "Pro",
      description: "Unlimited courses and advanced features.",
      priceNpr: 999900,
      limits: { maxCourses: -1, maxInstructors: 10, maxStudents: 5000, storageMb: 50000 },
      features: { certificates: true, roadmaps: true, analytics: true, whiteLabel: true },
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        description: plan.description,
        priceNpr: plan.priceNpr,
        limits: plan.limits,
        features: plan.features,
        sortOrder: plan.sortOrder,
      },
      create: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        priceNpr: plan.priceNpr,
        limits: plan.limits,
        features: plan.features,
        isPublic: true,
        sortOrder: plan.sortOrder,
      },
    });
  }

  const org = await prisma.organization.upsert({
    where: { slug: "edujarr" },
    update: { name: "Edujarr Demo Institute", status: "ACTIVE", planId: "plan_pro" },
    create: {
      id: "org_edujarr",
      name: "Edujarr Demo Institute",
      slug: "edujarr",
      subdomain: "edujarr",
      status: "ACTIVE",
      planId: "plan_pro",
    },
  });

  await prisma.organizationSubscription.upsert({
    where: { organizationId: org.id },
    update: { planId: "plan_pro", status: "ACTIVE" },
    create: {
      id: "sub_edujarr",
      organizationId: org.id,
      planId: "plan_pro",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const admin = await upsertUserWithPassword({
    email: "admin@edujarr.com",
    name: "Sam Admin",
    role: Role.ADMIN,
    image: asset("/images/about/video.jpg"),
    bio: "Admin overseeing course quality, user access, and reporting.",
    extendedProfile: {
      headline: "Head of Learning Operations",
      location: "San Francisco, CA",
      website: "https://edujarr.com",
      phone: "+1 (415) 555-0100",
      linkedIn: "linkedin.com/in/sam-admin",
    },
  });

  const instructor = await upsertUserWithPassword({
    email: "instructor@example.com",
    name: "Jane Instructor",
    role: Role.INSTRUCTOR,
    image: asset("/images/hero/woman.png"),
    bio: "Senior software engineer and instructor with 10+ years of industry experience. I teach practical web development with a focus on real-world projects.",
    extendedProfile: {
      headline: "Senior Software Engineer & Educator",
      location: "Austin, TX",
      website: "https://janeinstructor.dev",
      phone: "+1 (512) 555-0142",
      linkedIn: "linkedin.com/in/jane-instructor",
      github: "github.com/jane-instructor",
    },
  });

  const studentSeed = [
    {
      email: "alice@example.com",
      name: "Alice Student",
      image: asset("/images/testimonials/1.png"),
      bio: "Aspiring front-end developer learning HTML, CSS, and JavaScript through hands-on projects.",
      extendedProfile: {
        headline: "Junior Web Developer",
        location: "Portland, OR",
        linkedIn: "linkedin.com/in/alice-student",
        github: "github.com/alice-student",
      },
    },
    {
      email: "bob@example.com",
      name: "Bob Student",
      image: asset("/images/testimonials/2.png"),
      bio: "Career switcher completing full-stack coursework and building a portfolio of deployed apps.",
      extendedProfile: {
        headline: "Full-stack learner",
        location: "Chicago, IL",
        website: "https://bobstudent.dev",
        github: "github.com/bob-student",
      },
    },
    {
      email: "carol@example.com",
      name: "Carol Student",
      image: asset("/images/testimonials/3.png"),
      bio: "Computer science student exploring web technologies and UI design alongside coursework.",
      extendedProfile: {
        headline: "CS student · UI enthusiast",
        location: "Boston, MA",
        linkedIn: "linkedin.com/in/carol-student",
      },
    },
  ];

  const students = await Promise.all(
    studentSeed.map((s) =>
      upsertUserWithPassword({
        email: s.email,
        name: s.name,
        role: Role.STUDENT,
        bio: s.bio,
        image: s.image,
        extendedProfile: s.extendedProfile,
      }),
    ),
  );

  async function ensureMember(userId: string, role: OrgRole) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId },
      },
      update: { role },
      create: { organizationId: org.id, userId, role },
    });
  }

  await ensureMember(admin.id, OrgRole.ORG_ADMIN);
  await ensureMember(instructor.id, OrgRole.INSTRUCTOR);
  for (const student of students) {
    await ensureMember(student.id, OrgRole.STUDENT);
  }

  const coursesBySlug = new Map<string, { id: string; slug: string }>();
  for (const courseData of courseCatalog) {
    const course = await seedCourseWithModules(
      prisma,
      instructor.id,
      org.id,
      courseData,
    );
    coursesBySlug.set(course.slug, course);
  }

  const introCourse = coursesBySlug.get("intro-to-web-development")!;
  const marketingCourse = coursesBySlug.get("digital-marketing-foundations")!;
  const jsCourse = coursesBySlug.get("javascript-deep-dive")!;
  const reactCourse = coursesBySlug.get("react-fundamentals")!;

  for (const student of students) {
    await prisma.enrollment.upsert({
      where: {
        courseId_studentId: { courseId: introCourse.id, studentId: student.id },
      },
      update: {},
      create: { courseId: introCourse.id, studentId: student.id },
    });
  }

  await prisma.enrollment.upsert({
    where: {
      courseId_studentId: {
        courseId: marketingCourse.id,
        studentId: students[0]!.id,
      },
    },
    update: {},
    create: { courseId: marketingCourse.id, studentId: students[0]!.id },
  });

  await prisma.enrollment.upsert({
    where: {
      courseId_studentId: {
        courseId: jsCourse.id,
        studentId: students[2]!.id,
      },
    },
    update: {},
    create: { courseId: jsCourse.id, studentId: students[2]!.id },
  });

  const firstLesson = await prisma.lesson.findFirst({
    where: { courseId: introCourse.id, order: 1 },
  });

  if (firstLesson) {
    const aliceCompletedAt = new Date();
    aliceCompletedAt.setDate(aliceCompletedAt.getDate() - 2);
    aliceCompletedAt.setHours(14, 20, 0, 0);

    await prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId: students[0]!.id,
          lessonId: firstLesson.id,
        },
      },
      update: { completed: true, completedAt: aliceCompletedAt },
      create: {
        studentId: students[0]!.id,
        lessonId: firstLesson.id,
        completed: true,
        completedAt: aliceCompletedAt,
      },
    });

    const htmlQuiz = serializeQuizPayload({
      passingScore: 70,
      questions: [
        {
          id: "q1",
          prompt: "Which tag defines the largest heading in HTML?",
          options: ["<h1>", "<head>", "<header>", "<title>"],
          correctIndex: 0,
        },
        {
          id: "q2",
          prompt: "Which attribute makes a link open in a new tab?",
          options: ["href", "target=\"_blank\"", "rel", "src"],
          correctIndex: 1,
        },
        {
          id: "q3",
          prompt: "What does CSS stand for?",
          options: [
            "Cascading Style Sheets",
            "Creative Style System",
            "Computer Style Syntax",
            "Colorful Style Sheets",
          ],
          correctIndex: 0,
        },
      ],
    });

    await prisma.lessonResource.upsert({
      where: { id: "seed-resource-html-quiz" },
      update: { description: htmlQuiz },
      create: {
        id: "seed-resource-html-quiz",
        lessonId: firstLesson.id,
        type: "QUIZ",
        title: "HTML basics quiz",
        url: "",
        description: htmlQuiz,
      },
    });

    await prisma.lessonResource.upsert({
      where: { id: "seed-resource-html-cheatsheet" },
      update: {},
      create: {
        id: "seed-resource-html-cheatsheet",
        lessonId: firstLesson.id,
        type: "TEXT",
        title: "HTML cheat sheet",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTML",
        description: "Quick reference for common HTML elements.",
      },
    });
  }

  const cssLesson = await prisma.lesson.findFirst({
    where: { courseId: introCourse.id, order: 4 },
  });

  if (cssLesson) {
    await prisma.lessonResource.upsert({
      where: { id: "seed-resource-css-exercise" },
      update: {},
      create: {
        id: "seed-resource-css-exercise",
        lessonId: cssLesson.id,
        type: "EXERCISE",
        title: "Style a card component",
        url: "",
        description:
          "Create a card with a title, image, and button. Use flexbox for layout and add a hover state on the button.",
      },
    });
  }

  await completeLessonsForStudent(
    students[1]!.id,
    introCourse.id,
    [14, 12, 10, 8, 6, 5, 4, 3, 2],
  );

  await prisma.certificate.upsert({
    where: {
      studentId_courseId: {
        studentId: students[1]!.id,
        courseId: introCourse.id,
      },
    },
    create: {
      studentId: students[1]!.id,
      courseId: introCourse.id,
    },
    update: {},
  });

  await completeLessonsForStudent(
    students[0]!.id,
    marketingCourse.id,
    [7, 6, 5, 4, 3, 2, 1, 1, 1],
  );

  await prisma.certificate.upsert({
    where: {
      studentId_courseId: {
        studentId: students[0]!.id,
        courseId: marketingCourse.id,
      },
    },
    create: {
      studentId: students[0]!.id,
      courseId: marketingCourse.id,
    },
    update: {},
  });

  const assignment = await prisma.assignment.upsert({
    where: { id: "seed-assignment-web" },
    update: {
      title: "Build a landing page",
      description:
        "Create a responsive landing page for a fictional course using semantic HTML, Flexbox/Grid, and a working contact form.",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: "seed-assignment-web",
      courseId: introCourse.id,
      title: "Build a landing page",
      description:
        "Create a responsive landing page for a fictional course using semantic HTML, Flexbox/Grid, and a working contact form.",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.assignment.upsert({
    where: { id: "seed-assignment-react" },
    update: {
      title: "Mini LMS dashboard",
      description:
        "Build a React dashboard with course cards, progress bars, and a profile panel. Use React Router for at least two pages.",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: "seed-assignment-react",
      courseId: reactCourse.id,
      title: "Mini LMS dashboard",
      description:
        "Build a React dashboard with course cards, progress bars, and a profile panel. Use React Router for at least two pages.",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.review.upsert({
    where: {
      courseId_studentId: {
        courseId: introCourse.id,
        studentId: students[1]!.id,
      },
    },
    create: {
      courseId: introCourse.id,
      studentId: students[1]!.id,
      rating: 5,
      comment:
        "Clear explanations and practical exercises. The module structure made it easy to follow along after work.",
    },
    update: {
      rating: 5,
      comment:
        "Clear explanations and practical exercises. The module structure made it easy to follow along after work.",
    },
  });

  await prisma.review.upsert({
    where: {
      courseId_studentId: {
        courseId: marketingCourse.id,
        studentId: students[0]!.id,
      },
    },
    create: {
      courseId: marketingCourse.id,
      studentId: students[0]!.id,
      rating: 4,
      comment:
        "Great intro to digital marketing fundamentals. The funnel metrics lesson alone was worth it.",
    },
    update: {
      rating: 4,
      comment:
        "Great intro to digital marketing fundamentals. The funnel metrics lesson alone was worth it.",
    },
  });

  await prisma.review.upsert({
    where: {
      courseId_studentId: {
        courseId: jsCourse.id,
        studentId: students[2]!.id,
      },
    },
    create: {
      courseId: jsCourse.id,
      studentId: students[2]!.id,
      rating: 5,
      comment: "Finally understood closures and the event loop. Highly recommend after the intro web course.",
    },
    update: {
      rating: 5,
      comment: "Finally understood closures and the event loop. Highly recommend after the intro web course.",
    },
  });

  const roadmapsBySlug = new Map<string, { id: string; slug: string }>();

  for (const roadmapData of roadmapCatalog) {
    const roadmap = await prisma.roadmap.upsert({
      where: {
        organizationId_slug: {
          organizationId: org.id,
          slug: roadmapData.slug,
        },
      },
      update: {
        title: roadmapData.title,
        description: roadmapData.description,
        status: RoadmapStatus.PUBLISHED,
        featured: roadmapData.featured ?? false,
        category: roadmapData.category,
        level: roadmapData.level,
        estimatedHours: roadmapData.estimatedHours,
        thumbnail: asset(roadmapData.thumbnail),
        outcomes: roadmapData.outcomes,
      },
      create: {
        organizationId: org.id,
        title: roadmapData.title,
        slug: roadmapData.slug,
        description: roadmapData.description,
        status: RoadmapStatus.PUBLISHED,
        featured: roadmapData.featured ?? false,
        category: roadmapData.category,
        level: roadmapData.level,
        estimatedHours: roadmapData.estimatedHours,
        thumbnail: asset(roadmapData.thumbnail),
        outcomes: roadmapData.outcomes,
      },
    });

    roadmapsBySlug.set(roadmap.slug, roadmap);

    await prisma.roadmapCourse.deleteMany({ where: { roadmapId: roadmap.id } });

    for (const [index, courseSlug] of roadmapData.courseSlugs.entries()) {
      const linkedCourse = coursesBySlug.get(courseSlug);
      if (!linkedCourse) {
        throw new Error(`Roadmap ${roadmapData.slug} references unknown course ${courseSlug}`);
      }
      await linkRoadmapCourse(prisma, roadmap.id, linkedCourse.id, index + 1);
    }
  }

  const webRoadmap = roadmapsBySlug.get("web-developer-starter")!;
  const growthRoadmap = roadmapsBySlug.get("digital-growth-path")!;
  const creatorRoadmap = roadmapsBySlug.get("creator-career-path")!;

  await prisma.roadmapEnrollment.upsert({
    where: {
      roadmapId_studentId: {
        roadmapId: webRoadmap.id,
        studentId: students[1]!.id,
      },
    },
    update: { progress: 100 },
    create: {
      roadmapId: webRoadmap.id,
      studentId: students[1]!.id,
      progress: 100,
    },
  });

  await prisma.roadmapCertificate.upsert({
    where: {
      studentId_roadmapId: {
        studentId: students[1]!.id,
        roadmapId: webRoadmap.id,
      },
    },
    update: {},
    create: {
      studentId: students[1]!.id,
      roadmapId: webRoadmap.id,
    },
  });

  await prisma.roadmapEnrollment.upsert({
    where: {
      roadmapId_studentId: {
        roadmapId: growthRoadmap.id,
        studentId: students[0]!.id,
      },
    },
    update: { progress: 100 },
    create: {
      roadmapId: growthRoadmap.id,
      studentId: students[0]!.id,
      progress: 100,
    },
  });

  await prisma.roadmapCertificate.upsert({
    where: {
      studentId_roadmapId: {
        studentId: students[0]!.id,
        roadmapId: growthRoadmap.id,
      },
    },
    update: {},
    create: {
      studentId: students[0]!.id,
      roadmapId: growthRoadmap.id,
    },
  });

  await prisma.roadmapEnrollment.upsert({
    where: {
      roadmapId_studentId: {
        roadmapId: creatorRoadmap.id,
        studentId: students[0]!.id,
      },
    },
    update: { progress: 50 },
    create: {
      roadmapId: creatorRoadmap.id,
      studentId: students[0]!.id,
      progress: 50,
    },
  });

  for (const method of paymentMethodSeed) {
    await prisma.paymentMethod.upsert({
      where: { id: method.id },
      update: {
        type: method.type,
        label: method.label,
        accountInfo: method.accountInfo,
        instructions: method.instructions,
        qrImageUrl: method.qrImageUrl ? asset(method.qrImageUrl) : null,
        enabled: method.enabled,
        sortOrder: method.sortOrder,
      },
      create: {
        id: method.id,
        organizationId: org.id,
        type: method.type,
        label: method.label,
        accountInfo: method.accountInfo,
        instructions: method.instructions,
        qrImageUrl: method.qrImageUrl ? asset(method.qrImageUrl) : null,
        enabled: method.enabled,
        sortOrder: method.sortOrder,
      },
    });
  }

  for (const subscriber of newsletterSubscriberSeed) {
    const subscribedAt = new Date();
    subscribedAt.setDate(subscribedAt.getDate() - Math.floor(Math.random() * 45));

    await prisma.newsletterSubscriber.upsert({
      where: {
        organizationId_email: {
          organizationId: org.id,
          email: subscriber.email,
        },
      },
      update: {
        name: subscriber.name,
        source: subscriber.source,
        status: subscriber.status ?? "ACTIVE",
        unsubscribedAt:
          subscriber.status === "UNSUBSCRIBED" ? new Date() : null,
      },
      create: {
        organizationId: org.id,
        email: subscriber.email,
        name: subscriber.name,
        source: subscriber.source,
        status: subscriber.status ?? "ACTIVE",
        subscribedAt,
        unsubscribedAt:
          subscriber.status === "UNSUBSCRIBED" ? new Date() : null,
      },
    });
  }

  const activeSubscriberCount = newsletterSubscriberSeed.filter(
    (s) => s.status !== "UNSUBSCRIBED",
  ).length;

  for (const campaign of newsletterCampaignSeed) {
    const sentAt =
      campaign.status === "SENT" && campaign.sentDaysAgo
        ? new Date(Date.now() - campaign.sentDaysAgo * 24 * 60 * 60 * 1000)
        : null;

    await prisma.newsletterCampaign.upsert({
      where: { id: campaign.id },
      update: {
        subject: campaign.subject,
        body: campaign.body,
        status: campaign.status,
        sentAt,
        recipientCount:
          campaign.status === "SENT" ? activeSubscriberCount : 0,
        createdById: admin.id,
      },
      create: {
        id: campaign.id,
        organizationId: org.id,
        subject: campaign.subject,
        body: campaign.body,
        status: campaign.status,
        sentAt,
        recipientCount:
          campaign.status === "SENT" ? activeSubscriberCount : 0,
        createdById: admin.id,
      },
    });
  }

  console.log("Seeding complete:");
  console.log({
    password: DEMO_PASSWORD,
    admin: admin.email,
    instructor: instructor.email,
    students: students.map((s) => s.email),
    courses: [...coursesBySlug.keys()],
    roadmaps: [...roadmapsBySlug.keys()],
    newsletterSubscribers: newsletterSubscriberSeed.length,
    newsletterCampaigns: newsletterCampaignSeed.length,
    paymentMethods: paymentMethodSeed.length,
    assignments: [assignment.title, "Mini LMS dashboard"],
  });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end().catch(() => undefined);
  });
