-- Helper to read function source
CREATE OR REPLACE FUNCTION public.get_function_source(func_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  src text;
BEGIN
  SELECT prosrc INTO src
  FROM pg_proc
  WHERE proname = func_name
  LIMIT 1;
  
  RETURN src;
END;
$$;
