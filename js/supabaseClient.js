const SUPABASE_URL = "https://cxrdcoboopkngypngbti.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4cmRjb2Jvb3Brbmd5cG5nYnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODgzMDEsImV4cCI6MjA5NTA2NDMwMX0.WfBehWtd0FHu9kPnX8c1RuTqIaxFd-8pLmKQd2_bPIY";
const PRODUCT_IMAGES_BUCKET = "produto-imagens";

window.PRODUCT_IMAGES_BUCKET = PRODUCT_IMAGES_BUCKET;

function isSupabaseConfigured() {
  const hasProjectUrl = SUPABASE_URL === "https://cxrdcoboopkngypngbti.supabase.co";
  const hasAnonKey = SUPABASE_ANON_KEY.startsWith("eyJ") && SUPABASE_ANON_KEY.length > 100;
  const hasBucket = PRODUCT_IMAGES_BUCKET === "produto-imagens";

  return hasProjectUrl && hasAnonKey && hasBucket;
}

function createGelimoSupabaseClient() {
  if (!isSupabaseConfigured()) {
    console.warn("Gelimo: Supabase URL ou anon key ainda nao foram configurados.");
    return null;
  }

  if (!window.supabase) {
    console.warn("Gelimo: biblioteca do Supabase nao foi carregada.");
    return null;
  }

  try {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          apikey: SUPABASE_ANON_KEY,
        },
      },
    });
  } catch (error) {
    console.error("Gelimo: erro ao criar cliente Supabase.", error);
    return null;
  }
}

window.gelimoSupabaseConfig = {
  url: SUPABASE_URL,
  bucket: PRODUCT_IMAGES_BUCKET,
  isConfigured: isSupabaseConfigured(),
};

window.gelimoSupabase = createGelimoSupabaseClient();
