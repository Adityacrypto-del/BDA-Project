import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JobView from "@/components/jobs/JobView";
import { JOBS, getJob } from "@/lib/mr-jobs";

export function generateStaticParams() {
  return JOBS.map((j) => ({ job: j.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ job: string }> }): Promise<Metadata> {
  const job = getJob((await params).job);
  return { title: job ? `Job ${job.number}: ${job.title} — Retail MapReduce` : "Job not found" };
}

/** Reads the real mapper/reducer from ../mapreduce so the page always shows the code that runs. */
async function readSource(slug: string, file: "mapper.py" | "reducer.py") {
  try {
    return await readFile(path.join(process.cwd(), "..", "mapreduce", slug, file), "utf8");
  } catch {
    return `# mapreduce/${slug}/${file} not found next to the frontend folder`;
  }
}

export default async function JobPage({ params }: { params: Promise<{ job: string }> }) {
  const { job: slug } = await params;
  const job = getJob(slug);
  if (!job) notFound();

  const [mapper, reducer] = await Promise.all([readSource(job.slug, "mapper.py"), readSource(job.slug, "reducer.py")]);
  return <JobView slug={job.slug} mapperCode={mapper} reducerCode={reducer} />;
}
