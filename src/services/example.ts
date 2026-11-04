import { api } from '../lib/api';

interface ExampleItem {
  id: string;
  title: string;
  createdAt: string;
}

export const exampleService = {
  list: () => api.get<ExampleItem[]>('/examples'),
  get: (id: string) => api.get<ExampleItem>(`/examples/${id}`),
  create: (data: Omit<ExampleItem, 'id' | 'createdAt'>) =>
    api.post<ExampleItem>('/examples', data),
  update: (id: string, data: Partial<ExampleItem>) =>
    api.patch<ExampleItem>(`/examples/${id}`, data),
  delete: (id: string) => api.delete(`/examples/${id}`),
};
