import { assets } from "@/lib/mock-home";

export type CatalogCourse = {
  id: string;
  title: string;
  image: string;
  students: string;
  studentCount: number;
  duration: string;
  price: string;
  priceValue: number;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  rating: number;
  instructor: string;
  date: string;
  featured?: boolean;
};

export const catalogCourses: CatalogCourse[] = [
  {
    id: "motion-graphics",
    title: "Motion Graphics: Create a Nice Typography Animation",
    image: assets.courses[0],
    students: "5,957 Students",
    studentCount: 5957,
    duration: "01h 49m",
    price: "$33.99",
    priceValue: 33.99,
    category: "Graphic Design",
    level: "Intermediate",
    rating: 5,
    instructor: "Maya Chen",
    date: "03/11/2023",
    featured: true,
  },
  {
    id: "financial-analyst",
    title: "The Complete Financial Analyst Training & Investing",
    image: assets.courses[1],
    students: "5,957 Students",
    studentCount: 5957,
    duration: "01h 49m",
    price: "$45.99",
    priceValue: 45.99,
    category: "Business",
    level: "Advanced",
    rating: 5,
    instructor: "Jordan Lee",
    date: "03/11/2023",
    featured: true,
  },
  {
    id: "startup-lab",
    title: "Startup Lab: Ship Products People Actually Use",
    image: assets.courses[2],
    students: "4,210 Students",
    studentCount: 4210,
    duration: "02h 15m",
    price: "$39.99",
    priceValue: 39.99,
    category: "Business",
    level: "Intermediate",
    rating: 4,
    instructor: "Samira Ali",
    date: "04/02/2023",
  },
  {
    id: "instagram-growth",
    title: "Marketing 2023: Complete Guide To Instagram Growth",
    image: assets.courses[3],
    students: "5,957 Students",
    studentCount: 5957,
    duration: "01h 49m",
    price: "$33.99",
    priceValue: 33.99,
    category: "Digital Marketing",
    level: "Beginner",
    rating: 5,
    instructor: "Blair Warren",
    date: "05/18/2023",
    featured: true,
  },
  {
    id: "php-js",
    title: "Advance PHP knowledge with JS to make smart web",
    image: assets.courses[4],
    students: "5,957 Students",
    studentCount: 5957,
    duration: "01h 49m",
    price: "$33.99",
    priceValue: 33.99,
    category: "Web Development",
    level: "Advanced",
    rating: 4,
    instructor: "Chris Park",
    date: "06/01/2023",
  },
  {
    id: "problem-solving",
    title: "Creative Problem Solving for Modern Teams",
    image: assets.courses[5],
    students: "3,840 Students",
    studentCount: 3840,
    duration: "01h 20m",
    price: "$29.99",
    priceValue: 29.99,
    category: "Personal Development",
    level: "Beginner",
    rating: 5,
    instructor: "Anika Sharma",
    date: "06/22/2023",
  },
  {
    id: "data-viz",
    title: "Data Visualization for Storytellers",
    image: assets.courses[0],
    students: "2,104 Students",
    studentCount: 2104,
    duration: "03h 10m",
    price: "$41.00",
    priceValue: 41,
    category: "IT and Software",
    level: "Intermediate",
    rating: 5,
    instructor: "Maya Chen",
    date: "07/01/2023",
  },
  {
    id: "ux-research",
    title: "UX Research Sprint: Interviews to Insights",
    image: assets.courses[2],
    students: "1,880 Students",
    studentCount: 1880,
    duration: "02h 05m",
    price: "$36.50",
    priceValue: 36.5,
    category: "Graphic Design",
    level: "Intermediate",
    rating: 4,
    instructor: "Ronald Richards",
    date: "07/12/2023",
  },
  {
    id: "react-foundations",
    title: "React Foundations for Product Builders",
    image: assets.courses[4],
    students: "6,420 Students",
    studentCount: 6420,
    duration: "04h 30m",
    price: "$49.00",
    priceValue: 49,
    category: "Web Development",
    level: "Beginner",
    rating: 5,
    instructor: "Chris Park",
    date: "08/03/2023",
    featured: true,
  },
  {
    id: "brand-systems",
    title: "Brand Systems: Identity that Scales",
    image: assets.courses[5],
    students: "1,540 Students",
    studentCount: 1540,
    duration: "02h 40m",
    price: "$37.00",
    priceValue: 37,
    category: "Graphic Design",
    level: "Advanced",
    rating: 4,
    instructor: "Maya Chen",
    date: "08/15/2023",
  },
  {
    id: "seo-playbook",
    title: "SEO Playbook for Growing Products",
    image: assets.courses[3],
    students: "3,210 Students",
    studentCount: 3210,
    duration: "02h 00m",
    price: "$27.50",
    priceValue: 27.5,
    category: "Digital Marketing",
    level: "Beginner",
    rating: 4,
    instructor: "Blair Warren",
    date: "09/01/2023",
  },
  {
    id: "leadership-lab",
    title: "Leadership Lab: Coaching Your Team",
    image: assets.courses[1],
    students: "980 Students",
    studentCount: 980,
    duration: "01h 55m",
    price: "$44.00",
    priceValue: 44,
    category: "Personal Development",
    level: "Advanced",
    rating: 5,
    instructor: "Anika Sharma",
    date: "09/20/2023",
  },
];

export const filterCategories = [
  "All",
  "Web Development",
  "Graphic Design",
  "Digital Marketing",
  "Business",
  "Personal Development",
  "IT and Software",
] as const;

export const categorySlugMap: Record<string, (typeof filterCategories)[number]> = {
  "web-development": "Web Development",
  "graphic-design": "Graphic Design",
  design: "Graphic Design",
  "art-humanities": "Graphic Design",
  "art-&-humanities": "Graphic Design",
  "digital-marketing": "Digital Marketing",
  business: "Business",
  "business-finance": "Business",
  "personal-development": "Personal Development",
  growth: "Personal Development",
  "it-and-software": "IT and Software",
};

export function categoryFromSlug(slug: string | null | undefined) {
  if (!slug) return "All";
  const decoded = decodeURIComponent(slug).trim();
  if (decoded === "All") return "All";
  if ((filterCategories as readonly string[]).includes(decoded)) {
    return decoded as (typeof filterCategories)[number];
  }
  const normalized = decoded
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const mapped = categorySlugMap[normalized] ?? categorySlugMap[decoded.toLowerCase()];
  return mapped ?? "All";
}

export function slugFromCategory(category: string) {
  if (category === "All") return null;
  return category
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const filterLevels = ["All", "Beginner", "Intermediate", "Advanced"] as const;

export const sortOptions = [
  { id: "popular", label: "Most popular" },
  { id: "rating", label: "Highest rated" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "newest", label: "Newest" },
] as const;
