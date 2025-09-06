import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CategoryWithMainCategory } from '@/types/categories';

export const useCategoriesWithMain = (gymId?: string) => {
  const [categories, setCategories] = useState<CategoryWithMainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
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
    };

    fetchCategories();
  }, [gymId]);

  return { categories, loading, error, refetch: () => setLoading(true) };
};