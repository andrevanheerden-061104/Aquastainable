import { useCallback, useState } from 'react';
import axios, { isAxiosError } from 'axios';

import { useBackendApi } from '@/lib/hooks/useBackendApi';

export type PlantSpecies = {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  imageSourceUrl?: string;
  imageLicense?: string;
  source?: string;
  // Filled for plants from the common-plants catalogue.
  description?: string;
  bestTempC?: string;
  phRange?: string;
  light?: string;
  growthRate?: string;
  placement?: string;
  attachment?: string;
  careLevel?: string;
  co2?: string;
  origin?: string;
  maxHeightCm?: number | null;
  popular?: boolean;
};

export type SavedPlant = PlantSpecies & {
  plantId: string;
  tankId: string;
  tankName?: string;
  addedAt?: string;
  description?: string;
  bestTempC?: string;
  phRange?: string;
  light?: string;
  growthRate?: string;
  placement?: string;
  careProfileConfidence?: string;
  careProfileModel?: string;
};

export type PlantCompatibilityAssessment = {
  canAdd: boolean;
  status: 'compatible' | 'incompatible' | 'needs_information';
  title: string;
  explanation: string;
  suggestedPlantName: string;
  model?: string;
};

export function usePlantApi() {
  const { buildUrl } = useBackendApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestApi = useCallback(async <T,>(method: 'get' | 'post' | 'delete', path: string, payload?: object) => {
    setError('');
    setLoading(true);
    try {
      const response = await axios({ method, url: buildUrl(path), data: payload });
      return response.data as T;
    } catch (err) {
      const message = isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error ? err.message : 'Request failed.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  // Own request (no shared loading flag) that can be cancelled, like the fish search.
  const searchPlants = useCallback(async (query: string, signal?: AbortSignal) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];
    try {
      const response = await axios.get<PlantSpecies[]>(buildUrl(`/plants/search?query=${encodeURIComponent(trimmedQuery)}`), { signal });
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      if (axios.isCancel(err)) throw err;
      const message = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Plant search failed.';
      throw new Error(message);
    }
  }, [buildUrl]);

  const addPlantToTank = useCallback(async (payload: {
    userId: string;
    tankId: string;
    plantId: string;
    name: string;
    scientificName: string;
    image?: string;
    imageSourceUrl?: string;
    imageLicense?: string;
    source?: string;
  }) => requestApi<SavedPlant>('post', '/plants/add', payload), [requestApi]);

  const getUserPlants = useCallback(async (userId: string) => (
    requestApi<SavedPlant[]>('get', `/plants/user/${encodeURIComponent(userId)}`)
  ), [requestApi]);

  const deletePlant = useCallback(async (userId: string, tankId: string, plantDocId: string) => (
    requestApi<{ success: boolean }>('delete', `/plants/${encodeURIComponent(tankId)}/${encodeURIComponent(plantDocId)}`, { userId })
  ), [requestApi]);

  const assessPlantAddition = useCallback(async (payload: { userId: string; tankId: string; plant: PlantSpecies }) => (
    requestApi<PlantCompatibilityAssessment>('post', '/plants/assess-add', payload)
  ), [requestApi]);

  return { loading, error, searchPlants, assessPlantAddition, addPlantToTank, getUserPlants, deletePlant };
}

export default usePlantApi;