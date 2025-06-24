import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Organization {
  id: string;
  name: string;
}

interface CreateIncidentData {
  title: string;
  description: string;
  organizationId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  affectedDataTypes: string[];
  detectedAt: string;
  reportedBy: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  organizationId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  affectedDataTypes: string[];
  detectedAt: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
}

// Hook para listar organizações
export const useListOrganizations = () => {
  return useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await fetch('/api/v1/organizations');
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      return response.json();
    }
  });
};

// Hook para criar incidente
export const useCreateIncident = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Incident, Error, CreateIncidentData>({
    mutationFn: async (incidentData: CreateIncidentData) => {
      const response = await fetch('/api/v1/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incidentData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create incident');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidar cache dos incidentes para refetch automático
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    }
  });
};

// Hook adicional para listar incidentes (útil para o sistema)
export const useListIncidents = () => {
  return useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: async () => {
      const response = await fetch('/api/v1/incidents');
      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }
      return response.json();
    }
  });
};