import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CategoryWithMainCategory } from '@/types/categories';

export const useCategoriesWithMain = (gymId?: string, enabled = true) => {
  const [categories, setCategories] = useState<CategoryWithMainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
      if (!enabled) {
        setCategories([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        let query = supabase
          .from('course_categories')
          .select(`
            *,
            main_categories (*)
          `)
          .eq('is_active', true);

        if (gymId) {
          query = query.eq('gym_id', gymId);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle categorie');
      } finally {
        setLoading(false);
      }
    }, [gymId, enabled]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
};