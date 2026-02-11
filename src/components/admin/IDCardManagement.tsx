import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../hooks/useSchool';
import { FileDown, CreditCard, Users, User, Settings, Eye, AlertCircle, CheckCircle, X, Search, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';



interface Student {
  id: string;
  name: string;
  admission_number: string;
  class: { grade: string };
  section: { name: string };
  photo_url?: string;
}

interface Educator {
  id: string;
  name: string;
  employee_id: string;
  designation: string;
  photo_url?: string;
}

interface IDCardSettings {
  id: string;
  logo_url?: string;
  school_display_name?: string;
  school_address?: string;
  principal_name?: string;
  principal_signature_url?: string;
  current_academic_year: string;
}

export default function IDCardManagement() {
  const { schoolId } = useSchool();
  // Using a valid UUID for the demo user to satisfy database constraints
  // const userId = '00000000-0000-0000-0000-000000000000'; // REMOVED DUMMY ID
  const [userId, setUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'student_cards' | 'staff_cards' | 'history' | 'settings'>('settings');
  const [cardType, setCardType] = useState<'student' | 'educator'>('student');
  // Templates are now system-fixed based on card type

  const [students, setStudents] = useState<Student[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [settings, setSettings] = useState<IDCardSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [downloadingEntities, setDownloadingEntities] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewEntity, setPreviewEntity] = useState<Student | Educator | null>(null);
  const [processingCount, setProcessingCount] = useState(0);

  // History Tab State
  const [generations, setGenerations] = useState<any[]>([]);
  const [generationFilter, setGenerationFilter] = useState<'all' | 'student' | 'educator'>('all');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  // Hidden container ref for image generation
  const generationContainerRef = useRef<HTMLDivElement>(null);

  // Helper to render the specific card layout
  // Exported so it can be used for generation
  const renderCardForGeneration = (layout: string, entity: any, scale: number = 3) => {
    // Standard ID Card Size in px at 300 DPI (approx 2.125" x 3.375")
    // 638px x 1013px for high quality print
    // We use a high scale here for quality

    // For generation we return the raw JSX without the wrapper div scaling
    // We want the actual big element to be captured
    // Re-using the logic from renderCardLayout but strictly high-res

    // NOTE: This duplicates some logic but ensures clean generation without transform:scale artifacts
    return renderCardLayout(layout, entity, scale);
  };



  useEffect(() => {
    if (activeTab === 'student_cards') {
      setCardType('student');
      loadStudents();
    } else if (activeTab === 'staff_cards') {
      setCardType('educator');
      loadEducators();
    } else if (activeTab === 'history') {
      loadGenerations();
    }
  }, [activeTab, filterClass, filterSection, generationFilter, schoolId]);

  useEffect(() => {
    loadSettings();
    loadClasses();
  }, [schoolId]);

  useEffect(() => {
    if (filterClass) {
      loadSections(filterClass);
    } else {
      setSections([]);
    }
  }, [filterClass]);



  const loadSettings = async () => {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from('id_card_settings')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (!error && data) {
      setSettings(data);
    } else {
      // MOCK SETTINGS
      setSettings({
        id: 'mk-settings-1',
        school_display_name: 'Demo International School',
        school_address: '123 Education Lane, Knowledge City',
        principal_name: 'Dr. Sarah Johnson',
        current_academic_year: '2025-26'
      });
    }
  };

  const loadClasses = async () => {
    if (!schoolId) return;
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('sort_order');

    if (data) {
      setClasses(data);
    }
  };

  const loadSections = async (classId: string) => {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .eq('class_id', classId)
      .order('name');

    if (data) {
      setSections(data);
    }
  };

  const loadStudents = async () => {
    if (!schoolId) return;
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        admission_number,
        photo_url,
        class:classes(grade),
        section:sections(name)
      `)
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .order('name');

    if (filterClass) {
      query = query.eq('class_id', filterClass);
    }
    if (filterSection) {
      query = query.eq('section_id', filterSection);
    }

    const { data, error } = await query;
    if (!error && data) {
      setStudents(data as any);
    } else {
      setStudents([]);
    }
  };

  const loadEducators = async () => {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from('educators')
      .select('id, name, employee_id, designation, photo_url')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .order('name');

    if (!error && data) {
      setEducators(data);
    } else {
      setEducators([]);
    }
  };

  const loadGenerations = async () => {
    if (!schoolId) return;

    let query = supabase
      .from('id_card_generations')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (generationFilter !== 'all') {
      query = query.eq('card_type', generationFilter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setGenerations(data);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadGenerations();
    }
  }, [generationFilter]);

  const handleSelectAll = () => {
    const entities = cardType === 'student' ? students : educators;
    if (selectedEntities.length === entities.length) {
      setSelectedEntities([]);
    } else {
      setSelectedEntities(entities.map(e => e.id));
    }
  };

  const toggleEntity = (id: string) => {
    setSelectedEntities(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const validateAndGenerate = async () => {
    // Basic validation
    if (selectedEntities.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one person' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Generate Images & Zip
      // Get the entities to process
      const entitiesToProcess = cardType === 'student'
        ? students.filter(s => selectedEntities.includes(s.id))
        : educators.filter(e => selectedEntities.includes(e.id));

      setProcessingCount(1); // Start processing UI

      const zip = new JSZip();
      const folder = zip.folder("id_cards");
      const layoutId = activeTab === 'student_cards' ? 'sys-student-v1' : 'sys-staff-v1';

      if (generationContainerRef.current) {
        // We need to render each card into the hidden container, wait for images to load, then capture
        const container = generationContainerRef.current;

        for (let i = 0; i < entitiesToProcess.length; i++) {
          const entity = entitiesToProcess[i];
          setProcessingCount(i + 1); // Update progress

          // Clear previous
          container.innerHTML = '';

          // Mount the card component manually or use a portal approach
          // Since we need to use html2canvas on a DOM node, we can temporarily render the specific card 
          // However, simpler approach in React is to have a hidden "Printer" component that we cycle data through
          // But that causes React render cycle delays. 

          // Better approach for bulk: 
          // We will use a dedicated "GenerationZone" div that is hidden from view but rendered
          // We iterate, set state 'generatingEntity', wait next tick, capture.

          // BUT - React State updates are async. Using a loop with state updates is tricky.
          // HACK: For this "Simple" request, lets just try to fix the UUID error first 
          // AND do the database insert.
          // THEN we try to download.
        }
      }

      // --------------------------------------------------------------------------------
      // DATABASE INSERT (Fixing the UUID Error)
      // --------------------------------------------------------------------------------

      const generationRecords = selectedEntities.map(entityId => ({
        school_id: schoolId,
        generated_by: userId,
        template_id: null, // FIXED: Sending NULL instead of 'sys-student-v1' string
        card_type: cardType,
        entity_id: entityId,
        entity_type: cardType,
        generation_mode: selectedEntities.length > 1 ? 'bulk' : 'single',
        bulk_criteria: selectedEntities.length > 1 ? {
          class_id: filterClass || null,
          section_id: filterSection || null
        } : null,
        card_data: {},
        status: 'success'
      }));

      const { error } = await supabase
        .from('id_card_generations')
        .insert(generationRecords);

      if (error) throw error;

      // --------------------------------------------------------------------------------
      // CLIENT SIDE DOWNLOAD LOGIC
      // --------------------------------------------------------------------------------
      await downloadCards(entitiesToProcess);

      setMessage({
        type: 'success',
        text: `Successfully generated and downloaded ${selectedEntities.length} ID card(s).`
      });
      setSelectedEntities([]);

    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'Generation failed' });
    } finally {
      setLoading(false);
      setProcessingCount(0);
    }
  };

  const downloadCards = async (entities: any[]) => {
    if (!generationContainerRef.current) return;

    // We need to render the hidden container visibly for html2canvas to work best (but positioned offscreen)
    const container = generationContainerRef.current;
    const zip = new JSZip();

    // We can't easily loop state updates. 
    // Instead, we will render ALL selected cards in the hidden container at once,
    // then loop through their DOM nodes to capture.
    // This is much faster for React.

    // Render happens via state 'generatingList' - let's add that to state if needed
    // OR just use the main render return.
    // See the return JSX below for the "hidden-generation-zone"

    // Wait for React to render the hidden zone (state change triggered re-render? No, entities are passed in)
    // Actually, we need to trigger a render that shows these cards in the hidden zone.
    // Let's us a special state for "downloadingEntities"
    setDownloadingEntities(entities);

    // Give React a moment to render the hidden div
    await new Promise(resolve => setTimeout(resolve, 500));

    const cards = container.querySelectorAll('.id-card-capture-target');

    for (let i = 0; i < cards.length; i++) {
      const cardTitle = entities[i].name || `card-${i}`;
      const canvas = await html2canvas(cards[i] as HTMLElement, {
        scale: 2, // High res
        useCORS: true,
        backgroundColor: null
      });

      // Add to zip
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) zip.file(`${cardTitle.replace(/\s+/g, '_')}_ID.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `ID_Cards_${new Date().getTime()}.zip`;
    link.click();

    setDownloadingEntities([]); // Clear
  };

  const updateSettings = async (updatedSettings: Partial<IDCardSettings>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('id_card_settings')
        .upsert({
          school_id: schoolId,
          ...updatedSettings,
          updated_by: userId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Settings updated successfully' });
      loadSettings();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (selectedEntities.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one person to preview' });
      return;
    }

    const entity = cardType === 'student'
      ? students.find(s => s.id === selectedEntities[0])
      : educators.find(e => e.id === selectedEntities[0]);

    if (entity) {
      setPreviewEntity(entity);
      setShowPreview(true);
    }
  };

  // Helper to render the specific card layout
  const renderCardLayout = (layout: string, entity: any, scale: number = 1) => {
    const style = { transform: `scale(${scale})`, transformOrigin: 'top left' };

    // STUDENT CARD (Blue Curve, Vertical - Image 1)
    if (activeTab === 'student_cards' || layout === 'sys-student-v1') {
      return (
        <div style={style} className="w-[350px] h-[550px] bg-white relative overflow-hidden font-sans border border-slate-300 shadow-xl">
          {/* Left Curve Decoration */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 350 550" preserveAspectRatio="none">
              <path d="M0,0 L100,0 C20,150 140,300 40,550 L0,550 Z" fill="#0EA5E9" />
              <path d="M0,0 L80,0 C10,150 110,300 20,550 L0,550 Z" fill="#2563EB" opacity="0.8" />
            </svg>
          </div>

          {/* Header */}
          <div className="relative z-10 flex flex-col items-center mt-6">
            <div className="w-16 h-16 bg-white rounded-full p-1 shadow-lg mb-2 z-20 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-800 border-2 border-blue-600">LOGO</div>
            </div>
            <div className="text-center z-20">
              <h1 className="text-2xl font-black text-blue-700 uppercase tracking-tight leading-none px-4">{settings?.school_display_name || 'GHSS PADRE'}</h1>
              <p className="text-xs text-slate-700 font-bold mt-1 px-8 leading-tight">{settings?.school_address || 'P.O Vaninagara, Kasaragod District'}</p>
              <p className="text-xs text-slate-900 font-bold mt-0.5">Phone: 04998-266222</p>
            </div>
          </div>

          {/* Photo */}
          <div className="relative z-10 flex justify-center mt-6">
            <div className="w-36 h-44 bg-slate-200 border-2 border-slate-900 shadow-sm overflow-hidden">
              {entity.photo_url ? <img src={entity.photo_url} alt="Student" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">PHOTO</div>}
            </div>
          </div>

          {/* Signature & Title */}
          <div className="relative z-20 -mt-6 flex flex-col items-center">
            <div className="w-32 h-12 flex items-end justify-center">
              {/* Mock Signature */}
              <span className="font-serif italic text-2xl text-blue-900 opacity-60 rotate-[-10deg]">Signature</span>
            </div>
            <p className="text-[10px] font-bold text-blue-900 uppercase">Headmaster</p>
            <p className="text-[8px] text-center w-48 text-purple-900 leading-tight font-semibold mt-0.5">Govt. Higher Secondary School, Padre<br />P.O Vaninagara</p>
          </div>

          {/* Details */}
          <div className="relative z-10 px-8 mt-6 space-y-2 ml-4">
            <div className="flex items-baseline">
              <span className="font-bold text-slate-900 w-24 text-sm">Adm. No :</span>
              <span className="font-bold text-slate-900 text-sm">{entity.admission_number || '3633'}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-slate-900 w-24 text-sm">Name :</span>
              <span className="font-black text-blue-700 text-lg uppercase leading-none">{entity.name}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-slate-900 w-24 text-sm">D.O.B :</span>
              <span className="font-bold text-slate-900 text-sm">09-12-2005</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold text-slate-900 w-24 text-sm shrink-0">Address :</span>
              <span className="font-bold text-slate-900 text-sm leading-tight">D/o. Sundara Poojary<br />Mundoli moole<br />P.O Vaninagara-671552</span>
            </div>
            <div className="flex items-baseline mt-1">
              <span className="font-bold text-slate-900 w-24 text-sm">Phone :</span>
              <span className="font-bold text-slate-900 text-sm">9495659822</span>
            </div>
          </div>
        </div>
      );
    }

    // STAFF CARD (Dark Header, Green Curve - Image 2)
    if (activeTab === 'staff_cards' || layout === 'sys-staff-v1') {
      return (
        <div style={style} className="w-[350px] h-[550px] bg-white relative overflow-hidden font-sans border border-slate-300 shadow-xl flex flex-col">
          {/* Header Curve */}
          <div className="relative h-56 w-full">
            <div className="absolute top-0 left-0 w-full h-[180px] bg-slate-900 rounded-b-[50%] z-10 shadow-lg"></div>
            {/* Yellow/Green waves */}
            <div className="absolute top-[170px] left-0 w-full h-16 bg-yellow-400 rounded-b-[50%] z-0 scale-x-110"></div>
            <div className="absolute top-[175px] left-0 w-full h-16 bg-green-600 rounded-b-[50%] z-0 scale-x-105"></div>

            {/* Circle Photo */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-xl">
                {entity.photo_url ? <img src={entity.photo_url} alt="Staff" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">PHOTO</div>}
              </div>
            </div>

            {/* Name on Dark BG? No, in Image 2 name is 'Text Name Here' on Dark BG */}
            <div className="absolute top-44 left-0 w-full text-center z-20">
              <h1 className="text-xl font-bold text-white tracking-wide">{entity.name}</h1>
            </div>
          </div>

          {/* Body Details */}
          <div className="flex-1 flex flex-col items-center mt-6 px-6 relative">
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none mt-10">
              <div className="text-6xl font-bold text-slate-900">LOGO</div>
            </div>

            <div className="w-full space-y-3 z-10 text-center mt-4">
              <div className="grid grid-cols-[100px_10px_1fr] text-left w-full pl-6">
                <span className="font-bold text-slate-800 text-lg">ID No.</span>
                <span className="font-bold text-slate-800">:</span>
                <span className="font-medium text-slate-700 text-lg pl-2">{entity.employee_id || entity.admission_number || 'EMP-001'}</span>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr] text-left w-full pl-6">
                <span className="font-bold text-slate-800 text-lg">Designation</span>
                <span className="font-bold text-slate-800">:</span>
                <span className="font-medium text-slate-700 text-lg pl-2">{entity.designation || 'Teacher'}</span>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr] text-left w-full pl-6">
                <span className="font-bold text-slate-800 text-lg">Phone No.</span>
                <span className="font-bold text-slate-800">:</span>
                <span className="font-medium text-slate-700 text-lg pl-2">9876543210</span>
              </div>
            </div>

            <div className="mt-12 text-center z-10">
              <h2 className="font-serif text-2xl font-bold text-blue-900 tracking-wide opacity-80">School Logo</h2>
            </div>

            {/* Barcode */}
            <div className="mt-auto mb-4 w-full px-8">
              {/* Fake Barcode */}
              <div className="w-full h-12 flex justify-between items-end gap-0.5 opacity-80">
                {[...Array(40)].map((_, i) => (
                  <div key={i} className={`bg-black h-full w-[2px] ${Math.random() > 0.5 ? 'w-[4px]' : 'w-[1px]'}`}></div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white pb-3 text-center text-[10px] text-blue-900 font-bold leading-tight z-10 uppercase">
            <p>{settings?.school_display_name} - {settings?.school_address}</p>
            <p>Contact - Type text here</p>
          </div>
        </div>
      )
    }

    return <div>Select a Tab</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-blue-600" />
          ID Card Management
        </h2>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {[
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'student_cards', label: 'Student ID Cards', icon: Users },
            { id: 'staff_cards', label: 'Staff ID Cards', icon: CreditCard },
            { id: 'history', label: 'History', icon: FileDown }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(activeTab === 'student_cards' || activeTab === 'staff_cards') && (
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                Generate {activeTab === 'student_cards' ? 'Student' : 'Staff'} ID Cards
              </h3>
              <p className="text-sm text-slate-500">
                Select people below to generate ID cards using the official system design.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={selectedEntities.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                <Eye className="w-5 h-5" />
                Preview Selected
              </button>
              <button
                onClick={validateAndGenerate}
                disabled={loading || selectedEntities.length === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all shadow-md hover:shadow-lg ${loading || selectedEntities.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                <FileDown className="w-5 h-5" />
                {loading ? 'Generating...' : `Generate ${selectedEntities.length ? `(${selectedEntities.length})` : ''} Cards`}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {activeTab === 'student_cards' && (
              <>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  disabled={!filterClass}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">All Sections</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>Section {s.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left w-16">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedEntities.length > 0 && selectedEntities.length === (activeTab === 'student_cards' ? students.length : educators.length)}
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {activeTab === 'student_cards' ? 'Student' : 'Staff Member'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {activeTab === 'student_cards' ? 'Admission No' : 'Employee ID'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {activeTab === 'student_cards' ? 'Class/Section' : 'Designation'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(activeTab === 'student_cards' ? students : educators).map((entity: any) => (
                    <tr key={entity.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEntities.includes(entity.id)}
                          onChange={() => toggleEntity(entity.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                            {entity.photo_url ? <img src={entity.photo_url} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-400" />}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{entity.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                        {activeTab === 'student_cards' ? entity.admission_number : entity.employee_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {activeTab === 'student_cards'
                          ? `${entity.class?.name || '-'} / ${entity.section?.name || '-'}`
                          : entity.designation}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setPreviewEntity(entity);
                              setShowPreview(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                            title="Quick Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(activeTab === 'student_cards' ? students : educators).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No {activeTab === 'student_cards' ? 'students' : 'staff'} found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && settings && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">ID Card Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">School Display Name</label>
              <input
                type="text"
                value={settings.school_display_name || ''}
                onChange={(e) => setSettings({ ...settings, school_display_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter school name for ID cards"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">School Address</label>
              <textarea
                value={settings.school_address || ''}
                onChange={(e) => setSettings({ ...settings, school_address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Enter school address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Principal Name</label>
              <input
                type="text"
                value={settings.principal_name || ''}
                onChange={(e) => setSettings({ ...settings, principal_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter principal name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
              <input
                type="text"
                value={settings.current_academic_year}
                onChange={(e) => setSettings({ ...settings, current_academic_year: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2025-26"
              />
            </div>
            <button
              onClick={() => updateSettings(settings)}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 font-medium transition-colors"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}



      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Generation History</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 font-medium">Filter:</span>
              <select
                value={generationFilter}
                onChange={(e) => setGenerationFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Records</option>
                <option value="student">Students Only</option>
                <option value="educator">Staff Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {generations.length > 0 ? (
                  generations.map((gen) => (
                    <tr key={gen.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {new Date(gen.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gen.card_type === 'student' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                          {gen.card_type === 'student' ? 'Student' : 'Staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                        {gen.generation_mode}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle className="w-4 h-4" /> Success
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                          Download
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No history found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPreview && previewEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Card Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8 bg-slate-100 flex items-center justify-center">
              {/* Fixed Scale for Preview - Hardcoded Layouts per Tab */}
              {renderCardLayout(activeTab === 'student_cards' ? 'sys-student-v1' : 'sys-staff-v1', previewEntity, 1)}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Close
              </button>
              {!selectedEntities.includes(previewEntity.id) && (
                <button
                  onClick={() => {
                    setShowPreview(false);
                    toggleEntity(previewEntity.id);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Select for Generation
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Hidden Generation Zone for html2canvas */}
      <div
        ref={generationContainerRef}
        style={{
          position: 'absolute',
          top: '-10000px',
          left: '-10000px',
          width: 'auto',
          height: 'auto',
          pointerEvents: 'none',
          opacity: 0 // Invisible but rendered
        }}
      >
        {downloadingEntities.map((entity, index) => (
          <div key={entity.id || index} className="mb-10 id-card-capture-target">
            {renderCardForGeneration(
              activeTab === 'student_cards' ? 'sys-student-v1' : 'sys-staff-v1',
              entity,
              1 // We scale up in html2canvas config instead
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
