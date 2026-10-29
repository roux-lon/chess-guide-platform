import { LESSONS } from "@/features/lessons";
import { LessonScreen } from "@/ui/LessonScreen";

// Every lesson is a real page at build time (static export), and nothing else is.
export const dynamicParams = false;

export function generateStaticParams() {
  return LESSONS.map((lesson) => ({ lessonId: lesson.id }));
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <LessonScreen lessonId={lessonId} />;
}
