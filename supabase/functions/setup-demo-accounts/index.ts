import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];

    const demoAccounts = [
      {
        email: 'superadmin@erp.com',
        password: 'demo123456',
        full_name: 'Platform Administrator',
        phone: '+91-9999999999',
        role: 'SUPERADMIN',
        school_email: null,
      },
      {
        email: 'admin@demoschool.edu',
        password: 'demo123456',
        full_name: 'Principal Sharma',
        phone: '+91-9876543210',
        role: 'ADMIN',
        school_email: 'admin@demoschool.edu',
      },
      {
        email: 'rajesh@demoschool.edu',
        password: 'demo123456',
        full_name: 'Rajesh Kumar',
        phone: '+91-9876543211',
        role: 'EDUCATOR',
        school_email: 'admin@demoschool.edu',
        employee_id: 'EMP001',
      },
      {
        email: 'ramesh@gmail.com',
        password: 'demo123456',
        full_name: 'Ramesh Gupta',
        phone: '+91-9876000001',
        role: 'PARENT',
        school_email: 'admin@demoschool.edu',
        parent_phone: '+91-9876000001',
      },
    ];

    for (const account of demoAccounts) {
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.full_name,
          },
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            results.push({ email: account.email, status: 'already_exists' });
            continue;
          }
          throw authError;
        }

        const userId = authData.user.id;

        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .eq('name', account.role)
          .single();

        let schoolId = null;
        if (account.school_email) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('id')
            .eq('email', account.school_email)
            .single();
          schoolId = schoolData?.id;
        }

        await supabase.from('user_profiles').insert({
          id: userId,
          school_id: schoolId,
          role_id: roleData?.id,
          full_name: account.full_name,
          phone: account.phone,
          is_active: true,
        });

        if (account.role === 'EDUCATOR' && account.employee_id) {
          await supabase
            .from('educators')
            .update({ user_id: userId })
            .eq('school_id', schoolId)
            .eq('employee_id', account.employee_id);
        }

        if (account.role === 'PARENT' && account.parent_phone) {
          await supabase
            .from('parents')
            .update({ user_id: userId })
            .eq('school_id', schoolId)
            .eq('phone', account.parent_phone);
        }

        results.push({ email: account.email, status: 'created', user_id: userId });
      } catch (error: any) {
        results.push({ email: account.email, status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo accounts setup completed',
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});