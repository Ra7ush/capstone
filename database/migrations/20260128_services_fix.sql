-- Add foreign key constraint to services table
-- This allows PostgREST to perform joins between services and users

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'services_creator_id_fkey'
        AND table_name = 'services'
    ) THEN
        ALTER TABLE public.services
        ADD CONSTRAINT services_creator_id_fkey
        FOREIGN KEY (creator_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Also check course_modules and lessons as they might be missing FKs if created manually
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'course_modules_service_id_fkey'
        AND table_name = 'course_modules'
    ) THEN
        ALTER TABLE public.course_modules
        ADD CONSTRAINT course_modules_service_id_fkey
        FOREIGN KEY (service_id)
        REFERENCES public.services(id)
        ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'lessons_module_id_fkey'
        AND table_name = 'lessons'
    ) THEN
        ALTER TABLE public.lessons
        ADD CONSTRAINT lessons_module_id_fkey
        FOREIGN KEY (module_id)
        REFERENCES public.course_modules(id)
        ON DELETE CASCADE;
    END IF;
END $$;
