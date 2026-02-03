-- Seed Holidays for all existing schools

do $$
declare
    school_rec record;
    curr_date date;
    year integer := 2025;
begin
    for school_rec in select id from public.schools
    loop
        -- 1. Insert Sundays
        curr_date := make_date(year, 1, 1);
        while extract(year from curr_date) = year loop
            if extract(dow from curr_date) = 0 then -- 0 is Sunday
                insert into public.holidays (school_id, name, date, type, is_recurring)
                values (school_rec.id, 'Sunday', curr_date, 'weekend', true)
                on conflict (school_id, date) do nothing;
            end if;
            curr_date := curr_date + 1;
        end loop;

        -- 2. Insert Fixed Festivals
        insert into public.holidays (school_id, name, date, type, is_recurring)
        values 
            (school_rec.id, 'Republic Day', '2025-01-26', 'festival', true),
            (school_rec.id, 'Independence Day', '2025-08-15', 'festival', true),
            (school_rec.id, 'Gandhi Jayanti', '2025-10-02', 'festival', true),
            (school_rec.id, 'Christmas', '2025-12-25', 'festival', true),
            (school_rec.id, 'New Year', '2025-01-01', 'festival', true)
        on conflict (school_id, date) do nothing;
        
    end loop;
end;
$$;
