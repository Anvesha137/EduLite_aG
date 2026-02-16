-- Service Ticket System
-- Description: Create support tickets and replies for parents and admin interaction.

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('Academic', 'Transport', 'Fee', 'Discipline', 'Technical', 'General')),
    subject TEXT,
    description TEXT NOT NULL,
    attachment_url TEXT,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- User ID
    sender_role TEXT NOT NULL, -- e.g. 'PARENT' or 'ADMIN'
    message TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Address Update Requests
CREATE TABLE IF NOT EXISTS public.address_update_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
    new_address TEXT NOT NULL,
    new_city TEXT,
    new_state TEXT,
    new_pincode TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_service_tickets_updated_at BEFORE UPDATE ON public.service_tickets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_address_update_requests_updated_at BEFORE UPDATE ON public.address_update_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMIT;
