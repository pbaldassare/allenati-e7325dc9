
-- Drop all existing tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS public.crawled_pages CASCADE;
DROP TABLE IF EXISTS public.generated_code CASCADE; 
DROP TABLE IF EXISTS public.scraped_data CASCADE;
DROP TABLE IF EXISTS public.scraping_projects CASCADE;

-- Drop the function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
