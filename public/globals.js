// ═══════════════════════════════════════
// GLOBAL STATE VARIABLES (CalorIA)
// ═══════════════════════════════════════

var currentUser = null;
var supabase = null;
var askClaude = null;
var askGeminiWithImage = null;
var callGroq = null;
var callGroqLarge = null;
var extractJSON = null;
var showPanel = null;
var showToast = null;
var escapeHtml = null;
var t = null;
var currentProfile = null;
var diary = { cafe: [], almoco: [], lanche: [], jantar: [] };
var diaryGoal = 2000;
var diaryDate = new Date().toISOString().split('T')[0];
var lastSearchResult = null;
var lastCamResult = null;
var lastAiRecipeData = null;
var currentGoalDelta = 0;
var _appInitialized = false;
var _initAppRunning = false;
var _suppressAuthChange = false;
var currentLang = localStorage.getItem('cv_lang') || 'pt';
var newRecipeVisibility = 'public';
var newRecipePatientId = null;
var allAdminUsers = [];
var allNutritionistRequests = [];
var allUpgradeRequests = [];

// Variáveis do patches.js
var diaryGoalSugar = 25;
var diaryGoalWater = 2000;
var diaryWaterMl = 0;

