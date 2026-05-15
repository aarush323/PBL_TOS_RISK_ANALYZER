import { useCallback } from 'react';
import { deleteAnalysis, fetchHistory, fetchAnalysis, renameAnalysis } from '../api/historyApi';

export const useHistoryActions = ({
  token,
  setHistoryItems,
  setIsHistoryLoading,
  addToast,
}) => {
  const loadHistory = useCallback(async (limit = 50) => {
    setIsHistoryLoading(true);
    try {
      const { res, data } = await fetchHistory({ token, limit });
      if (res.ok) {
        setHistoryItems(Array.isArray(data) ? data : []);
      } else {
        addToast(data?.detail || 'Failed to load history', true);
      }
    } catch (error) {
      console.error('Load history error:', error);
      addToast('History service unavailable', true);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [addToast, setHistoryItems, setIsHistoryLoading, token]);

  const fetchHistoryItem = useCallback(
    (jobId) => fetchAnalysis({ token, jobId }),
    [token]
  );

  const renameHistoryItem = useCallback(
    (jobId, title) => renameAnalysis({ token, jobId, title }),
    [token]
  );

  const deleteHistoryItem = useCallback(
    (jobId) => deleteAnalysis({ token, jobId }),
    [token]
  );

  return {
    loadHistory,
    fetchHistoryItem,
    renameHistoryItem,
    deleteHistoryItem,
  };
};
