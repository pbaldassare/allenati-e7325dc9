import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainCategory } from '@/types/categories';

export const useMainCategories = () => {
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('main_categories')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setMainCategories(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle categorie');
      } finally {
        setLoading(false);
      }
    };

    fetchMainCategories();
  }, []);

  return { mainCategories, loading, error, refetch: () => setLoading(true) };
};