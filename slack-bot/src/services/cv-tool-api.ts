import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { config } from '../config';

export interface CVToolUser {
  Id: number;
  Name: string;
  Email: string | null;
}

export interface Vacancy {
  Id: number;
  Title: string;
  Description: string;
  Client: string | null;
  Location: string | null;
  RemoteWork: boolean;
}

export interface Candidate {
  score?: number;
  userId: string;
  name: string;
  email?: string;
  seniority?: string;
  yearsOfExperience?: number;
  location?: string;
  summary?: string;
  skills?: string[];
}

export class CVToolApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.cvTool.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Upload CV file
   */
  async uploadCV(fileBuffer: Buffer, fileName: string): Promise<any> {
    const formData = new FormData();
    formData.append('files', fileBuffer, fileName);

    const response = await this.client.post('/api/upload', formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  }

  /**
   * Upload project file for a specific user
   */
  async uploadProject(
    fileBuffer: Buffer,
    fileName: string,
    userId: number
  ): Promise<any> {
    const formData = new FormData();
    formData.append('files', fileBuffer, fileName);
    formData.append('userId', userId.toString());

    const response = await this.client.post('/api/projects/upload', formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  }

  /**
   * Upload vacancy file
   */
  async uploadVacancy(fileBuffer: Buffer, fileName: string): Promise<any> {
    const formData = new FormData();
    formData.append('files', fileBuffer, fileName);

    const response = await this.client.post('/api/vacancies/upload', formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  }

  /**
   * Search candidates using RAG chat
   */
  async searchCandidates(query: string): Promise<string> {
    const response = await this.client.post('/api/chat', {
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    });

    // For streaming responses, we'll need to handle this differently
    // For now, return the full response
    return response.data;
  }

  /**
   * Get matched candidates for a vacancy
   */
  async matchVacancy(vacancyId: number): Promise<{
    vacancy: Vacancy;
    candidates: Candidate[];
  }> {
    const response = await this.client.get(
      `/api/vacancies/${vacancyId}/match`
    );
    return response.data;
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<CVToolUser[]> {
    const response = await this.client.get('/api/people');
    return response.data.people || [];
  }

  /**
   * Get user projects
   */
  async getUserProjects(userId: number): Promise<any[]> {
    const response = await this.client.get(`/api/projects?userId=${userId}`);
    return response.data.projects || [];
  }

  /**
   * Get all vacancies
   */
  async getVacancies(): Promise<Vacancy[]> {
    const response = await this.client.get('/api/vacancies');
    return response.data.vacancies || [];
  }
}

export const cvToolApi = new CVToolApiService();

