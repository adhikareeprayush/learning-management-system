import type { Level, PrismaClient } from "@prisma/client";
import { CourseStatus } from "@prisma/client";
import { imagekitAsset } from "../src/lib/imagekit-url";

export type LessonSeed = {
  title: string;
  content: string;
  summary: string;
  order: number;
  duration: number;
  isFree?: boolean;
  videoUrl?: string;
};

export type ModuleSeed = {
  title: string;
  description: string;
  order: number;
  lessons: LessonSeed[];
};

export type CourseSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: Level;
  status?: CourseStatus;
  featured?: boolean;
  price?: number;
  priceNpr?: number;
  duration: number;
  thumbnail: string;
  outcomes: string[];
  modules: ModuleSeed[];
};

export async function seedCourseWithModules(
  prisma: PrismaClient,
  instructorId: string,
  data: CourseSeed,
) {
  const course = await prisma.course.upsert({
    where: { slug: data.slug },
    update: {
      title: data.title,
      description: data.description,
      status: data.status ?? CourseStatus.PUBLISHED,
      featured: data.featured ?? false,
      category: data.category,
      thumbnail: imagekitAsset(data.thumbnail),
      price: data.price ?? 0,
      priceNpr: data.priceNpr ?? 0,
      duration: data.duration,
      level: data.level,
      outcomes: data.outcomes,
    },
    create: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      instructorId,
      level: data.level,
      status: data.status ?? CourseStatus.PUBLISHED,
      price: data.price ?? 0,
      priceNpr: data.priceNpr ?? 0,
      duration: data.duration,
      featured: data.featured ?? false,
      category: data.category,
      thumbnail: imagekitAsset(data.thumbnail),
      outcomes: data.outcomes,
    },
  });

  for (const mod of data.modules) {
    const module = await prisma.module.upsert({
      where: { courseId_order: { courseId: course.id, order: mod.order } },
      update: { title: mod.title, description: mod.description },
      create: {
        courseId: course.id,
        title: mod.title,
        description: mod.description,
        order: mod.order,
      },
    });

    for (const lesson of mod.lessons) {
      await prisma.lesson.upsert({
        where: { courseId_order: { courseId: course.id, order: lesson.order } },
        update: {
          title: lesson.title,
          content: lesson.content,
          summary: lesson.summary,
          duration: lesson.duration,
          isFree: lesson.isFree ?? false,
          videoUrl: lesson.videoUrl ?? null,
          moduleId: module.id,
        },
        create: {
          courseId: course.id,
          moduleId: module.id,
          title: lesson.title,
          content: lesson.content,
          summary: lesson.summary,
          order: lesson.order,
          duration: lesson.duration,
          isFree: lesson.isFree ?? false,
          videoUrl: lesson.videoUrl ?? null,
        },
      });
    }
  }

  return course;
}

export async function linkRoadmapCourse(
  prisma: PrismaClient,
  roadmapId: string,
  courseId: string,
  order: number,
) {
  await prisma.roadmapCourse.upsert({
    where: { roadmapId_courseId: { roadmapId, courseId } },
    update: { order },
    create: { roadmapId, courseId, order },
  });
}
