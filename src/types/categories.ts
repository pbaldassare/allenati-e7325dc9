export interface MainCategory {
  id: string;
  name: string;
  description: string | null;
  requires_belt: boolean;
  color_hex: string | null;
  icon_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithMainCategory {
  id: string;
  name: string;
  description: string | null;
  color_hex: string | null;
  icon_name: string | null;
  gym_id: string | null;
  main_category_id: string | null;
  is_active: boolean;
  created_at: string;
  main_categories?: MainCategory | null;
}

export const getBeltDisplayCondition = async (userId: string) => {
  const { data } = await import('@/integrations/supabase/client').then(module => 
    module.supabase.rpc('user_practices_martial_arts', { _user_id: userId })
  );
  return data || false;
};