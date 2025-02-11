// Import the JobListing type to define the output of our function.
import type { JobListing } from '../types';

interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  requirements: string[];
  url: string;
  source: string;
  postedDate: string;
  applicationDeadline?: string;
}

class JobScraper {
  private sources = ['linkedin', 'indeed', 'glassdoor'];
  private cache: Map<string, JobListing[]> = new Map();
  private lastScrapedTime: Map<string, number> = new Map();
  private CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

  async scrapeJobs(preferences: {
    keywords?: string[];
    location?: string;
    type?: 'internship' | 'fulltime' | 'all';
  }): Promise<JobListing[]> {
    const jobs: JobListing[] = [];

    for (const source of this.sources) {
      if (this.shouldScrape(source)) {
        try {
          const scrapedJobs = await this.scrapeSource(source, preferences);
          jobs.push(...this.processScrapedJobs(scrapedJobs, source));
          this.updateCache(source, jobs);
        } catch (error) {
          console.error(`Error scraping ${source}:`, error);
          const cachedJobs = this.cache.get(source);
          if (cachedJobs) {
            jobs.push(...cachedJobs);
          }
        }
      } else {
        const cachedJobs = this.cache.get(source);
        if (cachedJobs) {
          jobs.push(...cachedJobs);
        }
      }
    }

    return this.filterJobs(jobs, preferences);
  }

  private shouldScrape(source: string): boolean {
    const lastScraped = this.lastScrapedTime.get(source);
    return !lastScraped || Date.now() - lastScraped > this.CACHE_DURATION;
  }

  private async scrapeSource(
    source: string,
    preferences: {
      keywords?: string[];
      location?: string;
      type?: 'internship' | 'fulltime' | 'all';
    }
  ): Promise<ScrapedJob[]> {
    // Mock implementation for now
    return [];
  }

  private processScrapedJobs(jobs: ScrapedJob[], source: string): JobListing[] {
    return jobs.map((job, index) => ({
      id: `${source}-${index}`,
      title: job.title,
      company: job.company,
      location: job.location,
      type: this.determineJobType(job.title),
      salary: job.salary || 'Not specified',
      description: job.description,
      requirements: job.requirements,
      source: source,
      postedDate: job.postedDate,
      applicationDeadline: job.applicationDeadline || this.calculateDeadline(job.postedDate),
    }));
  }

  private determineJobType(title: string): 'internship' | 'fulltime' {
    return title.toLowerCase().includes('intern') ? 'internship' : 'fulltime';
  }

  private calculateDeadline(postedDate: string): string {
    const date = new Date(postedDate);
    date.setDate(date.getDate() + 30); // Default 30 days from posting
    return date.toISOString();
  }

  private filterJobs(
    jobs: JobListing[],
    preferences: {
      keywords?: string[];
      location?: string;
      type?: 'internship' | 'fulltime' | 'all';
    }
  ): JobListing[] {
    return jobs.filter((job) => {
      const matchesType =
        !preferences.type ||
        preferences.type === 'all' ||
        job.type === preferences.type;

      const matchesLocation =
        !preferences.location ||
        job.location.toLowerCase().includes(preferences.location.toLowerCase());

      const matchesKeywords =
        !preferences.keywords ||
        preferences.keywords.some(
          (keyword) =>
            job.title.toLowerCase().includes(keyword.toLowerCase()) ||
            job.description.toLowerCase().includes(keyword.toLowerCase()) ||
            job.requirements.some((req) =>
              req.toLowerCase().includes(keyword.toLowerCase())
            )
        );

      return matchesType && matchesLocation && matchesKeywords;
    });
  }

  private updateCache(source: string, jobs: JobListing[]) {
    this.cache.set(source, jobs);
    this.lastScrapedTime.set(source, Date.now());
  }
}

// Create a JobScraper instance
const jobScraper = new JobScraper();

// Export an async function to fetch scraped jobs, making it easy to call from Jobs.tsx
export async function getScrapedJobs(preferences: {
  keywords?: string[];
  location?: string;
  type?: 'internship' | 'fulltime' | 'all';
}): Promise<JobListing[]> {
  return jobScraper.scrapeJobs(preferences);
}
