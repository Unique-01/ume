export type JobStatus = "accepted" | "processing" | "completed" | "failed";

export type Job = {
    id: string;
    status: JobStatus;
    createdAt: Date;
    updatedAt: Date;
    outputPath?: string;
    error?: string;
};

const jobs = new Map<string, Job>();

export const jobStore = {
    create(id: string): Job {
        const job: Job = {
            id,
            status: "accepted",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        jobs.set(id, job);
        return job;
    },
    update(id: string, patch: Partial<Omit<Job, "id" | "createdAt">>): void {
        const job = jobs.get(id);
        if (!job) return;

        Object.assign(job, patch, { updatedAt: new Date() });
    },

    get(id: string): Job | undefined {
        return jobs.get(id);
    },
};
